// controllers/meetingController.js
const Meeting = require('../models/Meeting');
const Room = require('../models/Room');
const Project = require('../models/Project');

const updateRoomAvailability = async (roomId, meetingDate) => {
  const totalDayMinutes = 24 * 60; // 1440 minutes in a day
  const timezoneOffset = 360; // 6 hours (360 minutes) adjustment for local time difference
  const currentDate = new Date(); // Current date and time (March 19, 2025, per system)
  const dateString = new Date(meetingDate).toISOString().split('T')[0];
  const startOfDay = new Date(dateString + "T00:00:00Z"); // Midnight UTC of meeting day
  const endOfDay = new Date(dateString + "T23:59:59.999Z"); // End of meeting day UTC

  // Fetch meetings for the room on the specified day
  const meetings = await Meeting.find({
    roomId,
    start: { $lt: endOfDay },
    end: { $gt: startOfDay }
  }).sort({ start: 1 });

  // Initialize timeline for the day
  const timeline = new Array(totalDayMinutes).fill(0);

  // Block past time if the meeting day is today
  let availableMinutes = totalDayMinutes;
  if (dateString === currentDate.toISOString().split('T')[0]) {
    const currentMinutes = Math.floor((currentDate - startOfDay) / (1000 * 60));
    for (let i = 0; i < Math.min(currentMinutes, totalDayMinutes); i++) {
      timeline[i] = 1; // Mark past minutes as occupied
    }
    availableMinutes = totalDayMinutes - currentMinutes; // Reduce available time by past minutes
  }

  // Mark occupied time for future meetings
  meetings.forEach(meeting => {
    const meetingStart = Math.max(
      0,
      Math.floor((new Date(meeting.start) - startOfDay) / (1000 * 60))
    );
    const meetingEnd = Math.min(
      totalDayMinutes,
      Math.ceil((new Date(meeting.end) - startOfDay) / (1000 * 60))
    );

    // Only count future meetings (skip if meeting has ended before current time)
    if (dateString === currentDate.toISOString().split('T')[0]) {
      const currentMinutes = Math.floor((currentDate - startOfDay) / (1000 * 60));
      if (meetingEnd <= currentMinutes) return; // Skip past meetings
    }

    for (let i = meetingStart; i < meetingEnd; i++) {
      timeline[i] = 1; // Mark minute as occupied
    }
  });

  // Calculate total occupied minutes
  const occupiedMinutes = timeline.reduce((sum, val) => sum + val, 0);
  availableMinutes = totalDayMinutes - occupiedMinutes - timezoneOffset; // Subtract 6 hours (360 minutes)
  if (availableMinutes < 0) availableMinutes = 0; // Prevent negative values

  const adjustedAvailabilityPercentage = (availableMinutes / totalDayMinutes) * 100;

  // Update the room with the latest availability for this day
  await Room.updateOne(
    { roomId },
    {
      $set: {
        totalAvailableMinutes: availableMinutes,
        availabilityPercentage: Math.round(adjustedAvailabilityPercentage * 100) / 100
      }
    },
    { upsert: true }
  );

  // Log the result
  console.log(`Room ${roomId}, Date ${dateString}`);
  console.log(`Available Minutes: ${availableMinutes}, Availability: ${adjustedAvailabilityPercentage}%`);
};


// GET all meetings for a specific room
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

    // Update room availability for the meeting day
    await updateRoomAvailability(roomId, newMeeting.start);

    res.status(201).json(newMeeting);
  } catch (err) {
    console.error("Error creating meeting:", err);
    res.status(500).json({ message: err.message });
  }
};