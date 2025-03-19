// controllers/meetingController.js
const Meeting = require('../models/Meeting');
const Room = require('../models/Room');
const Project = require('../models/Project');

// Helper function to recalculate and update room availability for a given meeting day
const updateRoomAvailability = async (roomId, meetingDate) => {
  // Use UTC day boundaries based on the meeting date
  const dateString = new Date(meetingDate).toISOString().split('T')[0];
  const startOfDay = new Date(dateString + "T00:00:00Z");
  const endOfDay = new Date(dateString + "T23:59:59.999Z");
  const totalDayMinutes = 24 * 60;

  // Find all meetings for this room that overlap with the day
  const meetings = await Meeting.find({
    roomId,
    start: { $lt: endOfDay },
    end: { $gt: startOfDay }
  }).sort({ start: 1 });

  let meetingDurationTotal = 0;
  meetings.forEach(meeting => {
    // Ensure the meeting times are limited to the day boundaries
    const meetingStart = new Date(meeting.start) < startOfDay ? startOfDay : new Date(meeting.start);
    const meetingEnd = new Date(meeting.end) > endOfDay ? endOfDay : new Date(meeting.end);
    meetingDurationTotal += (meetingEnd - meetingStart) / (1000 * 60);
  });
  meetingDurationTotal = Math.round(meetingDurationTotal);

  // Calculate available minutes and percentage
  let availableMinutes = totalDayMinutes - meetingDurationTotal;
  let availabilityPercentage = (availableMinutes / totalDayMinutes) * 100;

  // If no meetings exist, ensure full availability
  if (meetings.length === 0) {
    availableMinutes = totalDayMinutes;
    availabilityPercentage = 100;
  }

  // Update the room document with new availability values
  await Room.findOneAndUpdate(
    { roomId },
    {
      totalAvailableMinutes: availableMinutes,
      availabilityPercentage: Math.round(availabilityPercentage * 100) / 100 // rounding to two decimals if needed
    }
  );
};

// GET all meetings for a specific room (existing code remains unchanged)
exports.getMeetings = async (req, res) => {
  const roomId = req.query.roomId;
  try {
    const room = await Room.findOne({ roomId }).populate({
      path: 'meetings',
      populate: { path: 'project', select: 'project tasks' }
    });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
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

    // Validate project
    const projectData = await Project.findOne({ projectId: project });
    if (!projectData) {
      return res.status(400).json({ message: "Invalid project ID." });
    }

    // Check for overlapping meetings in the room
    const existingMeetings = await Meeting.find({
      roomId,
      $or: [{ start: { $lt: end }, end: { $gt: start } }]
    });
    if (existingMeetings.length > 0) {
      return res.status(400).json({ message: "Time slot is already booked for this room." });
    }

    // Create and save new meeting
    const meeting = new Meeting({
      title,
      start,
      end,
      organizer,
      project: projectData._id,
      task,
      roomId,
      email
    });
    const newMeeting = await meeting.save();

    // Add meeting reference to the room
    let room = await Room.findOne({ roomId });
    if (!room) {
      room = new Room({ roomId, meetings: [newMeeting._id] });
    } else {
      room.meetings.push(newMeeting._id);
    }
    await room.save();

    // Update room availability based on the meeting's start date (assumes meeting occurs within one day)
    await updateRoomAvailability(roomId, newMeeting.start);

    res.status(201).json(newMeeting);
  } catch (err) {
    console.error("Error creating meeting:", err);
    res.status(500).json({ message: err.message });
  }
};
