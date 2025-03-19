//models/Room.js
const mongoose = require('mongoose');
const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  features: [{ type: String }], // e.g., ["Video", "Whiteboard"]
  meetings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' }],
  totalAvailableMinutes: { type: Number, default: 1440 },
  availabilityPercentage: { type: Number, default: 100 }
});

module.exports = mongoose.model('Room', roomSchema);
