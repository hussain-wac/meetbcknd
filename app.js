// backend/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');
const meetingRoutes = require('./routes/meetingRoutes');
const projectRoutes = require('./routes/projectRoutes')
const roomRoutes = require('./routes/roomRoutes');

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/meetings', meetingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/rooms', roomRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
