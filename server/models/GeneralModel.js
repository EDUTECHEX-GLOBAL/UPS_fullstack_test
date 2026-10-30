import mongoose from 'mongoose';

const generalApplicationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  collegeId: {
    type: String,
    required: true
  },
  startTerm: {
    type: String,
    enum: ['fall-2024', 'spring-2025', 'summer-2025', 'fall-2025', 'fall-2026', 'spring-2026', 'summer-2026', ''],
    default: ''
  },
  housingPreference: {
    type: String,
    enum: ['on-campus', 'off-campus-organized-living', 'with-parents', ''],
    default: ''
  },
  participationPrograms: {
    type: String,
    enum: [
      'project-discovery',
      'gear-up',
      '20-20-leadership-program',
      'eco',
      'kc-scholars',
      'none',
      ''
    ],
    default: ''
  },
  fafsaIntent: {
    type: String,
    enum: ['yes', 'no', ''],
    default: ''
  },
  visaClassification: {
    type: String,
    enum: ['yes', 'no', ''],
    default: ''
  },
  applicationReason: [{
    type: String,
    enum: [
      'Academic Program of Interest',
      'KU\'s Academic Reputation',
      'Value of a KU Degree',
      'Scholarship Opportunities',
      'Study Abroad Opportunities',
      'Career Services & Internships',
      'On-Campus Housing Options',
      'Athletics / Sports Programs',
      'Campus Atmosphere & Traditions',
      'Beauty of Campus',
      'Student Life & Social Scene',
      'Location/Distance from Home',
      'KU Recruitment Staff / Outreach',
      'Campus Visit Experience'
    ]
  }],
  progress: {
    type: Number,
    default: 0
  },
  lastSaved: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one general application per student per college
generalApplicationSchema.index({ studentId: 1, collegeId: 1 }, { unique: true });

// Calculate progress before saving
generalApplicationSchema.pre('save', function(next) {
  let completedFields = 0;
  const totalFields = 6; // startTerm, housingPreference, participationPrograms, fafsaIntent, visaClassification, applicationReason
  
  if (this.startTerm && this.startTerm !== '') completedFields++;
  if (this.housingPreference && this.housingPreference !== '') completedFields++;
  if (this.participationPrograms && this.participationPrograms !== '') completedFields++;
  if (this.fafsaIntent && this.fafsaIntent !== '') completedFields++;
  if (this.visaClassification && this.visaClassification !== '') completedFields++;
  if (this.applicationReason && this.applicationReason.length > 0) completedFields++;
  
  this.progress = Math.round((completedFields / totalFields) * 100);
  next();
});

const GeneralApplication = mongoose.model('GeneralApplication', generalApplicationSchema);

export default GeneralApplication;