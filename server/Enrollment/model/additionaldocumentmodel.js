import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  originalName: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  s3Key: { type: String, default: '' },
  bucket: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const additionalDocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicationId: { type: String, default: '' },
  studyType: { 
    type: String, 
    enum: ['Bachelor', 'Medical', 'Master'], 
    required: true 
  },
  documentType: { type: String, required: true },
  documentName: { type: String, required: true },
  required: { type: Boolean, default: false },
  conditional: { type: Boolean, default: false },
  conditionText: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Not Uploaded', 'Uploaded', 'Pending', 'Rejected'], 
    default: 'Not Uploaded' 
  },
  file: { type: fileSchema, default: null }
}, { timestamps: true });

additionalDocumentSchema.index({ userId: 1, studyType: 1, documentType: 1 }, { unique: true });

export default mongoose.model('AdditionalDocument', additionalDocumentSchema);

