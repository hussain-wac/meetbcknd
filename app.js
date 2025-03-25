require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const meetingRoutes = require('./routes/meetingRoutes');
const projectRoutes = require('./routes/projectRoutes');
const roomRoutes = require('./routes/roomRoutes');
const userRoutes = require('./routes/userRoutes'); // Add this
const startScheduler = require('./models/notificationScheduler');
const cron = require('node-cron');
const updateMeetingStatus = require('./utils/updateMeetingStatus');

const app = express();
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/meetings', meetingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes); // Add this

// Create HTTP server and attach Socket.IO
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: "*" } // Adjust the origin as needed for your front end
});

// A simple in-memory map to store email-to-socket mapping
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  socket.on('register', (email) => {
    connectedUsers.set(email, socket.id);
    console.log(`Registered user ${email} with socket ${socket.id}`);
  });
  
  socket.on('disconnect', () => {
    for (let [email, sockId] of connectedUsers.entries()) {
      if (sockId === socket.id) {
        connectedUsers.delete(email);
        break;
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

startScheduler(io, connectedUsers);
cron.schedule('* * * * *', () => {
  console.log('Running meeting status update...');
  updateMeetingStatus();
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});