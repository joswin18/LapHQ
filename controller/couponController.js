const Coupon = require('../model/couponModel');
const Cart = require('../model/cartModel');

let loadCouponManagement = async(req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit);

        let coupons = await Coupon.find({})
            .skip(skip)
            .limit(limit);

            res.render('couponManagement', { coupons,currentPage:page,totalPages:totalPages});
    } catch (error) {
        console.log(error.message)
    }
}

let createCoupon = async(req,res)=>{
    try {
        const newCoupon = new Coupon(req.body);
        await newCoupon.save();
        return res.redirect('/admin/couponManagement');
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {  
            res.status(400).json({ message: 'Coupon already exists' });
        } else {
            res.status(500).json({ message: 'Server Error' });
        }
    }
    
}

let deleteCoupon  = async(req,res)=>{
    try {
        let couponId = req.params.id;
        let deleteCoupon = await Coupon.findByIdAndUpdate({_id:couponId},{$set:{isActive:false}})
        if(deleteCoupon){
            res.redirect('/admin/couponManagement')
        }
    } catch (error) {
        console.log(error.message)
    }
}

let restoreCoupon = async(req,res)=>{
    try {
        let couponId = req.params.id;
        let restoreCoupon = await Coupon.findByIdAndUpdate({_id:couponId},{$set:{isActive:true}})
        if(restoreCoupon){
            res.redirect('/admin/couponManagement')
        }
    } catch (error) {
        console.log(error.message)
    }
}

let updateCoupon = async (req, res) => {
    try {
        const { couponId, code, discountPercentage, minimumPurchase,maximumPurchase, startDate, endDate, description } = req.body;
        await Coupon.findByIdAndUpdate(couponId, {
            code,
            discountPercentage,
            minimumPurchase,
            maximumPurchase,
            startDate,
            endDate,
            description
        });
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            res.status(400).json({ message: 'Coupon already exists' });
        } else {
            res.status(500).json({ message: 'Server Error' });
        }
    }
}

let applyCoupon = async(req,res)=>{
    try {
        let userId = req.session.user_id
        console.log(userId)
        console.log("coupon code ",req.body.couponCode)
        let couponCode = req.body.couponCode
        let discount = 0;
        let couponApplied = false;
        let cart = await Cart.findOne({userId:userId})

        if (couponCode) {
            
            const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
            if (!coupon) {
                return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
            }

            if (coupon.users.includes(userId)) {
                return res.status(400).json({ success: false, message: 'Coupon already applied' });
            }
            // const currentDate = new Date();
            // if (currentDate < coupon.startDate || currentDate > coupon.endDate) {
            //     return res.status(400).json({ success: false, message: 'Coupon not valid for current date' });
            // }
            if (cart.total < coupon.minimumPurchase) {
                return res.status(400).json({ success: false, message: 'Cart total does not meet the minimum purchase requirement' });
            }

            if(cart.total > coupon.maximumPurchase){
                return res.status(400).json({ success: false, message: 'Cart total does not meet the maximum purchase requirement' });
            }
            discount = (cart.total * coupon.discountPercentage) / 100;
            res.status(200).json({success:true,discount:discount,couponId:coupon._id})
            couponApplied = true;
        }

    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    loadCouponManagement,
    createCoupon,
    deleteCoupon,
    restoreCoupon,
    updateCoupon,
    applyCoupon
}