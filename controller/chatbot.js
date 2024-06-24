const express = require('express');
const router = express.Router();
const { NlpManager } = require('node-nlp');
const path = require('path');

// Load the training data
const manager = new NlpManager({ languages: ['en'], forceNER: true });
const modelPath = path.join(__dirname, '../model/model.nlp');

console.log('Loading model from:', modelPath);
manager.load(modelPath);

router.post('/chat', async (req, res) => {
  try {
    console.log('Chat route accessed');
    const { message } = req.body;
    const response = await manager.process('en', message);
    console.log('Response from NLP model:', response);
    res.json({ answer: response.answer });
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ error: 'An error occurred while processing your message.' });
  }
});

module.exports = router;