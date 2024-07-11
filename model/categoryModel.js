let mongoose = require('mongoose')

let categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    deleted: {
        type: Boolean,
        default: false
    },
    offer: {
        percentage: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        startDate: {
            type: Date
        },
        endDate: {
            type: Date
        },
        active: {
            type: Boolean,
            default: false
        }
    }
})

module.exports = mongoose.model('category',categorySchema )