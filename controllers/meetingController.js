const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Room = require('../models/Room');
const Project = require('../models/Project');

// Helper function to recalculate and update room availability for a given date
const updateRoomAvailability = async (roomId, date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const totalDayMinutes = 24 * 60;

    // Fetch meetings for that room on the given day
    const meetings = await Meeting.find({
        roomId,
        start: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ start: 1 });

    // Calculate total meeting duration for the day
    let meetingDurationTotal = 0;
    meetings.forEach(meeting => {
        const meetingStart = new Date(meeting.start);
        const meetingEnd = new Date(meeting.end);
        meetingDurationTotal += (meetingEnd - meetingStart) / (1000 * 60);
    });
    let availableMinutes = totalDayMinutes - meetingDurationTotal;
    let availabilityPercentage = (availableMinutes / totalDayMinutes) * 100;

    // Update room availability fields
    await Room.findOneAndUpdate(
      { roomId },
      { 
        totalAvailableMinutes: availableMinutes, 
        availabilityPercentage: Number(availabilityPercentage.toFixed(2))
      }
    );
};

// GET all meetings for a specific room (existing code)
exports.getMeetings = async (req, res) => {
  const roomId = req.query.roomId; 

  try {
    const room = await Room.findOne({ roomId }).populate({
      path: 'meetings',
      populate: { path: 'project', select: 'project tasks' } // Ensure project data is populated
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Format meetings
    const formattedMeetings = room.meetings.map(meeting => {
      if (!meeting.project) {
        console.warn(`Warning: Meeting ${meeting._id} has no associated project.`);
        return { ...meeting.toObject(), projectName: 'Unknown', taskName: 'Unknown' };
      }

      const taskDetails = meeting.project.tasks?.find(task => task.taskId === meeting.task) || {};

      return {
        _id: meeting._id,
        title: meeting.title,
        organizer: meeting.organizer,
        projectId: meeting.project._id,
        projectName: meeting.project.project || 'Unknown',
        taskId: meeting.task,
        taskName: taskDetails.task || 'Unknown',
        start: meeting.start,
        end: meeting.end,
        roomId: meeting.roomId,
        email: meeting.email
      };
    });

    res.json(formattedMeetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST to create a new meeting
exports.createMeeting = async (req, res) => {
  try {
    const { title, start, end, organizer, project, task, roomId, email } = req.body;

    console.log("Received request body:", req.body);

    if (!title || !start || !end || !organizer || !project || !task || !roomId || !email) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Convert projectId from string to ObjectId
    const projectData = await Project.findOne({ projectId: project }); // Assuming projectId is unique

    if (!projectData) {
      return res.status(400).json({ message: "Invalid project ID." });
    }

    // Check for overlapping meetings
    const existingMeetings = await Meeting.find({
      roomId,
      $or: [{ start: { $lt: end }, end: { $gt: start } }]
    });

    if (existingMeetings.length > 0) {
      return res.status(400).json({ message: "Time slot is already booked for this room." });
    }

    // Create new meeting
    const meeting = new Meeting({
      title,
      start,
      end,
      organizer,
      project: projectData._id, // Use ObjectId
      task,
      roomId,
      email
    });

    // Save meeting
    const newMeeting = await meeting.save();

    // Add meeting reference to the room
    let room = await Room.findOne({ roomId });
    if (!room) {
      room = new Room({ roomId, meetings: [newMeeting._id] });
    } else {
      room.meetings.push(newMeeting._id);
    }
    await room.save();

    // Update room availability using the meeting's start date (assumes meeting is within one day)
    await updateRoomAvailability(roomId, newMeeting.start);

    res.status(201).json(newMeeting);
  } catch (err) {
    console.error("Error creating meeting:", err);
    res.status(500).json({ message: err.message });
  }
};
