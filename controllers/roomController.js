// controllers/roomController.js
const Room = require('../models/Room');

// Function to get all rooms with stored availability details
exports.getAllRoomsAvailability = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ message: err.message });
  }
};

// Function to add a new room
exports.addRoom = async (req, res) => {
  try {
    const { roomId, name, capacity, features } = req.body;
    
    if (!roomId || !name || !capacity) {
      return res.status(400).json({ message: "Room ID, name, and capacity are required." });
    }

    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      return res.status(400).json({ message: "Room with this ID already exists." });
    }

    const newRoom = new Room({ roomId, name, capacity, features, meetings: [] });
    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (err) {
    console.error("Error adding room:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId }).populate('meetings');

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    res.json(room);
  } catch (err) {
    console.error("Error fetching room:", err);
    res.status(500).json({ message: err.message });
  }
};