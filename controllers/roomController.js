const Room = require('../models/Room');
const Meeting = require('../models/Meeting');

// Function to calculate available slots and update Room document
exports.getAvailableSlots = async (req, res) => {
    try {
        const { roomId, date } = req.params;
        if (!roomId || !date) {
            return res.status(400).json({ message: "Room ID and date are required." });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Get all meetings for the room on the given date
        const meetings = await Meeting.find({
            roomId,
            start: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ start: 1 });

        const totalDayMinutes = 24 * 60; // 1440 minutes in a day
        let availableMinutes = totalDayMinutes;
        let availableSlots = [];
        let previousEnd = startOfDay;

        meetings.forEach(meeting => {
            let meetingStart = new Date(meeting.start);
            let meetingEnd = new Date(meeting.end);

            // Calculate gap before the meeting
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

        // Check for time after last meeting
        if (previousEnd < endOfDay) {
            let gapMinutes = (endOfDay - previousEnd) / (1000 * 60);
            availableSlots.push({
                start: previousEnd,
                end: endOfDay,
                duration: gapMinutes
            });
        }

        // Calculate availability percentage
        let availabilityPercentage = (availableMinutes / totalDayMinutes) * 100;

        // Update room availability in DB
        await Room.findOneAndUpdate({ roomId }, {
            totalAvailableMinutes: availableMinutes,
            availabilityPercentage: availabilityPercentage
        });

        res.json({
            roomId,
            date,
            availableSlots,
            totalAvailableMinutes: availableMinutes,
            availabilityPercentage: availabilityPercentage.toFixed(2) + "%"
        });
    } catch (err) {
        console.error("Error calculating available slots:", err);
        res.status(500).json({ message: err.message });
    }
};
