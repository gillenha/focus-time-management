const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');

// Quote routes
router.get('/', quoteController.getQuotes);
router.post('/', quoteController.addQuote);
router.delete('/:id', quoteController.deleteQuote);

module.exports = router; 