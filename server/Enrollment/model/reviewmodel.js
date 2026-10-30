import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { type: String, enum: ['Pending', 'Submitted', 'In Review', 'Approved', 'Rejected'], default: 'Pending' },
  submittedAt: { type: Date },
  programType: { type: String },
  reviewNotes: { type: String }
}, { timestamps: true });

export default mongoose.model('FirstYearReview', reviewSchema);

