const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: [{
        type: {
            type: String,
            required: true
        },
        transationMode: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
    total:{
        type:Number,
        required:true,
        default:0
    }
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);