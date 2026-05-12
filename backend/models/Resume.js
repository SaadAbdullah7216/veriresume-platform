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
      strengths: [String],
      suggestions: [String],
      recommendedKeywords: [String],
      suggestedJobTitles: [String],
      deepAnalysis: mongoose.Schema.Types.Mixed,
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
    enhancedResume: mongoose.Schema.Types.Mixed, // persisted AI-enhanced resume JSON
    enhancedMeta: {
      provider: String,
      generatedAt: Date,
      jdUpdatedAt: Date,
      baseAtsScore: Number,
      estimatedNewAtsScore: Number,
    },
    jobTarget: { type: String }, // e.g., "Frontend Developer"
    module3Result: mongoose.Schema.Types.Mixed,
    jobDescription: {
      text: String,
      fileName: String,
      updatedAt: Date,
    },
    jdAnalysis: {
      atsMatchScore: Number,
      matchLabel: String,
      alignment: {
        skills: Number,
        keywords: Number,
        experience: Number,
        education: Number,
        tools: Number,
        responsibilities: Number,
      },
      matchedKeywords: [String],
      missingKeywords: [String],
      missingSkills: [String],
      missingCertifications: [String],
      missingResponsibilities: [String],
      missingTools: [String],
      weaknesses: [String],
      recommendations: [String],
      summary: String,
      generatedAt: Date,
    },
    interviewPrep: {
      readinessScore: Number,
      focusAreas: [String],
      questions: [
        {
          id: String,
          type: String,
          level: String,
          question: String,
          focusArea: String,
        },
      ],
      generatedAt: Date,
    },
    mockInterview: {
      level: String,
      currentIndex: { type: Number, default: 0 },
      questions: [
        {
          id: String,
          type: String,
          level: String,
          question: String,
          focusArea: String,
        },
      ],
      history: [
        {
          questionId: String,
          question: String,
          answer: String,
          evaluation: {
            score: Number,
            confidence: Number,
            accuracy: Number,
            clarity: Number,
            completeness: Number,
            feedback: String,
            improvedAnswer: String,
          },
          evaluatedAt: Date,
        },
      ],
      startedAt: Date,
    },
    
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
