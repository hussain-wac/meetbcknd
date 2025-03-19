const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Route to get available slots for a room on a specific date
router.get('/:roomId/:date', roomController.getAvailableSlots);

module.exports = router;
