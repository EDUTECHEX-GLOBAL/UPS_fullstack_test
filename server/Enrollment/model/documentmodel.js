import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  documents: { type: mongoose.Schema.Types.Mixed }, // flexible key-value store for document metadata
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
}, { timestamps: true });

export default mongoose.model('FirstYearDocuments', documentSchema);
