import mongoose from 'mongoose';

const contactSubmissionSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 40 },
  country: { type: String, trim: true, default: '', maxlength: 100 },
  programLevel: { type: String, trim: true, default: '', maxlength: 100 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new', index: true },
  source: { type: String, trim: true, default: 'website-contact-form' },
}, { timestamps: true });

contactSubmissionSchema.index({ createdAt: -1 });

export default mongoose.model('ContactSubmission', contactSubmissionSchema);
