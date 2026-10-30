import mongoose from 'mongoose';

const documentFileSchema = new mongoose.Schema({
  fileName: { type: String, default: '' },
  fileKey: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: null }
}, { _id: false });

const educationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  applicantType: { type: String, default: 'First-Year Student' },
  applyingFor: { type: String, default: "Bachelor's" },

  // Bachelor's Education Details
  bachelorDetails: {
    highestEducation: { type: String, default: '10+2 / Higher Secondary' },
    schoolName: { type: String, default: '' },
    board: { type: String, default: '' },
    country: { type: String, default: '' },
    state: { type: String, default: '' },
    startYear: { type: String, default: '' },
    completionYear: { type: String, default: '' },
    percentage: { type: String, default: '' },
    certificateDoc: documentFileSchema
  },

  // Transfer Student Details
  transferDetails: {
    currentCollege: { type: String, default: '' },
    currentProgram: { type: String, default: '' },
    major: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    creditsCompleted: { type: String, default: '' },
    gpa: { type: String, default: '' },
    transcriptDoc: documentFileSchema
  },

  // Master's Education Details
  masterDetails: {
    highestEducation: { type: String, default: "Bachelor's Degree" },
    degreeType: { type: String, default: "Bachelor's Degree" },
    university: { type: String, default: '' },
    courseMajor: { type: String, default: '' },
    country: { type: String, default: '' },
    state: { type: String, default: '' },
    startYear: { type: String, default: '' },
    graduationYear: { type: String, default: '' },
    gpa: { type: String, default: '' },
    transcriptDoc: documentFileSchema,
    degreeDoc: documentFileSchema
  },

  // Medical Education Details
  medicalDetails: {
    highestEducation: { type: String, default: '' },
    schoolCollege: { type: String, default: '' },
    institution: { type: String, default: '' },
    course: { type: String, default: '' },
    country: { type: String, default: '' },
    state: { type: String, default: '' },
    startYear: { type: String, default: '' },
    completionYear: { type: String, default: '' },
    percentageGpa: { type: String, default: '' },
    academicDoc: documentFileSchema
  },

  // Legacy array fallback
  educationDetails: [{
    qualification: String,
    schoolName: String,
    boardUniversity: String,
    yearOfPassing: String,
    score: String,
    country: String,
    programApplyingFor: String,
    intendedMajor: String
  }],
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
}, { timestamps: true });

export default mongoose.model('FirstYearEducationDetails', educationSchema);
