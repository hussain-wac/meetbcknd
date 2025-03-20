const Meeting = require('./Meeting');


const checkUpcomingMeetings = async (io, connectedUsers) => {
  try {
    const now = new Date();
    const startWindow = new Date(now.getTime() + 10 * 60 * 1000);
    const endWindow = new Date(now.getTime() + 11 * 60 * 1000);
    console.log(`Checking for meetings between ${startWindow} and ${endWindow}`);

    const upcomingMeetings = await Meeting.find({
      start: { $gte: startWindow, $lt: endWindow }
    });

    console.log("Upcoming meetings found:", upcomingMeetings);

    if (upcomingMeetings.length > 0) {
      // Notify users with upcoming meetings
      upcomingMeetings.forEach(meeting => {
        const socketId = connectedUsers.get(meeting.email);
        if (socketId) {
          io.to(socketId).emit('meetingNotification', {
            message: `Your meeting "${meeting.title}" is starting in 10 minutes.`,
            meetingId: meeting._id,
            start: meeting.start,
            roomId: meeting.roomId
          });
          console.log(`Notification sent to ${meeting.email} for meeting ${meeting._id}`);
        }
      });
    } else {
      // If there are no upcoming meetings, notify all connected users
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

// Export a function to start the scheduler
module.exports = function startScheduler(io, connectedUsers) {
  // Check every minute (60000 ms)
  setInterval(() => {
    checkUpcomingMeetings(io, connectedUsers);
  }, 60000);
};
