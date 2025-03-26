const Meeting = require('../models/Meeting');

const updateMeetingStatus = async () => {
  try {
    const currentTime = new Date();
    const meetings = await Meeting.find({});

    const updates = meetings.map(async (meeting) => {
      let newStatus;
      if (currentTime < meeting.start) {
        newStatus = 'upcoming';
      } else if (currentTime >= meeting.start && currentTime <= meeting.end) {
        newStatus = 'running';
      } else if (currentTime > meeting.end) {
        newStatus = 'completed';
      }

      // Only update if the status has changed to avoid unnecessary writes
      if (newStatus && meeting.status !== newStatus) {
        await Meeting.updateOne(
          { _id: meeting._id }, // Match the meeting by ID
          { $set: { status: newStatus } } // Update only the status field
        );
      }
    });

    await Promise.all(updates);
    console.log('Meeting statuses updated successfully.');
  } catch (err) {
    console.error('Error updating meeting statuses:', err);
  }
};

module.exports = updateMeetingStatus;