// const Order = require('../model/orderModel');
const Cart = require('../model/cartModel');
const Product = require('../model/productModel');
const Address = require('../model/addressModel')
const User = require('../model/userModel')
const randomstring = require('randomstring');
const Order = require('../model/orderModel');
const Razorpay = require('razorpay')
const crypto = require('crypto');
const Coupon = require('../model/couponModel')
const Wallet = require('../model/walletModel');
const walletController = require('./walletController');


const razorpay = new Razorpay({
    key_id: 'rzp_test_xaGkIpXmOWb28y',
    key_secret: '7l3JbQrUmZdZ8tocVjWSV07y'
});


let loadOrder = async(req,res)=>{
    try {
        let userId = req.session.user_id
        // console.log(userId)
        // let cartData = await Cart.findOne({userId})
        let cartData = await Cart.findOne({ userId }).populate('items.productId')
        let userData =  await User.findById(userId)
        let addressData = await Address.find({user:userId})
        // console.log(cartData)
        if (!cartData || cartData.items.length === 0) {
            return res.redirect('/cart'); 
        }
        res.render('checkoutPage',{req:req,cartData,userData,addressData})
    } catch (error) {
        console.log(error.message)
    }
}

let addAddress = async (req, res) => {
    try {
        const { addressType, addressLine1, addressLine2, city, state, zipCode } = req.body;
        const userId = req.session.user_id;

        const newAddress = new Address({
            user: userId,
            addressType,
            addressLine1,
            addressLine2,
            city,
            state,
            zipCode
        });

        await newAddress.save();

        res.json({ success: true, message: 'Address added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error adding address' });
    }
};



let placeOrder = async (req, res) => {
    try {
        const { address, paymentOption, newAddress ,total, couponId, couponCode, discount} = req.body;
        const userId = req.session.user_id;

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        let shippingAddressId;

        if (newAddress) {
            const newAddressDoc = new Address({
                user: userId,
                addressType: address.addressType,
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2,
                city: address.city,
                state: address.state,
                zipCode: address.zipCode
            });
            const savedAddress = await newAddressDoc.save();
            shippingAddressId = savedAddress._id;
        } else {
            shippingAddressId = address.addressId;
        }

        let couponApplied = false;
        if (couponId) {
            await Coupon.findByIdAndUpdate(couponId, { $addToSet: { users: userId } });
            couponApplied = true;
        }
        

        const orderId = randomstring.generate({ length: 4, charset: 'numeric' });
        const parseIntTotal=parseInt(total)
        const newOrder = new Order({
            user: userId,
            orderId: orderId,
            shippingAddress: shippingAddressId,
            paymentMethod: paymentOption,
            items: cart.items.map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                subTotal: item.subTotal
            })),
            billTotal: parseIntTotal,
            orderStatus: 'Pending',
            paymentStatus: 'Pending',
            couponApplied: couponApplied,
            couponCode: couponCode || null,
            discount: discount || 0
        });

        const productDetails = [];
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(
                item.productId._id,
                { $inc: { stock: -item.quantity } },
                { new: true }
            );

            productDetails.push({
                name: item.productId.name,
                quantity: item.quantity,
                price: item.productId.price
            });
        }

        await newOrder.save();
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [], total: 0 } });

        let razorpayOrderId = null;
        if (paymentOption === 'Razorpay') {
            const razorpayOrder = await razorpay.orders.create({
                amount: parseIntTotal * 100, // Amount in paise
                currency: "INR",
                receipt: `order_rcptid_${orderId}`
            });
            razorpayOrderId = razorpayOrder.id;
        }

        res.json({ 
            success: true, 
            orderId: newOrder.orderId, 
            razorpayOrderId: razorpayOrderId, 
            products: productDetails, 
            total: parseIntTotal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error placing order' });
    }
};

let loadConfirmation = async (req, res) => {
    try {
        let orderId = req.query.orderId;
        console.log("Requested Order ID:", orderId);

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order ID is missing' });
        }

        let order = await Order.findOne({ orderId: orderId })
            .populate('user')
            .populate('shippingAddress')
            .populate('items.product');

        console.log("Found order:", order);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.render('confirmationPage', { req: req, order: order });
    } catch (error) {
        console.error("Error in loadConfirmation:", error);
        res.status(500).json({ success: false, message: 'Error loading confirmation', error: error.message });
    }
};

let verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        const hmac = crypto.createHmac('sha256', '7l3JbQrUmZdZ8tocVjWSV07y');
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature === razorpay_signature) {
            // Payment is successful
            await Order.findOneAndUpdate({ orderId: orderId }, {
                orderStatus: 'Confirmed',
                paymentStatus: 'Success'
            });

            return res.json({ success: true, orderId: orderId });
        } else {
            await Order.findOneAndUpdate({ orderId: orderId }, {
                orderStatus: 'Failed',
                paymentStatus: 'Failed'
            });
            return res.json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error verifying payment' });
    }
};

const retryPayment = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findOne({ orderId: orderId });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const razorpayOrder = await razorpay.orders.create({
            amount: order.billTotal * 100, // Amount in paise
            currency: "INR",
            receipt: `order_rcptid_${orderId}_retry`
        });

        res.json({ 
            success: true, 
            razorpayOrderId: razorpayOrder.id,
            amount: order.billTotal * 100,
            orderId: order.orderId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error creating Razorpay order for retry' });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.orderStatus === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Order is already cancelled' });
        }

        // Check if the order was paid
        if (order.paymentStatus === 'Success') {
            // If paid, refund to wallet
            await refundToWallet(order.user, order.billTotal, order.orderId);
        }

        // Update order status
        order.orderStatus = 'Cancelled';
        order.paymentStatus = 'Refunded';
        await order.save();

        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error cancelling order' });
    }
};

const refundToWallet = async (userId, amount, orderId) => {
    try {
        let wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet) {
            wallet = new Wallet({ user: userId, balance: 0, total: 0 });
        }

        wallet.balance += amount;
        wallet.total += amount;
        wallet.transactions.push({
            type: 'Credit',
            transationMode: 'Refund',
            amount: amount,
            date: new Date()
        });

        await wallet.save();
    } catch (error) {
        console.error('Error refunding to wallet:', error);
    }
};

let searchOrder = async(req,res)=>{
    try {
        const orderId = req.params.orderId;
        const order = await Order.findOne({ orderId: orderId })
            .populate('user')
            .populate('shippingAddress')
            .populate('items.product');
        
        if (order) {
            res.json({ success: true, order: order });
        } else {
            res.json({ success: false, message: 'Order not found' });
        }
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    loadOrder,
    addAddress,
    placeOrder,
    loadConfirmation,
    verifyPayment,
    retryPayment,
    cancelOrder,
    refundToWallet,
    searchOrder
};