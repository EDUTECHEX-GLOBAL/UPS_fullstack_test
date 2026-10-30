// models/Application.js
import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  fileType: String,
  size: Number
});

const applicationSchema = new mongoose.Schema({
  // Application Identification
  applicationId: {
    type: String,
    unique: true,
    required: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  
  // University Information - HARDCODED for Kansas University
  university: {
    type: String,
    default: 'Kansas University',
    required: true,
    immutable: true // Cannot be changed
  },
  universityCode: {
    type: String,
    default: 'KU',
    immutable: true
  },
  
  // Student Information
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'United States'
    }
  },
  dateOfBirth: Date,
  
  // Academic Information
  major: {
    type: String,
    required: true,
    enum: [
      'Business Administration', 
      'Computer Science', 
      'Engineering', 
      'Biology', 
      'Psychology', 
      'Nursing',
      'Mathematics',
      'Physics',
      'Chemistry',
      'Political Science',
      'Economics',
      'English',
      'History',
      'Art & Design',
      'Music',
      'Other'
    ]
  },
  gpa: {
    type: Number,
    min: 0.0,
    max: 4.0
  },
  satScore: {
    type: Number,
    min: 400,
    max: 1600
  },
  actScore: {
    type: Number,
    min: 1,
    max: 36
  },
  highSchool: String,
  graduationYear: Number,
  
  // Application Status & Timeline
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under-review', 'accepted', 'rejected', 'withdrawn'],
    default: 'draft'
  },
  submittedAt: Date,
  reviewDate: Date,
  decisionDate: Date,
  
  // Progress Tracking
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Documents
  documents: [documentSchema],
  adminDocuments: [documentSchema],
  
  // Notes & Communication
  adminNotes: [{
    content: String,
    createdBy: {
      id: String,
      name: String,
      role: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false
    }
  }],
  
  
  scholarshipApplied: Boolean,
  scholarshipType: String,
  
  // Application Source
  source: {
    type: String,
    enum: ['online-portal', 'agent', 'direct-apply', 'transfer', 'other'],
    default: 'online-portal'
  },
  
  // Flags
  isNew: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Timestamps
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastViewedByAdmin: Date,
  
  // References to other collections (for importing data from your existing routes)
  sectionReferences: {
    generalInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'GeneralApplication' },
    academicInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicApplication' },
    highSchoolInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'HighSchoolCurriculum' },
    internationalInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'InternationalStudent' },
    residencyInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'ResidencyApplication' },
    familyInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyApplication' },
    contactInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactApplication' }
  },
  
  // Application Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    applicationVersion: String,
    formCompletedSections: [String], // Track which sections are completed
    totalTimeSpent: Number // in minutes
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// ============= INDEXES for better performance =============
applicationSchema.index({ status: 1, submittedAt: -1 });
applicationSchema.index({ university: 1, status: 1 }); // For Kansas University queries
applicationSchema.index({ email: 1, university: 1 });
applicationSchema.index({ studentId: 1 });
applicationSchema.index({ 'adminNotes.createdAt': -1 });
applicationSchema.index({ isArchived: 1 });
applicationSchema.index({ university: 1, major: 1, status: 1 }); // Combined index for filtering

// ============= PRE-SAVE MIDDLEWARE =============
applicationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update progress based on status
  const progressMap = {
    'draft': 25,
    'submitted': 50,
    'under-review': 75,
    'accepted': 100,
    'rejected': 100,
    'withdrawn': 100
  };
  
  if (progressMap[this.status] !== undefined) {
    this.progress = progressMap[this.status];
  }
  
  // Set submittedAt when status changes to 'submitted'
  if (this.isModified('status') && this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  
  // Set decisionDate when accepted/rejected/withdrawn
  if (this.isModified('status') && 
      ['accepted', 'rejected', 'withdrawn'].includes(this.status) && 
      !this.decisionDate) {
    this.decisionDate = new Date();
  }
  
  // Auto-generate applicationId if not provided
  if (!this.applicationId) {
    this.applicationId = `KU${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  
  next();
});

// ============= VIRTUAL PROPERTIES =============
applicationSchema.virtual('statusFormatted').get(function() {
  const statusMap = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'under-review': 'Under Review',
    'accepted': 'Accepted',
    'rejected': 'Rejected',
    'withdrawn': 'Withdrawn'
  };
  return statusMap[this.status] || this.status;
});

applicationSchema.virtual('priorityColor').get(function() {
  const colorMap = {
    'low': 'blue',
    'normal': 'gray',
    'high': 'orange',
    'urgent': 'red'
  };
  return colorMap[this.priority] || 'gray';
});

applicationSchema.virtual('daysSinceSubmission').get(function() {
  if (!this.submittedAt) return null;
  const now = new Date();
  const submitted = new Date(this.submittedAt);
  const diffTime = Math.abs(now - submitted);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

applicationSchema.virtual('formattedAddress').get(function() {
  if (!this.address) return '';
  const { street, city, state, zipCode, country } = this.address;
  const parts = [];
  if (street) parts.push(street);
  if (city) parts.push(city);
  if (state) parts.push(state);
  if (zipCode) parts.push(zipCode);
  if (country && country !== 'United States') parts.push(country);
  return parts.join(', ');
});

// ============= STATIC METHODS =============
applicationSchema.statics.generateKansasAppId = async function() {
  const prefix = 'KU';
  const year = new Date().getFullYear().toString().slice(-2);
  const lastApp = await this.findOne({ 
    university: 'Kansas University',
    applicationId: new RegExp(`^${prefix}${year}`)
  }).sort({ applicationId: -1 });
  
  let sequence = 1001;
  if (lastApp && lastApp.applicationId) {
    const match = lastApp.applicationId.match(new RegExp(`${prefix}${year}(\\d{4})`));
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }
  
  return `${prefix}${year}${sequence.toString().padStart(4, '0')}`;
};

// Get all Kansas University applications
applicationSchema.statics.findKansasApplications = function(filter = {}) {
  return this.find({ 
    university: 'Kansas University',
    ...filter 
  });
};

// Get Kansas application stats
applicationSchema.statics.getKansasStats = async function() {
  return this.aggregate([
    {
      $match: {
        university: 'Kansas University',
        isArchived: false
      }
    },
    {
      $facet: {
        statusCounts: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        majorCounts: [
          {
            $group: {
              _id: '$major',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ],
        monthlyApplications: [
          {
            $group: {
              _id: {
                year: { $year: '$submittedAt' },
                month: { $month: '$submittedAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 6 }
        ]
      }
    }
  ]);
};

// ============= INSTANCE METHODS =============
applicationSchema.methods.addAdminNote = function(content, adminInfo, isInternal = false) {
  this.adminNotes.push({
    content,
    createdBy: {
      id: adminInfo.id || adminInfo._id,
      name: adminInfo.name || `${adminInfo.firstName} ${adminInfo.lastName}`,
      role: adminInfo.role || 'admin'
    },
    isInternal
  });
  return this.save();
};

applicationSchema.methods.updateStatus = function(newStatus, adminInfo, reason = '') {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add note about status change
  const noteContent = `Status changed from ${oldStatus} to ${newStatus}` + 
                     (reason ? `\nReason: ${reason}` : '');
  
  return this.addAdminNote(noteContent, adminInfo, false);
};

applicationSchema.methods.archiveApplication = function(adminInfo, reason = '') {
  this.isArchived = true;
  const noteContent = `Application archived` + (reason ? `\nReason: ${reason}` : '');
  return this.addAdminNote(noteContent, adminInfo, false);
};

applicationSchema.methods.restoreApplication = function(adminInfo) {
  this.isArchived = false;
  return this.addAdminNote('Application restored from archive', adminInfo, false);
};

applicationSchema.methods.markAsViewed = function() {
  this.lastViewedByAdmin = new Date();
  return this.save();
};

applicationSchema.methods.toDashboardFormat = function() {
  return {
    _id: this._id,
    applicationId: this.applicationId,
    name: this.name,
    email: this.email,
    phone: this.phone,
    major: this.major,
    status: this.status,
    statusFormatted: this.statusFormatted,
    progress: this.progress,
    submittedAt: this.submittedAt,
    gpa: this.gpa,
    priority: this.priority,
    priorityColor: this.priorityColor,
    daysSinceSubmission: this.daysSinceSubmission,
    isNew: this.isNew,
    lastViewedByAdmin: this.lastViewedByAdmin
  };
};

const Application = mongoose.model('Application', applicationSchema);

export default Application;