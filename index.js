const express = require("express");
const app = express();
const path = require("path");
// const ejs = require("ejs")
const mongoose = require("mongoose");
const nocache = require('nocache')
require('dotenv').config();

const mongoDBUri = process.env.MONGODB_URI;

mongoose.connect(mongoDBUri)

app.use(nocache())

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }))

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views/user"))


const userRoute = require("./routes/userRoute")
app.use('/',userRoute);


const adminRoute = require('./routes/adminRoute')
app.use('/admin',adminRoute)

const chatbotRoute = require('./routes/chatbotRoute')
app.use('/chat',chatbotRoute)

app.get('*',function(req,res){
    res.render('404error')
})

app.listen(5000, () => {
    console.log("Server running at http://localhost:5000")
})

