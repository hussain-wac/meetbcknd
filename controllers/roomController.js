const Room = require('../models/Room');
const Meeting = require('../models/Meeting');

// Function to get all rooms with availability details for a given date
exports.getAllRoomsAvailability = async (req, res) => {
    try {
        const { date } = req.params;
        if (!date) {
            return res.status(400).json({ message: "Date is required." });
        }

        // Explicitly set as UTC
        const startOfDay = new Date(date + "T00:00:00Z");
        const endOfDay = new Date(date + "T23:59:59.999Z");

        // Fetch all rooms
        const rooms = await Room.find().populate('meetings');

        const totalDayMinutes = 24 * 60;

        const roomAvailabilityData = await Promise.all(rooms.map(async (room) => {
            const meetings = await Meeting.find({
                roomId: room.roomId,
                start: { $gte: startOfDay, $lte: endOfDay }
            }).sort({ start: 1 });

            let availableMinutes = totalDayMinutes;
            let availableSlots = [];
            let previousEnd = startOfDay;

            meetings.forEach(meeting => {
                let meetingStart = new Date(meeting.start);
                let meetingEnd = new Date(meeting.end);

                if (meetingStart > previousEnd) {
                    let gapMinutes = (meetingStart - previousEnd) / (1000 * 60);
                    availableSlots.push({
                        start: previousEnd,
                        end: meetingStart,
                        duration: gapMinutes
                    });
                }

                availableMinutes -= (meetingEnd - meetingStart) / (1000 * 60);
                previousEnd = meetingEnd;
            });

            if (previousEnd < endOfDay) {
                let gapMinutes = (endOfDay - previousEnd) / (1000 * 60);
                availableSlots.push({
                    start: previousEnd,
                    end: endOfDay,
                    duration: gapMinutes
                });
            }

            return {
                roomId: room.roomId,
                name: room.name,
                capacity: room.capacity,
                features: room.features,
                totalMeetings: meetings.length,
                meetings,
                availableSlots,
                totalAvailableMinutes: availableMinutes,
                availabilityPercentage: ((availableMinutes / totalDayMinutes) * 100).toFixed(2) + "%"
            };
        }));

        res.json(roomAvailabilityData);
    } catch (err) {
        console.error("Error fetching rooms availability:", err);
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
