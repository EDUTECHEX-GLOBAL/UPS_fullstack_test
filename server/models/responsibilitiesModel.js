import mongoose from "mongoose";

const responsibilitiesSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    responsibilities: [{ type: String }],
    circumstances: [{ type: String }]
  },
  {
    timestamps: true
  }
);

// Create unique index for studentId
responsibilitiesSchema.index({ studentId: 1 }, { unique: true });

const Responsibilities = mongoose.model("Responsibilities", responsibilitiesSchema);
export default Responsibilities;