const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Room = require('../models/Room');
const Project = require('../models/Project');

// GET all meetings for a specific room
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

    // Ensure that meeting.project is properly populated
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


exports.createMeeting = async (req, res) => {
  try {
    const { title, start, end, organizer, project, task, roomId, email } = req.body;

    console.log("Received request body:", req.body);

    if (!title || !start || !end || !organizer || !project || !task || !roomId || !email) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Convert projectId from string to ObjectId
    const projectData = await Project.findOne({ projectId: project }); // Assuming projectId is a unique field

    if (!projectData) {
      return res.status(400).json({ message: "Invalid project ID." });
    }

    // Check for overlapping meetings
    const existingMeetings = await Meeting.find({
      roomId,
      $or: [{ start: { $lt: end }, end: { $gt: start } }] // Overlap condition
    });

    if (existingMeetings.length > 0) {
      return res.status(400).json({ message: "Time slot is already booked for this room." });
    }

    // Create new meeting object with the correct ObjectId reference
    const meeting = new Meeting({
      title,
      start,
      end,
      organizer,
      project: projectData._id, // Store ObjectId instead of string
      task,
      roomId,
      email
    });

    // Save meeting
    const newMeeting = await meeting.save();

    // Add meeting to the corresponding room
    let room = await Room.findOne({ roomId });

    if (!room) {
      room = new Room({ roomId, meetings: [newMeeting._id] });
    } else {
      room.meetings.push(newMeeting._id);
    }

    await room.save();
    res.status(201).json(newMeeting);
  } catch (err) {
    console.error("Error creating meeting:", err);
    res.status(500).json({ message: err.message });
  }
};