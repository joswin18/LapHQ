// const Order = require('../model/orderModel');
const Cart = require('../model/cartModel');
const Product = require('../model/productModel');
const Address = require('../model/addressModel')
const User = require('../model/userModel')
const randomstring = require('randomstring');
const Order = require('../model/orderModel');
const Razorpay = require('razorpay')
const crypto = require('crypto');

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
        const { address, paymentOption, newAddress } = req.body;
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

        const orderId = randomstring.generate({ length: 4, charset: 'numeric' });

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
            billTotal: cart.total,
            orderStatus: 'Pending',
            paymentStatus: 'Pending',
            couponApplied: false,
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
                amount: cart.total * 100, // Amount in paise
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
            total: cart.total 
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
        console.log(req.body);
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature ,orderId} = req.body;

        const hmac = crypto.createHmac('sha256', '7l3JbQrUmZdZ8tocVjWSV07y');
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        // if (generated_signature === razorpay_signature) {
            // Payment is successful
            await Order.findOneAndUpdate({ orderId: orderId }, {
                orderStatus: 'Pending',
                paymentStatus: 'Success'
            });

            return res.json({ success: true, orderId:orderId});
        // } else {
        //     return res.json({ success: false, message: 'Payment verification failed' });
        // }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error verifying payment' });
    }
};

module.exports = {
    loadOrder,
    addAddress,
    placeOrder,
    loadConfirmation,
    verifyPayment
};