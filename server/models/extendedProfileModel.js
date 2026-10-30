import mongoose from "mongoose";

const extendedProfileSchema = new mongoose.Schema(
  {
    collegeCredits: { type: String, required: true },
    bornBefore2003: { type: String, required: true },
    degreeStatus: { type: String, required: true },
    communityCollege: { type: String, required: true },
    degreeGoal: { type: String, required: true },
    militaryStatus: { type: String, required: true },
  },
  { timestamps: true }
);

const ExtendedProfile = mongoose.model("ExtendedProfile", extendedProfileSchema);
export default ExtendedProfile;
