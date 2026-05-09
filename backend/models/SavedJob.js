import mongoose from 'mongoose';

const savedJobSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  jobId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    default: 'Unknown Company',
  },
  location: {
    type: String,
    default: 'Remote',
  },
  type: {
    type: String,
    default: 'Full-time',
  },
  salary: {
    type: String,
    default: 'Not specified',
  },
  description: {
    type: String,
    default: '',
  },
  applyUrl: {
    type: String,
    default: '#',
  },
  logo: {
    type: String,
    default: null,
  },
  source: {
    type: String,
    default: 'JSearch',
  },
  postedDate: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
}, { timestamps: true });

// Compound index to prevent duplicate saves
savedJobSchema.index({ user: 1, jobId: 1 }, { unique: true });

export default mongoose.model('SavedJob', savedJobSchema);
