const Meeting = require('./Meeting');
const moment = require('moment-timezone');

const checkUpcomingMeetings = async (io, connectedUsers) => {
  try {
    const now = moment().utc();
    const startWindow = now.clone().add(10, 'minutes');
    const endWindow = now.clone().add(11, 'minutes');

    console.log(`Checking for meetings between ${startWindow.toISOString()} and ${endWindow.toISOString()}`);
    console.log(`Server Local Time: ${now.local().format()} | UTC Time: ${now.format()}`);

    const upcomingMeetings = await Meeting.find({
      start: { $gte: startWindow.toDate(), $lt: endWindow.toDate() }
    });

    console.log("Upcoming meetings found:", upcomingMeetings);

    if (upcomingMeetings.length > 0) {
      upcomingMeetings.forEach(meeting => {
        const socketId = connectedUsers.get(meeting.email);
        if (socketId) {
          io.to(socketId).emit('meetingNotification', {
            message: `Your meeting \"${meeting.title}\" is starting in 10 minutes.`,
            meetingId: meeting._id,
            start: meeting.start,
            roomId: meeting.roomId
          });
          console.log(`Notification sent to ${meeting.email} for meeting ${meeting._id}`);
        }
      });
    } else {
      console.log("No upcoming meetings found. Sending default notification to all users.");
      connectedUsers.forEach((socketId, email) => {
        io.to(socketId).emit('meetingNotification', {
          message: "You have no meetings scheduled in the next 10 minutes."
        });
        console.log(`Default notification sent to ${email}`);
      });
    }
  } catch (error) {
    console.error("Error checking upcoming meetings:", error);
  }
};

module.exports = function startScheduler(io, connectedUsers) {
  setInterval(() => {
    checkUpcomingMeetings(io, connectedUsers);
  }, 60000);
};
