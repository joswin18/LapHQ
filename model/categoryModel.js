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
    }
})

module.exports = mongoose.model('category',categorySchema )