// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all users with filtering
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 12 } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get users with pagination
    const users = await User.find(filter)
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get user stats
    const stats = await User.getUserStats();
    
    res.status(200).json({
      success: true,
      count: users.length,
      total: totalUsers,
      page: parseInt(page),
      pages: Math.ceil(totalUsers / limit),
      stats,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get single user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'user', status = 'active' } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create avatar initial
    const avatar = name.charAt(0).toUpperCase();
    
    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      status,
      avatar,
      joinDate: new Date()
    });
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.__v;
    
    // Update stats
    const stats = await User.getUserStats();
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      stats,
      data: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, status, lastLogin } = req.body;
    
    // Check if email is being changed and if it already exists
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another user'
        });
      }
    }
    
    // Update user
    const updatedData = {};
    if (name) {
      updatedData.name = name;
      updatedData.avatar = name.charAt(0).toUpperCase();
    }
    if (email) updatedData.email = email;
    if (role) updatedData.role = role;
    if (status) updatedData.status = status;
    if (lastLogin) updatedData.lastLogin = lastLogin;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update stats if status or role changed
    const stats = await User.getUserStats();
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      stats,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get updated stats
    const stats = await User.getUserStats();
    
    res.status(200).json({
      success: true,
      message: `User ${status} successfully`,
      stats,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role value'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get updated stats
    const stats = await User.getUserStats();
    
    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      stats,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get updated stats
    const stats = await User.getUserStats();
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const stats = await User.getUserStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Bulk update users
exports.bulkUpdateUsers = async (req, res) => {
  try {
    const { userIds, status, role } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs are required'
      });
    }
    
    const updateData = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No update data provided'
      });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updateData
    );
    
    // Get updated stats
    const stats = await User.getUserStats();
    
    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} users updated successfully`,
      stats,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Seed initial users (for development)
exports.seedUsers = async (req, res) => {
  try {
    const users = [
      {
        name: "Mounika",
        email: "mounikatsumaki800@gmail.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2026-01-09')
      },
      {
        name: "mounika",
        email: "nil@gmail.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2026-01-09')
      },
      {
        name: "Mounika",
        email: "ttumalanounika25@gmail.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2026-01-07')
      },
      {
        name: "mounika",
        email: "mounika18@gmail.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2026-01-06')
      },
      {
        name: "Mounika",
        email: "admin@educourses.com",
        password: "password123",
        role: "admin",
        status: "active",
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        joinDate: new Date('2025-11-06')
      },
      {
        name: "Aravind",
        email: "arvindbondai2003@gmail.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2025-11-05')
      },
      {
        name: "Aarith",
        email: "rapinaxcondary6686@gmail.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2025-11-03')
      },
      {
        name: "uday",
        email: "udayamkar8688@gmail.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2025-10-17')
      },
      {
        name: "Bonda Aravind",
        email: "bondaanavind994@gmail.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2025-10-16')
      },
      {
        name: "aravind",
        email: "arvindbondai18@gmail.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2025-10-15')
      },
      {
        name: "Aarith",
        email: "aaritim@dedutches.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2025-10-15')
      },
      {
        name: "praneeth",
        email: "praneethunkaus4d@gmail.com",
        password: "password123",
        role: "user",
        status: "active",
        joinDate: new Date('2025-10-15')
      }
    ];

    // Hash passwords and add avatars
    for (let user of users) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
      user.avatar = user.name.charAt(0).toUpperCase();
    }

    // Clear existing users (optional)
    await User.deleteMany({});
    
    // Insert users
    const createdUsers = await User.insertMany(users);
    
    // Remove passwords from response
    const usersResponse = createdUsers.map(user => {
      const userObj = user.toObject();
      delete userObj.password;
      delete userObj.__v;
      return userObj;
    });

    res.status(201).json({
      success: true,
      message: 'Users seeded successfully',
      count: createdUsers.length,
      data: usersResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};