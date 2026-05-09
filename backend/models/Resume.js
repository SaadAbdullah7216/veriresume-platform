import mongoose from "mongoose";

const ResumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalFile: { type: String }, // file path on server (stored filename)
    originalFileName: { type: String }, // original uploaded filename
    parsedData: {
      name: String,
      email: String,
      phone: String,
      education: [mongoose.Schema.Types.Mixed],
      experience: [mongoose.Schema.Types.Mixed],
      skills: [String],
      summary: String,
      rawText: String,
    },
    aiAnalysis: {
      atsScore: Number,
      keywordDensity: Number,
      grammarScore: Number,
      readability: Number,
      structureScore: Number,
      overallScore: Number,
      weaknesses: [String],
      suggestions: [String],
      recommendedKeywords: [String],
      techSkills: [String],
      softSkills: [String],
      matchedSkills: [String],
      missingSkills: [String],
    },
    anomalyDetection: {
      hasAnomalies: { type: Boolean, default: false },
      anomalyCount: { type: Number, default: 0 },
      severity: { type: String, enum: ['none', 'low', 'medium', 'high'], default: 'none' },
      issues: [{
        type: String,
        severity: String,
        field: String,
        value: String,
        message: String
      }],
      details: {
        languagesInSkills: [String],
        genericSoftwareInSkills: [String],
        educationInExperience: [mongoose.Schema.Types.Mixed],
        experienceInEducation: [mongoose.Schema.Types.Mixed],
        duplicateSkills: [String],
        duplicateExperiences: [mongoose.Schema.Types.Mixed]
      },
      report: String,
      detectedAt: Date
    },
    enhancedFile: { type: String }, // path to AI-enhanced resume
    jobTarget: { type: String }, // e.g., "Frontend Developer"
    
    // Decision Status Fields
    decisionStatus: { type: String, enum: ['SHORTLISTED', 'NEEDS_REVIEW', 'REJECTED', 'SHORTLISTED_WITH_FLAG', 'PENDING'], default: 'PENDING' },
    decisionReason: { type: String },
    atsThresholdUsed: { type: Number }, // Threshold used for this decision
    lastScreeningDate: { type: Date },
    lastScreeningJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' }, // Which job this ATS score was screened for
  },
  { timestamps: true }
);

const Resume = mongoose.model("Resume", ResumeSchema);
export default Resume;
