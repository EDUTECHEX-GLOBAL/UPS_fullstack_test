import mongoose from 'mongoose';

const programDetailSchema = new mongoose.Schema({
  name: {           // ✅ ADDED - was missing
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
    default: 'master'
  },
  level: {
    type: String,
    enum: ['Master', 'MBA', 'MSc', 'MA', 'MEng', 'LLM', 'MFA', 'MPH', 'MPP', 'Other'],
    default: 'Master'
  },
  duration: {
    type: String,
    trim: true
  },
  studyMode: {
    type: String,
    enum: ['On Campus', 'Online', 'Hybrid', 'Part Time', 'Executive', 'Research'],
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
}, { _id: false });

const mastersUniversitySchema = new mongoose.Schema({
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
      'Research University',
      'Public University',
      'Private University',
      'Ivy League',
      'Russell Group',
      'Go8 (Australia)',
      'Technical University',
      'Business School',
      'Medical School',
      'Law School',
      'Liberal Arts College (with Graduate Programs)'
    ]
  },
  accreditation: { type: String, trim: true },
  ranking: { type: String, trim: true },
  website: {
    type: String,
    required: [true, 'Website is required'],
    trim: true,
    match: [
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
      'Please enter a valid URL'
    ]
  },
  country: { type: String, required: [true, 'Country is required'], trim: true },
  state: { type: String, required: [true, 'State/Province is required'], trim: true },
  city: { type: String, required: [true, 'City is required'], trim: true, index: true },
  address: { type: String, required: [true, 'Address is required'], trim: true },
  zipCode: { type: String, required: [true, 'ZIP/Postal code is required'], trim: true },
  adminEmail: {
    type: String, required: [true, 'Admin email is required'],
    lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  adminPhone: { type: String, required: [true, 'Admin phone is required'], trim: true },
  admissionEmail: {
    type: String, required: [true, 'Admission email is required'],
    lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  admissionPhone: { type: String, trim: true },
  
  // ✅ FIXED: Mixed type to handle both strings and objects
  programs: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  
  intakes: [{ type: String, trim: true }],
  applicationDeadlines: {
    earlyDecision: { type: String, trim: true },
    earlyAction: { type: String, trim: true },
    regularDecision: { type: String, trim: true },
    rolling: { type: String, trim: true }
  },
  tuitionFees: {
    inState: { type: String, required: [true, 'In-state tuition is required'], trim: true },
    outOfState: { type: String, trim: true },
    international: { type: String, trim: true },
    roomAndBoard: { type: String, trim: true }
  },
  minimumGPA: { type: String, trim: true },
  minimumUndergraduateGPA: { type: String, default: '3.0', trim: true },
  greRequirements: {
    quantitative: { type: String, trim: true },
    verbal: { type: String, trim: true },
    analytical: { type: String, trim: true },
    total: { type: String, trim: true }
  },
  gmatRequirements: {
    total: { type: String, trim: true },
    quantitative: { type: String, trim: true },
    verbal: { type: String, trim: true }
  },
  englishTests: [{
    type: String,
    enum: ['TOEFL iBT', 'IELTS Academic', 'PTE Academic', 'Duolingo English Test', 'Cambridge English']
  }],
  applicationRequirements: [{ type: String, trim: true }],
  programSource: {
    type: String,
    enum: ['official', 'fallback-template'],
    default: 'official'
  },
  programTemplates: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  workExperienceRequired: { type: Boolean, default: false },
  minimumWorkExperience: { type: String, trim: true },
  preferredWorkExperience: { type: String, trim: true },
  researchProposalRequired: { type: Boolean, default: false },
  writingSampleRequired: { type: Boolean, default: false },
  interviewRequired: { type: Boolean, default: false },
  universityLogo: { type: String, default: null },
  coverImage: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  degreeLevel: { type: String, default: 'Masters' },
  source: { type: String, default: 'masters' },
  createdBy: { type: String, default: 'admin' },
  programCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// ✅ FIXED pre-save hook: normalizes plain string programs into objects
mastersUniversitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  if (this.programs && Array.isArray(this.programs)) {
    // Normalize any plain strings into proper program objects
    this.programs = this.programs.map(p => {
      if (typeof p === 'string') {
        return {
          name: p,
          title: p,
          program_name: p,
          level: 'Master',
          duration: '2 years',
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
  }
  
  next();
});

mastersUniversitySchema.index({ 
  universityName: 'text', 
  city: 'text',
  'programs.name': 'text',
  'programs.description': 'text'
});

mastersUniversitySchema.virtual('programNames').get(function() {
  if (this.programs && Array.isArray(this.programs)) {
    return this.programs.map(p => typeof p === 'string' ? p : (p.name || p.title || p.program_name));
  }
  return [];
});

const MastersUniversity = mongoose.models.MastersUniversity || mongoose.model('MastersUniversity', mastersUniversitySchema);

export default MastersUniversity;
