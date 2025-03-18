const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  meetings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' }] // Store meeting references here
});

module.exports = mongoose.model('Room', roomSchema);
