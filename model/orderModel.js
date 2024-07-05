const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Deleted', 'Returned'],
        default: 'Pending',
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            default: 1
        },
        subTotal: {
            type: Number,
            required: true,
        }
    }],
    billTotal: {
        type: Number,
        required: true
    },
    shippingAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Success', 'Failed', 'Refunded'],
        default: 'Pending',
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
    shippingCharge: {
        type: Number,
        default: 0
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    couponCode: {
        type: String,
        default: null
    },
    discount: {
        type: Number,
        default: 0
    },returnReason: {
        type: String,
        default: null
    },
    returnDescription: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Order', orderSchema);