const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    brandName:{
        type:String,
        required: true
    },
    description:{
        type: String,
        required:true
    },
    category: {
        type: String,
        required: true
    },
    defaultImg: [{
        type: String,
        required: true
    }],
    hoverImg: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    oldPrice: {
        type: Number
    },
    discountedPrice: {
        type: Number
    },
    discountedOldPrice: {
        type: Number
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isBestSeller: {
        type: Boolean,
        default: false
    },
    isDeleted:{
        type:Boolean,
        default: false
    },
    stock:{
        type:Number,
        required:true,
        min:0
    }
});

module.exports = mongoose.model('Product', productSchema);
