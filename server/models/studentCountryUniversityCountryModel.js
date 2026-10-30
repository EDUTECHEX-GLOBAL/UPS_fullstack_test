import mongoose from "mongoose";

const studentCountryUniversityCountrySchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
      trim: true,
    },
    countryCode: {
      type: String,
      trim: true,
      default: "",
    },
    degree: {
      type: String,
      enum: ["bachelor", "master", "professional-degree"],
      required: true,
    },
    programType: {
      type: String,
      enum: ["UG", "PG", "MEDICAL"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

studentCountryUniversityCountrySchema.index({ country: 1 });
studentCountryUniversityCountrySchema.index({ degree: 1 });
studentCountryUniversityCountrySchema.index({ programType: 1 });
studentCountryUniversityCountrySchema.index({ isActive: 1 });

const StudentCountryUniversityCountry =
  mongoose.models.StudentCountryUniversityCountry ||
  mongoose.model("StudentCountryUniversityCountry", studentCountryUniversityCountrySchema);

export default StudentCountryUniversityCountry;
