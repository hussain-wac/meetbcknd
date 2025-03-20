const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');

router.get('/', meetingController.getMeetings);
router.post('/', meetingController.createMeeting);
router.put('/:meetingId', meetingController.updateMeeting)

module.exports = router;
