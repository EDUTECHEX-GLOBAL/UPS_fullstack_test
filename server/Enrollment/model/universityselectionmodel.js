import mongoose from 'mongoose';

const universityChoiceSchema = new mongoose.Schema({
  universityId: { type: mongoose.Schema.Types.Mixed, required: true },
  universityName: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  programName: { type: String, trim: true, default: '' },
  selectedPrograms: [{ type: String, trim: true }],
  degree: { type: String, trim: true, default: '' }
}, { _id: false });

const universitySelectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  programType: { type: String, required: true },
  selectedCountry: { type: String, trim: true },
  selectedUniversities: [{
    universityId: { type: mongoose.Schema.Types.Mixed, required: true },
    universityName: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    programName: { type: String, trim: true, default: '' },
    selectedPrograms: [{ type: String, trim: true }],
    degree: { type: String, trim: true, default: '' }
  }],
  studentSelectedPrograms: [universityChoiceSchema],
  status: { type: String, enum: ['selected', 'Pending', 'In Progress', 'Completed'], default: 'selected' },
}, { timestamps: true });

export default mongoose.model('FirstYearUniversitySelection', universitySelectionSchema);
