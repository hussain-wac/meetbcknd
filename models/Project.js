const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  task: { type: String, required: true },
  taskId: { type: String, required: true }
});

const projectSchema = new mongoose.Schema({
  project: { type: String, required: true },
  tasks: [taskSchema], // Array of tasks
  projectOrganizer: { type: String, required: true },
  projectId: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Project', projectSchema);
