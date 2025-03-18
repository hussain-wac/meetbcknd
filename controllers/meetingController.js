const Meeting = require('../models/Meeting');
const Room = require('../models/Room');

// GET all meetings for a specific room
exports.getMeetings = async (req, res) => {
  const roomId = req.query.roomId; // Expecting roomId to be passed as a query parameter
  try {
    const room = await Room.findOne({ roomId }).populate('meetings');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room.meetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create a new meeting and add it to the appropriate room
exports.createMeeting = async (req, res) => {
  const { title, start, end, organizer, project, roomId, email } = req.body;

  // Create new meeting object
  const meeting = new Meeting({ title, start, end, organizer, project, roomId, email });

  try {
    // Save the meeting
    const newMeeting = await meeting.save();

    // Find or create the room and add the meeting to it
    let room = await Room.findOne({ roomId });

    if (!room) {
      // If room doesn't exist, create it
      room = new Room({ roomId, meetings: [newMeeting._id] });
    } else {
      // If room exists, push the meeting to the meetings array
      room.meetings.push(newMeeting._id);
    }

    // Save the room
    await room.save();
    res.status(201).json(newMeeting);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
