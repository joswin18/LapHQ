const User = require('../model/userModel')
const Product = require('../model/productModel')

const bcrypt = require('bcrypt')
const sharp = require('sharp')
const path = require('path')
const Order = require('../model/orderModel')
const Coupon = require('../model/couponModel');
const validator = require('validator')
const PDFDocument = require('pdfkit-table');
const excel = require('excel4node');
const Category = require('../model/categoryModel')
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
        const totalRevenue = await Order.aggregate([
            { $match: { orderStatus: 'Delivered' } },
            { $group: { _id: null, total: { $sum: '$billTotal' } } }
        ]);

        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();
        const categoryCount = await Category.countDocuments();

        const orderData = await Order.aggregate([
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                count: { $sum: 1 },
                revenue: { $sum: '$billTotal' }
            }},
            { $sort: { _id: 1 } }
        ]);

        const bestSellingProducts = await Order.aggregate([
            { $unwind: "$items" },
            { $group: {
                _id: "$items.product",
                totalQuantity: { $sum: "$items.quantity" }
            }},
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
            { $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productDetails"
            }},
            { $unwind: "$productDetails" },
            { $project: {
                name: "$productDetails.name",
                totalQuantity: 1
            }}
        ]);

        const bestSellingCategories = await Order.aggregate([
            { $unwind: "$items" },
            { $lookup: {
                from: "products",
                localField: "items.product",
                foreignField: "_id",
                as: "product"
            }},
            { $unwind: "$product" },
            { $group: {
                _id: "$product.category",
                totalQuantity: { $sum: "$items.quantity" }
            }},
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);

        const bestSellingBrands = await Order.aggregate([
            { $unwind: "$items" },
            { $lookup: {
                from: "products",
                localField: "items.product",
                foreignField: "_id",
                as: "product"
            }},
            { $unwind: "$product" },
            { $group: {
                _id: "$product.brandName",
                totalQuantity: { $sum: "$items.quantity" }
            }},
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);

        res.render('home', {
            totalRevenue: totalRevenue[0]?.total || 0,
            totalOrders,
            totalProducts,
            categoryCount,
            orderData: orderData,
            bestSellingProducts,
            bestSellingCategories,
            bestSellingBrands
        });
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
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Number of users per page
        const skip = (page - 1) * limit;

        const totalUsers = await User.countDocuments({ is_admin: 0 });
        const totalPages = Math.ceil(totalUsers / limit);

        let usersData = await User.find({ is_admin: 0 })
            .skip(skip)
            .limit(limit);

        
        res.render('userList',{users:usersData,currentPage:page,totalPages:totalPages})
    } catch (error) {
        console.log(error.message)
    }
}

let loadproductListing = async(req,res)=>{
    try {
        let filter = req.query.filter || 'default';

        // let productData = await Product.find({isDeleted: false})
        let page = parseInt(req.query.page) || 1;
        let limit = 10;

        let query = {isDeleted: false};
        let sort = {};

        switch(filter) {
            case 'newArrivals':
                sort = {createdAt: -1};
                break;
            case 'aAtoZZ':
                sort = {name: 1};
                break;
            case 'zZtoAA':
                sort = {name: -1};
                break;
        }

        let totalProducts = await Product.countDocuments(query);
        let totalPages = Math.ceil(totalProducts / limit);

        let productData = await Product.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .collation({locale: 'en', strength: 2});

        let deletedProducts = await Product.find({isDeleted: true});
        res.render('productListing',{products:productData, deletedProducts:deletedProducts , currentFilter:filter, currentPage:page,totalPages:totalPages})
    } catch (error) {
        console.log(error.message)
    }
}


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

        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Number of orders per page
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        let orderData = await Order.find({})
            .populate('user')
            .populate('shippingAddress')
            .populate('items.product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('orderManagement',{orderData,currentPage:page,totalPages:totalPages})
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

const loadSalesReport = async (req, res) => {
    try {
        let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(0);
        let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

        endDate.setHours(23, 59, 59, 999);

        let filter = req.query.filter;
        if (filter) {
            let today = new Date();
            switch (filter) {
                case 'day':
                    startDate = new Date(today.setHours(0, 0, 0, 0));
                    break;
                case 'week':
                    startDate = new Date(today.setDate(today.getDate() - 7));
                    break;
                case 'month':
                    startDate = new Date(today.setMonth(today.getMonth() - 1));
                    break;
            }
        }

        let orderDetails = await Order.find({
            orderStatus: 'Delivered',
            orderDate: { $gte: startDate, $lte: endDate }
        }).populate('user');

        let overallSalesCount = orderDetails.length;
        let overallOrderAmount = orderDetails.reduce((total, order) => total + order.billTotal, 0);
        let overallDiscount = orderDetails.reduce((total, order) => total + order.discount, 0);

        res.render('salesReport',{
            orderDetails: orderDetails,
            overallSalesCount: overallSalesCount,
            overallOrderAmount: overallOrderAmount,
            overallDiscount: overallDiscount,
            startDate: startDate,
            endDate: endDate,
            filter: filter
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};


const generatePDF = async (res, orderDetails, totals) => {
    const doc = new PDFDocument();
    
    doc.pipe(res);
    
    doc.fontSize(18).text('Sales Report', {align: 'center'});
    doc.moveDown();
    
    doc.fontSize(14).text(`Total Sales: ${totals.overallSalesCount}`);
    doc.text(`Total Amount: $${totals.overallOrderAmount.toFixed(2)}`);
    doc.text(`Total Discount: $${totals.overallDiscount.toFixed(2)}`);
    doc.moveDown();
    

    const table = {
        headers: ['Order ID', 'User', 'Amount', 'Discount', 'Date', 'Payment Method'],
        rows: []
    };
    
    orderDetails.forEach(order => {
        table.rows.push([
            order.orderId,
            order.user.name,
            `$${order.billTotal.toFixed(2)}`,
            `$${order.discount.toFixed(2)}`,
            order.orderDate.toLocaleDateString(),
            order.paymentMethod
        ]);
    });
    
    doc.table(table, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
        prepareRow: (row, i) => doc.font('Helvetica').fontSize(10)
    });
    
    doc.end();
};

const generateExcel = async (res, orderDetails, totals) => {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');
    
    const style = workbook.createStyle({
        font: {
            bold: true,
            color: '#000000',
            size: 12,
        },
    });
    
    worksheet.cell(1, 1).string('Sales Report').style(style);
    worksheet.cell(2, 1).string(`Total Sales: ${totals.overallSalesCount}`).style(style);
    worksheet.cell(3, 1).string(`Total Amount: $${totals.overallOrderAmount.toFixed(2)}`).style(style);
    worksheet.cell(4, 1).string(`Total Discount: $${totals.overallDiscount.toFixed(2)}`).style(style);
    
    const headers = ['Order ID', 'User', 'Amount', 'Discount', 'Date', 'Payment Method'];
    headers.forEach((header, index) => {
        worksheet.cell(6, index + 1).string(header).style(style);
    });
    
    orderDetails.forEach((order, index) => {
        worksheet.cell(index + 7, 1).string(order.orderId);
        worksheet.cell(index + 7, 2).string(order.user.name);
        worksheet.cell(index + 7, 3).number(parseFloat(order.billTotal.toFixed(2)));
        worksheet.cell(index + 7, 4).number(parseFloat(order.discount.toFixed(2)));
        worksheet.cell(index + 7, 5).string(order.orderDate.toLocaleDateString());
        worksheet.cell(index + 7, 6).string(order.paymentMethod);
    });
    
    workbook.write('Sales Report.xlsx', res);
};

const downloadSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, format } = req.query;
        
        let orderDetails = await Order.find({
            orderStatus: 'Delivered',
            orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }).populate('user');

        let totals = {
            overallSalesCount: orderDetails.length,
            overallOrderAmount: orderDetails.reduce((total, order) => total + order.billTotal, 0),
            overallDiscount: orderDetails.reduce((total, order) => total + order.discount, 0)
        };

        if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
            await generatePDF(res, orderDetails, totals);
        } else if (format === 'excel') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
            await generateExcel(res, orderDetails, totals);
        } else {
            res.status(400).send('Invalid format specified');
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

let loadCategoryOffer = async(req,res)=>{
    try {
        let categoryId = req.query.id;
        let category = await Category.findById(categoryId);
        if(category){
            res.render('categoryOffer', { category: category });
        } else {
            res.redirect('/admin/category');
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/admin/category');
    }
}

const updateProductPricesForCategory = async (categoryId) => {
    try {
 
        const category = await Category.findById(categoryId);

        if (!category) {
            throw new Error('Category not found');
        }

        const products = await Product.find({ category: category.name });

        for (const product of products) {
            if (category.offer.active) {

                product.discountedPrice = product.price;
                product.discountedOldPrice = product.oldPrice;

                product.oldPrice = product.price;
                product.price = product.price - (product.price * (category.offer.percentage / 100));
            } else {

                if (product.oldPrice) {
                    product.price = product.discountedPrice;
                    product.oldPrice = product.discountedOldPrice;
                }
            }

            await product.save();
        }
    } catch (error) {
        console.error('Error updating product prices:', error);
    }
};

let addCategoryOffer = async (req, res) => {
    try {
        const { categoryId, offerPercentage, startDate, endDate } = req.body;
        const now = new Date();
        const offerStartDate = new Date(startDate);
        const offerEndDate = new Date(endDate);

        const offerData = {
            percentage: offerPercentage,
            startDate: offerStartDate,
            endDate: offerEndDate,
            active: now >= offerStartDate && now <= offerEndDate
        };

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { offer: offerData },
            { new: true, runValidators: true }
        );

        if (updatedCategory) {
            await updateProductPricesForCategory(categoryId);
            res.redirect('/admin/category');
        } else {
            res.render('categoryOffer', { error: 'Failed to add offer', category: await Category.findById(categoryId) });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

let deleteCategoryOffer = async (req, res) => {
    try {
        const categoryId = req.query.id;

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { $unset: { offer: "" } },
            { new: true }
        );

        if (updatedCategory) {
            await updateProductPricesForCategory(categoryId);
            res.redirect(`/admin/categoryOffer?id=${categoryId}`);
        } else {
            res.render('categoryOffer', { error: 'Failed to delete offer', category: await Category.findById(categoryId) });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

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
    loadSalesReport,
    downloadSalesReport,
    loadCategoryOffer,
    addCategoryOffer,
    deleteCategoryOffer
}