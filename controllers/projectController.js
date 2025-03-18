const Project = require('../models/Project');

// GET all projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE a new project
exports.createProject = async (req, res) => {
    try {
      // Check if request body is an array (which is incorrect)
      if (Array.isArray(req.body)) {
        return res.status(400).json({ message: "Invalid request format. Expected a single object, not an array." });
      }
  
      // Destructure request body
      const { project, tasks, projectOrganizer, projectId } = req.body;
  
      // Validate required fields
      if (!project || !tasks || !projectOrganizer || !projectId) {
        return res.status(400).json({ message: "All fields are required." });
      }
  
      // Create new project
      const newProject = new Project({ project, tasks, projectOrganizer, projectId });
      await newProject.save();
  
      res.status(201).json({ message: "Project added successfully!", project: newProject });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  