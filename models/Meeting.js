// Models/Meeting.js
const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  organizer: { type: String, required: true },
  members: [{ type: String, required: true }],
  meetingType: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  roomId: { type: String, required: true },
  email: { type: String, required: true },
  status: {
    type: String,
    enum: ['upcoming', 'running', 'completed'],
    default: 'upcoming',
    required: true
  }
});

module.exports = mongoose.model('Meeting', meetingSchema);