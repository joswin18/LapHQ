
let User = require('../model/userModel')
let bcrypt = require('bcrypt')
const validator = require('validator');
const nodemailer = require('nodemailer')
const Address = require('../model/addressModel');
const Order = require('../model/orderModel');
let { generateOtp } = require('../otpUtils/otpGenerator');
let { sendOtp } = require('../otpUtils/insertOtp');
const crypto = require('crypto');
const Wallet = require('../model/walletModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const category = require('../model/categoryModel')


let securePassword = async(password)=>{
    try{
        let passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    }catch(error){
        console.log(error.message)
    }
}


const generateReferralCode = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
};


const addReferralBonus = async (userId, amount, type) => {
    const wallet = await Wallet.findOne({ user: userId });
    if (wallet) {
        wallet.balance += amount;
        wallet.total += amount;
        wallet.transactions.push({
            type: type,
            transationMode: 'Referral Bonus',
            amount: amount
        });
        await wallet.save();
    }
};
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
        // const bestSellers = await Product.find({ isBestSeller: true });
        let categories = await category.find({deleted:false})

        const calculateDiscount = (price, oldPrice) => {
            return ((oldPrice - price) / oldPrice * 100).toFixed(2);
        };

        const featuredProductsWithDiscount = featuredProducts.map(product => {
            const discountPercentage = calculateDiscount(product.price, product.oldPrice);
            return { ...product._doc, discountPercentage };
        });

        const bestSellingProducts = await Order.aggregate([
            { $unwind: "$items" },
            { $group: {
                _id: "$items.product",
                totalQuantity: { $sum: "$items.quantity" }
            }},
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);

        const bestSellingProductDetails = await Product.find({
            _id: { $in: bestSellingProducts.map(item => item._id) }
        });
        
        const bestSellingProductsWithDiscount = bestSellingProductDetails.map(product => {
            const discountPercentage = calculateDiscount(product.price, product.oldPrice);
            const quantityData = bestSellingProducts.find(item => item._id.toString() === product._id.toString());
            return { 
                ...product._doc, 
                discountPercentage,
                totalQuantitySold: quantityData ? quantityData.totalQuantity : 0
            };
        });

        let userDataName = req.body.name;
        let result = await res.render('home',{req:req,userDataName,featuredProducts:featuredProductsWithDiscount,bestSellers:bestSellingProductsWithDiscount,categories});
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
        
        const referralCode = generateReferralCode();

        let otp = generateOtp();
        let spassword = await securePassword(req.body.password)
        let user = new User({
            name:req.body.name,
            email:req.body.email,
            mobile:req.body.mobile,
            password:spassword,
            is_admin:0,
            referralCode: referralCode,
            referredBy: req.body.referralCode || null
        })
        console.log(otp)
        let userData = await user.save()

        if(userData){
            let wallet = new Wallet({
                user: userData._id,
                balance: 0,
                total: 0
            });
            await wallet.save();

            userData.wallet = wallet._id;
            await userData.save();
            
            if (userData.referredBy) {
                const referrer = await User.findOne({ referralCode: userData.referredBy });
                if (referrer) {
                    await addReferralBonus(referrer._id, 100, 'Referral Bonus Received');
                    await addReferralBonus(userData._id, 100, 'Signup Bonus');
                }
            }

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
       const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const sort = req.query.sort || 'featured';
        const category = req.query.category || '';

        let query = { isDeleted: false };
        if (category) {
            query.category = category;
        }

        let sortOption = {};
        switch (sort) {
            case 'price_asc':
                sortOption = { price: 1 };
                break;
            case 'price_desc':
                sortOption = { price: -1 };
                break;
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            default:
                sortOption = { isFeatured: -1 };
        }

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        const products = await Product.find(query)
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit);

        const categories = await Product.distinct('category');

        const calculateDiscount = (price, oldPrice) => {
            return ((oldPrice - price) / oldPrice * 100).toFixed(2);
        };

        const productsWithDiscount = products.map(product => {
            const discountPercentage = calculateDiscount(product.price, product.oldPrice);
            return { ...product._doc, discountPercentage };
        });

        res.render('shopPage', {
            req: req,
            products: productsWithDiscount,
            currentPage: page,
            totalPages: totalPages,
            sort: sort,
            category: category,
            categories: categories,
            limit: limit
        });
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
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ user: userId });
        
        let orderData = await Order.find({ user: userId })
            .populate('user')
            .populate('shippingAddress')
            .populate('items.product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

            console.log('heloooooo',orderData)

        let addressData = await Address.find({user:req.session.user_id})
        let userData=await User.findById(req.session.user_id)
        console.log(userData);
        console.log('hiiii',addressData);
        res.render('accountDetails',{req:req,addressData:addressData,userData:userData,orderData:orderData,currentPage: page,totalPages: Math.ceil(totalOrders / limit)})
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

        let savedAddress = await address.save();

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

const generateInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findOne({ orderId: orderId })
            .populate('user')
            .populate('shippingAddress')
            .populate('items.product');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const doc = new PDFDocument({ margin: 50 });
        const filename = `invoice-${orderId}.pdf`;

        res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // doc.image('/assets/imgs/theme/logo.svg', 50, 45, { width: 50 });

        doc.fontSize(20).text('Order Invoice', { align: 'center' });
        doc.moveDown();

        doc.fontSize(10);
        doc.text(`Invoice Number: ${order.orderId}`, 50, 100);
        doc.text(`Date: ${order.orderDate.toLocaleDateString()}`, 50, 115);
        doc.text(`Payment Method: ${order.paymentMethod}`, 50, 130);

        const invoiceTableTop = 160;
        doc.font('Helvetica-Bold');
        doc.text('Item', 50, invoiceTableTop);
        doc.text('Image', 200, invoiceTableTop);
        doc.text('Quantity', 300, invoiceTableTop);
        doc.text('Price', 400, invoiceTableTop);
        doc.text('Total', 500, invoiceTableTop);

        let tableTop = invoiceTableTop + 20;
        doc.font('Helvetica');

        for (const item of order.items) {
            const itemTotal = item.quantity * item.product.price;
            
            doc.text(item.product.name, 50, tableTop, { width: 140 });
            
            const imagePath = path.join(__dirname, '..', 'public', 'productImages', item.product.defaultImg[0]);
            if (fs.existsSync(imagePath)) {
                doc.image(imagePath, 200, tableTop - 10, { width: 30 });
            }
            
            doc.text(item.quantity.toString(), 300, tableTop);
            doc.text(`$${item.product.price.toFixed(2)}`, 400, tableTop);
            doc.text(`$${itemTotal.toFixed(2)}`, 500, tableTop);

            tableTop += 40;

            
            if (tableTop > 700) {
                doc.addPage();
                tableTop = 50;
            }
        }


        tableTop += 20;
        doc.font('Helvetica-Bold');
        doc.text('Shipping Address:', 50, tableTop);
        doc.font('Helvetica');
        doc.text(`${order.shippingAddress.addressLine1}`, 50, tableTop + 15);
        doc.text(`${order.shippingAddress.addressLine2}`, 50, tableTop + 30);
        doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`, 50, tableTop + 45);


        const totalsTop = tableTop + 80;
        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', 400, totalsTop);
        doc.text(`$${(order.billTotal + order.discount).toFixed(2)}`, 500, totalsTop);

        if (order.couponApplied) {
            doc.text(`Discount (${order.couponCode}):`, 400, totalsTop + 20);
            doc.text(`-$${order.discount.toFixed(2)}`, 500, totalsTop + 20);
        }

        doc.text('Shipping:', 400, totalsTop + 40);
        doc.text(`$${order.shippingCharge.toFixed(2)}`, 500, totalsTop + 40);

        doc.text('Total:', 400, totalsTop + 60);
        doc.text(`$${order.billTotal.toFixed(2)}`, 500, totalsTop + 60);

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate invoice' });
    }
};
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
    generateInvoice
}