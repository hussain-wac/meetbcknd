const User = require('../models/User');

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 3) {
      return res.status(400).json({ 
        message: "Please provide a search query with at least 3 characters." 
      });
    }

    const users = await User.find({
      name: { $regex: query, $options: 'i' },
    })
      .limit(10)
      .select('name email');

    const formattedUsers = users.map(user => ({
      value: user.name,
      label: user.name,
      email: user.email,
    }));

    res.json(formattedUsers);
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.addUser = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists." });
    }

    // Create new user
    const user = new User({
      name,
      email,
    });

    const savedUser = await user.save();

    // Return the same format as searchUsers for consistency
    const formattedUser = {
      value: savedUser.name,
      label: savedUser.name,
      email: savedUser.email,
    };

    res.status(201).json(formattedUser);
  } catch (err) {
    console.error("Error adding user:", err);
    res.status(500).json({ message: err.message });
  }
};