import mongoose from 'mongoose';

const personalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Personal Information
  title: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String },
  dateOfBirth: { type: String },
  placeOfBirth: { type: String },
  countryOfBirth: { type: String },
  citizenship: { type: String },
  gender: { type: String },

  // Contact Information
  mobile: { type: String },
  address1: { type: String },
  address2: { type: String },

  // Passport Details
  passportNumber: { type: String },
  passportIssueDate: { type: String },
  passportExpiryDate: { type: String },
  issuingCountry: { type: String },

  // Family Details
  fatherFirstName: { type: String, default: '' },
  fatherLastName: { type: String, default: '' },
  fatherPhone: { type: String, default: '' },
  fatherEmail: { type: String, default: '' },
  fatherName: { type: String, default: '' },

  motherFirstName: { type: String, default: '' },
  motherLastName: { type: String, default: '' },
  motherPhone: { type: String, default: '' },
  motherName: { type: String, default: '' },

  phone: { type: String, default: '' },

  // Temporary Address
  tempAddress1: { type: String, default: '' },
  tempAddress2: { type: String, default: '' },
  tempCity: { type: String, default: '' },
  tempState: { type: String, default: '' },
  tempCountry: { type: String, default: '' },
  tempZip: { type: String, default: '' },

  // Permanent Address
  sameAsTemporaryAddress: { type: Boolean, default: false },
  permAddress1: { type: String, default: '' },
  permAddress2: { type: String, default: '' },
  permCity: { type: String, default: '' },
  permState: { type: String, default: '' },
  permCountry: { type: String, default: '' },
  permZip: { type: String, default: '' },

  // Passport Upload Reference
  passportDoc: {
    fileName: { type: String, default: '' },
    fileKey: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null }
  },

  parent1Relationship: { type: String },
  parent1FullName: { type: String },
  parent1Email: { type: String },
  parent1Phone: { type: String },

  parent2Relationship: { type: String },
  parent2FullName: { type: String },
  parent2Email: { type: String },
  parent2Phone: { type: String },

  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' }
}, { timestamps: true });

export default mongoose.model('FirstYearPersonalDetails', personalSchema);
