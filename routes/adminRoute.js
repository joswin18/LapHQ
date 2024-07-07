const express = require('express')
const adminAuth = require('../middlware/adminAuth')
const adminRoute = express();

const session =  require('express-session')
const config =require('../config/config')
adminRoute.use(session({secret:config.sessionSecret}))


const bodyParser = require('body-parser')

adminRoute.use(bodyParser.json())
adminRoute.use(bodyParser.urlencoded({extended:true}))

let multer = require('multer')
let path = require('path')

let storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,path.join(__dirname,'../public/productImages'));
    },
    filename:function(req,file,cb){
        let name = Date.now()+ '-' +file.originalname;
        cb(null,name)
    }
})

let upload = multer({storage:storage})

adminRoute.set('view engine','ejs')
adminRoute.set('views','./views/admin/')

const adminController = require('../controller/adminController')
const couponController = require('../controller/couponController')

adminRoute.get('/',adminAuth.islogout,adminController.loadLogin)
adminRoute.post('/',adminController.verifyLogin)
adminRoute.get('/home',adminAuth.islogin,adminController.loadDashboard)
adminRoute.get('/logout',adminAuth.islogin,adminController.logout)


adminRoute.get('/userList',adminAuth.islogin,adminController.loadUserList)
adminRoute.get('/productListing',adminAuth.islogin,adminController.loadproductListing)
adminRoute.get('/AddProducts',adminAuth.islogin,adminController.loadAddProducts)
adminRoute.post('/AddProducts',upload.array('image',5),adminController.addProducts)
adminRoute.get('/deleteProduct/:id',adminController.deleteProduct)
adminRoute.get('/restoreProduct/:id',adminController.restoreProduct)

adminRoute.get('/block-user',adminController.blockUser)

adminRoute.get('/category',adminAuth.islogin,adminController.loadCategory)
adminRoute.post('/category',adminController.insertCategory)
adminRoute.get('/category/delete/:id', adminController.softDeleteCategory)

adminRoute.get('/editProduct',adminAuth.islogin, adminController.editLoad)
adminRoute.post('/updateProduct',upload.array('image',5), adminController.updateProduct);
adminRoute.get('/categoryEdit',adminAuth.islogin,adminController.loadCategoryEdit)
adminRoute.post('/categoryEdit',adminController.categoryEdit)
adminRoute.get('/orderList',adminAuth.islogin,adminController.loadOrderManagement)
adminRoute.get('/orderDetails',adminAuth.islogin,adminController.loadOrderDetails)
adminRoute.post('/updateOrderStatus',adminController.updateOrderStatus)

adminRoute.get('/couponManagement',adminAuth.islogin,couponController.loadCouponManagement)
adminRoute.post('/coupons',couponController.createCoupon)
adminRoute.get('/coupons/delete/:id',couponController.deleteCoupon)
adminRoute.get('/coupons/restore/:id',couponController.restoreCoupon)
adminRoute.post('/coupons/update', couponController.updateCoupon)

adminRoute.get('/salesReport',adminAuth.islogin,adminController.loadSalesReport)
adminRoute.get('/salesReport/download',adminAuth.islogin,adminController.downloadSalesReport)

module.exports = adminRoute;
