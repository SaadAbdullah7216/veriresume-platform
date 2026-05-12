import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    // Legacy field for backward compatibility
    hr: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    // New field (preferred)
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    // Job details
    title: { type: String, required: true },
    company: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    companyLogoUrl: { type: String },
    companyDescription: { type: String },
    companyWebsite: { type: String },
    companyLocation: { type: String },
    
    // Salary information
    salary: { type: String, default: 'Competitive' },
    salaryRange: { type: String }, // Legacy field
    
    // Job type
    type: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Remote", "Internship"],
      default: "Full-time"
    },
    jobType: { type: String }, // Legacy field
    
    // Experience level
    experience: { type: String, default: 'Not specified' },
    
    // Industry
    industry: { type: String, default: 'Technology' },
    
    // Requirements and skills
    requirements: [String],
    skillsRequired: [String], // Legacy field
    
    // Additional job details
    responsibilities: [String],
    benefits: [String],
    
    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "closed"],
      default: "active"
    },
    
    // Dates
    postedDate: { type: Date, default: Date.now },
    
    // Applicants
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resume" }],
    
    // Match scores (for job recommendations)
    matchScore: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

// Index for faster queries
JobSchema.index({ postedBy: 1, status: 1 });
JobSchema.index({ createdAt: -1 });

const Job = mongoose.model("Job", JobSchema);
export default Job;
