const Meeting = require('./Meeting');
const moment = require('moment-timezone');

const checkUpcomingMeetings = async (io, connectedUsers) => {
  try {
    const now = moment().utc();
    
    // Time windows
    const threeHourStart = now.clone().add(3, 'hours');
    const threeHourEnd = now.clone().add(3, 'hours').add(1, 'minute');
    
    const oneHourStart = now.clone().add(1, 'hour');
    const oneHourEnd = now.clone().add(1, 'hour').add(1, 'minute');
    
    const tenMinStart = now.clone().add(10, 'minutes');
    const tenMinEnd = now.clone().add(11, 'minutes');
    
    const oneMinStart = now.clone().add(1, 'minute');
    const oneMinEnd = now.clone().add(2, 'minutes');

    console.log(`Checking 3-hour window: ${threeHourStart.toISOString()} to ${threeHourEnd.toISOString()}`);
    console.log(`Checking 1-hour window: ${oneHourStart.toISOString()} to ${oneHourEnd.toISOString()}`);
    console.log(`Checking 10-min window: ${tenMinStart.toISOString()} to ${tenMinEnd.toISOString()}`);
    console.log(`Checking 1-min window: ${oneMinStart.toISOString()} to ${oneMinEnd.toISOString()}`);
    console.log(`Server Local Time: ${now.local().format()} | UTC Time: ${now.format()}`);

    // Queries for each time window
    const threeHourMeetings = await Meeting.find({
      start: { $gte: threeHourStart.toDate(), $lt: threeHourEnd.toDate() },
      threeHourNotified: { $ne: true }
    });

    const oneHourMeetings = await Meeting.find({
      start: { $gte: oneHourStart.toDate(), $lt: oneHourEnd.toDate() },
      oneHourNotified: { $ne: true }
    });

    const tenMinMeetings = await Meeting.find({
      start: { $gte: tenMinStart.toDate(), $lt: tenMinEnd.toDate() },
      tenMinNotified: { $ne: true }
    });

    const oneMinMeetings = await Meeting.find({
      start: { $gte: oneMinStart.toDate(), $lt: oneMinEnd.toDate() },
      oneMinNotified: { $ne: true }
    });

    // 3-hour notifications
    threeHourMeetings.forEach(async (meeting) => {
      const socketId = connectedUsers.get(meeting.email);
      if (socketId) {
        io.to(socketId).emit('meetingNotification', {
          message: `Your meeting "${meeting.title}" is starting in 3 hours.`,
          meetingId: meeting._id,
          start: meeting.start,
          roomId: meeting.roomId
        });
        await Meeting.updateOne(
          { _id: meeting._id },
          { $set: { threeHourNotified: true } }
        );
        console.log(`3-hour notification sent to ${meeting.email} for meeting ${meeting._id}`);
      }
    });

    // 1-hour notifications
    oneHourMeetings.forEach(async (meeting) => {
      const socketId = connectedUsers.get(meeting.email);
      if (socketId) {
        io.to(socketId).emit('meetingNotification', {
          message: `Your meeting "${meeting.title}" is starting in 1 hour.`,
          meetingId: meeting._id,
          start: meeting.start,
          roomId: meeting.roomId
        });
        await Meeting.updateOne(
          { _id: meeting._id },
          { $set: { oneHourNotified: true } }
        );
        console.log(`1-hour notification sent to ${meeting.email} for meeting ${meeting._id}`);
      }
    });

    // 10-minute notifications
    tenMinMeetings.forEach(async (meeting) => {
      const socketId = connectedUsers.get(meeting.email);
      if (socketId) {
        io.to(socketId).emit('meetingNotification', {
          message: `Your meeting "${meeting.title}" is starting in 10 minutes.`,
          meetingId: meeting._id,
          start: meeting.start,
          roomId: meeting.roomId
        });
        await Meeting.updateOne(
          { _id: meeting._id },
          { $set: { tenMinNotified: true } }
        );
        console.log(`10-min notification sent to ${meeting.email} for meeting ${meeting._id}`);
      }
    });

    // 1-minute notifications
    oneMinMeetings.forEach(async (meeting) => {
      const socketId = connectedUsers.get(meeting.email);
      if (socketId) {
        io.to(socketId).emit('meetingNotification', {
          message: `Your meeting "${meeting.title}" is starting in 1 minute!`,
          meetingId: meeting._id,
          start: meeting.start,
          roomId: meeting.roomId
        });
        await Meeting.updateOne(
          { _id: meeting._id },
          { $set: { oneMinNotified: true } }
        );
        console.log(`1-min notification sent to ${meeting.email} for meeting ${meeting._id}`);
      }
    });

  } catch (error) {
    console.error("Error checking upcoming meetings:", error);
  }
};

module.exports = function startScheduler(io, connectedUsers) {
  setInterval(() => {
    checkUpcomingMeetings(io, connectedUsers);
  }, 60000);
};