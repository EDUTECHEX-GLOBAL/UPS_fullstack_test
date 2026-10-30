// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  avatar: {
    type: String,
    default: function() {
      // Generate avatar initial
      return this.name.charAt(0).toUpperCase();
    }
  },
  lastLogin: {
    type: Date,
    default: null
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for formatted join date
userSchema.virtual('formattedJoinDate').get(function() {
  return this.joinDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
});

// Virtual for formatted last login
userSchema.virtual('formattedLastLogin').get(function() {
  if (!this.lastLogin) return 'Never';
  
  const now = new Date();
  const diffMs = now - this.lastLogin;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  
  return this.lastLogin.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
});

// Method to get user stats
userSchema.statics.getUserStats = async function() {
  const totalUsers = await this.countDocuments();
  const activeUsers = await this.countDocuments({ status: 'active' });
  const adminUsers = await this.countDocuments({ role: 'admin' });
  
  return {
    totalUsers,
    activeUsers,
    adminUsers
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;