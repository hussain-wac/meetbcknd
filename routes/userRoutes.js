const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route to search users by name
router.get('/search', userController.searchUsers);

// Route to add a new user
router.post('/', userController.addUser);

module.exports = router;