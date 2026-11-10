import mongoose from 'mongoose';

const reportFileSchema = new mongoose.Schema({
  fileName: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  s3Key: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const verificationSchema = new mongoose.Schema({
  status: { type: String, enum: ['Pending', 'Verified', 'Rejected', 'Failed'], default: 'Pending' },
  extractedScore: { type: mongoose.Schema.Types.Mixed, default: null },
  extractedTestDate: { type: Date, default: null },
  matched: { type: Boolean, default: false }
}, { _id: false });

const eligibleUniversitySchema = new mongoose.Schema({
  university: { type: String, default: '' },
  country: { type: String, default: '' },
  network: { type: String, default: '' },
  degreeLevels: { type: String, default: '' },
  minScoreRequired: { type: Number, default: 0 }
}, { _id: false });

const testSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  hasNotTaken: { type: Boolean, default: false },
  tests: [{
    id: String,
    category: { type: String, enum: ['language','additional'], default: '' }, // Added field
    exam: String,
    score: String,
    testDate: String,

    // Section scores & Master test fields
    readingScore: { type: String, default: '' },
    listeningScore: { type: String, default: '' },
    speakingScore: { type: String, default: '' },
    writingScore: { type: String, default: '' },

    verbalScore: { type: String, default: '' },
    quantitativeScore: { type: String, default: '' },
    analyticalWritingScore: { type: String, default: '' },

    dataInsightsScore: { type: String, default: '' },
    subjectName: { type: String, default: '' },

    chemicalPhysicalScore: { type: String, default: '' },
    carsScore: { type: String, default: '' },
    biologicalBiochemicalScore: { type: String, default: '' },
    psychologicalSocialScore: { type: String, default: '' },

    paperSubject: { type: String, default: '' },
    gateRank: { type: String, default: '' },

    percentile: { type: String, default: '' },
    varcPercentile: { type: String, default: '' },
    dilrPercentile: { type: String, default: '' },
    qaPercentile: { type: String, default: '' },

    allIndiaRank: { type: String, default: '' },
    sjtBand: { type: String, default: '' },

    reportFile: { type: mongoose.Schema.Types.Mixed, default: null },
    selectedUniversities: [eligibleUniversitySchema],
    eligibleUniversities: [eligibleUniversitySchema],
    verification: { 
      type: verificationSchema, 
      default: () => ({ status: 'Pending', extractedScore: null, extractedTestDate: null, matched: false }) 
    }
  }],
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
}, { timestamps: true });

export default mongoose.model('FirstYearTestScores', testSchema);
