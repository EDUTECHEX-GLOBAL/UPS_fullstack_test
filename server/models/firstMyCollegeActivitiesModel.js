import mongoose from "mongoose";

const firstMyCollegeActivitiesSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    collegeId: {
      type: String,
      required: true,
    },
    activities: [
      {
        type: String,
        trim: true,
      },
    ],
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
firstMyCollegeActivitiesSchema.index({ studentId: 1, collegeId: 1 }, { unique: true });

// Calculate progress based on completed activities
firstMyCollegeActivitiesSchema.methods.calculateProgress = function () {
  const completedActivities = this.activities.filter(activity => activity !== "").length;
  const totalRequired = 1; // At least one activity is required
  const progress = Math.min((completedActivities / totalRequired) * 100, 100);
  return Math.round(progress);
};

// Update progress before saving
firstMyCollegeActivitiesSchema.pre("save", function (next) {
  this.progress = this.calculateProgress();
  next();
});

const FirstMyCollegeActivities = mongoose.model("FirstMyCollegeActivities", firstMyCollegeActivitiesSchema);
export default FirstMyCollegeActivities;