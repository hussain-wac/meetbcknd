//Models/Meeting.js

const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  organizer: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true }, 
  task: { type: String, required: true }, // Add task field
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  roomId: { type: String, required: true }, 
  email: { type: String, required: true }
});

module.exports = mongoose.model('Meeting', meetingSchema);
