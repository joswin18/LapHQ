
let User = require('../model/userModel')
let bcrypt = require('bcrypt')
const validator = require('validator');
const nodemailer = require('nodemailer')
const Address = require('../model/addressModel');
const Order = require('../model/orderModel');
let { generateOtp } = require('../otpUtils/otpGenerator');
let { sendOtp } = require('../otpUtils/insertOtp');

let securePassword = async(password)=>{
    try{
        let passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    }catch(error){
        console.log(error.message)
    }
}

//for sending mail

// const sendVerifyMail = async(name,email,user_id)=>{
//     try{
//         let transporter = nodemailer.createTransport({
//             host:'smtp.gmail.com',
//             port: 587,
//             secure: false,
//             auth: {
//                 user: 'laphq11@gmail.com',
//                 pass: 'vjzg bqmr njoi hhpe'
//             }
//         });

//         const mailOptions = {
//             from:'laphq11@gmail.com',
//             to:email,
//             subject: 'Verify Your Email Address',
//             html: `
//                 <p>Hello ${name},</p>
//                 <p>Please click the following link to verify your email address:</p>
//                 <a href="http://127.0.0.1:5000/verify?id=${user_id}">Verify</a>
//             ` 
//         }
//         transporter.sendMail(mailOptions,function(error,info){
//             if(error){
//                 console.log(error)
//             }else{
//                 console.log('email has been sent:' ,info.response)
//             }
//         })
//     }catch(error){
//         console.log(error.message)
//     }
// }

const Product = require('../model/productModel');

let homepage = async(req,res)=>{
    try{
        // let userName = await User.findOne({name:name})
        const featuredProducts = await Product.find({ isDeleted:false });
        const bestSellers = await Product.find({ isBestSeller: true });
        
        const calculateDiscount = (price, oldPrice) => {
            return ((oldPrice - price) / oldPrice * 100).toFixed(2);
        };

        const featuredProductsWithDiscount = featuredProducts.map(product => {
            const discountPercentage = calculateDiscount(product.price, product.oldPrice);
            return { ...product._doc, discountPercentage };
        });

        let userDataName = req.body.name;
        let result = await res.render('home',{req:req,userDataName,featuredProducts:featuredProductsWithDiscount,bestSellers});
        return result;
    }catch(err){
        console.log("error",err);
    }
}

let loadregister = async(req,res)=>{
    try{
         res.render('registration')
    }catch(error){
        console.log(error.message);
    }
}

let loadLogin = async(req,res)=>{
    try{
         res.render('login')
    }catch(error){
        console.log(error.message);
    }
}

let insertUser = async(req,res)=>{
    try{
        
        const { name, email, mobile, password, confirm_password } = req.body;

        // Validate email format
        if (!validator.isEmail(email)) {
            return res.render('registration', { emailval: '*Invalid email address' });
        }

        // Validate password length
        if (!validator.isLength(password, { min: 8 })) {
            return res.render('registration', { passval: '*Password must be at least 8 characters long' });
        }

        // Validate password and confirm_password match
        if (password !== confirm_password) {
            return res.render('registration', { password_message: '*Passwords do not match' });
            
        }

        let existingUser = await User.findOne({email:email})
        if(existingUser){
            return res.render('registration',{emailError:'*Email already registered'})
        }
        let otp = generateOtp();
        let spassword = await securePassword(req.body.password)
        let user = new User({
            name:req.body.name,
            email:req.body.email,
            mobile:req.body.mobile,
            password:spassword,
            is_admin:0
        })
        console.log(otp)
        let userData = await user.save()
        if(userData){
            
            req.session.otp = otp;
            req.session.email = email;
            sendOtp(req.body.email,otp);
            res.redirect('/otp')
            // await User.updateOne({_id: userData._id}, {$set: {otp: otp}});
            // sendOtp(req.body.email, otp);
            // res.redirect('/otp')
            
            // sendVerifyMail(req.body.name, req.body.email,userData._id)
            // res.render('registration',{message:'registered successfully'})
        }else{
            res.render('registration',{message:'registration failed'})
        }
    }catch(error){
        console.log("userData error",error.message)
    }
}

let verifyMail = async(req,res)=>{
    try{
        let updateInfo = await User.updateOne({_id:req.query.id},{$set:{is_verified:1}})
        console.log(updateInfo);
        res.render('email-verified')
    }catch(error){
        console.log(error.message)
    }
}
let verifyLogin = async(req,res)=>{
    try{
        let email = req.body.email
        let password = req.body.password
        let userData = await User.findOne({email:email})

        if(userData){
            let passwordMatch = await bcrypt.compare(password,userData.password)

            if(userData.isBlocked){
                return res.render('login',{message:'You have been blocked!.'})
            }

            if(passwordMatch){
                if(userData.is_verified === 0){
                    res.render('login',{message:'please verify your verification mail'})
                }else{
                    req.session.user_id = userData._id;
                   
                    req.session.userName = userData.name;
                    res.redirect('/home')
                }
            }else{
                res.render('login',{message:'Email or password is incorrect'})  
            }
        }else{
            res.render('login',{message:'Email or password is incorrect'})
        }


    }catch(error){
        console.log(error.message)
    }
}

let userLogout = async(req,res)=>{
    try{
        req.session.user_id = false
        res.redirect('/login')
    }catch(error){
        console.log(error.message)
    }
}

let loadShop = async(req,res)=>{
    try{
        const featuredProducts = await Product.find({ isDeleted:false });
        const bestSellers = await Product.find({ isBestSeller: true });
        
        const calculateDiscount = (price, oldPrice) => {
            return ((oldPrice - price) / oldPrice * 100).toFixed(2);
        };

        const featuredProductsWithDiscount = featuredProducts.map(product => {
            const discountPercentage = calculateDiscount(product.price, product.oldPrice);
            return { ...product._doc, discountPercentage };
        });

        res.render('shopPage',{req:req,featuredProducts:featuredProductsWithDiscount,bestSellers})
    }catch(error){
        console.log(error.message)
    }
}

let resendOtp = async (req, res) => {
    try {
        const otp = generateOtp();
        console.log(otp)
        const email = req.session.email;

        if (!email) {
            return res.json({ success: false, error: 'User email not found' });
        }

        req.session.otp = otp;
        req.session.otpTimeout = Date.now() + (30 * 1000); // Set the new OTP timeout
        req.session.otpExpiry = Date.now() + (5 * 60 * 1000); // Set the new OTP timeout

        sendOtp(email, otp);

        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, error: 'Failed to resend OTP' });
    }
}

let loadOtp = async(req,res)=>{
    try{
        const otpTimeout = Date.now() + (30 * 1000)
        const otpExpiry = Date.now() + (5 * 60 * 1000)
        req.session.otpTimeout = otpTimeout
        req.session.otpExpiry = otpExpiry
        res.render('otpVerification',{otpTimeout})
    }catch(error){
        console.log(error.message)
    }
}

let verifyOtp = async (req, res) => {
    try {
        const { otp} = req.body;
        const user = await User.findOne({email:req.session.email});

        if (!user) {
            return res.render('otpVerification', { message: 'User not found', otpTimeout: req.session.otpTimeout});
        }

        if (!req.session.otp || req.session.otp !== otp) {
            return res.render('otpVerification', { message: 'Invalid OTP', otpTimeout: req.session.otpTimeout });
        }

        if (Date.now() > req.session.otpExpiry) {
            return res.render('otpVerification', { message: 'OTP has expired. Resend new one', otpTimeout: req.session.otpTimeout });
        }

        await User.updateOne({ _id: user._id }, { $set: { is_verified: 1, otp: null } });
        delete req.session.otp;
        delete req.session.otpExpiry;
        delete req.session.otpTimeout;
        
        res.redirect('/login');
    } catch (error) {
        console.log(error.message);
    }
}




let loadAccount = async(req,res)=>{
    try {
        let userId = req.session.user_id
        let orderData = await Order.find({ user: userId })
            .populate('user')
            .populate('shippingAddress')
            .populate('items.product')

            console.log('heloooooo',orderData)

        let addressData = await Address.find({user:req.session.user_id})
        let userData=await User.findById(req.session.user_id)
        console.log(userData);
        console.log('hiiii',addressData);
        res.render('accountDetails',{req:req,addressData:addressData,userData:userData,orderData:orderData})
    } catch (error) {
        console.log(error.message);
    }
}


let productDetail = async(req,res)=>{
    try {
        let productId = req.query.id;
        console.log(productId)
        let product = await Product.findById(productId)

        if(!product){
            return res.status(404).send('product not found')
        }

        const calculateDiscount = (price, oldPrice) => {
            return ((oldPrice - price) / oldPrice * 100).toFixed(0);
        };

        const discountPercentage = calculateDiscount(product.price, product.oldPrice,product);
        const ProductsWithDiscount = {...product._doc,discountPercentage}

        res.render('productPage',{req:req,product:ProductsWithDiscount})
    } catch (error) {
        console.log(error.message)
    }
}

let loadEmailVerification = async(req,res)=>{
    try {
        res.render('emailVerification')
    } catch (error) {
        console.log(error.message)
    }
}

let loadForgotOtp = async(req,res)=>{
    try {
        const otpTimeout = Date.now() + (30 * 1000)
        req.session.otpTimeout = otpTimeout
        res.render('forgotOtp',{otpTimeout})
    } catch (error) {
        console.log(error.message)
    } 
}

let forgotOtpVerification = async(req,res)=>{
    try {

        const { otp} = req.body;
        const user = await User.findOne({email:req.session.email});

        if (!user) {
            return res.render('forgotOtp', { error: 'User not found', otpTimeout: req.session.otpTimeout});
        }

        if (!req.session.otp || req.session.otp !== otp) {
            return res.render('forgotOtp', { error: 'Invalid OTP', otpTimeout: req.session.otpTimeout });
        }

        res.redirect('/password-change');

        delete req.session.otp;
        
        

    } catch (error) {
        console.log(error.message)
    }
}

let emailVerification = async(req,res)=>{
    try {
        
        let userEmail = req.body.email;
        let checkEmail = await User.findOne({email:userEmail})
        
        if(checkEmail){
            let otp = generateOtp();
            console.log(otp)
            req.session.otp = otp;
            req.session.email = userEmail;
            sendOtp(checkEmail.email,otp);
            res.redirect('/forgotOtp')
        }else{
            res.render('emailVerification',{error:'email does not exist'})
        }
    } catch (error) {
        console.log(error.message)
    }
}

let ForgotresendOtp = async (req, res) => {
    try {
        const otp = generateOtp();
        console.log(otp)
        const email = req.session.email;

        if (!email) {
            return res.json({ success: false, error: 'User email not found' });
        }

        req.session.otp = otp;
        req.session.otpTimeout = Date.now() + (30 * 1000); // Set the new otp timeout

        sendOtp(email, otp);

        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, error: 'Failed to resend OTP' });
    }
}

let loadpasswordChange = async(req,res)=>{
    try {
        res.render('password-change')
    } catch (error) {
        console.log(error.message)
    }
}

let changePassword = async (req, res) => {
    try {
      const { password, Confirmpassword } = req.body;
  
      
      if (!validator.isLength(password, { min: 8 })) {
        return res.render('password-change', { message: 'Password must be at least 8 characters long' });
      }
  
      if (password !== Confirmpassword) {
        return res.render('password-change', { message: 'Passwords do not match' });
      }
  
      const user = await User.findOne({ email: req.session.email });
  
      if (!user) {
        return res.render('password-change', { message: 'User not found' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword , is_verified: 1} });
      console.log('password changed successfully')
      res.redirect('/login')
    } catch (error) {
      console.log(error.message);
      res.render('password-change', { message: 'Error changing password' });
    }
  };


  let saveAddress = async (req, res) => {
    try {
        const { addressType, addressLine1, addressLine2, city, state, zipCode } = req.body;
        console.log(addressType, addressLine1, addressLine2, city, state, zipCode);

        let userId = req.session.user_id;
        console.log(userId)

        if (!userId) {
            return res.status(400).send({ message: 'User ID not found in session' });
        }

        let userData = await User.findById(userId);
        console.log(userData);
        if (!userData) {
            return res.status(404).send({ message: 'User not found' });
        }

        let address = new Address({
            user:userData._id,
            addressType:addressType,
            addressLine1:addressLine1,
            addressLine2:addressLine2,
            city:city,
            state:state,
            zipCode:zipCode
        });

        // Save the address
        let savedAddress = await address.save();

        // Update the user's addresses
        userData.addresses.push(savedAddress._id);
        await userData.save();

        

        res.status(200).send({ message: 'Address saved successfully', address: savedAddress });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: 'Failed to save address', error: error.message });
    }
};

const updateAddress = async (req, res) => {
    try {
        const addressId = req.params.addressId;
        const { addressType, addressLine1, addressLine2, city, state, zipCode } = req.body;

        // Update the address in the database
        const updatedAddress = await Address.findByIdAndUpdate(
            addressId,
            { addressType, addressLine1, addressLine2, city, state, zipCode },
            { new: true }
        );

        res.status(200).json(updatedAddress);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Failed to update address' });
    }
};


const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.addressId;

        // Delete the address from the database
        await Address.findByIdAndDelete(addressId);

        res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Failed to delete address' });
    }
}

const updateProfile = async(req,res) =>{
    try{
        // console.log('hiiiii');
        let {dname,number} = req.body;
        let userId = req.session.user_id;
        let userData = await User.findById(userId)
        
        console.log(dname,number)

        if(!userId){
            res.status(400).send({message:'user not found in session'})
        }

        if(!userData){
            res.status(404).send({message:'user not found'})
        }

        userData.name = dname;
        userData.mobile = number;
        await userData.save();
        
        res.redirect('/account')
    }
    catch(error){
        console.log(error.message);
    }
}

let cancelOrder = async(req,res)=>{
    try {
        let {orderId} = req.body;
        let cancelOrder = await Order.findByIdAndUpdate(orderId,{orderStatus:'Cancelled'})

        if(cancelOrder){
            res.status(200).json({success:'order cancelled successfully'})
            console.log('order cancelled')
        }else{
            res.status(404).json({ success: false, message: 'Order not found' });
        }
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    homepage,
    loadregister,
    insertUser,
    loadLogin,
    verifyMail,
    verifyLogin,
    userLogout,
    loadShop,
    loadOtp,
    verifyOtp,
    loadAccount,
    resendOtp,
    productDetail,
    loadEmailVerification,
    emailVerification,
    loadForgotOtp,
    forgotOtpVerification,
    ForgotresendOtp,
    loadpasswordChange,
    changePassword,
    saveAddress,
    updateAddress,
    deleteAddress,
    updateProfile,
    cancelOrder
}