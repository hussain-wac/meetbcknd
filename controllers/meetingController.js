// controllers/meetingController.js
const Meeting = require('../models/Meeting');
const Room = require('../models/Room');
const Project = require('../models/Project');

// Helper function to recalculate and update room availability for a given meeting day
const updateRoomAvailability = async (roomId, meetingDate) => {
  try {
      // Convert the meeting date to a standardized format (UTC start and end of day)
      const dateString = new Date(meetingDate).toISOString().split('T')[0];
      const startOfDay = new Date(dateString + "T00:00:00Z");
      const endOfDay = new Date(dateString + "T23:59:59.999Z");

      const totalDayMinutes = 24 * 60; // 1440 minutes in a full day

      // Fetch all meetings for this room that overlap with the selected day
      const meetings = await Meeting.find({
          roomId,
          start: { $lt: endOfDay }, // Meetings that start before the day ends
          end: { $gt: startOfDay }   // Meetings that end after the day starts
      }).sort({ start: 1 });

      let occupiedMinutes = 0;
      let lastEndTime = startOfDay; // Keep track of last occupied slot

      meetings.forEach(meeting => {
          // Clip meeting times within the day boundaries
          let meetingStart = new Date(meeting.start) < startOfDay ? startOfDay : new Date(meeting.start);
          let meetingEnd = new Date(meeting.end) > endOfDay ? endOfDay : new Date(meeting.end);

          // Ensure no overlapping time is counted twice
          if (meetingStart >= lastEndTime) {
              occupiedMinutes += (meetingEnd - meetingStart) / (1000 * 60); // Convert ms to minutes
          } else if (meetingEnd > lastEndTime) {
              occupiedMinutes += (meetingEnd - lastEndTime) / (1000 * 60);
          }

          lastEndTime = meetingEnd > lastEndTime ? meetingEnd : lastEndTime;
      });

      // Prevent negative values due to floating point errors
      occupiedMinutes = Math.min(totalDayMinutes, Math.max(0, occupiedMinutes));
      let availableMinutes = totalDayMinutes - occupiedMinutes;

      // Ensure rounding is correct and percentage never exceeds 100%
      let availabilityPercentage = Math.max(0, Math.min(100, (availableMinutes / totalDayMinutes) * 100));

      // Round values properly
      availableMinutes = Math.round(availableMinutes);
      availabilityPercentage = Math.round(availabilityPercentage * 100) / 100; // Keep 2 decimal places

      // Update the room's availability in the database
      await Room.findOneAndUpdate(
          { roomId },
          {
              totalAvailableMinutes: availableMinutes,
              availabilityPercentage: availabilityPercentage
          }
      );

      console.log(`Updated Room ${roomId} - Availability: ${availabilityPercentage}%`);
  } catch (error) {
      console.error("Error updating room availability:", error);
  }
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
