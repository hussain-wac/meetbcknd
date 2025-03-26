//controlers/meetingController.js

const Meeting = require('../models/Meeting');
const Room = require('../models/Room');

// GET all meetings for a specific room
exports.getMeetings = async (req, res) => {
  const roomId = req.query.roomId;
  try {
    const room = await Room.findOne({ roomId }).populate('meetings');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    const formattedMeetings = room.meetings.map(meeting => ({
      _id: meeting._id,
      title: meeting.title,
      organizer: meeting.organizer,
      members: meeting.members, // Now an array of { name, email } objects
      meetingType: meeting.meetingType,
      start: meeting.start,
      end: meeting.end,
      roomId: meeting.roomId,
      email: meeting.email,
      status: meeting.status
    }));
    res.json(formattedMeetings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST to create a new meeting
exports.createMeeting = async (req, res) => {
  try {
    const { title, start, end, organizer, members, meetingType, roomId, email } = req.body;
    console.log("Received request body:", req.body);

    if (!title || !start || !end || !organizer || !members || !meetingType || !roomId || !email) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Members must be a non-empty array." });
    }

    for (const member of members) {
      if (!member.name || !member.email) {
        return res.status(400).json({ message: "Each member must have a name and email." });
      }
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid start or end time format." });
    }

    const existingMeetings = await Meeting.find({
      roomId,
      $or: [{ start: { $lt: endDate }, end: { $gt: startDate } }]
    });

    if (existingMeetings.length > 0) {
      return res.status(409).json({
        message: "Time slot conflicts with existing meeting(s).",
        conflicts: existingMeetings
      });
    }

    const currentTime = new Date();
    let status = 'upcoming';
    if (currentTime >= startDate && currentTime <= endDate) {
      status = 'running';
    } else if (currentTime > endDate) {
      status = 'completed';
    }

    const meeting = new Meeting({
      title,
      start: startDate,
      end: endDate,
      organizer,
      members,
      meetingType,
      roomId,
      email,
      status
    });
    const newMeeting = await meeting.save();

    let room = await Room.findOne({ roomId });
    if (!room) {
      room = new Room({ roomId, meetings: [newMeeting._id] });
    } else {
      room.meetings.push(newMeeting._id);
    }
    await room.save();

    res.status(201).json(newMeeting);

    // **Send Emails**
    const formattedStart = startDate.toLocaleString();
    const formattedEnd = endDate.toLocaleString();
    const memberList = members.map(m => `${m.name} (${m.email})`).join(', ');

    // Email to organizer
    sendEmail(
      newMeeting.email,
      `Confirmation: Your Meeting "${newMeeting.title}" is Scheduled`,
      `Dear ${newMeeting.organizer},\n\nYour meeting "${newMeeting.title}" has been successfully scheduled.\n\n` +
      `📅 **Date & Time:** ${formattedStart} - ${formattedEnd}\n` +
      `📍 **Location:** ${newMeeting.roomId}\n` +
      `👥 **Attendees:** ${memberList}\n\n` +
      `You can manage or update your meeting anytime.\n\nBest regards,\nWacspace Team`
    );

    // Emails to members
    newMeeting.members.forEach(member => {
      sendEmail(
        member.email,
        `Invitation: You’re Invited to “${newMeeting.title}”`,
        `Dear ${member.name},\n\nYou have been invited to a meeting:\n\n` +
        `📅 **Meeting Title:** ${newMeeting.title}\n` +
        `👤 **Organizer:** ${newMeeting.organizer}\n` +
        `📅 **Date & Time:** ${formattedStart} - ${formattedEnd}\n` +
        `📍 **Location:** ${newMeeting.roomId}\n\n` +
        `Please mark your calendar.\n\nLooking forward to your participation.\n\nBest regards,\nWacspace Team`
      );
    });

  } catch (err) {
    console.error("Error creating meeting:", err);
    res.status(500).json({ message: err.message });
  }
};

// PUT to update an existing meeting
exports.updateMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title, start, end, organizer, members, meetingType, roomId, email } = req.body;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found." });
    }

    let overlappingDetails = null;
    if (start || end || roomId) {
      const updatedStart = start ? new Date(start) : meeting.start;
      const updatedEnd = end ? new Date(end) : meeting.end;
      const updatedRoomId = roomId || meeting.roomId;

      const overlappingMeetings = await Meeting.find({
        roomId: updatedRoomId,
        _id: { $ne: meetingId },
        $or: [{ start: { $lt: updatedEnd }, end: { $gt: updatedStart } }]
      });

      if (overlappingMeetings.length > 0) {
        overlappingDetails = overlappingMeetings.map(conflict => ({
          meetingId: conflict._id,
          title: conflict.title,
          start: conflict.start,
          end: conflict.end,
          roomId: conflict.roomId
        }));
        return res.status(409).json({
          message: "Updated time slot conflicts with existing meeting(s).",
          conflicts: overlappingDetails
        });
      }
    }

    if (title) meeting.title = title;
    if (start) meeting.start = new Date(start);
    if (end) meeting.end = new Date(end);
    if (organizer) meeting.organizer = organizer;
    if (members) {
      if (!Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ message: "Members must be a non-empty array." });
      }
      // Validate members structure
      for (const member of members) {
        if (!member.name || !member.email) {
          return res.status(400).json({ message: "Each member must have a name and email." });
        }
      }
      meeting.members = members; // Update with array of { name, email } objects
    }
    if (meetingType) meeting.meetingType = meetingType;
    if (roomId) meeting.roomId = roomId;
    if (email) meeting.email = email;

    const currentTime = new Date();
    if (start || end) {
      const newStart = start ? new Date(start) : meeting.start;
      const newEnd = end ? new Date(end) : meeting.end;
      if (currentTime < newStart) {
        meeting.status = 'upcoming';
      } else if (currentTime >= newStart && currentTime <= newEnd) {
        meeting.status = 'running';
      } else if (currentTime > newEnd) {
        meeting.status = 'completed';
      }
    }

    const updatedMeeting = await meeting.save();

    const originalRoomId = req.body.originalRoomId || meeting.roomId;
    if (roomId && roomId !== originalRoomId) {
      await Room.updateOne(
        { roomId: originalRoomId },
        { $pull: { meetings: meetingId } }
      );
      await Room.updateOne(
        { roomId },
        { $addToSet: { meetings: meetingId } },
        { upsert: true }
      );
    }

    res.json(updatedMeeting);
  } catch (err) {
    console.error("Error updating meeting:", err);
    res.status(500).json({ message: err.message });
  }
};

// DELETE to remove an existing meeting
exports.deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found." });
    }

    const roomId = meeting.roomId;

    await Meeting.deleteOne({ _id: meetingId });

    await Room.updateOne(
      { roomId },
      { $pull: { meetings: meetingId } }
    );

    res.status(200).json({ 
      message: "Meeting deleted successfully",
      deletedMeetingId: meetingId 
    });
  } catch (err) {
    console.error("Error deleting meeting:", err);
    res.status(500).json({ message: err.message });
  }
};