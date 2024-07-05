const User = require('../model/userModel')
const Product = require('../model/productModel')

const bcrypt = require('bcrypt')
const sharp = require('sharp')
const path = require('path')
const Order = require('../model/orderModel')
const Coupon = require('../model/couponModel');
const validator = require('validator')


const loadLogin = async(req,res)=>{
    try{
        return res.render('login')
    }catch(error){
        console.log(error.message)
    }
}

const verifyLogin = async(req,res)=>{
    try {
        const email = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({email:email})
        if(userData){
            const passwordMatch = await bcrypt.compare(password,userData.password)
            if(passwordMatch){
                if(userData.is_admin === 0){
                    res.render('login',{message:'Email and password is incorrect'})
                }else{
                    req.session.admin_id = userData._id;
                    res.redirect('/admin/home')
                }
            }else{
                res.render('login',{message:'Email and password is incorrect'})
            }

        }else{
            res.render('login',{message:'Email and password is incorrect'})
        }
    } catch (error) {
        console.log(error.message)
    }
}

const loadDashboard = async(req,res)=>{
    try {
        res.render('home')
    } catch (error) {
        console.log(error.message)
    }
}


const logout = async(req,res)=>{
    try {
       req.session.admin_id = null
       res.redirect('/admin')
    } catch (error) {
        console.log(error.message)
    }
}

const loadUserList = async(req,res)=>{
    try {
        let usersData = await User.find({is_admin:0})
        res.render('userList',{users:usersData})
    } catch (error) {
        console.log(error.message)
    }
}

let loadproductListing = async(req,res)=>{
    try {
        let filter = req.query.filter || 'default';

        // let productData = await Product.find({isDeleted: false})
        let productData;

        let deletedProducts = await Product.find({isDeleted: true})

        switch(filter) {
            case 'newArrivals':
                productData = await Product.find({isDeleted: false}).sort({createdAt: -1});
                break;
            case 'aAtoZZ':
                productData = await Product.find({isDeleted: false}).collation({locale: 'en', strength: 2}).sort({name: 1});
                break;
            case 'zZtoAA':
                productData = await Product.find({isDeleted: false}).collation({locale: 'en', strength: 2}).sort({name: -1});
                break;
            default:
                productData = await Product.find({isDeleted: false});
        }
        res.render('productListing',{products:productData, deletedProducts:deletedProducts , currentFilter:filter})
    } catch (error) {
        console.log(error.message)
    }
}

let Category = require('../model/categoryModel')
// const { log } = require('console')

let loadAddProducts = async(req,res)=>{
    try {
        let categoryData = await Category.find({})
        res.render('addProduct',{categoryData:categoryData})
    } catch (error) {
        console.log(error.message)
    }
}

let addProducts = async(req,res)=>{

    const { name, brandName, description, price, oldPrice, category, stock } = req.body;
    console.log(name, brandName, description, price, oldPrice, category );
    let categoryData = await Category.find({})

        
        if (!name || !brandName || !description || !price || !category) {
            return res.render('addProduct', { error: 'Please fill in all required fields' ,categoryData:categoryData});
        }

        
        if (!validator.isLength(name, { min: 3, max: 50 })) {
            return res.render('addProduct', { error: 'Product name should be between 3 and 50 characters',categoryData:categoryData });
        }

        if (!validator.isLength(brandName, { min: 2, max: 30 })) {
            return res.render('addProduct', { error: 'Brand name should be between 2 and 30 characters' ,categoryData:categoryData});
        }

        
        if (!validator.isLength(description, { min: 10, max: 1000 })) {
            return res.render('addProduct', { error: 'Description should be between 10 and 1000 characters',categoryData:categoryData });
        }

        
        if (!validator.isFloat(price, { min: 0.01 })) {
            return res.render('addProduct', { error: 'Price should be a valid number greater than 0' ,categoryData:categoryData});
        }

        
        if (oldPrice && !validator.isFloat(oldPrice, { min: 0.01 })) {
            return res.render('addProduct', { error: 'Regular price should be a valid number greater than 0' ,categoryData:categoryData});
        }

    try {
        const images = [];
        // const hoverImage = req.files[0].filename;
    
        for (const file of req.files) {
          const resizedImage = await sharp(path.join(__dirname, '../public/productImages', file.filename))
            .resize(1000, 1000)
            .toFile(path.join(__dirname, '../public/productImages', 'resized-' + file.filename));
    
          images.push('resized-' + file.filename);
        }
        console.log(images)

        let product = new Product({
            name,
            brandName,
            description,
            category,
            defaultImg: images,
            hoverImg: images[0],
            price,
            oldPrice,
            isFeatured: true,
            stock
        });

        let productsData = await product.save()

        if(productsData){
            console.log("if");
            res.redirect('/admin/productListing')
        } else {
            console.log("elses");
            res.render('addProduct', { error: 'Error occurred while adding the product',categoryData:categoryData })
        }

    } catch (error) {
        console.log(error.message)
    }
}

// let deleteProduct = async(req,res)=>{
//     try {
//         let productId = req.params.id;

//         let deletedProduct = await Product.findByIdAndDelete(productId)

//         if(deletedProduct) {
//             res.redirect('/admin/productListing')
//         }else{
//             res.render('productListing',{error:'Product not found'})
//         }

//     } catch (error) {
//         console.log(error.message)
//         res.render('productListing', { error: 'An error occurred while deleting the product' })        
//     }
// }

let deleteProduct = async(req,res)=>{
    try {
        let productId = req.params.id;

        let deleteProduct = await Product.findByIdAndUpdate(productId,{isDeleted:true})

        if(deleteProduct){
            res.redirect('/admin/productListing')
        }else{
            res.render('productListing',{error:'Product not found'})
        }
    } catch (error) {
        console.log(error.message)
    }
}

let restoreProduct = async(req,res)=>{
    try {
        let productId = req.params.id;

        let restoredProduct = await Product.findByIdAndUpdate(productId,{isDeleted:false},{new:true})

        if(restoredProduct){
            res.redirect('/admin/productListing')
        }else{
            res.render('productListing',{error:'product not found'})
        }

    } catch (error) {
        console.log(error.message)
    }
}


let blockUser = async (req, res) => {
    try {
        const userId = req.query.id;

        const user = await User.findById(userId);

        if (user) {
            const isBlocked = user.isBlocked || false;

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { isBlocked: !isBlocked },
                { new: true }
            )
            
            req.session.user_id = false

            res.redirect('/admin/userList');
        } else {
            res.render('userList', { error: 'User not found' });
        }
    } catch (error) {
        console.log(error.message);
        res.render('userList', { error: 'An error occurred while updating the user status' });
    }
};



let loadCategory = async(req,res)=>{
    try {
        let categoryData = await Category.find({deleted:false})
        res.render('category',{categoryData:categoryData})


    } catch (error) {
        console.log(error.message)
    }
}



let insertCategory = async(req,res)=>{
    try {
        let {name,description} = req.body;

        if (validator.isEmpty(name) || validator.isEmpty(description)) {
            let categoryData = await Category.find({ deleted: false });
            return res.render('category', { error: 'Name and description are required', categoryData });
        }

        if (!validator.isLength(name, { min: 3, max: 50 })) {
            let categoryData = await Category.find({ deleted: false });
            return res.render('category', { error: 'Name must be between 3 and 50 characters', categoryData });
        }

        if (!validator.isLength(description, { min: 10, max: 200 })) {
            let categoryData = await Category.find({ deleted: false });
            return res.render('category', { error: 'Description must be between 10 and 200 characters', categoryData });
        }

        let lowerCaseName = name.toLowerCase();

        let existingCategory = await Category.findOne({ name: { $regex: new RegExp('^' + lowerCaseName + '$', 'i') }, deleted: false });
        // if(existingCategory){
        //     // let caseInsensitive = categoryData.toLowerCase()
        //     let categoryData = await Category.find({ deleted: false })
            
        // }

        if (existingCategory) {
            let categoryData = await Category.find({ deleted: false })
            return res.render('category',{ error: 'Category already exists',categoryData });
        }

        let category = new Category({
            name:name,
            description:description
        })

        let categoryData = await category.save()



        if(categoryData){
            res.redirect('category')
        }

    } catch (error) {
        console.log(error.message)
    }
}

let softDeleteCategory = async (req, res) => {
    try {
        let categoryId = req.params.id;

        let deleteCategory = await Category.findByIdAndUpdate(categoryId,{deleted:true})
        if(deleteCategory){
            res.redirect('/admin/category')
        }else{
            res.render('category',{error:'category not found'})
        }        
    } catch (error) {
        console.log(error.message);
    }
};



let editLoad = async (req, res) => {
    try {
        console.log('editLoad function called'); 

        let id = req.query.id;
        let productData = await Product.findById({ _id: id });
        console.log('productData:', productData);

        if (productData) {
            let categoryData = await Category.find({});
            res.render('productEdit', { productData: productData, categoryData: categoryData });
        } else {
            res.redirect('/admin/productListing');
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/admin/productListing');
    }
};

let updateProduct = async (req, res) => {
    try {
        const { id, name, brandName, description, price, oldPrice, category, stock} = req.body;
        const updatedProduct = await Product.findById(id);
        const categoryData = await Category.find({deleted:false});

        if (!name || !brandName || !description || !price || !category) {
            return res.render('productEdit', { error: 'Please fill in all required fields', productData: updatedProduct, categoryData: categoryData });
        }

        if (!validator.isLength(name, { min: 3, max: 50 })) {
            return res.render('productEdit', { error: 'Product name should be between 3 and 50 characters', productData: updatedProduct, categoryData: categoryData });
        }

        if (!validator.isLength(brandName, { min: 2, max: 30 })) {
            return res.render('productEdit', { error: 'Brand name should be between 2 and 30 characters', productData: updatedProduct, categoryData: categoryData });
        }

        if (!validator.isLength(description, { min: 10, max: 1000 })) {
            return res.render('productEdit', { error: 'Description should be between 10 and 1000 characters', productData: updatedProduct, categoryData: categoryData });
        }

        if (!validator.isFloat(price, { min: 0.01 })) {
            return res.render('productEdit', { error: 'Price should be a valid number greater than 0', productData: updatedProduct, categoryData: categoryData });
        }

        if (oldPrice && !validator.isFloat(oldPrice, { min: 0.01 })) {
            return res.render('productEdit', { error: 'Regular price should be a valid number greater than 0', productData: updatedProduct, categoryData: categoryData });
        }

        if (updatedProduct) {
            updatedProduct.name = name;
            updatedProduct.brandName = brandName;
            updatedProduct.description = description;
            updatedProduct.price = price;
            updatedProduct.oldPrice = oldPrice;
            updatedProduct.category = category;
            updatedProduct.stock = stock;

            if (req.files && req.files.length > 0) {
                const newImages = [];
                for (const file of req.files) {
                    const resizedImage = await sharp(path.join(__dirname, '../public/productImages', file.filename))
                        .resize(1000, 1000)
                        .toFile(path.join(__dirname, '../public/productImages', 'resized-' + file.filename));
                    newImages.push('resized-' + file.filename);
                }
                updatedProduct.defaultImg = [...updatedProduct.defaultImg, ...newImages];
            }

            const savedProduct = await updatedProduct.save();

            if (savedProduct) {
                res.redirect('/admin/productListing');
            } else {
                res.render('productEdit', { error: 'Error occurred while updating the product', productData: updatedProduct, categoryData: categoryData });
            }
        } else {
            res.render('productEdit', { error: 'Product not found', categoryData: categoryData });
        }
    } catch (error) {
        console.log(error.message);
    }
}

let loadCategoryEdit = async(req,res)=>{
    try {
        let categoryId = req.query.id;

        console.log(categoryId)

        let categoryData = await Category.findById({_id:categoryId})
        res.render('categoryEdit',{categoryData})
    } catch (error) {
        console.log(error.message)
    }
}

let categoryEdit = async(req,res)=>{
    try {
        let {name,description} = req.body;
        let id = req.query.id

        if (validator.isEmpty(name) || validator.isEmpty(description)) {
            let categoryData = await Category.find({ deleted: false });
            return res.render('category', { error: 'Name and description are required', categoryData });
        }

        if (!validator.isLength(name, { min: 3, max: 50 })) {
            let categoryData = await Category.find({ deleted: false });
            return res.render('category', { error: 'Name must be between 3 and 50 characters', categoryData });
        }

        if (!validator.isLength(description, { min: 10, max: 200 })) {
            let categoryData = await Category.find({ deleted: false });
            return res.render('category', { error: 'Description must be between 10 and 200 characters', categoryData });
        }

        let existingCategory = await Category.findOne({ name: name, deleted: false })

        if (existingCategory) {
            let categoryData = await Category.find({ deleted: false })
            return res.render('category',{ error: 'Category already exists',categoryData });
        }


        let updatedCategory = await Category.findByIdAndUpdate({_id:id},{
            name:name,
            description:description
        })
        if(updatedCategory){
            res.redirect('/admin/category')
        }
    } catch (error) {
        console.log(error.message  )
    }
}

let loadOrderManagement = async(req,res)=>{
    try {
        // let order = await Order.findById({userId:userData._id})

        let orderData = await Order.find({})
            .populate('user')
            .populate('shippingAddress')
            .populate('items.product')

        res.render('orderManagement',{orderData})
    } catch (error) {
        console.log(error.message)
    }
}

let loadOrderDetails = async(req,res)=>{
    try {
        let orderId = req.query.orderId;

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order ID is missing' });
        }

        let order = await Order.findOne({ orderId: orderId })
            .populate('user')
            .populate('shippingAddress')
            .populate('items.product');

        res.render('orderDetails',{order:order})
    } catch (error) {
        console.log(error.message);
    }
}

let updateOrderStatus = async(req,res) => {
    try {
        const { orderId, orderStatus } = req.body;
        let updateStatus = await Order.findByIdAndUpdate(orderId, { orderStatus: orderStatus });

        if(updateStatus){
            // res.status(200).json({ message: 'Order status updated successfully' });
            return res.redirect('/admin/orderList')
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

let loadSalesReport = async(req,res)=>{
    try {
        let orderDetails = await Order.find({ orderStatus: 'Delivered' }).populate('user')

        console.log(orderDetails.orderId)
        console.log(orderDetails)
        res.render('salesReport',{orderDetails:orderDetails})
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    loadLogin,
    verifyLogin,
    loadDashboard,
    logout,
    loadUserList,
    loadproductListing,
    loadAddProducts,
    addProducts,
    deleteProduct,
    restoreProduct,
    blockUser,
    loadCategory,
    insertCategory,
    editLoad,
    updateProduct,
    softDeleteCategory,
    loadCategoryEdit,
    categoryEdit,
    loadOrderManagement,
    loadOrderDetails,
    updateOrderStatus,
    loadSalesReport
}