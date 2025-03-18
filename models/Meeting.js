const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  organizer: { type: String, required: true },
  project: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  roomId: { type: String, required: true }, // Store room ID here
  email: { type: String, required: true }
});

module.exports = mongoose.model('Meeting', meetingSchema);
