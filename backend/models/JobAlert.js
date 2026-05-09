import mongoose from 'mongoose';

const jobAlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  keyword: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: '',
  },
  jobType: {
    type: String,
    enum: ['all', 'Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'],
    default: 'all',
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'instant'],
    default: 'daily',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastChecked: {
    type: Date,
    default: null,
  },
  matchCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

export default mongoose.model('JobAlert', jobAlertSchema);
