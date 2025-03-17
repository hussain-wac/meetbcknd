// backend/controllers/meetingController.js
const Meeting = require('../models/Meeting');

// GET all meetings
exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find();
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create a new meeting
exports.createMeeting = async (req, res) => {
  const { title, start, end } = req.body;
  const meeting = new Meeting({ title, start, end });

  try {
    const newMeeting = await meeting.save();
    res.status(201).json(newMeeting);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
