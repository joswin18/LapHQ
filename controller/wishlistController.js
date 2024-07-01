const User = require('../model/userModel')
const Product = require('../model/productModel');
const Wishlist = require('../model/wishlistModel');

let addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.body.productId;

        let wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            wishlist = new Wishlist({ user: userId, products: [productId] });
            await wishlist.save();
            res.status(200).json({ success: true, message: 'Product added to wishlist' });
        } else if (!wishlist.products.includes(productId)) {
            wishlist.products.push(productId);
            await wishlist.save();
            res.status(200).json({ success: true, message: 'Product added to wishlist' });
        } else {
            res.status(200).json({ success: false, alreadyInWishlist: true, message: 'Product already in wishlist' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to add product to wishlist' });
    }
};

let removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.body.productId;

        await Wishlist.updateOne(
            { user: userId },
            { $pull: { products: productId } }
        );

        res.status(200).json({ success: true, message: 'Product removed from wishlist' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to remove product from wishlist' });
    }
};

let loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const wishlist = await Wishlist.findOne({ user: userId }).populate('products');
        res.render('wishlist', { req: req, wishlist: wishlist });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading wishlist');
    }
};


module.exports = {
    addToWishlist,
    removeFromWishlist,
    loadWishlist
}