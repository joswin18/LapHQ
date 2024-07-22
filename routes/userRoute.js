const express = require("express")
const userRoute = express.Router();
const userController = require("../controller/userController");
const cartController = require("../controller/cartController");
const orderController = require("../controller/orderController");
const wishlistController = require("../controller/wishlistController");
const couponController = require("../controller/couponController");
const walletController = require("../controller/walletController");
const session = require('express-session')

let config = require('../config/config')
userRoute.use(session({secret:config.sessionSecret}))

let auth = require('../middlware/auth');
// userRoute.set('view engine', 'ejs')
// userRoute.set('views', './views/user')

let bodyParser = require('body-parser');
const { trusted } = require("mongoose");

userRoute.use(bodyParser.json())
userRoute.use(bodyParser.urlencoded({extended:true}))
//dont use


userRoute.get('/register',auth.is_logout, userController.loadregister);


userRoute.post('/register',userController.insertUser)
userRoute.get('/verify',userController.verifyMail)

//login
userRoute.get('/',auth.is_logout, userController.homepage);
userRoute.post('/',userController.verifyLogin);

userRoute.get('/login',auth.is_logout, userController.loadLogin);
userRoute.post('/login',userController.verifyLogin);


userRoute.get('/home',auth.is_login, userController.homepage);
userRoute.get('/logout',userController.userLogout)

userRoute.get('/shop',auth.is_login,userController.loadShop)
userRoute.get('/otp',auth.is_logout,userController.loadOtp)
userRoute.post('/otp',auth.is_logout, userController.verifyOtp)
userRoute.post('/resend-otp', userController.resendOtp)

userRoute.get('/emailVerification',auth.is_logout,userController.loadEmailVerification)
userRoute.post('/emailVerification',auth.is_logout,userController.emailVerification)

userRoute.get('/forgotOtp',auth.is_logout,userController.loadForgotOtp)
userRoute.post('/forgotOtp',auth.is_logout,userController.forgotOtpVerification)
userRoute.post('/forgot-resend-otp',auth.is_logout,userController.ForgotresendOtp)
userRoute.get('/password-change',auth.is_logout,userController.loadpasswordChange)
userRoute.post('/password-change',auth.is_logout,userController.changePassword)

//account
userRoute.get('/account',auth.is_login,userController.loadAccount)
userRoute.post('/save-address', userController.saveAddress);
userRoute.put('/update-address/:addressId',userController.updateAddress)
userRoute.delete('/delete-address/:addressId',userController.deleteAddress)
userRoute.post('/update-profile',userController.updateProfile)

//products
userRoute.get('/productDetails',auth.is_login,userController.productDetail)
userRoute.post('/add-to-cart',cartController.addToCart)
userRoute.get('/cart',auth.is_login,cartController.loadCart)
userRoute.post('/update-quantity',cartController.updateQuantity)
userRoute.post('/remove-item',cartController.removeItem);
userRoute.post('/clear-cart',cartController.clearCart);

//order
userRoute.get('/checkOut',auth.is_login,orderController.loadOrder)
userRoute.post('/add-address',orderController.addAddress)
userRoute.post('/place-order',orderController.placeOrder)
userRoute.get('/order-confirmation',auth.is_login,orderController.loadConfirmation)
// userRoute.post('/cancel-order',userController.cancelOrder)
userRoute.post('/verify-order',orderController.verifyPayment)

userRoute.get('/wishlist',auth.is_login,wishlistController.loadWishlist)
//wishlist 
userRoute.post('/add-to-wishlist',wishlistController.addToWishlist)
userRoute.post('/remove-from-wishlist',wishlistController.removeFromWishlist);

userRoute.post('/coupon-applied',couponController.applyCoupon)
userRoute.post('/retry-payment/:orderId', orderController.retryPayment);

userRoute.post('/cancel-order', orderController.cancelOrder);
userRoute.get('/get-wallet-data',auth.is_login,walletController.wallet)

userRoute.get('/get-order-details/:orderId',auth.is_login,orderController.searchOrder)
userRoute.post('/return-order',orderController.returnProduct)

userRoute.get('/generate-invoice/:orderId',userController.generateInvoice)

userRoute.get('/search',userController.searchProducts)
module.exports = userRoute;