import mongoose from 'mongoose';

// Define a sub-schema for detailed program information
const programDetailSchema = new mongoose.Schema({
  name: {           // ✅ ADDED - was missing, causing "Program 1" fallback
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  program_name: {
    type: String,
    trim: true
  },
  degree: {
    type: String,
    trim: true,
    default: 'bachelor'
  },
  level: {
    type: String,
    enum: ['Bachelor', 'Master', 'PhD', 'Foundation', 'Diploma', 'Certificate'],
    default: 'Bachelor'
  },
  duration: {
    type: String,
    trim: true
  },
  studyMode: {
    type: String,
    enum: ['On Campus', 'Online', 'Hybrid', 'Distance Learning'],
    default: 'On Campus'
  },
  major_area: {
    type: String,
    trim: true
  },
  majorArea: {
    type: String,
    trim: true
  },
  original_major_area: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  requirements: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: ''
  }
}, { 
  _id: false,
  timestamps: false 
});

const bachelorsUniversitySchema = new mongoose.Schema({
  // Basic Information
  universityName: {
    type: String,
    required: [true, 'University name is required'],
    trim: true,
    index: true
  },
  universityCode: {
    type: String,
    required: [true, 'University code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  establishedYear: {
    type: Number,
    required: [true, 'Established year is required'],
    min: [1000, 'Year must be at least 1000'],
    max: [new Date().getFullYear(), `Year cannot be greater than ${new Date().getFullYear()}`]
  },
  universityType: {
    type: String,
    required: [true, 'University type is required'],
    enum: [
      'Public University',
      'Private University',
      'Ivy League',
      'Liberal Arts College',
      'Research University',
      'Community College',
      'Technical Institute',
      'Art School'
    ]
  },
  accreditation: {
    type: String,
    trim: true
  },
  ranking: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    required: [true, 'Website is required'],
    trim: true,
    match: [
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
      'Please enter a valid URL'
    ]
  },
  
  // Location (USA focused)
  country: {
    type: String,
    default: 'United States',
    enum: ['United States']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    enum: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
      "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
      "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
      "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
      "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
      "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
      "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
      "Rhode Island", "South Carolina", "South Dakota", "Tennessee",
      "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
      "Wisconsin", "Wyoming", "District of Columbia"
    ]
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    index: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  zipCode: {
    type: String,
    required: [true, 'ZIP code is required'],
    trim: true
  },
  
  // Contact
  adminEmail: {
    type: String,
    required: [true, 'Admin email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  adminPhone: {
    type: String,
    required: [true, 'Admin phone is required'],
    trim: true
  },
  admissionEmail: {
    type: String,
    required: [true, 'Admission email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  admissionPhone: {
    type: String,
    trim: true
  },
  
  // Academic Details
  programCategories: [{
    type: String,
    trim: true
  }],
  
  // ✅ FIXED: programs now uses Mixed type to accept BOTH:
  //    - plain strings: ["Computer Science & IT", "Engineering"]  (old data)
  //    - objects: [{ name: "Computer Science", level: "Bachelor", ... }]  (new data)
  programs: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  programSource: {
    type: String,
    enum: ['official', 'fallback-template'],
    default: 'official'
  },
  programTemplates: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  intakes: [{
    type: String,
    trim: true
  }],
  applicationDeadlines: {
    earlyDecision: String,
    earlyAction: String,
    regularDecision: String,
    rolling: String
  },
  tuitionFees: {
    inState: {
      type: String,
      required: [true, 'In-state tuition is required'],
      trim: true
    },
    outOfState: String,
    international: String,
    roomAndBoard: String
  },
  
  // Requirements
  minimumGPA: String,
  satRequirements: {
    math: String,
    reading: String,
    total: String
  },
  actRequirements: {
    composite: String
  },
  
  englishTests: [{
    type: String,
    enum: [
      'TOEFL iBT', 
      'IELTS Academic', 
      'PTE Academic', 
      'Duolingo English Test',
      'Cambridge English',
      'GRE',
      'GMAT',
      'SAT',
      'ACT'
    ]
  }],
  
  applicationRequirements: [{
    type: String,
    trim: true
  }],
  
  // Media
  universityLogo: {
    type: String,
    default: null
  },
  coverImage: {
    type: String,
    default: null
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  source: {
    type: String,
    default: 'bachelors'
  },
  degreeLevel: {
    type: String,
    default: 'Bachelors'
  },
  createdBy: {
    type: String,
    default: 'admin'
  },
  programCount: {
    type: Number,
    default: 0
  },
  dataFormat: {
    type: String,
    enum: ['simple', 'detailed'],
    default: 'detailed'
  }
}, {
  timestamps: true
});

// ✅ FIXED pre-save hook: normalizes plain string programs into objects
bachelorsUniversitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.programs && Array.isArray(this.programs)) {
    // Normalize any plain strings into proper program objects
    this.programs = this.programs.map(p => {
      if (typeof p === 'string') {
        return {
          name: p,
          title: p,
          program_name: p,
          level: 'Bachelor',
          duration: '4 years',
          studyMode: 'On Campus',
          description: `${p} program`
        };
      }
      // Already an object — ensure name is set
      if (typeof p === 'object' && !p.name) {
        p.name = p.title || p.program_name || 'Unknown Program';
      }
      return p;
    });
    this.programCount = this.programs.length;
  } else if (this.programCategories && Array.isArray(this.programCategories)) {
    this.programCount = this.programCategories.length;
  }
  
  next();
});

bachelorsUniversitySchema.index({ 
  universityName: 'text', 
  city: 'text',
  'programs.name': 'text',
  'programs.description': 'text'
});

bachelorsUniversitySchema.virtual('programNames').get(function() {
  if (this.programs && Array.isArray(this.programs)) {
    return this.programs.map(p => typeof p === 'string' ? p : (p.name || p.title || p.program_name));
  }
  return this.programCategories || [];
});

const BachelorsUniversity = mongoose.models.BachelorsUniversity || mongoose.model('BachelorsUniversity', bachelorsUniversitySchema);

export default BachelorsUniversity;
