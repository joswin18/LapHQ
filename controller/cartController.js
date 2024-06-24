const User = require('../model/userModel')
const Product = require('../model/productModel');

const Cart = require('../model/cartModel')

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { productId, quantity = 1 } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Please log in to add items to your cart' });
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({ message: 'User not found' });
        }

        const productData = await Product.findById(productId);
        if (!productData) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (productData.stock < quantity) {
            return res.status(400).json({ message: 'Not enough stock available' });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({
                userId: userId,
                items: [{
                    productId: productData._id,
                    subTotal: productData.price,
                    quantity: parseInt(quantity)
                }],
                total: productData.price * parseInt(quantity)
            });
        } else {
            const cartItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
            if (cartItemIndex > -1) {
                const newQuantity = cart.items[cartItemIndex].quantity + parseInt(quantity);
                if (productData.stock < newQuantity) {
                    return res.status(400).json({ message: 'Not enough stock available' });
                }
                cart.items[cartItemIndex].quantity = newQuantity;
                cart.items[cartItemIndex].subTotal = productData.price * newQuantity;
            } else {
                cart.items.push({
                    productId: productId,
                    quantity: parseInt(quantity),
                    subTotal: productData.price * parseInt(quantity)
                });
            }
            cart.total = cart.items.reduce((total, item) => total + item.subTotal, 0);
        }

        await cart.save();

        res.status(200).json({ message: 'Product added to cart', cart });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Failed to add product to cart' });
    }
};



let loadCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        // let cartData = await Cart.findById(userId)
        let cartData = await Cart.findOne({ userId }).populate('items.productId')
        console.log(cartData)
        res.render('cart', { req: req, cartData: cartData })
    } catch (error) {
        console.log(error.message)
    }
}

let updateQuantity = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { productId, isIncrement } = req.body;

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const cartItemIndex = cart.items.findIndex(item => item.productId._id.toString() === productId);
        if (cartItemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        const cartItem = cart.items[cartItemIndex];
        const product = cartItem.productId;

        let quantityChange = isIncrement ? 1 : -1;
        let newQuantity = cartItem.quantity + quantityChange;

        if (isIncrement && product.stock < newQuantity) {
            return res.status(400).json({ success: false, message: 'Not enough stock available' });
        }

        if (newQuantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity cannot be less than 1' });
        }

        cartItem.quantity = newQuantity;
        cartItem.subTotal = product.price * cartItem.quantity;
        cart.total = cart.items.reduce((total, item) => total + item.subTotal, 0);

        await cart.save();

        res.json({ success: true, cart });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to update quantity' });
    }
};

const removeItem = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { productId } = req.body;

        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item.productId._id.toString() === productId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        cart.items.splice(itemIndex, 1);

        cart.total = cart.items.reduce((total, item) => total + item.subTotal, 0);

        await cart.save();

        res.json({ success: true, cart });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to remove item from cart' });
    }
};

const clearCart = async (req, res) => {
    try {
        const userId = req.session.user_id;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        cart.items = [];
        cart.total = 0;

        await cart.save();

        res.json({ success: true, message: 'Cart cleared successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to clear cart' });
    }
};

module.exports = {
    addToCart,
    loadCart,
    updateQuantity,
    removeItem,
    clearCart
}