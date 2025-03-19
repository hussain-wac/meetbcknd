const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  meetings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' }],
  totalAvailableMinutes: { type: Number, default: 1440 }, // Store available minutes in a day
  availabilityPercentage: { type: Number, default: 100 } // Store availability percentage
});

module.exports = mongoose.model('Room', roomSchema);
