import mongoose from 'mongoose';

const programSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Program Details
  programType: { type: String, default: '' },
  selectedCountries: [{ type: String }],
  countryName: { type: String, default: '' },
  universityId: { type: String, default: '' },
  universityName: { type: String, default: '' },

  programSelection: { type: mongoose.Schema.Types.Mixed }, // flexible structure

  // Process-admin approval
  programApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under_review'],
    default: 'pending',
  },
  approvedAt:    { type: Date, default: null },
  approvedBy:    { type: String, default: '' }, // process admin name / id
  approvalNotes: { type: String, default: '' },

  processAdminVerified: { type: Boolean, default: false },
  processAdminVerifiedAt: { type: Date, default: null },

  verificationStatus: {
    type: String,
    enum: ['pending_admin_review', 'approved', 'rejected', 'changes_requested'],
    default: 'pending_admin_review',
  },
  rejectedAt:          { type: Date, default: null },
  rejectionReason:     { type: String, default: '' },
  changeRequestedAt:   { type: Date, default: null },
  changeRequestReason: { type: String, default: '' },

  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },

  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
}, { timestamps: true });

export default mongoose.model('FirstYearProgramSelection', programSchema);
