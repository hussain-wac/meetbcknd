const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Get all rooms with availability details for a given date
router.get('/availability/:date', roomController.getAllRoomsAvailability);

// Add a new room
router.post('/add', roomController.addRoom);

module.exports = router;
