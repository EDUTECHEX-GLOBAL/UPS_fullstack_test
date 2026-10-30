import mongoose from 'mongoose';

const findingSchema = new mongoose.Schema({
  code: { type: String, required: true },
  severity: { type: String, enum: ['review', 'info'], default: 'review' },
  section: { type: String, required: true },
  field: { type: String, required: true },
  message: { type: String, required: true },
  applicationSource: { type: String, default: 'Application' },
  documentSource: { type: String, default: 'Uploaded document' },
}, { _id: false });

const applicationConsistencySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, unique: true, index: true },
  status: { type: String, enum: ['consistent', 'review_required', 'insufficient_data'], required: true },
  checkedAt: { type: Date, default: Date.now },
  comparedFieldCount: { type: Number, default: 0 },
  uploadedDocumentCount: { type: Number, default: 0 },
  extractedDocumentCount: { type: Number, default: 0 },
  findings: { type: [findingSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('ApplicationConsistency', applicationConsistencySchema);
