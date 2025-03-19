// models/Room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  features: [{ type: String }],
  meetings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' }],
  totalAvailableMinutes: { type: Number, default: 1440 }, // Single value, default to 24 hours
  availabilityPercentage: { type: Number, default: 100 }  // Single value, default to 100%
});

module.exports = mongoose.model('Room', roomSchema);