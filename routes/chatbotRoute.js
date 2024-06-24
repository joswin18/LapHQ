const express = require('express');
const app = express();
const chatbotRouter = require('../controller/chatbot');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views','./views/chatbot/')
// Serve static files
app.use(express.static('public'));

// Routes
app.use('/chat', chatbotRouter);

// Home page route
app.get('/', (req, res) => {
  // Assuming you have the home page content in a file called 'home.ejs'
  res.render('chat', { req:req });
});



module.exports = app;