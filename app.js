require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const meetingRoutes = require('./routes/meetingRoutes');
const projectRoutes = require('./routes/projectRoutes');
const roomRoutes = require('./routes/roomRoutes');
const startScheduler = require('./models/notificationScheduler');

const app = express();
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/meetings', meetingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/rooms', roomRoutes);

// Create HTTP server and attach Socket.IO
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: "*" } // Adjust the origin as needed for your front end
});

// A simple in-memory map to store email-to-socket mapping
const connectedUsers = new Map();

// When a client connects, they should emit their email for registration.
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  
  socket.on('register', (email) => {
    // Associate the user's email with the socket.id
    connectedUsers.set(email, socket.id);
    console.log(`Registered user ${email} with socket ${socket.id}`);
  });
  
  socket.on('disconnect', () => {
    // Clean up disconnected sockets by removing any matching email entry
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
