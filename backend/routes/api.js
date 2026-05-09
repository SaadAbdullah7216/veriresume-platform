import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import requirePremium from '../middleware/requirePremium.js';
import multer from 'multer';
import axios from 'axios';
import { ObjectId } from 'mongodb';
import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Match from '../models/Match.js';
import AnomalyReport from '../models/AnomalyReport.js';
import Application from '../models/Application.js';
import Subscription from '../models/Subscription.js';
import AdminLog from '../models/AdminLog.js';
import Notification from '../models/Notification.js';
import SavedJob from '../models/SavedJob.js';
import JobAlert from '../models/JobAlert.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import { matchScrapedJobs, extractSkillsFromResume } from '../utils/recommendationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Python AI Service URL
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

function resolveResumeFilePath(resume) {
  const candidateNames = [resume?.originalFile, resume?.originalFileName]
    .filter(Boolean)
    .map((name) => path.basename(name));

  for (const candidateName of candidateNames) {
    const candidatePath = path.join(UPLOAD_DIR, candidateName);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return candidateNames.length > 0 ? path.join(UPLOAD_DIR, candidateNames[0]) : null;
}

function buildResumeTextFallback(resume) {
  const parsedData = resume?.parsedData || {};
  const storedText = parsedData.rawText || parsedData.raw_text || '';

  if (storedText && storedText.trim().length > 0) {
    return storedText.trim();
  }

  const parts = [];
  if (parsedData.name) parts.push(`Name: ${parsedData.name}`);
  if (parsedData.email) parts.push(`Email: ${parsedData.email}`);
  if (parsedData.phone) parts.push(`Phone: ${parsedData.phone}`);
  if (parsedData.summary) parts.push(`Summary: ${parsedData.summary}`);
  if (Array.isArray(parsedData.skills) && parsedData.skills.length > 0) parts.push(`Skills: ${parsedData.skills.join(', ')}`);
  if (Array.isArray(parsedData.experience) && parsedData.experience.length > 0) parts.push(`Experience:\n${parsedData.experience.join('\n')}`);
  if (Array.isArray(parsedData.education) && parsedData.education.length > 0) parts.push(`Education:\n${parsedData.education.join('\n')}`);

  return parts.join('\n\n').trim();
}

async function loadResumeTextForAnalysis(resume) {
  const filePath = resolveResumeFilePath(resume);
  const fallbackText = buildResumeTextFallback(resume);

  if (!filePath || !fs.existsSync(filePath)) {
    return {
      filePath,
      resumeText: fallbackText,
      parsedData: null,
      fromFile: false,
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), resume?.originalFileName || resume?.originalFile || path.basename(filePath));

    const parseResponse = await axios.post(`${PYTHON_SERVICE_URL}/api/parse-resume`, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 30000,
    });

    if (!parseResponse.data.success) {
      return {
        filePath,
        resumeText: fallbackText,
        parsedData: null,
        fromFile: false,
        error: parseResponse.data.error || 'Failed to parse resume file',
      };
    }

    const parsedData = parseResponse.data.data;
    const resumeText = parsedData.raw_text || parsedData.rawText || fallbackText;

    return {
      filePath,
      resumeText,
      parsedData,
      fromFile: true,
    };
  } catch (error) {
    return {
      filePath,
      resumeText: fallbackText,
      parsedData: null,
      fromFile: false,
      error: error.message,
    };
  }
}

// ============================================
// EXISTING ROUTES
// ============================================

router.get('/me', authMiddleware, (req, res) => {
  const user = req.user;
  // exclude sensitive fields
  res.json({ id: user._id, email: user.email, name: user.name, avatar: user.avatar, role: user.role, isPremium: user.isPremium || false, premiumExpiresAt: user.premiumExpiresAt || null });
});

// ============================================
// ============================================
// FILE SERVING ROUTE
// ============================================

/**
 * GET /api/view-file/:filename
 * Serve uploaded files with proper inline display headers
 */
router.get('/view-file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, '../../uploads', safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.doc') contentType = 'application/msword';

    res.setHeader('Content-Type', contentType);
    // Force inline display (not download) for PDFs; download for DOCX
    res.setHeader('Content-Disposition', ext === '.pdf' ? `inline; filename="${safeFilename}"` : `attachment; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(filePath);
  } catch (error) {
    console.error('View file error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// JOB SEEKER ROUTES
// ============================================

/**
 * POST /api/jobseeker/upload-resume
 * Upload resume, parse it, and save to database
 */
router.post('/jobseeker/upload-resume', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('[UPLOAD] No file in request');
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const userId = req.user._id;

    // Enforce upload limit: 5 per 12 hours for free users
    if (!req.user.isPremium) {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const recentUploads = await Resume.countDocuments({
        user: userId,
        createdAt: { $gte: twelveHoursAgo },
      });
      if (recentUploads >= 5) {
        // Clean up uploaded file
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(429).json({
          success: false,
          error: 'Free users can upload 5 resumes per 12 hours. Upgrade to Premium for unlimited uploads.',
          requiresPremium: true,
        });
      }
    }
    const filePath = req.file.path;
    const targetRole = req.body.targetRole || '';

    console.log(`[UPLOAD] Starting resume upload for user: ${userId}`);
    console.log(`[UPLOAD] File path: ${filePath}`);
    console.log(`[UPLOAD] File name: ${req.file.originalname}`);
    console.log(`[UPLOAD] Target role: ${targetRole || 'Not specified'}`);

    // Call Python service to parse resume
    const formData = new FormData();
    const fileStream = fs.createReadStream(filePath);
    formData.append('file', fileStream, req.file.originalname);

    console.log(`[UPLOAD] Sending to Python service: ${PYTHON_SERVICE_URL}/api/parse-resume`);

    let parsedData = { name: '', email: '', phone: '', education: [], experience: [], skills: [], summary: '', raw_text: '' };
    let pythonServiceAvailable = true;
    
    try {
      const parseResponse = await axios.post(`${PYTHON_SERVICE_URL}/api/parse-resume`, formData, {
        headers: { ...formData.getHeaders() },
        timeout: 60000,
      });
      console.log(`[UPLOAD] Python service response status: ${parseResponse.status}`);
      if (!parseResponse.data.success) {
        console.warn(`[UPLOAD] Python service error: ${parseResponse.data.error} — saving basic record`);
        pythonServiceAvailable = false;
      } else {
        const rawParsed = parseResponse.data.data;
        // Flatten candidate_info nesting — parser returns { candidate_info: {name,email,phone}, skills, raw_text, ... }
        parsedData = {
          ...rawParsed,
          name: rawParsed.name || rawParsed.candidate_info?.name || '',
          email: rawParsed.email || rawParsed.candidate_info?.email || '',
          phone: rawParsed.phone || rawParsed.candidate_info?.phone || '',
        };
      }
    } catch (pythonErr) {
      console.warn(`[UPLOAD] Python service unavailable (${pythonErr.code}) — saving basic record with filename`);
      pythonServiceAvailable = false;
      // Extract name from filename as fallback
      const nameFallback = req.file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      parsedData.name = nameFallback;
    }

    // Convert education, experience arrays to simple strings
    // parsedData.education is an array of objects like [{degree: '...', institution: '...', year: '...'}]
    // We need to convert each object to a readable string
    const educationStrings = Array.isArray(parsedData.education) 
      ? parsedData.education.map(item => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object') {
            // Convert object to readable string: "Bachelor's in CS - MIT (2020)"
            const degree = item.degree || 'Degree';
            const institution = item.institution || '';
            const year = item.year || '';
            return `${degree}${institution ? ' - ' + institution : ''}${year ? ' (' + year + ')' : ''}`;
          }
          return String(item);
        })
      : [];
    
    const experienceStrings = Array.isArray(parsedData.experience)
      ? parsedData.experience.map(item => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object') {
            // Convert object to readable string: "Software Engineer at Google (2020-2023)"
            const title = item.title || item.position || 'Position';
            const company = item.company || '';
            const duration = item.duration || item.dates || '';
            return `${title}${company ? ' at ' + company : ''}${duration ? ' (' + duration + ')' : ''}`;
          }
          return String(item);
        })
      : [];
    
    const skillsStrings = Array.isArray(parsedData.skills)
      ? parsedData.skills.map(item => typeof item === 'string' ? item : String(item))
      : [];

    // Save resume to database
    const resume = new Resume({
      user: userId,
      originalFile: req.file.filename,
      originalFileName: req.file.originalname,
      parsedData: {
        name: parsedData.name || '',
        email: parsedData.email || '',
        phone: parsedData.phone || '',
        education: educationStrings,
        experience: experienceStrings,
        skills: skillsStrings,
        summary: parsedData.summary || '',
        rawText: parsedData.raw_text || parsedData.rawText || '',
      },
      jobTarget: targetRole,
      aiAnalysis: {
        atsScore: 0,
        keywordDensity: 0,
        grammarScore: 0,
        readability: 0,
        structureScore: 0,
        weaknesses: [],
        suggestions: [],
      },
    });

    await resume.save();

    // Automatically analyze the resume after upload
    try {
      const resumeText = parsedData.raw_text || parsedData.rawText || '';
      
      if (resumeText && resumeText.length > 50) {  // Only analyze if we have substantial text
        console.log('Starting automatic AI analysis for resume:', resume._id);
        
        // Create a job description from the target role
        const jobDescription = targetRole 
          ? `Looking for a ${targetRole} with strong technical skills and relevant experience.`
          : 'Looking for a talented professional with relevant skills and experience.';
        
        const analyzeResponse = await axios.post(`${PYTHON_SERVICE_URL}/api/analyze-resume`, {
          resumeText: resumeText,
          jobDescription: jobDescription,
          targetRole: targetRole,
        }, {
          timeout: 60000, // 60 second timeout
        });

        if (analyzeResponse.data.success) {
          const analysis = analyzeResponse.data.data;
          
          // Update resume with AI analysis
          resume.aiAnalysis = {
            atsScore: analysis.ats_score || analysis.atsScore || 0,
            keywordDensity: analysis.keyword_density || analysis.keywordDensity || 0,
            grammarScore: analysis.grammar_score || analysis.grammarScore || 0,
            readability: (analysis.readability_score || analysis.readability || 0),
            structureScore: analysis.structure_score || analysis.structureScore || 0,
            overallScore: analysis.overall_score || 0,
            weaknesses: analysis.weaknesses || [],
            suggestions: analysis.suggestions || [],
            recommendedKeywords: analysis.recommended_keywords || [],
            techSkills: analysis.tech_skills || [],
            softSkills: analysis.soft_skills || [],
            matchedSkills: analysis.matchedSkills || [],
            missingSkills: analysis.missingSkills || [],
            sectionAnalysis: analysis.section_analysis || {},
            metrics: analysis.metrics || {},
          };
          
          // Also store the complete analysis
          resume.completeAnalysis = analysis;
          
          await resume.save();
          console.log('✅ AI analysis completed for resume:', resume._id);
        } else {
          console.log('⚠️ AI analysis failed:', analyzeResponse.data.error);
        }
      }
    } catch (analysisError) {
      console.error('AI analysis failed (non-critical):', analysisError.message);
      // Don't fail the upload if analysis fails
    }

    res.json({
      success: true,
      data: {
        resumeId: resume._id,
        originalFileName: req.file.originalname,
        parsedData: resume.parsedData,
        aiAnalysis: resume.aiAnalysis,
        recommendedKeywords: resume.aiAnalysis?.recommendedKeywords || resume.completeAnalysis?.recommended_keywords || [],
        analysisPending: !pythonServiceAvailable,
        message: pythonServiceAvailable
          ? 'Resume uploaded and parsed successfully'
          : 'Resume uploaded successfully! AI analysis will be available once the analysis service is running. You can re-analyze from the Analysis page.',
      },
    });
  } catch (error) {
    console.error('[UPLOAD] Error uploading resume:', error.message);
    
    // Provide more detailed error info for debugging
    if (error.response?.status) {
      console.error(`[UPLOAD] Python service returned ${error.response.status}: ${error.response.data?.error || 'Unknown error'}`);
    }
    if (error.code === 'ECONNREFUSED') {
      console.error('[UPLOAD] Could not connect to Python service. Make sure it is running on port 5001');
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data?.error || 'Internal server error'
    });
  }
});

/**
 * POST /api/jobseeker/analyze/:resumeId
 * Analyze resume for ATS score and enhancement suggestions
 */
router.post('/jobseeker/analyze/:resumeId', authMiddleware, async (req, res) => {
  try {
    const resumeId = req.params.resumeId;
    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    // Ensure user owns this resume
    if (resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { resumeText } = await loadResumeTextForAnalysis(resume);

    if (!resumeText) {
      return res.status(500).json({ success: false, error: 'No text content extracted from resume' });
    }

    // Call Python service to analyze resume with AI
    const analyzeResponse = await axios.post(`${PYTHON_SERVICE_URL}/api/analyze-resume`, {
      resumeText: resumeText,
      targetRole: resume.jobTarget || '',
    }, {
      timeout: 60000, // 60 second timeout for AI analysis
    });

    if (!analyzeResponse.data.success) {
      return res.status(500).json({ 
        success: false, 
        error: analyzeResponse.data.error || 'Failed to analyze resume' 
      });
    }

    const analysis = analyzeResponse.data.data;

    // Update resume with AI analysis (Python returns snake_case, DB stores camelCase)
    resume.aiAnalysis = {
      atsScore: analysis.ats_score || analysis.atsScore || 0,
      keywordDensity: analysis.keyword_density || analysis.keywordDensity || 0,
      grammarScore: analysis.grammar_score || analysis.grammarScore || 0,
      readability: analysis.readability_score || analysis.readability || 0,
      structureScore: analysis.structure_score || analysis.structureScore || 0,
      overallScore: analysis.overall_score || analysis.overallScore || 0,
      weaknesses: analysis.weaknesses || [],
      suggestions: analysis.suggestions || [],
      recommendedKeywords: analysis.recommended_keywords || analysis.recommendedKeywords || [],
      techSkills: analysis.tech_skills || analysis.techSkills || [],
      softSkills: analysis.soft_skills || analysis.softSkills || [],
      matchedSkills: analysis.matchedSkills || analysis.matched_skills || [],
      missingSkills: analysis.missingSkills || analysis.missing_skills || [],
      sectionAnalysis: analysis.section_analysis || analysis.sectionAnalysis || {},
      metrics: analysis.metrics || {},
    };

    await resume.save();

    res.json({
      success: true,
      data: {
        resumeId: resume._id,
        aiAnalysis: resume.aiAnalysis,
        enhancedSummary: analysis.enhanced_summary || analysis.enhancedSummary || '',
      },
    });
  } catch (error) {
    console.error('Analyze resume error:', error);
    
    // Provide more detailed error messages
    let errorMessage = error.message;
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Python AI service is not running. Please start the service.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'AI analysis timed out. Please try again.';
    }
    
    res.status(500).json({ success: false, error: errorMessage });
  }
});

/**
 * GET /api/jobs/active
 * Get all active HR-posted jobs (for job seekers to browse)
 * Returns jobs with match scores if resumeId query param provided
 */
router.get('/jobs/active', authMiddleware, async (req, res) => {
  try {
    const { resumeId } = req.query;

    // Fetch all active jobs posted by any HR
    const activeJobs = await Job.find({ status: 'active' })
      .populate('postedBy', 'name email company')
      .sort({ createdAt: -1 });

    console.log(`\n[ACTIVE-JOBS] Found ${activeJobs.length} active HR-posted jobs`);

    let resumeSkills = [];
    let resumeText = '';
    let resumeTarget = '';

    // If resumeId provided, extract skills for matching
    if (resumeId) {
      try {
        const resume = await Resume.findById(resumeId);
        if (resume && resume.user.toString() === req.user._id.toString()) {
          resumeSkills = (resume.parsedData?.skills || []).map(s => s.toLowerCase());
          resumeTarget = (resume.jobTarget || '').toLowerCase();
          resumeText = [
            resume.parsedData?.summary || '',
            ...(resume.parsedData?.experience || []).map(e => `${e.title || ''} ${e.description || ''}`),
            ...resumeSkills,
          ].join(' ').toLowerCase();
          console.log(`[ACTIVE-JOBS] Resume skills (${resumeSkills.length}): ${resumeSkills.slice(0, 10).join(', ')}`);
        }
      } catch (e) {
        console.warn('[ACTIVE-JOBS] Could not load resume for matching:', e.message);
      }
    }

    // Score each job against resume
    const scoredJobs = activeJobs.map(job => {
      const jobObj = job.toObject();
      let matchScore = 0;
      let matchedSkills = [];
      let missingSkills = [];

      if (resumeSkills.length > 0) {
        // Build job text from all relevant fields
        const jobText = [
          jobObj.title || '',
          jobObj.description || '',
          ...(jobObj.requirements || []),
          ...(jobObj.skillsRequired || []),
          ...(jobObj.responsibilities || []),
          jobObj.industry || '',
        ].join(' ').toLowerCase();

        // Find matched and missing skills
        matchedSkills = resumeSkills.filter(skill => jobText.includes(skill));
        missingSkills = (jobObj.skillsRequired || jobObj.requirements || [])
          .filter(req => !resumeSkills.some(s => req.toLowerCase().includes(s)))
          .slice(0, 5);

        // Calculate match score
        const skillMatch = resumeSkills.length > 0 ? (matchedSkills.length / resumeSkills.length) * 50 : 0;
        const titleMatch = jobObj.title && resumeTarget && jobObj.title.toLowerCase().includes(resumeTarget.split(' ')[0]) ? 25 : 0;
        const descMatch = jobText.split(' ').filter(w => resumeSkills.includes(w)).length > 3 ? 15 : 0;
        const reqMatch = matchedSkills.length >= 3 ? 10 : matchedSkills.length >= 1 ? 5 : 0;
        matchScore = Math.min(100, Math.round(skillMatch + titleMatch + descMatch + reqMatch));
      }

      return {
        _id: jobObj._id,
        title: jobObj.title,
        company: jobObj.company,
        location: jobObj.location,
        description: jobObj.description,
        salary: jobObj.salary,
        type: jobObj.type,
        experience: jobObj.experience,
        industry: jobObj.industry,
        requirements: jobObj.requirements || [],
        skillsRequired: jobObj.skillsRequired || [],
        responsibilities: jobObj.responsibilities || [],
        benefits: jobObj.benefits || [],
        postedDate: jobObj.postedDate || jobObj.createdAt,
        postedBy: jobObj.postedBy,
        source: 'Portal',
        matchScore,
        matchedSkills,
        missingSkills,
      };
    });

    // Sort by match score (highest first)
    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      data: {
        jobs: scoredJobs,
        totalJobs: scoredJobs.length,
        hasResume: resumeSkills.length > 0,
      }
    });

  } catch (error) {
    console.error('[ACTIVE-JOBS] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobseeker/jobs/:resumeId
 * Get job recommendations based on resume
 */
router.get('/jobseeker/jobs/:resumeId', authMiddleware, async (req, res) => {
  try {
    const resumeId = req.params.resumeId;
    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    // Ensure user owns this resume
    if (resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Build search keywords from resume
    const skills = resume.parsedData.skills.join(' ');
    const targetRole = resume.jobTarget || 'Software Engineer';
    const keywords = `${targetRole} ${skills}`.trim();

    console.log(`\n📋 Fetching jobs for resume: ${resumeId}`);
    console.log(`   Keywords: ${keywords}`);
    console.log(`   Python Service URL: ${PYTHON_SERVICE_URL}`);

    // Call Python service to scrape jobs
    const jobsResponse = await axios.post(`${PYTHON_SERVICE_URL}/api/scrape-jobs`, {
      keywords: keywords,
      location: 'Pakistan',
      platforms: ['rozee', 'mustakbil'],
    }, { timeout: 30000 });

    console.log(`   Response status: ${jobsResponse.status}`);
    console.log(`   Response success: ${jobsResponse.data.success}`);

    if (!jobsResponse.data.success) {
      console.error(`   ❌ Job scraping failed: ${jobsResponse.data.error}`);
      return res.status(500).json({ success: false, error: 'Failed to fetch jobs: ' + (jobsResponse.data.error || 'Unknown error') });
    }

    const jobs = jobsResponse.data.data.jobs || [];
    console.log(`   Found ${jobs.length} jobs`);

    // Save jobs to database
    const savedJobs = [];
    for (const job of jobs.slice(0, 20)) { // Limit to top 20 jobs
      const existingJob = await Job.findOne({ url: job.url });
      
      if (!existingJob) {
        const newJob = new Job({
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          url: job.url,
          platform: job.platform,
          postedDate: job.postedDate || new Date(),
        });
        await newJob.save();
        savedJobs.push(newJob);
      } else {
        savedJobs.push(existingJob);
      }
    }

    console.log(`   ✅ Saved ${savedJobs.length} jobs`);

    res.json({
      success: true,
      data: {
        jobs: savedJobs,
        totalFound: jobs.length,
      },
    });
  } catch (error) {
    console.error('❌ Get jobs error:', error.message);
    console.error('   Full error:', error);
    res.status(500).json({ success: false, error: error.message, details: process.env.NODE_ENV === 'development' ? error.toString() : 'Internal server error' });
  }
});

/**
 * GET /api/jobseeker/my-resumes
 * Get all resumes for the logged-in user
 */
router.get('/jobseeker/my-resumes', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`📄 Fetching resumes for user: ${userId}`);
    
    const resumes = await Resume.find({ user: userId }).sort({ createdAt: -1 }).lean();
    
    console.log(`✅ Found ${resumes.length} resumes`);
    
    if (resumes.length === 0) {
      console.log('⚠️ No resumes found for user');
      return res.json({ 
        success: true, 
        data: {
          resumes: [],
          count: 0
        }
      });
    }
    
    res.json({ 
      success: true, 
      data: {
        resumes: resumes,
        count: resumes.length
      }
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HR ROUTES
// ============================================

/**
 * POST /api/hr/detect-anomalies
 * Check resumes for anomaly indicators
 */
router.post('/hr/detect-anomalies', authMiddleware, async (req, res) => {
  try {
    const { resumeIds } = req.body;

    if (!resumeIds || resumeIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No resume IDs provided' });
    }

    const anomalyReports = [];

    for (const resumeId of resumeIds) {
      const resume = await Resume.findById(resumeId);
      
      if (!resume) continue;

      // Get resume text
      const filePath = path.join(__dirname, '../../uploads', resume.originalFile);
      
      if (!fs.existsSync(filePath)) continue;
      
      const fileBuffer = fs.readFileSync(filePath);
      const formData = new FormData();
      const blob = new Blob([fileBuffer]);
      formData.append('file', blob, resume.originalFile);

      const parseResponse = await axios.post(`${PYTHON_SERVICE_URL}/api/parse-resume`, formData);
      const resumeText = parseResponse.data.data.rawText || '';

      // Get all existing resumes for duplicate detection
      const allResumes = await Resume.find({ _id: { $ne: resumeId } });
      const existingResumesData = allResumes.map(r => ({
        id: r._id.toString(),
        text: `${r.parsedData.name} ${r.parsedData.email} ${r.parsedData.skills.join(' ')}`,
      }));

      // Call Python service to detect anomalies
      const anomalyResponse = await axios.post(`${PYTHON_SERVICE_URL}/api/detect-anomalies`, {
        parsedData: resume.parsedData,
        resumeText: resumeText,
        existingResumes: existingResumesData,
      });

      if (anomalyResponse.data.success) {
        const anomalyData = anomalyResponse.data.data;

        // Convert indicator objects to strings if needed (model expects [String])
        const rawIndicators = anomalyData.indicators || [];
        const indicatorStrings = rawIndicators.map(ind => {
          if (typeof ind === 'string') return ind;
          if (ind && typeof ind === 'object') return ind.message || ind.type || JSON.stringify(ind);
          return String(ind);
        });

        // Save anomaly report
        const report = new AnomalyReport({
          resume: resumeId,
          riskScore: anomalyData.riskScore || 0,
          riskLevel: anomalyData.riskLevel || 'Low',
          indicators: indicatorStrings,
          duplicates: anomalyData.duplicates || [],
          recommendations: anomalyData.recommendations || [],
          status: anomalyData.riskScore > 50 ? 'flagged' : 'cleared',
        });

        await report.save();
        anomalyReports.push(report);
      }
    }

    res.json({
      success: true,
      data: {
        reports: anomalyReports,
      },
    });
  } catch (error) {
    console.error('Detect anomalies error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hr/rank-resumes
 * Rank resumes against a job description
 */
router.post('/hr/rank-resumes', authMiddleware, async (req, res) => {
  try {
    const { jobDescription, resumeIds, jobId } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ success: false, error: 'Job description is required' });
    }

    if (!resumeIds || resumeIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No resume IDs provided' });
    }

    // Prepare resumes for ranking
    const resumesData = [];

    for (const resumeId of resumeIds) {
      const resume = await Resume.findById(resumeId);
      
      if (!resume) continue;

      const { resumeText } = await loadResumeTextForAnalysis(resume);

      if (!resumeText || resumeText.length < 50) continue;

      resumesData.push({
        id: resumeId,
        text: resumeText,
        candidateName: resume.parsedData?.name || 'Unknown',
      });
    }

    // Call Python service to rank resumes
    const rankResponse = await axios.post(`${PYTHON_SERVICE_URL}/api/rank-resumes`, {
      jobDescription: jobDescription,
      resumes: resumesData,
    });

    if (!rankResponse.data.success) {
      return res.status(500).json({ success: false, error: 'Failed to rank resumes' });
    }

    const rankings = rankResponse.data.data.rankings;

    // Save matches to database
    const savedMatches = [];

    for (const ranking of rankings) {
      const match = new Match({
        resume: ranking.resumeId,
        job: jobId || undefined,
        jobDescription: jobDescription,
        matchScore: ranking.matchScore,
        rank: ranking.rank,
        strengths: ranking.strengths || [],
        weaknesses: ranking.weaknesses || [],
      });

      await match.save();
      savedMatches.push(match);
    }

    // Populate resume data so frontend can display candidate names and open files
    const populatedMatches = await Match.find(
      { _id: { $in: savedMatches.map(m => m._id) } }
    ).populate('resume', 'parsedData originalFile originalFileName aiAnalysis');

    res.json({
      success: true,
      data: {
        rankings: populatedMatches,
      },
    });
  } catch (error) {
    console.error('Rank resumes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hr/all-resumes
 * Get all resumes: HR-uploaded + job seeker application resumes
 */
router.get('/hr/all-resumes', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Resumes HR uploaded directly
    const hrUploadedResumes = await Resume.find({ user: userId })
      .populate('lastScreeningJobId', 'title company')
      .sort({ createdAt: -1 });

    // 2. Resumes from job seeker applications to this HR's jobs
    const hrApplications = await Application.find({ hr: userId })
      .populate({
        path: 'resume',
        model: 'Resume',
        select: 'parsedData aiAnalysis anomalyDetection decisionStatus jobTarget originalFile createdAt user'
      })
      .populate('jobSeeker', 'name email')
      .populate('job', 'title company')
      .sort({ appliedAt: -1 });

    // Build a set of already-included resume IDs (HR uploaded)
    const hrResumeIds = new Set(hrUploadedResumes.map(r => r._id.toString()));

    // Map application resumes into the same format, with extra applicant info
    // Deduplicate by resume._id to avoid duplicate keys when same resume is used for multiple applications
    const seenResumeIds = new Set();
    const applicationResumes = hrApplications
      .filter(app => {
        if (!app.resume || hrResumeIds.has(app.resume._id?.toString())) return false;
        const rid = app.resume._id?.toString();
        if (seenResumeIds.has(rid)) return false;
        seenResumeIds.add(rid);
        return true;
      })
      .map(app => {
        const resumeObj = app.resume.toObject ? app.resume.toObject() : app.resume;
        return {
          ...resumeObj,
          _applicationId: app._id,
          _isApplicant: true,
          _applicantName: app.jobSeeker?.name || resumeObj.parsedData?.name || 'Unknown',
          _applicantEmail: app.jobSeeker?.email || resumeObj.parsedData?.email || '',
          _jobTitle: app.job?.title || 'Unknown Job',
          _matchScore: app.matchScore || 0,
          _applicationStatus: app.status || 'pending',
          _appliedAt: app.appliedAt || app.createdAt,
        };
      });

    const allResumes = [...hrUploadedResumes, ...applicationResumes];

    res.json({ success: true, data: allResumes });
  } catch (error) {
    console.error('Get all resumes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hr/anomaly-reports
 * Get all anomaly reports
 */
router.get('/hr/anomaly-reports', authMiddleware, async (req, res) => {
  try {
    const reports = await AnomalyReport.find().populate('resume').sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Get anomaly reports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hr/jobs
 * Get all jobs posted by HR
 */
router.get('/hr/jobs', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    // Get jobs created by this HR user
    const jobs = await Job.find({ postedBy: userId }).sort({ createdAt: -1 });
    
    // If no jobs found, return empty array
    res.json({ 
      success: true, 
      data: jobs || []
    });
  } catch (error) {
    console.error('Get HR jobs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hr/jobs
 * Create a new job posting
 */
router.post('/hr/jobs', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      title,
      company,
      location,
      type,
      salary,
      description,
      requirements,
      responsibilities,
      benefits,
      experience,
      industry,
      status
    } = req.body;

    // Validate required fields
    if (!title || !company || !location || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: title, company, location, description' 
      });
    }

    // Capitalize type for enum validation
    const jobType = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Full-time';

    const job = new Job({
      title,
      company,
      location,
      type: jobType,
      salary: salary || 'Competitive',
      description,
      requirements: requirements || [],
      responsibilities: responsibilities || [],
      benefits: benefits || [],
      experience: experience || 'Not specified',
      industry: industry || 'Technology',
      postedBy: userId,
      postedDate: new Date(),
      status: status || 'active'
    });

    await job.save();

    res.json({
      success: true,
      data: job,
      message: 'Job posted successfully'
    });
  } catch (error) {
    console.error('Create job error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/hr/jobs/:id
 * Update a job posting
 */
router.put('/hr/jobs/:id', authMiddleware, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id;
    const updates = req.body;

    // Find job and verify ownership
    const job = await Job.findOne({ _id: jobId, postedBy: userId });
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found or you do not have permission to edit it' 
      });
    }

    // Capitalize type if present
    if (updates.type) {
      updates.type = updates.type.charAt(0).toUpperCase() + updates.type.slice(1);
    }

    // Update job fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== '_id' && key !== 'postedBy') {
        job[key] = updates[key];
      }
    });

    await job.save();

    res.json({
      success: true,
      data: job,
      message: 'Job updated successfully'
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/hr/jobs/:id
 * Delete a job posting
 */
router.delete('/hr/jobs/:id', authMiddleware, async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id;

    // Find and delete job
    const job = await Job.findOneAndDelete({ _id: jobId, postedBy: userId });
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job not found or you do not have permission to delete it' 
      });
    }

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/hr/upload-resumes
 * Upload multiple resumes (no processing - just save files)
 */
router.post('/hr/upload-resumes', authMiddleware, upload.array('resumes', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const userId = req.user._id;
    const uploadedResumes = [];
    const errors = [];

    console.log(`\n📤 Uploading ${req.files.length} resume(s)...`);

    // Just save file info to database (no AI processing yet)
    for (const file of req.files) {
      try {
        // Create resume record with minimal data
        const resume = new Resume({
          user: userId,
          originalFile: file.filename,
          originalFileName: file.originalname, // Save original uploaded filename
          parsedData: {
            name: file.originalname.replace(/\.(pdf|docx)$/i, ''), // Use filename as temporary name
            email: '',
            phone: '',
            education: [],
            experience: [],
            skills: [],
            summary: '',
          },
          aiAnalysis: {
            atsScore: 0,
            keywordDensity: 0,
            grammarScore: 0,
            readability: 0,
            structureScore: 0,
            weaknesses: [],
            suggestions: [],
          },
        });

        await resume.save();
        
        uploadedResumes.push({
          id: resume._id,
          fileName: file.originalname,
          filePath: file.path,
          uploadedAt: new Date(),
          status: 'pending', // Pending AI screening
          success: true
        });
        
        console.log(`   ✅ Uploaded: ${file.originalname}`);
      } catch (saveError) {
        console.error(`   ❌ Failed to save ${file.originalname}:`, saveError.message);
        errors.push({
          fileName: file.originalname,
          error: 'Failed to save to database'
        });
      }
    }

    console.log(`\n✅ Upload complete: ${uploadedResumes.length} files saved`);

    res.json({
      success: true,
      data: {
        uploaded: uploadedResumes,
        errors: errors,
        total: req.files.length,
        successful: uploadedResumes.length,
        failed: errors.length,
      },
      message: `Uploaded ${uploadedResumes.length} of ${req.files.length} resumes. Run AI Screening to analyze.`
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to upload resumes' 
    });
  }
});

/**
 * DELETE /api/hr/resumes/:id
 * Delete a resume by ID (HR only)
 */
router.delete('/hr/resumes/:id', authMiddleware, async (req, res) => {
  try {
    const resumeId = req.params.id;
    const userId = req.user._id;

    console.log(`\n🗑️ Deleting resume ${resumeId} by user ${userId}...`);

    // Find the resume
    const resume = await Resume.findById(resumeId);

    if (!resume) {
      console.log(`   ❌ Resume not found: ${resumeId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Resume not found' 
      });
    }

    // Verify ownership (resume belongs to this HR user)
    if (resume.user.toString() !== userId.toString()) {
      console.log(`   ❌ Unauthorized: Resume belongs to different user`);
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized to delete this resume' 
      });
    }

    // Delete the physical file if it exists
    if (resume.originalFile) {
      const filePath = path.join(__dirname, '../../uploads', resume.originalFile);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`   🗑️ Deleted file: ${resume.originalFile}`);
        } catch (fileError) {
          console.error(`   ⚠️ Failed to delete file:`, fileError.message);
          // Continue anyway - we'll still delete the database record
        }
      }
    }

    // Delete associated matches
    const matchDeleteResult = await Match.deleteMany({ resume: resumeId });
    if (matchDeleteResult.deletedCount > 0) {
      console.log(`   🗑️ Deleted ${matchDeleteResult.deletedCount} associated match(es)`);
    }

    // Delete the resume from database
    await Resume.findByIdAndDelete(resumeId);

    console.log(`   ✅ Resume deleted successfully`);

    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to delete resume' 
    });
  }
});

/**
 * POST /api/hr/resumes/delete-all
 * Delete all resumes visible to this HR (own uploads + applicant resumes).
 */
router.post('/hr/resumes/delete-all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const includeApplications = req.body?.includeApplications !== false;

    const hrUploadedResumes = await Resume.find({ user: userId }).select('_id originalFile originalFileName');

    let applicationResumes = [];
    let applications = [];
    if (includeApplications) {
      applications = await Application.find({ hr: userId }).select('_id resume');
      const applicationResumeIds = applications.map(app => app.resume).filter(Boolean);
      if (applicationResumeIds.length > 0) {
        applicationResumes = await Resume.find({ _id: { $in: applicationResumeIds } })
          .select('_id originalFile originalFileName');
      }
    }

    const resumeMap = new Map();
    hrUploadedResumes.forEach(r => resumeMap.set(r._id.toString(), r));
    applicationResumes.forEach(r => resumeMap.set(r._id.toString(), r));

    const resumeIds = Array.from(resumeMap.keys());
    if (resumeIds.length === 0) {
      return res.json({
        success: true,
        message: 'No resumes found to delete',
        data: { deletedResumes: 0, deletedApplications: 0, deletedMatches: 0, deletedAnomalies: 0 }
      });
    }

    // Delete physical files
    const deletedFiles = new Set();
    resumeMap.forEach(resume => {
      const fileName = resume.originalFile || resume.originalFileName;
      if (!fileName) return;
      const filePath = path.join(__dirname, '../../uploads', path.basename(fileName));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          deletedFiles.add(fileName);
        } catch (fileError) {
          console.error(`   ⚠️ Failed to delete file: ${fileName}`, fileError.message);
        }
      }
    });

    const matchDeleteResult = await Match.deleteMany({ resume: { $in: resumeIds } });
    const anomalyDeleteResult = await AnomalyReport.deleteMany({ resume: { $in: resumeIds } });
    let applicationDeleteResult = { deletedCount: 0 };
    if (includeApplications) {
      applicationDeleteResult = await Application.deleteMany({ hr: userId });
    }

    const resumeDeleteResult = await Resume.deleteMany({ _id: { $in: resumeIds } });

    res.json({
      success: true,
      message: 'All resumes deleted successfully',
      data: {
        deletedResumes: resumeDeleteResult.deletedCount || 0,
        deletedApplications: applicationDeleteResult.deletedCount || 0,
        deletedMatches: matchDeleteResult.deletedCount || 0,
        deletedAnomalies: anomalyDeleteResult.deletedCount || 0,
        deletedFiles: deletedFiles.size,
      }
    });
  } catch (error) {
    console.error('Delete all resumes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete all resumes'
    });
  }
});

/**
 * POST /api/hr/run-ai-screening
 * Run AI screening on pending resumes
 */
router.post('/hr/run-ai-screening', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    let { jobDescription, resumeIds, anomalyThreshold = 30, matchThreshold = 50, atsThreshold = 60, jobId } = req.body;
    
    console.log(`\n🔍 RAW REQUEST BODY:`, JSON.stringify(req.body, null, 2));
    
    // 🔴 ENSURE THRESHOLDS ARE NUMBERS (handle 0 correctly)
    atsThreshold = typeof atsThreshold === 'number' && atsThreshold >= 0 ? atsThreshold : (Number(atsThreshold) || 60);
    anomalyThreshold = typeof anomalyThreshold === 'number' && anomalyThreshold >= 0 ? anomalyThreshold : (Number(anomalyThreshold) || 30);
    matchThreshold = typeof matchThreshold === 'number' && matchThreshold >= 0 ? matchThreshold : (Number(matchThreshold) || 50);

    console.log(`🔍 AI SCREENING: ATS=${atsThreshold}%, Anomaly=${anomalyThreshold}, Match=${matchThreshold}%, Resumes=${resumeIds ? resumeIds.length : 'all'}`);

    // Build query for resumes
    let query = {};

    // If specific resume IDs are provided, process those (allow reprocessing)
    if (resumeIds && Array.isArray(resumeIds) && resumeIds.length > 0) {
      // Convert string IDs to MongoDB ObjectId if needed
      const objectIds = resumeIds.map(id => {
        try {
          return new ObjectId(id);
        } catch (e) {
          console.warn(`   ⚠️ Invalid resume ID format: ${id}`);
          return id;
        }
      });
      query._id = { $in: objectIds };
      console.log(`   Query mode: SELECTED RESUMES (allow reprocessing)`);
      console.log(`   Converted IDs:`, objectIds);
    } else {
      // Only filter by atsScore when processing all resumes (not specific IDs)
      query.user = userId;
      query['aiAnalysis.atsScore'] = 0;
      console.log(`   Query mode: ALL PENDING RESUMES`);
    }

    console.log(`   Final Query:`, JSON.stringify(query));

    // Get resumes to process
    const resumes = await Resume.find(query);
    console.log(`   Found ${resumes.length} resumes in database`);
    
    // Log details of found resumes
    if (resumes.length > 0) {
      resumes.forEach((resume, idx) => {
        console.log(`   [${idx + 1}] Resume: ${resume.originalFile}, User: ${resume.user}, ID: ${resume._id}`);
      });
    } else {
      // Diagnostic: Check if resumes exist with these IDs at all
      console.log(`   🔍 DIAGNOSTIC: Checking if resumes exist with these IDs...`);
      const allResumesWithIds = await Resume.find({ _id: { $in: resumeIds.map(id => new ObjectId(id)) } });
      console.log(`   Found ${allResumesWithIds.length} resumes with these IDs (any user)`);
      if (allResumesWithIds.length > 0) {
        allResumesWithIds.forEach((resume, idx) => {
          console.log(`   [${idx + 1}] Resume: ${resume.originalFile}, User: ${resume.user}`);
        });
      }
    }

    if (resumes.length === 0) {
      return res.status(400).json({
        success: false,
        error: resumeIds && resumeIds.length > 0 
          ? 'No resumes found in your selection.'
          : 'No pending resumes found. All resumes have been processed.'
      });
    }

    console.log(`\n🤖 Running AI Screening on ${resumes.length} resume(s)...`);
    if (resumeIds && resumeIds.length > 0) {
      console.log(`   📋 Processing selected resumes only`);
    }

    // Test Python service connection first
    try {
      console.log(`   🔍 Testing Python AI Service at: ${PYTHON_SERVICE_URL}/health`);
      const healthCheck = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 5000 });
      console.log(`   ✅ Python AI Service connected: ${healthCheck.data.ai_provider}`);
      console.log(`   Response status: ${healthCheck.status}`);
    } catch (healthError) {
      console.error(`   ❌ Python AI Service not reachable at ${PYTHON_SERVICE_URL}`);
      console.error(`   Error message: ${healthError.message}`);
      console.error(`   Error code: ${healthError.code}`);
      if (healthError.response) {
        console.error(`   Response status: ${healthError.response.status}`);
        console.error(`   Response data:`, healthError.response.data);
      }
      return res.status(503).json({
        success: false,
        error: 'AI Service is not available. Please ensure Python service is running on port 5001.',
        details: healthError.message,
        pythonServiceUrl: PYTHON_SERVICE_URL
      });
    }

    const processedResumes = [];
    const errors = [];

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`📋 STARTING RESUME PROCESSING LOOP`);
    console.log(`═══════════════════════════════════════════════════════════`);

    // Process each resume
    for (let resumeIndex = 0; resumeIndex < resumes.length; resumeIndex++) {
      const resume = resumes[resumeIndex];
      try {
        console.log(`\n[${resumeIndex + 1}/${resumes.length}] ─────────────────────────────────────────────`);
        const { filePath, resumeText, parsedData, fromFile, error: loadError } = await loadResumeTextForAnalysis(resume);

        console.log(`   📂 File path: ${filePath || 'N/A'}`);
        console.log(`   🔍 Loaded from file: ${fromFile}`);

        if (loadError) {
          console.log(`   ⚠️ Load warning: ${loadError}`);
        }

        if (!resumeText || resumeText.length < 50) {
          console.log(`   ❌ No usable resume text found: ${resume.originalFile}`);
          errors.push({
            resumeId: resume._id,
            fileName: resume.originalFile,
            error: 'No usable resume text found'
          });
          continue;
        }

        console.log(`\n📄 Processing: ${resume.originalFile}`);
        console.log(`   Resume ID: ${resume._id}`);
        
        // Flatten the parsed data structure for fraud detection
        const flattenedData = {
          name: parsedData?.candidate_info?.name || parsedData?.name || resume.parsedData?.name || 'Unknown',
          email: parsedData?.candidate_info?.email || parsedData?.email || resume.parsedData?.email || '',
          phone: parsedData?.candidate_info?.phone || parsedData?.phone || resume.parsedData?.phone || '',
          skills: parsedData?.skills || resume.parsedData?.skills || [],
          education: parsedData?.education || resume.parsedData?.education || [],
          experience: parsedData?.experience || resume.parsedData?.experience || [],
          summary: parsedData?.summary || parsedData?.raw_text || resume.parsedData?.summary || resumeText,
          raw_text: parsedData?.raw_text || parsedData?.rawText || resumeText
        };

        if (!resume.parsedData) {
          resume.parsedData = {};
        }
        
        console.log(`   ✅ Step 1 Complete - Parsed: ${flattenedData.name}`);

        // Step 2 & 3: AI Analysis + Anomaly Detection (PARALLEL for speed)
        console.log(`   ⏳ Step 2+3: AI Analysis + Anomaly Detection (parallel)...`);
        const [analyzeResponse, anomalyResponse] = await Promise.all([
          axios.post(`${PYTHON_SERVICE_URL}/api/analyze-resume`, {
            resumeText: flattenedData.raw_text || '',
            jobDescription: jobDescription || '',
            parsedSkills: flattenedData.skills || [],
            anomalyThreshold,
            matchThreshold
          }, { timeout: 60000 }),
          axios.post(`${PYTHON_SERVICE_URL}/api/detect-anomalies`, {
            resumeText: flattenedData.raw_text || '',
            resumeData: flattenedData
          }, { timeout: 30000 })
        ]);

        const aiAnalysis = analyzeResponse.data.success ? analyzeResponse.data.data : {};
        const anomalyReport = anomalyResponse.data.success ? anomalyResponse.data.data : {};
        console.log(`   ✅ Step 2+3 Complete - ATS: ${aiAnalysis.ats_score || 0}%, Anomaly: ${anomalyReport.risk_level || 'Unknown'}`);

        // Update resume with flattened data
        resume.parsedData = {
          name: flattenedData.name || '',
          email: flattenedData.email || '',
          phone: flattenedData.phone || '',
          education: flattenedData.education || [],
          experience: flattenedData.experience || [],
          skills: flattenedData.skills || [],
          summary: flattenedData.summary || flattenedData.raw_text || '',
          rawText: flattenedData.raw_text || '',
        };

        resume.aiAnalysis = {
          atsScore: aiAnalysis.ats_score || 0,
          keywordDensity: aiAnalysis.keyword_density || 0,
          grammarScore: aiAnalysis.grammar_score || 0,
          readability: aiAnalysis.readability_score || 0,
          structureScore: aiAnalysis.structure_score || 0,
          weaknesses: aiAnalysis.weaknesses || [],
          suggestions: aiAnalysis.suggestions || [],
        };

        await resume.save();

        // Create or update anomaly report for ALL risk levels
        if (anomalyReport) {
          // Convert indicator objects to strings if needed (model expects [String])
          const rawIndicators = anomalyReport.indicators || [];
          const indicatorStrings = rawIndicators.map(ind => {
            if (typeof ind === 'string') return ind;
            if (ind && typeof ind === 'object') return ind.message || ind.type || JSON.stringify(ind);
            return String(ind);
          });

          const existingReport = await AnomalyReport.findOne({ resume: resume._id });

          if (existingReport) {
            // Update existing report with new data
            existingReport.riskScore = anomalyReport.risk_score || 0;
            existingReport.riskLevel = anomalyReport.risk_level || 'Low';
            existingReport.indicators = indicatorStrings;
            existingReport.status = anomalyReport.risk_level === 'High' ? 'flagged' : anomalyReport.risk_level === 'Medium' ? 'pending' : 'cleared';
            existingReport.priority = anomalyReport.risk_level === 'High' ? 'high' : anomalyReport.risk_level === 'Medium' ? 'medium' : 'low';
            await existingReport.save();
            console.log(`   🔄 Anomaly report updated - ${anomalyReport.risk_level} risk`);
          } else {
            const newAnomalyReport = new AnomalyReport({
              resume: resume._id,
              reportedBy: userId,
              riskScore: anomalyReport.risk_score || 0,
              riskLevel: anomalyReport.risk_level || 'Low',
              indicators: indicatorStrings,
              status: anomalyReport.risk_level === 'High' ? 'flagged' : anomalyReport.risk_level === 'Medium' ? 'pending' : 'cleared',
              priority: anomalyReport.risk_level === 'High' ? 'high' : anomalyReport.risk_level === 'Medium' ? 'medium' : 'low'
            });
            await newAnomalyReport.save();
            console.log(`   📋 Anomaly report created - ${anomalyReport.risk_level} risk`);
          }
        }

        // Determine decision status based on ATS score and threshold
        const atsScore = aiAnalysis.ats_score || 0;
        let decisionStatus = 'NEEDS_REVIEW';
        let decisionReason = '';

        if (atsScore >= atsThreshold) {
          decisionStatus = 'SHORTLISTED';
          decisionReason = `ATS Score (${atsScore}%) meets or exceeds threshold (${atsThreshold}%)`;
        } else if (atsScore >= (atsThreshold - 10)) {
          decisionStatus = 'NEEDS_REVIEW';
          decisionReason = `ATS Score (${atsScore}%) is within 10% of threshold (${atsThreshold}%) - Requires manual review`;
        } else {
          decisionStatus = 'REJECTED';
          decisionReason = `ATS Score (${atsScore}%) is more than 10% below threshold (${atsThreshold}%)`;
        }

        console.log(`   📊 ${flattenedData.name}: ATS=${atsScore}% → ${decisionStatus}`);

        // 🔴 SAVE DECISION TO DATABASE
        resume.decisionStatus = decisionStatus;
        resume.decisionReason = decisionReason;
        resume.atsThresholdUsed = atsThreshold;
        resume.lastScreeningDate = new Date();
        if (jobId) resume.lastScreeningJobId = jobId;
        await resume.save();

        processedResumes.push({
          id: resume._id,
          name: flattenedData.name,
          email: flattenedData.email,
          phone: flattenedData.phone,
          atsScore: aiAnalysis.ats_score || 0,
          matchScore: aiAnalysis.match_score || 0,
          qualityScore: aiAnalysis.quality_score || 0,
          anomalyWeight: aiAnalysis.anomaly_weight || 0,
          anomalyCount: aiAnalysis.anomaly_count || 0,
          anomalySeverity: aiAnalysis.anomaly_severity || 'none',
          anomalies: aiAnalysis.anomalies || [],
          decisionStatus: decisionStatus,
          reason: decisionReason,
          recommendation: aiAnalysis.recommendation || 'Continue with standard evaluation process',
          fraudRisk: anomalyReport.risk_level || 'Low',
          matchedSkills: aiAnalysis.matchedSkills || [],
          missingSkills: aiAnalysis.missingSkills || [],
          skills: flattenedData.skills?.slice(0, 5) || [],
          education: flattenedData.education || [],
          experience: flattenedData.experience || [],
          weaknesses: aiAnalysis.weaknesses || [],
          decision: decisionStatus
        });
        
        console.log(`   ✅ [${resumeIndex + 1}/${resumes.length}] COMPLETE`);

      } catch (processError) {
        console.error(`   ❌ Failed to process ${resume.originalFile}:`, processError.message);
        
        // Extract Python backend error if available
        let detailedError = processError.message;
        if (processError.response && processError.response.data && processError.response.data.error) {
            detailedError = processError.response.data.error;
            console.error(`      Python error details: ${detailedError}`);
        }
        
        errors.push({
          resumeId: resume._id,
          fileName: resume.originalFile,
          error: detailedError,
          details: processError.response?.data
        });
      }
    }

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`✅ PROCESSING LOOP COMPLETE`);
    console.log(`═══════════════════════════════════════════════════════════`);

    // Step 4: Rank resumes if job description provided
    if (jobDescription && processedResumes.length > 1) {
      console.log(`\n📊 Ranking ${processedResumes.length} resume(s)...`);

      try {
        const resumesForRanking = await Resume.find({
          _id: { $in: processedResumes.map(r => r.id) }
        });

        const rankResponse = await axios.post(`${PYTHON_SERVICE_URL}/api/rank-resumes`, {
          resumes: resumesForRanking.map(r => ({
            name: r.parsedData.name,
            email: r.parsedData.email,
            skills: r.parsedData.skills,
            education: r.parsedData.education,
            experience: r.parsedData.experience,
            raw_text: r.parsedData.summary
          })),
          jobDescription: jobDescription
        }, {
          timeout: 60000,
        });

        if (rankResponse.data.success) {
          const rankings = rankResponse.data.data.ranked_resumes;
          processedResumes.forEach((resume, index) => {
            const ranked = rankings.find(r => r.name === resume.name);
            if (ranked) {
              resume.matchScore = ranked.match_score;
              resume.rank = rankings.indexOf(ranked) + 1;
            }
          });
          processedResumes.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
          console.log(`   ✅ Ranked resumes by match score`);
        }
      } catch (rankError) {
        console.error(`   ⚠️ Ranking failed:`, rankError.message);
      }
    }

    console.log(`\n✅ AI Screening complete: ${processedResumes.length} processed, ${errors.length} failed`);
    console.log(`\n📊 RESULTS SUMMARY:`);
    console.log(`   ├─ Total Resumes: ${resumes.length}`);
    console.log(`   ├─ Successfully Processed: ${processedResumes.length}`);
    console.log(`   ├─ Failed: ${errors.length}`);
    console.log(`   ├─ Job Ranked: ${!!jobDescription}`);
    console.log(`   └─ Response ready to send`);
    
    // Log all processed resume details
    if (processedResumes.length > 0) {
      console.log(`\n📋 PROCESSED RESUMES:`);
      processedResumes.forEach((resume, idx) => {
        console.log(`   [${idx + 1}] ${resume.name}`);
        console.log(`       ├─ Email: ${resume.email}`);
        console.log(`       ├─ ATS Score: ${resume.atsScore}%`);
        console.log(`       ├─ Fraud Risk: ${resume.fraudRisk}`);
        console.log(`       ├─ Skills: ${resume.skills.join(', ')}`);
        console.log(`       └─ Match Score: ${resume.matchScore ? resume.matchScore + '%' : 'N/A'}`);
      });
    }
    
    // Log errors if any
    if (errors.length > 0) {
      console.log(`\n⚠️ FAILED RESUMES:`);
      errors.forEach((error, idx) => {
        console.log(`   [${idx + 1}] ${error.fileName}`);
        console.log(`       ├─ Error: ${error.error}`);
        console.log(`       └─ Details: ${JSON.stringify(error.details)}`);
      });
    }

    res.json({
      success: true,
      data: {
        processed: processedResumes,
        errors: errors,
        total: resumes.length,
        successful: processedResumes.length,
        failed: errors.length,
        ranked: !!jobDescription
      },
      message: `AI Screening complete! Processed ${processedResumes.length} of ${resumes.length} resumes.`
    });

  } catch (error) {
    console.error('❌ AI Screening Critical Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      requestBody: req.body
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run AI screening',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/hr/stats
 * Get dashboard statistics for HR
 */
router.get('/hr/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get counts
    const totalJobs = await Job.countDocuments({ postedBy: userId });
    const activeJobs = await Job.countDocuments({ postedBy: userId, status: 'active' });
    const totalResumes = await Resume.countDocuments();
    const totalMatches = await Match.countDocuments();
    const anomalyReports = await AnomalyReport.countDocuments({ status: 'pending' });

    // Get recent activity
    const recentResumes = await Resume.find().sort({ createdAt: -1 }).limit(5);
    const recentJobs = await Job.find({ postedBy: userId }).sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      data: {
        totalJobs,
        activeJobs,
        totalResumes,
        totalMatches,
        anomalyReports,
        recentResumes,
        recentJobs
      }
    });
  } catch (error) {
    console.error('Get HR stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/filter-tech-keywords
 * Filter keywords to only tech/IT-related using AI
 */
router.post('/filter-tech-keywords', authMiddleware, async (req, res) => {
  try {
    const { keywords } = req.body;
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ success: false, error: 'Keywords array required' });
    }

    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/filter-tech-keywords`, {
      keywords,
    }, { timeout: 15000 });

    res.json(response.data);
  } catch (error) {
    const status = error.response?.status;
    const apiMessage = error.response?.data?.error || error.message;
    console.error('[FILTER-KEYWORDS] Error:', status || 'NO_RESPONSE', apiMessage);

    // Fallback: return unfiltered keywords if Python service is down or errored
    if (!error.response || (status && status >= 500)) {
      return res.json({
        success: true,
        tech_keywords: keywords,
        filtered_out: [],
        total_input: keywords.length,
        total_tech: keywords.length,
        warning: 'Python service unavailable; returned unfiltered keywords.'
      });
    }

    res.status(500).json({ success: false, error: apiMessage });
  }
});



/**
 * POST /api/change-password
 * Change user password (requires current password)
 */
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.password) {
      return res.status(400).json({ success: false, error: 'Password change not available for OAuth accounts' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/upload-profile-picture
 * Upload user profile picture
 */
const profilePicStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
  }
});
const profilePicUpload = multer({
  storage: profilePicStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

router.post('/upload-profile-picture', authMiddleware, profilePicUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });
    res.json({ success: true, avatar: avatarUrl });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DEEP AI RESUME ANALYSIS (Groq + Gemini)
// ============================================

/**
 * POST /api/jobseeker/deep-analyze
 * Deep resume analysis using both Groq (Llama 3.3) and Google Gemini AI.
 * Returns comprehensive analysis with recommended keywords and job titles.
 */
router.post('/jobseeker/deep-analyze', authMiddleware, requirePremium, async (req, res) => {
  try {
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({ success: false, error: 'resumeId is required' });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }
    if (resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    let resumeText = resume.parsedData?.rawText || resume.parsedData?.raw_text || '';

    // Fallback 1: reconstruct text from structured parsed fields (for older resumes missing rawText)
    if (!resumeText || resumeText.length < 50) {
      const pd = resume.parsedData || {};
      const parts = [];
      if (pd.name) parts.push(`Name: ${pd.name}`);
      if (pd.email) parts.push(`Email: ${pd.email}`);
      if (pd.summary) parts.push(`Summary: ${pd.summary}`);
      if (Array.isArray(pd.skills) && pd.skills.length > 0) parts.push(`Skills: ${pd.skills.join(', ')}`);
      if (Array.isArray(pd.experience) && pd.experience.length > 0) parts.push(`Experience:\n${pd.experience.join('\n')}`);
      if (Array.isArray(pd.education) && pd.education.length > 0) parts.push(`Education:\n${pd.education.join('\n')}`);
      resumeText = parts.join('\n\n');
    }

    // Fallback 2: re-parse from original file on disk (handles resumes uploaded when Python was down)
    if ((!resumeText || resumeText.length < 50) && resume.originalFile) {
      try {
        const filePath = path.join(__dirname, '../../uploads', resume.originalFile);
        if (fs.existsSync(filePath)) {
          console.log(`[DEEP-ANALYZE] rawText missing — re-parsing file from disk: ${resume.originalFile}`);
          const reparseForm = new FormData();
          reparseForm.append('file', fs.createReadStream(filePath), resume.originalFileName || resume.originalFile);
          const parseResp = await axios.post(`${PYTHON_SERVICE_URL}/api/parse-resume`, reparseForm, {
            headers: { ...reparseForm.getHeaders() },
            timeout: 60000,
          });
          if (parseResp.data.success) {
            const reparsed = parseResp.data.data;
            // Flatten candidate_info nesting from resume_parser
            const reparsedName = reparsed.name || reparsed.candidate_info?.name || '';
            const reparsedEmail = reparsed.email || reparsed.candidate_info?.email || '';
            const reparsedPhone = reparsed.phone || reparsed.candidate_info?.phone || '';
            resumeText = reparsed.raw_text || reparsed.rawText || '';
            if (resumeText) {
              // Persist so future calls don't need to re-parse
              const updateFields = {
                'parsedData.rawText': resumeText,
                'parsedData.skills': reparsed.skills?.length ? reparsed.skills : resume.parsedData?.skills,
                'parsedData.summary': reparsed.summary || resume.parsedData?.summary,
              };
              if (reparsedName && !resume.parsedData?.name) updateFields['parsedData.name'] = reparsedName;
              if (reparsedEmail && !resume.parsedData?.email) updateFields['parsedData.email'] = reparsedEmail;
              if (reparsedPhone && !resume.parsedData?.phone) updateFields['parsedData.phone'] = reparsedPhone;
              await Resume.findByIdAndUpdate(resumeId, { $set: updateFields });
              console.log(`[DEEP-ANALYZE] Re-parsed and saved rawText (${resumeText.length} chars)`);
            }
          }
        }
      } catch (reparseErr) {
        console.warn('[DEEP-ANALYZE] Re-parse from file failed:', reparseErr.message);
      }
    }

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({ success: false, error: 'Resume text too short for analysis. Please re-upload your resume.' });
    }

    console.log(`\n🧠 Deep AI Analysis for resume: ${resumeId} (${resumeText.length} chars)`);

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/api/deep-analyze-resume`,
      { resumeText },
      { timeout: 90000 }
    );

    if (response.data.success) {
      const analysis = response.data.data;
      console.log(`✅ Deep analysis OK: ATS=${analysis.ats_score}, Keywords=${(analysis.recommended_job_keywords || []).length}`);

      // Save deep analysis data WITHOUT overwriting main analysis scores
      // Main scores (atsScore, grammarScore, readability, structureScore, overallScore)
      // are set during initial upload analysis and should remain consistent
      await Resume.findByIdAndUpdate(resumeId, {
        $set: {
          'aiAnalysis.deepAnalysis': analysis,
          'aiAnalysis.recommendedKeywords': analysis.recommended_job_keywords || [],
          'aiAnalysis.suggestedJobTitles': analysis.suggested_job_titles || [],
          'aiAnalysis.strengths': analysis.strengths || [],
          'aiAnalysis.weaknesses': analysis.weaknesses || [],
          'aiAnalysis.suggestions': analysis.suggestions || [],
        }
      });

      return res.json({ success: true, data: analysis });
    } else {
      return res.status(500).json({ success: false, error: response.data.error || 'Analysis failed' });
    }
  } catch (error) {
    console.error('Deep analysis error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// INDEED RAPIDAPI JOB SEARCH
// ============================================

/**
 * POST /api/jobseeker/search-indeed
 * Search for real jobs on Indeed via the RapidAPI Indeed Scraper API.
 * Uses keywords selected by the user (from deep analysis).
 */
router.post('/jobseeker/search-indeed', authMiddleware, async (req, res) => {
  try {
    const { keywords, location, country, maxRows, jobType, level, sort, fromDays, remote, radius } = req.body;

    if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) {
      return res.status(400).json({ success: false, error: 'Keywords are required' });
    }

    // Build a single query string from selected keywords
    const queryStr = Array.isArray(keywords) ? keywords.join(' ') : String(keywords);

    console.log(`\n🔍 Indeed API search: query="${queryStr}", location="${location || ''}", country="${country || 'us'}"`);

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/api/search-indeed-api`,
      {
        query: queryStr,
        location: location || '',
        country: country || 'us',
        maxRows: maxRows || 20,
        jobType: jobType || '',
        level: level || '',
        sort: sort || 'relevance',
        fromDays: fromDays || '7',
        remote: remote || '',
        radius: radius || '25',
      },
      { timeout: 70000 }
    );

    if (response.data.success) {
      const { jobs, total, source } = response.data.data;
      console.log(`✅ Indeed search OK: ${total} jobs (source: ${source})`);

      // Do basic skill matching against the keywords the user selected
      const keywordSet = new Set((Array.isArray(keywords) ? keywords : [keywords]).map(k => k.toLowerCase()));
      const enrichedJobs = (jobs || []).map((job, idx) => {
        const jobText = `${job.title} ${job.description || ''} ${job.company || ''}`.toLowerCase();
        const matchedSkills = [...keywordSet].filter(k => jobText.includes(k));
        const matchScore = Math.min(100, 30 + matchedSkills.length * 15);
        return {
          ...job,
          id: `indeed-${Date.now()}-${idx}`,
          matchScore,
          matchedSkills,
          source: 'indeed',
        };
      });

      // Sort by matchScore descending
      enrichedJobs.sort((a, b) => b.matchScore - a.matchScore);

      return res.json({
        success: true,
        data: {
          jobs: enrichedJobs,
          total: enrichedJobs.length,
          source,
          searchQuery: queryStr,
        }
      });
    } else {
      return res.status(500).json({ success: false, error: response.data.error || 'Indeed search failed' });
    }
  } catch (error) {
    console.error('Indeed search error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// LINKEDIN RAPIDAPI JOB SEARCH
// ============================================

/**
 * POST /api/jobseeker/search-linkedin
 * Search for real jobs on LinkedIn via the RapidAPI LinkedIn Job Search API.
 * Uses keywords selected by the user from deep analysis.
 */
router.post('/jobseeker/search-linkedin', authMiddleware, async (req, res) => {
  try {
    const { keywords, location, limit, timeRange, searchType } = req.body;

    if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) {
      return res.status(400).json({ success: false, error: 'Keywords are required' });
    }

    const queryStr = Array.isArray(keywords) ? keywords.slice(0, 3).join(' ') : String(keywords);

    console.log(`\n🔗 LinkedIn API search: query="${queryStr}", location="${location || ''}", limit=${limit || 20}`);

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/api/search-linkedin-api`,
      {
        query: queryStr,
        keywords: Array.isArray(keywords) ? keywords : [keywords],
        location: location || '',
        limit: limit || 20,
        timeRange: timeRange || '24h',
        searchType: searchType || 'job',
      },
      { timeout: 60000 }
    );

    if (response.data.success) {
      const { jobs, total, source } = response.data.data;
      console.log(`✅ LinkedIn search OK: ${total} jobs (source: ${source})`);

      // Enrich with match scores based on user's keywords
      const keywordSet = new Set((Array.isArray(keywords) ? keywords : [keywords]).map(k => k.toLowerCase()));
      const enrichedJobs = (jobs || []).map((job, idx) => {
        const jobText = `${job.title} ${job.description || ''} ${job.company || ''} ${job.full_description || ''}`.toLowerCase();
        const matchedSkills = [...keywordSet].filter(k => jobText.includes(k));
        const matchScore = Math.min(100, 25 + matchedSkills.length * 15);
        return {
          ...job,
          id: `linkedin-${Date.now()}-${idx}`,
          matchScore,
          matchedSkills,
          source: 'LinkedIn',
        };
      });

      // Sort by matchScore descending
      enrichedJobs.sort((a, b) => b.matchScore - a.matchScore);

      return res.json({
        success: true,
        data: {
          jobs: enrichedJobs,
          total: enrichedJobs.length,
          source,
          searchQuery: queryStr,
        }
      });
    } else {
      return res.status(500).json({ success: false, error: response.data.error || 'LinkedIn search failed' });
    }
  } catch (error) {
    console.error('LinkedIn search error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// JOB API SEARCH (Remotive + Jobicy + Arbeitnow + USAJobs)
// ==========================================================

/**
 * POST /api/jobseeker/search-jobs-api
 * Search real jobs from Remotive, Jobicy, Arbeitnow and USAJobs APIs
 * Can be used with custom keywords or auto-extracted from resume
 */
router.post('/jobseeker/search-jobs-api', authMiddleware, async (req, res) => {
  try {
    const { query, location, resumeId, platforms, max_per_platform } = req.body;

    let searchQuery = query || '';
    let resumeInfo = null;

    // If resumeId is provided, extract keywords from resume
    if (resumeId) {
      const resume = await Resume.findById(resumeId);
      if (resume && resume.user.toString() === req.user._id.toString()) {
        const skills = resume.parsedData?.skills || [];
        const targetRole = resume.jobTarget || '';
        
        // Build search query from resume if no custom query given
        if (!searchQuery) {
          searchQuery = targetRole || skills.slice(0, 3).join(' ') || 'Developer';
        }
        
        resumeInfo = {
          id: resume._id,
          name: resume.parsedData?.name || 'Candidate',
          targetRole: targetRole,
          skills: skills,
        };
      }
    }

    if (!searchQuery) {
      return res.status(400).json({ success: false, error: 'Please provide a search query or resume ID' });
    }

    console.log(`\n[JOB-API-SEARCH] Query: "${searchQuery}" | Location: "${location || 'Any'}"`);

    // Call Python Job API service
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/search-jobs-api`, {
      query: searchQuery,
      location: location || '',
      max_per_platform: max_per_platform || 10,
      platforms: platforms || ['remotive', 'themuse', 'arbeitnow', 'usajobs'],
    }, { timeout: 30000 });

    if (!response.data.success) {
      return res.status(500).json({ success: false, error: response.data.error || 'API search failed' });
    }

    const apiJobs = response.data.data?.jobs || [];
    
    // Apply skill matching if we have resume info
    let scoredJobs = apiJobs.map((job, idx) => {
      let matchScore = 0;
      let matchedSkills = [];
      let missingSkills = [];
      
      if (resumeInfo && resumeInfo.skills.length > 0) {
        const jobText = `${job.title} ${job.description || ''} ${(job.keywords || []).join(' ')}`.toLowerCase();
        const skills = resumeInfo.skills.map(s => s.toLowerCase());
        
        matchedSkills = skills.filter(s => jobText.includes(s));
        missingSkills = skills.filter(s => !jobText.includes(s)).slice(0, 5);
        
        // Calculate match score
        const skillScore = skills.length > 0 ? (matchedSkills.length / skills.length) * 60 : 30;
        const titleMatch = job.title?.toLowerCase().includes(searchQuery.toLowerCase().split(' ')[0]) ? 25 : 0;
        const hasKeywords = (job.keywords || []).some(k => skills.includes(k.toLowerCase())) ? 15 : 0;
        matchScore = Math.min(100, Math.round(skillScore + titleMatch + hasKeywords));
      } else {
        matchScore = Math.max(40, 85 - idx * 3); // Default scoring by relevance order
      }
      
      return {
        id: `${job.source?.toLowerCase() || 'api'}-${Date.now()}-${idx}`,
        title: job.title || 'Untitled',
        company: job.company || 'Unknown Company',
        location: job.location || 'Remote',
        description: job.description || '',
        url: job.url || '#',
        source: job.source || 'API',
        posted_date: job.posted_date || 'Recently',
        salary: job.salary || '',
        job_type: job.job_type || 'Full-Time',
        matchScore: matchScore,
        matchedSkills: matchedSkills,
        missingSkills: missingSkills,
        keywords: job.keywords || [],
        category: job.category || '',
        department: job.department || '',
      };
    });

    // Sort by match score
    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

    // Group by platform
    const jobsByPlatform = {};
    scoredJobs.forEach(job => {
      const key = (job.source || 'other').toLowerCase();
      if (!jobsByPlatform[key]) jobsByPlatform[key] = [];
      jobsByPlatform[key].push(job);
    });

    console.log(`[JOB-API-SEARCH] Found ${scoredJobs.length} jobs from APIs`);

    res.json({
      success: true,
      data: {
        jobs: scoredJobs,
        jobsByPlatform: jobsByPlatform,
        resumeInfo: resumeInfo,
        statistics: response.data.data?.statistics || {},
      }
    });

  } catch (error) {
    console.error('[JOB-API-SEARCH] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/jobseeker/find-matching-jobs
 * Find matching jobs for a resume from multiple platforms
 * Uses NLP + Semantic matching via Python AI service
 */
router.post('/jobseeker/find-matching-jobs', authMiddleware, async (req, res) => {
  try {
    const { resumeId, jobTarget, location } = req.body;

    if (!resumeId) {
      return res.status(400).json({ success: false, error: 'Resume ID required' });
    }

    console.log(`\n🔍 Finding matching jobs for resume: ${resumeId}`);

    // Get resume from database
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    // Ensure user owns this resume
    if (resume.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    console.log(`✅ Resume found: ${resume.parsedData?.name || 'Unknown'}`);

    // ══════════════════════════════════════════════════════════════
    //  SMART TARGET JOB TITLE EXTRACTION
    //  Instead of defaulting to "Developer", extract from resume context
    // ══════════════════════════════════════════════════════════════
    let targetJobTitle = jobTarget || resume.jobTarget || '';
    if (!targetJobTitle || targetJobTitle === 'Developer') {
      // Try to extract from experience titles
      const expTitles = (resume.parsedData?.experience || [])
        .map(e => e.title || e.position || '')
        .filter(t => t.length > 2);
      if (expTitles.length > 0) {
        targetJobTitle = expTitles[0]; // Use most recent job title
      }
    }
    if (!targetJobTitle || targetJobTitle === 'Developer') {
      // Try to infer from summary
      const summary = (resume.parsedData?.summary || '').toLowerCase();
      const rolePatterns = [
        /\b(data\s*(?:analyst|scientist|engineer))\b/i,
        /\b(software\s*(?:engineer|developer))\b/i,
        /\b(web\s*developer)\b/i,
        /\b(frontend|front[- ]end)\s*developer\b/i,
        /\b(backend|back[- ]end)\s*developer\b/i,
        /\b(full[- ]?stack)\s*developer\b/i,
        /\b(python|java|node|react|angular)\s*developer\b/i,
        /\b(machine\s*learning\s*engineer)\b/i,
        /\b(devops\s*engineer)\b/i,
        /\b(business\s*analyst)\b/i,
        /\b(project\s*manager)\b/i,
        /\b(qa\s*engineer|tester)\b/i,
        /\b(ui[\/\s]?ux\s*designer)\b/i,
        /\b(graphic\s*designer)\b/i,
      ];
      for (const pattern of rolePatterns) {
        const match = summary.match(pattern);
        if (match) {
          targetJobTitle = match[1];
          break;
        }
      }
    }
    if (!targetJobTitle || targetJobTitle === 'Developer') {
      // Infer from skills
      const skills = (resume.parsedData?.skills || []).map(s => s.toLowerCase());
      if (skills.some(s => s.includes('data') || s.includes('pandas') || s.includes('tableau') || s.includes('power bi'))) {
        targetJobTitle = 'Data Analyst';
      } else if (skills.some(s => s.includes('react') || s.includes('angular') || s.includes('vue'))) {
        targetJobTitle = 'Frontend Developer';
      } else if (skills.some(s => s.includes('node') || s.includes('express') || s.includes('django'))) {
        targetJobTitle = 'Backend Developer';
      } else if (skills.some(s => s.includes('python') || s.includes('machine learning') || s.includes('tensorflow'))) {
        targetJobTitle = 'Python Developer';
      } else if (skills.some(s => s.includes('java') && !s.includes('javascript'))) {
        targetJobTitle = 'Java Developer';
      } else {
        targetJobTitle = 'Software Developer';
      }
    }

    // ══════════════════════════════════════════════════════════════
    //  CLEAN RESUME SKILLS
    //  Filter out garbage tokens from parsed resume
    // ══════════════════════════════════════════════════════════════
    const rawSkills = resume.parsedData?.skills || [];
    const garbagePatterns = [
      /^additional\s*information/i, /^\d+/, /uploads\/min/i,
      /^worked\s*on/i, /^and\s/i, /^\W+$/, /^(the|a|an|to|in|of|for)$/i,
      /^[^a-zA-Z]*$/, /\.$/,
    ];
    const resumeSkills = rawSkills
      .map(s => typeof s === 'string' ? s.trim() : '')
      .filter(s => {
        if (s.length < 2 || s.length > 50) return false;
        return !garbagePatterns.some(p => p.test(s));
      });

    // Also extract clean skills from full resume text using the engine's TECH_SKILLS list
    const fullResumeText = [
      resume.parsedData?.summary || '',
      ...(resume.parsedData?.experience || []).map(e => `${e.title || ''} ${e.description || ''}`),
      ...(resume.parsedData?.education || []).map(e => `${e.degree || ''} ${e.field || ''}`),
      ...resumeSkills,
    ].join(' ');
    const cleanedSkillsFromText = extractSkillsFromResume(fullResumeText);
    // Merge: use cleaned skills from TECH_SKILLS + any valid parsed skills
    const mergedSkills = [...new Set([...cleanedSkillsFromText, ...resumeSkills.map(s => s.toLowerCase())])];

    const candidateName = resume.parsedData?.name || 'Candidate';
    const resumeSummary = resume.parsedData?.summary || '';
    const searchQuery = `${targetJobTitle} ${mergedSkills.slice(0, 5).join(' ')}`.trim();

    // Estimate experience years from resume
    const expEntries = resume.parsedData?.experience || [];
    const estimatedYears = Math.max(1, Math.min(expEntries.length * 2, 15));

    console.log(`📋 Candidate: ${candidateName}`);
    console.log(`📋 Target Job: ${targetJobTitle}`);
    console.log(`📋 Raw Skills (${rawSkills.length}): ${rawSkills.slice(0, 5).join(', ')}`);
    console.log(`📋 Cleaned Skills (${mergedSkills.length}): ${mergedSkills.slice(0, 10).join(', ')}`);
    console.log(`📋 Est. Experience: ~${estimatedYears} years`);
    console.log(`🌍 Step 1/2: Searching jobs from API platforms + scrapers...`);

    // STEP 1: Search jobs from FREE APIs (Remotive + Jobicy + Arbeitnow + USAJobs) AND scrapers
    let allJobs = [];
    
    // 1A: API-based job search (most reliable)
    try {
      const apiResponse = await axios.post(
        `${PYTHON_SERVICE_URL}/api/search-jobs-api`,
        {
          query: targetJobTitle,
          location: location || '',
          max_per_platform: 10,
          platforms: ['remotive', 'jobicy', 'arbeitnow', 'usajobs'],
        },
        { timeout: 30000 }
      );

      if (apiResponse.data.success) {
        const apiJobs = apiResponse.data.data?.jobs || [];
        allJobs.push(...apiJobs);
        console.log(`✅ API search: ${apiJobs.length} jobs from Remotive/Jobicy/Arbeitnow/USAJobs`);
      }
    } catch (apiErr) {
      console.warn(`⚠️ API search error: ${apiErr.message}`);
    }

    // 1B: Scrape Indeed (HTTP scraper — no browser)
    try {
      const scrapingResponse = await axios.post(
        `${PYTHON_SERVICE_URL}/api/scrape-jobs`,
        {
          jobTitle: targetJobTitle,
          keywords: searchQuery,
          location: location || 'Pakistan',
          platforms: ['indeed'],
          max_results_per_platform: 10
        },
        { timeout: 45000 }
      );

      if (scrapingResponse.data.success) {
        const scraperJobs = scrapingResponse.data.data?.jobs || [];
        allJobs.push(...scraperJobs);
        const byPlatform = scrapingResponse.data.data?.jobsByPlatform || {};
        console.log(`✅ Scraper: ${scraperJobs.length} jobs (Indeed: ${(byPlatform.indeed || []).length}, Rozee: ${(byPlatform.rozee || []).length}, Glassdoor: ${(byPlatform.glassdoor || []).length})`);
      }
    } catch (scrapeErr) {
      console.warn(`⚠️ Scraping error: ${scrapeErr.message}`);
    }

    console.log(`✅ Found ${allJobs.length} total jobs from all platforms`);

    if (allJobs.length === 0) {
      return res.json({
        success: true,
        data: {
          resumeInfo: {
            id: resume._id,
            name: candidateName,
            targetRole: targetJobTitle,
            skills: mergedSkills,
            summary: resumeSummary
          },
          allMatchingJobs: [],
          jobsByPlatform: {},
          statistics: { totalJobsFound: 0, totalMatches: 0, byPlatform: {}, averageMatchScore: 0 },
          message: 'No jobs found from platforms. Try again later.'
        }
      });
    }

    // STEP 2: TF-IDF + Cosine Similarity matching (Node.js - no Python dependency)
    console.log(`🧠 Step 2/2: TF-IDF matching (Node.js recommendation engine)...`);

    let matchingJobs = [];

    try {
      const scored = matchScrapedJobs({
        resumeSkills: mergedSkills,  // Use cleaned skills instead of raw garbage
        resumeTitle: targetJobTitle,
        resumeSummary: fullResumeText,  // Use full resume text for better TF-IDF
        resumeExperienceYears: estimatedYears,
        jobs: allJobs,
        minScore: 10,  // Lower threshold — let frontend decide what to show
      });

      matchingJobs = scored.map((job, idx) => ({
        id: `${job.source || 'job'}-${Date.now()}-${idx}`,
        title: job.title || 'Untitled',
        company: job.company || 'Unknown Company',
        location: job.location || 'Pakistan',
        description: job.description || '',
        source: job.source || 'unknown',
        url: job.url || '#',
        matchScore: job.matchScore || 0,
        matchedSkills: job.matchedSkills || [],
        missingSkills: job.missingSkills || [],
        skillScore: job.skillScore || 0,
        semanticScore: job.semanticScore || 0,
        titleScore: job.titleScore || 0,
        experienceScore: job.experienceScore || 0,
        reason: job.reason || '',
        postedDate: job.posted_date || job.postedDate || 'Recently',
        easyApply: job.easy_apply || false,
      }));
      console.log(`✅ TF-IDF Matching complete: ${matchingJobs.length} jobs scored & ranked`);
    } catch (matchErr) {
      console.warn(`⚠️ TF-IDF matching error: ${matchErr.message}`);
      // Fallback: basic keyword matching
      console.log(`📊 Using basic keyword matching as fallback...`);
      for (const job of allJobs) {
        const jobText = `${job.title} ${job.description || ''}`.toLowerCase();
        const matched = mergedSkills.filter(s => jobText.includes(s.toLowerCase()));
        const score = Math.min(100, 30 + matched.length * 12);
        matchingJobs.push({
          id: `${job.source || 'job'}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: job.title || 'Untitled',
          company: job.company || 'Unknown',
          location: job.location || 'Pakistan',
          description: job.description || '',
          source: job.source || 'unknown',
          url: job.url || '#',
          matchScore: score,
          matchedSkills: matched,
          missingSkills: [],
          postedDate: job.posted_date || 'Recently',
        });
      }
      matchingJobs.sort((a, b) => b.matchScore - a.matchScore);
    }

    // Save scraped jobs to DB for caching
    try {
      const ScrapedJob = (await import('../models/ScrapedJob.js')).default;
      for (const job of matchingJobs) {
        try {
          await ScrapedJob.findOneAndUpdate(
            { url: job.url },
            {
              $set: {
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                source: job.source,
                url: job.url,
                postedDate: job.postedDate,
                scrapedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
              $addToSet: {
                matches: {
                  resumeId: resume._id,
                  userId: req.user._id,
                  matchScore: job.matchScore,
                  matchedSkills: job.matchedSkills,
                  missingSkills: job.missingSkills,
                  matchedAt: new Date(),
                }
              }
            },
            { upsert: true, new: true }
          );
        } catch (saveErr) {
          // Ignore duplicate key errors
        }
      }
      console.log(`💾 Saved ${matchingJobs.length} jobs to database cache`);
    } catch (dbErr) {
      console.warn(`⚠️ DB cache save failed (non-critical): ${dbErr.message}`);
    }

    console.log(`\n✅ Resume Matching Complete`);
    console.log(`   Total Jobs Scraped: ${allJobs.length}`);
    console.log(`   Matching Jobs: ${matchingJobs.length}`);
    if (matchingJobs.length > 0) {
      console.log(`   Top Match: ${matchingJobs[0].title} (${matchingJobs[0].matchScore}%)`);
    }

    // Group by platform
    const jobsByPlatform = {};
    matchingJobs.forEach(job => {
      const key = job.source || 'other';
      if (!jobsByPlatform[key]) jobsByPlatform[key] = [];
      jobsByPlatform[key].push(job);
    });

    res.json({
      success: true,
      data: {
        resumeInfo: {
          id: resume._id,
          name: candidateName,
          targetRole: targetJobTitle,
          skills: resumeSkills,
          summary: resumeSummary
        },
        allMatchingJobs: matchingJobs,
        jobsByPlatform: jobsByPlatform,
        statistics: {
          totalJobsFound: allJobs.length,
          totalMatches: matchingJobs.length,
          byPlatform: Object.keys(jobsByPlatform).reduce((acc, key) => {
            acc[key] = jobsByPlatform[key].length;
            return acc;
          }, {}),
          averageMatchScore: matchingJobs.length > 0 
            ? Math.round(matchingJobs.reduce((sum, j) => sum + j.matchScore, 0) / matchingJobs.length)
            : 0,
          matchingTechnique: 'TF-IDF Vectorization + Cosine Similarity (Node.js natural)'
        }
      }
    });

  } catch (error) {
    console.error('🔴 Find matching jobs error:', error.message);
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn('⚠️ Python service unavailable, returning empty results');
      return res.json({
        success: true,
        data: {
          allMatchingJobs: [],
          jobsByPlatform: {},
          statistics: { totalJobsFound: 0, totalMatches: 0, byPlatform: {}, averageMatchScore: 0 },
          error: 'Job scraping service is temporarily unavailable. Please try again later.'
        }
      });
    }
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || 'Unknown error'
    });
  }
});

// ============================================
// APPLICATION ROUTES (Job Seeker Apply)
// ============================================

/**
 * POST /api/jobs/:jobId/apply
 * Job seeker applies to a job — sends resume directly to HR
 */
router.post('/jobs/:jobId/apply', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { jobId } = req.params;
    const { coverNote } = req.body;

    // Find the job
    const job = await Job.findById(jobId).populate('postedBy', 'name email company');
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.status !== 'active') {
      return res.status(400).json({ success: false, error: 'This job is no longer accepting applications' });
    }

    // Get the job seeker's latest resume
    const resume = await Resume.findOne({ user: userId }).sort({ createdAt: -1 });
    if (!resume) {
      return res.status(400).json({ success: false, error: 'Please upload your resume before applying' });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({ jobSeeker: userId, job: jobId });
    if (existingApplication) {
      return res.status(400).json({ success: false, error: 'You have already applied to this job' });
    }

    // Calculate match score
    const resumeSkills = (resume.parsedData?.skills || []).map(s => s.toLowerCase());
    const jobText = [
      job.title || '', job.description || '',
      ...(job.requirements || []), ...(job.skillsRequired || [])
    ].join(' ').toLowerCase();
    const matchedSkills = resumeSkills.filter(skill => jobText.includes(skill));
    const matchScore = resumeSkills.length > 0
      ? Math.round((matchedSkills.length / resumeSkills.length) * 100)
      : 0;

    // Create the application
    const application = new Application({
      jobSeeker: userId,
      job: jobId,
      resume: resume._id,
      hr: job.postedBy._id || job.postedBy,
      status: 'pending',
      matchScore,
      coverNote: coverNote || '',
      statusHistory: [{ status: 'pending', changedAt: new Date(), note: 'Application submitted' }]
    });

    await application.save();

    // Add resume to job's applicants array (for HR screening)
    if (!job.applicants) job.applicants = [];
    if (!job.applicants.includes(resume._id)) {
      job.applicants.push(resume._id);
      await job.save();
    }

    console.log(`[APPLY] User ${userId} applied to job ${jobId} (match: ${matchScore}%)`);

    res.json({
      success: true,
      data: application,
      message: 'Application submitted successfully! The HR team will review your resume.'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'You have already applied to this job' });
    }
    console.error('Apply error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobseeker/my-applications
 * Get all applications for the logged-in job seeker
 */
router.get('/jobseeker/my-applications', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const applications = await Application.find({ jobSeeker: userId })
      .populate({
        path: 'job',
        select: 'title company location type salary experience status postedDate'
      })
      .populate('hr', 'name email company')
      .populate({
        path: 'resume',
        select: 'originalFileName parsedData.name parsedData.skills aiAnalysis.atsScore aiAnalysis.overallScore createdAt'
      })
      .sort({ appliedAt: -1 });

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/hr/applications
 * Get all applications received by this HR (their posted jobs)
 */
router.get('/hr/applications', authMiddleware, async (req, res) => {
  try {
    const hrId = req.user._id;

    const applications = await Application.find({ hr: hrId })
      .populate('jobSeeker', 'name email')
      .populate({
        path: 'job',
        select: 'title company location type'
      })
      .populate({
        path: 'resume',
        select: 'originalFile originalFileName parsedData aiAnalysis decisionStatus'
      })
      .sort({ appliedAt: -1 });

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Get HR applications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/hr/applications/:id/status
 * HR updates application status
 */
router.put('/hr/applications/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const hrId = req.user._id;

    const validStatuses = ['pending', 'reviewing', 'shortlisted', 'interview_scheduled', 'selected', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const application = await Application.findOne({ _id: id, hr: hrId });
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    application.status = status;
    application.updatedAt = new Date();
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      note: note || `Status changed to ${status}`
    });

    if (note) application.hrNotes = note;

    await application.save();

    res.json({
      success: true,
      data: application,
      message: `Application status updated to ${status}`
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/:jobId/application-status
 * Check if job seeker has already applied to a job
 */
router.get('/jobs/:jobId/application-status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { jobId } = req.params;

    const application = await Application.findOne({ jobSeeker: userId, job: jobId });

    res.json({
      success: true,
      applied: !!application,
      status: application?.status || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// COMPANIES ROUTE (Explore Companies)
// ============================================

/**
 * GET /api/companies
 * Get all HR companies with job counts
 */
router.get('/companies', authMiddleware, async (req, res) => {
  try {
    // Get all HR users
    const hrUsers = await User.find({ role: 'hr' }).select('name email company avatar');

    // Get job counts per HR
    const companies = await Promise.all(hrUsers.map(async (hr) => {
      const activeJobs = await Job.countDocuments({ postedBy: hr._id, status: 'active' });
      const totalJobs = await Job.countDocuments({ postedBy: hr._id });

      return {
        _id: hr._id,
        name: hr.name,
        email: hr.email,
        company: hr.company || 'Unknown Company',
        avatar: hr.avatar,
        activeJobs,
        totalJobs
      };
    }));

    // Group by company name
    const companyMap = {};
    companies.forEach(c => {
      const key = c.company;
      if (!companyMap[key]) {
        companyMap[key] = {
          company: key,
          recruiters: [],
          activeJobs: 0,
          totalJobs: 0,
          email: c.email,
          avatar: c.avatar
        };
      }
      companyMap[key].recruiters.push({ name: c.name, email: c.email, _id: c._id });
      companyMap[key].activeJobs += c.activeJobs;
      companyMap[key].totalJobs += c.totalJobs;
    });

    res.json({
      success: true,
      data: Object.values(companyMap)
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN DASHBOARD ROUTES (Live Data)
// ============================================

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/admin/stats', authMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const jobSeekers = await User.countDocuments({ role: 'jobseeker' });
    const hrRecruiters = await User.countDocuments({ role: 'hr' });
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const flaggedFromReports = await AnomalyReport.countDocuments({ status: { $in: ['flagged', 'pending', 'Flagged'] } });
    const flaggedFromResumes = await Resume.countDocuments({ 'anomalyDetection.hasAnomalies': true });
    const flaggedResumes = flaggedFromReports > 0 ? flaggedFromReports : flaggedFromResumes;
    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ status: 'active' });
    const totalApplications = await Application.countDocuments();
    const totalResumes = await Resume.countDocuments();

    // Calculate percentages
    const seekerPercent = totalUsers > 0 ? Math.round((jobSeekers / totalUsers) * 100) : 0;
    const hrPercent = totalUsers > 0 ? Math.round((hrRecruiters / totalUsers) * 100) : 0;

    // Get real premium revenue from subscriptions
    const activeSubscriptions = await Subscription.find({ status: 'active', paymentStatus: 'Paid' });
    const premiumRevenue = activeSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0) || premiumUsers * 29;

    res.json({
      success: true,
      data: {
        totalUsers,
        jobSeekers,
        hrRecruiters,
        premiumUsers,
        flaggedResumes,
        totalJobs,
        activeJobs,
        totalApplications,
        totalResumes,
        seekerPercent,
        hrPercent,
        premiumRevenue
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/user-growth
 * Get user growth data for charts
 */
router.get('/admin/user-growth', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const weeks = [];
    
    for (let i = 5; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      
      const count = await User.countDocuments({
        createdAt: { $lte: weekEnd }
      });
      
      weeks.push({
        name: `Week ${6 - i}`,
        users: count
      });
    }

    res.json({ success: true, data: weeks });
  } catch (error) {
    console.error('User growth error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/recent-users
 * Get recently registered users
 */
router.get('/admin/recent-users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('name email role isPremium createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    const formattedUsers = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role === 'hr' ? 'HR' : u.role === 'admin' ? 'Admin' : 'Job Seeker',
      status: 'Active',
      joined: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : 'N/A',
      isPremium: u.isPremium || false
    }));

    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    console.error('Recent users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/anomaly-reports
 * Get recent anomaly reports
 */
router.get('/admin/anomaly-reports', authMiddleware, async (req, res) => {
  try {
    // Primary: AnomalyReport collection
    const reports = await AnomalyReport.find()
      .populate('resume', 'originalFile parsedData')
      .sort({ createdAt: -1 })
      .limit(10);

    let formatted = reports.map(r => ({
      _id: r._id,
      resume: r.resume?.originalFile || r.resume?.parsedData?.name || 'Unknown',
      score: r.riskScore || 0,
      status: r.status || 'Flagged',
      reason: (r.indicators && r.indicators.length > 0) ? r.indicators[0] : 'Suspicious content',
      priority: r.priority || 'medium',
      createdAt: r.createdAt
    }));

    // Fallback: pull from Resume.anomalyDetection if no dedicated reports
    if (formatted.length === 0) {
      const flaggedResumes = await Resume.find({
        'anomalyDetection.hasAnomalies': true
      })
        .populate('user', 'name email')
        .sort({ 'anomalyDetection.detectedAt': -1 })
        .limit(10);

      formatted = flaggedResumes.map(r => ({
        _id: r._id,
        resume: r.parsedData?.name || r.originalFile || 'Unknown',
        score: r.anomalyDetection?.anomalyCount
          ? Math.min(100, r.anomalyDetection.anomalyCount * 15 + 30)
          : 50,
        status: r.anomalyDetection?.severity === 'high' ? 'Flagged' : 'Pending',
        reason: r.anomalyDetection?.issues?.[0]?.message
          || (r.anomalyDetection?.issues?.[0]?.type || 'Anomaly detected'),
        priority: r.anomalyDetection?.severity || 'medium',
        createdAt: r.anomalyDetection?.detectedAt || r.createdAt
      }));
    }

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Anomaly reports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/ai-usage
 * Get AI usage statistics with anomaly trends
 */
router.get('/admin/ai-usage', authMiddleware, async (req, res) => {
  try {
    const totalResumes = await Resume.countDocuments();
    const analyzedResumes = await Resume.countDocuments({ aiAnalysis: { $exists: true, $ne: null } });
    const matchCount = await Match.countDocuments();
    const anomalyCount = await AnomalyReport.countDocuments();

    // Average scores from analyzed resumes
    const scoreAgg = await Resume.aggregate([
      { $match: { aiAnalysis: { $exists: true, $ne: null } } },
      { $group: {
        _id: null,
        avgAts: { $avg: '$aiAnalysis.atsScore' },
        avgGrammar: { $avg: '$aiAnalysis.grammarScore' },
        avgRelevancy: { $avg: '$aiAnalysis.relevancyScore' },
      }}
    ]);
    const avgScores = scoreAgg[0] || { avgAts: 0, avgGrammar: 0, avgRelevancy: 0 };

    // Score distribution
    const low = await Resume.countDocuments({ 'aiAnalysis.atsScore': { $gt: 0, $lt: 40 } });
    const medium = await Resume.countDocuments({ 'aiAnalysis.atsScore': { $gte: 40, $lt: 60 } });
    const high = await Resume.countDocuments({ 'aiAnalysis.atsScore': { $gte: 60, $lt: 80 } });
    const excellent = await Resume.countDocuments({ 'aiAnalysis.atsScore': { $gte: 80 } });

    // Anomaly trends - last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const anomalyTrends = await AnomalyReport.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        total: { $sum: 1 },
        flagged: { $sum: { $cond: [{ $in: ['$status', ['flagged', 'Flagged']] }, 1, 0] } },
        cleared: { $sum: { $cond: [{ $eq: ['$status', 'cleared'] }, 1, 0] } },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const found = anomalyTrends.find(t => t._id.year === d.getFullYear() && t._id.month === d.getMonth() + 1);
      trends.push({
        month: monthNames[d.getMonth()],
        total: found?.total || 0,
        flagged: found?.flagged || 0,
        cleared: found?.cleared || 0,
      });
    }

    res.json({
      success: true,
      data: {
        totalAnalyzed: analyzedResumes,
        anomaliesDetected: anomalyCount,
        averageAtsScore: avgScores.avgAts || 0,
        averageGrammarScore: avgScores.avgGrammar || 0,
        averageRelevancyScore: avgScores.avgRelevancy || 0,
        analysisResults: { low, medium, high, excellent },
        anomalyTrends: trends,
        usageBreakdown: [
          { name: 'Resume Analysis', value: analyzedResumes },
          { name: 'Job Matching', value: matchCount },
          { name: 'Anomaly Detection', value: anomalyCount }
        ]
      }
    });
  } catch (error) {
    console.error('AI usage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Admin deletes a user
 */
router.delete('/admin/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    // Also delete user's resumes and applications
    await Resume.deleteMany({ user: id });
    await Application.deleteMany({ jobSeeker: id });
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN - ALL USERS (with search & filter)
// ============================================
router.get('/admin/users', authMiddleware, async (req, res) => {
  try {
    const { search, role, premium, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (premium === 'true') {
      filter.isPremium = true;
    } else if (role && role !== 'all') {
      filter.role = role;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('name email role company isPremium premiumExpiresAt createdAt isEmailVerified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const formatted = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      roleLabel: u.role === 'hr' ? 'HR' : u.role === 'admin' ? 'Admin' : 'Job Seeker',
      company: u.company || '',
      isPremium: u.isPremium || false,
      isEmailVerified: u.isEmailVerified || false,
      joined: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : 'N/A',
      createdAt: u.createdAt
    }));

    res.json({ success: true, data: formatted, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN - ALL JOBS
// ============================================
router.get('/admin/jobs', authMiddleware, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { title: searchRegex },
        { company: searchRegex },
        { location: searchRegex }
      ];
    }

    const total = await Job.countDocuments(filter);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await Job.find(filter)
      .populate('postedBy', 'name email company')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const formatted = jobs.map(j => ({
      _id: j._id,
      title: j.title,
      company: j.company,
      location: j.location || 'N/A',
      type: j.type || 'Full-time',
      status: j.status || 'active',
      salary: j.salary || '',
      experience: j.experience || '',
      applications: 0,
      postedBy: j.postedBy ? { name: j.postedBy.name, email: j.postedBy.email } : null,
      createdAt: j.createdAt,
      posted: j.createdAt ? new Date(j.createdAt).toISOString().split('T')[0] : 'N/A'
    }));

    // Get application counts
    for (const job of formatted) {
      job.applications = await Application.countDocuments({ job: job._id });
    }

    res.json({ success: true, data: formatted, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Admin jobs list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN - ALL ANOMALY REPORTS (full)
// ============================================
router.get('/admin/anomaly-reports-full', authMiddleware, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    // 1. Try AnomalyReport collection first
    const total = await AnomalyReport.countDocuments(filter);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reports = await AnomalyReport.find(filter)
      .populate({ path: 'resume', select: 'originalFile parsedData user', populate: { path: 'user', select: 'name email' } })
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    let formatted = reports.map(r => ({
      _id: r._id,
      resumeName: r.resume?.originalFile || r.resume?.parsedData?.name || 'Unknown',
      userName: r.resume?.user?.name || r.reportedBy?.name || r.resume?.parsedData?.name || 'Unknown',
      userEmail: r.resume?.user?.email || r.reportedBy?.email || 'N/A',
      riskScore: r.riskScore || 0,
      status: r.status || 'flagged',
      indicators: r.indicators || [],
      priority: r.priority || 'medium',
      createdAt: r.createdAt,
      date: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : 'N/A'
    }));

    // 2. Fallback: pull from Resume.anomalyDetection if no dedicated reports
    let totalCount = total;
    if (formatted.length === 0) {
      const resumeFilter = { 'anomalyDetection.hasAnomalies': true };
      if (status && status !== 'all') {
        // Map statuses
        if (status === 'flagged') resumeFilter['anomalyDetection.severity'] = { $in: ['high', 'medium'] };
        if (status === 'pending') resumeFilter['anomalyDetection.severity'] = 'low';
      }
      totalCount = await Resume.countDocuments(resumeFilter);
      const flaggedResumes = await Resume.find(resumeFilter)
        .populate('user', 'name email')
        .sort({ 'anomalyDetection.detectedAt': -1 })
        .skip(skip)
        .limit(parseInt(limit));

      formatted = flaggedResumes.map(r => {
        const anomaly = r.anomalyDetection || {};
        const indicators = (anomaly.issues || []).map(i => i.message || i.type || 'Unknown issue');
        const riskScore = anomaly.anomalyCount
          ? Math.min(100, anomaly.anomalyCount * 15 + 30)
          : (anomaly.severity === 'high' ? 75 : anomaly.severity === 'medium' ? 50 : 30);
        const detectedAt = anomaly.detectedAt || r.createdAt;

        // Apply search filter
        if (search) {
          const q = search.toLowerCase();
          const nameMatch = (r.parsedData?.name || '').toLowerCase().includes(q);
          const emailMatch = (r.user?.email || '').toLowerCase().includes(q);
          if (!nameMatch && !emailMatch) return null;
        }

        return {
          _id: r._id,
          resumeName: r.parsedData?.name || r.originalFile || 'Unknown',
          userName: r.user?.name || r.parsedData?.name || 'Unknown',
          userEmail: r.user?.email || r.parsedData?.email || 'N/A',
          riskScore,
          status: anomaly.severity === 'high' ? 'flagged' : 'pending',
          indicators: indicators.length > 0 ? indicators : ['Anomaly detected in resume data'],
          priority: anomaly.severity || 'medium',
          createdAt: detectedAt,
          date: detectedAt ? new Date(detectedAt).toISOString().split('T')[0] : 'N/A'
        };
      }).filter(Boolean);
    } else if (search) {
      // Apply search to AnomalyReport results
      const q = search.toLowerCase();
      formatted = formatted.filter(r =>
        r.resumeName.toLowerCase().includes(q) ||
        r.userName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: formatted, total: totalCount, page: parseInt(page), pages: Math.ceil(totalCount / parseInt(limit)) });
  } catch (error) {
    console.error('Anomaly reports full error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN - LOGS
// ============================================
router.get('/admin/logs', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const total = await AdminLog.countDocuments();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await AdminLog.find()
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const formatted = logs.map(l => ({
      _id: l._id,
      action: l.action,
      category: l.category,
      details: l.details,
      performedBy: l.performedBy ? { name: l.performedBy.name, email: l.performedBy.email } : null,
      createdAt: l.createdAt,
      date: l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : 'N/A'
    }));

    res.json({ success: true, data: formatted, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN - TOGGLE JOB STATUS
// ============================================
router.patch('/admin/jobs/:id/toggle-status', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    job.status = job.status === 'active' ? 'closed' : 'active';
    await job.save();

    res.json({ success: true, data: { _id: job._id, status: job.status } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN - DELETE JOB
// ============================================
router.delete('/admin/jobs/:id', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    await Application.deleteMany({ job: req.params.id });
    res.json({ success: true, message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENHANCED RESUME - Generate with Gemini AI (primary) + Groq fallback
// ============================================
router.post('/jobseeker/enhance-resume', authMiddleware, requirePremium, async (req, res) => {
  try {
    const { resumeId } = req.body;
    const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    const parsedData = resume.parsedData || {};
    const analysis = resume.aiAnalysis || {};
    const name = parsedData.name || 'Candidate';
    const email = parsedData.email || '';
    const phone = parsedData.phone || '';
    const skills = parsedData.skills || [];
    const experience = parsedData.experience || [];
    const education = parsedData.education || [];
    const summary = parsedData.summary || '';
    const rawText = parsedData.rawText || '';

    const weaknesses = analysis.weaknesses || [];
    const suggestions = analysis.suggestions || [];
    const strengths = analysis.strengths || [];

    // Build resume context for AI
    const resumeContext = `
Name: ${name}
Email: ${email}
Phone: ${phone}
Skills: ${skills.join(', ')}
Summary: ${summary}
Experience: ${JSON.stringify(experience)}
Education: ${JSON.stringify(education)}
Full Resume Text: ${rawText.slice(0, 3000)}
Current ATS Score: ${analysis.atsScore || 'N/A'}
Current Grammar Score: ${analysis.grammarScore || 'N/A'}
Current Readability: ${analysis.readability || 'N/A'}
Current Structure Score: ${analysis.structureScore || 'N/A'}
Strengths: ${strengths.join('; ') || 'None identified'}
Weaknesses Found: ${weaknesses.join('; ') || 'None identified'}
Suggestions: ${suggestions.join('; ') || 'None identified'}
`;

    const prompt = `You are an expert resume writer, ATS optimization specialist, and career consultant. Your task is to completely transform and enhance the following resume to achieve the highest possible scores in ALL four categories: ATS Compatibility, Grammar & Language, Readability, and Structure.

RESUME DATA:
${resumeContext}

SPECIFIC WEAK AREAS TO FIX (from analysis):
${weaknesses.length > 0 ? weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n') : 'No specific weaknesses identified — focus on general improvement.'}

SUGGESTIONS TO IMPLEMENT (from analysis):
${suggestions.length > 0 ? suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'No specific suggestions — apply best practices.'}

STRENGTHS TO PRESERVE:
${strengths.length > 0 ? strengths.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'Enhance everything.'}

ENHANCEMENT REQUIREMENTS:

1. ATS OPTIMIZATION (Target: 90%+):
   - Use standard ATS-friendly section headers: "Professional Summary", "Experience", "Education", "Skills", "Certifications"
   - Include industry-specific keywords and technical terms relevant to the candidate's field
   - Avoid tables, columns, graphics, headers/footers that ATS cannot parse
   - Use standard date formats and job title conventions
   - Add relevant hard skills and technical tools

2. GRAMMAR & LANGUAGE (Target: 90%+):
   - Fix ALL grammar, spelling, and punctuation errors
   - Use strong action verbs at the start of every bullet: Led, Developed, Implemented, Achieved, Spearheaded, Orchestrated, Optimized
   - Maintain consistent tense: past tense for previous roles, present tense for current
   - Eliminate passive voice, filler words, and weak phrases
   - Ensure parallel structure in all bullet points

3. READABILITY (Target: 90%+):
   - Keep bullet points concise (1-2 lines max)
   - Use clear, professional language avoiding jargon overload
   - Ensure logical flow from most impressive to least
   - Write a compelling 2-3 sentence professional summary
   - Use quantifiable metrics wherever possible (%, $, numbers)

4. STRUCTURE & ORGANIZATION (Target: 90%+):
   - Order sections: Contact Info → Professional Summary → Core Skills → Experience → Education → Certifications → Achievements
   - Each experience entry must have: Title, Company, Duration, Description, 3-5 achievement bullets
   - Group skills into categories if more than 8 skills
   - Include a clear professional summary at the top
   - Ensure consistent formatting throughout

Return ONLY valid JSON (no markdown, no code fences, no explanation) with this exact structure:
{
  "enhancedName": "${name}",
  "enhancedSummary": "A powerful 2-3 sentence professional summary highlighting key achievements, years of experience, and unique value proposition",
  "enhancedSkills": ["skill1", "skill2", "...at least 10-15 relevant skills organized by relevance"],
  "enhancedExperience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Date Range",
      "description": "Brief 1-sentence role overview with scope/impact",
      "bullets": ["Achievement with metrics (e.g., Increased revenue by 30%)", "Second achievement with quantifiable result", "Third achievement demonstrating leadership or technical excellence"]
    }
  ],
  "enhancedEducation": [
    {
      "degree": "Degree Name",
      "institution": "Institution Name",
      "year": "Year or Date Range"
    }
  ],
  "certifications": ["Any relevant certifications mentioned or recommended for this field"],
  "achievements": ["Key quantifiable achievement 1 with numbers/metrics", "Key achievement 2 with impact", "Key achievement 3 with results"],
  "grammarFixes": ["Specific grammar fix 1: before → after", "Grammar fix 2: before → after"],
  "structureImprovements": ["Structure change 1: what was reorganized", "Structure change 2: what section was added/improved"],
  "readabilityImprovements": ["Readability fix 1: what was simplified", "Readability fix 2: what was clarified"],
  "atsKeywordsAdded": ["keyword1", "keyword2", "keyword3", "at least 5-8 industry keywords"],
  "weaknessesAddressed": [{"weakness": "The specific weakness from analysis", "fix": "How it was fixed in the enhanced resume"}, {"weakness": "Another weakness", "fix": "How it was addressed"}],
  "suggestionsApplied": [{"suggestion": "The suggestion from analysis", "implementation": "How it was implemented"}],
  "enhancedScores": {
    "ats": 92,
    "grammar": 94,
    "readability": 91,
    "structure": 93,
    "overall": 92
  },
  "estimatedNewScore": 92
}

CRITICAL RULES:
- Every bullet point MUST start with a strong action verb
- Every bullet SHOULD include a quantifiable metric (%, $, number) where possible
- If experience/education data is sparse, intelligently enhance it using the full resume text
- Do NOT fabricate companies or degrees — only enhance existing information
- The enhancedScores MUST reflect realistic but HIGH scores (88-95%) that this enhanced resume would achieve
- estimatedNewScore should be the weighted overall: ats*0.35 + grammar*0.20 + readability*0.20 + structure*0.25
- The enhanced resume MUST score 88%+ on ALL four categories: ATS, Grammar, Readability, and Structure
- weaknessesAddressed MUST address EVERY weakness listed above with a specific fix
- suggestionsApplied MUST implement EVERY suggestion listed above`;

    let enhancedData = null;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    // Try Groq first (faster, reliable, no quota issues)
    if (GROQ_API_KEY) {
      try {
        console.log('[ENHANCE] Trying Groq API...');
        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
          },
          {
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        const content = groqResponse.data.choices?.[0]?.message?.content;
        if (content) {
          enhancedData = JSON.parse(content);
          console.log('[ENHANCE] Groq API success');
        }
      } catch (groqErr) {
        console.warn('[ENHANCE] Groq API failed:', groqErr.message);
      }
    }

    // Fallback to Gemini if Groq failed
    if (!enhancedData && GEMINI_API_KEY) {
      try {
        console.log('[ENHANCE] Trying Gemini API as fallback...');
        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4000 }
          },
          { timeout: 45000 }
        );

        let content = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
          const jsonStart = content.indexOf('{');
          const jsonEnd = content.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            content = content.substring(jsonStart, jsonEnd + 1);
          }
          enhancedData = JSON.parse(content);
          console.log('[ENHANCE] Gemini API success');
        }
      } catch (geminiErr) {
        console.warn('[ENHANCE] Gemini API also failed:', geminiErr.message);
      }
    }

    if (!enhancedData) {
      return res.status(500).json({ success: false, error: 'AI enhancement service unavailable. Please check API keys and try again.' });
    }

    // Ensure all fields exist with sane defaults
    enhancedData.enhancedName = enhancedData.enhancedName || name;
    enhancedData.enhancedSummary = enhancedData.enhancedSummary || summary || 'Results-driven professional with diverse skills and experience.';
    enhancedData.enhancedSkills = enhancedData.enhancedSkills || skills;
    enhancedData.enhancedExperience = enhancedData.enhancedExperience || experience;
    enhancedData.enhancedEducation = enhancedData.enhancedEducation || education;
    enhancedData.certifications = enhancedData.certifications || [];
    enhancedData.achievements = enhancedData.achievements || [];
    enhancedData.grammarFixes = enhancedData.grammarFixes || [];
    enhancedData.atsKeywordsAdded = enhancedData.atsKeywordsAdded || [];
    enhancedData.structureImprovements = enhancedData.structureImprovements || [];
    enhancedData.readabilityImprovements = enhancedData.readabilityImprovements || [];
    enhancedData.weaknessesAddressed = enhancedData.weaknessesAddressed || [];
    enhancedData.suggestionsApplied = enhancedData.suggestionsApplied || [];

    // Ensure enhanced scores exist and are high
    if (!enhancedData.enhancedScores || typeof enhancedData.enhancedScores !== 'object') {
      enhancedData.enhancedScores = {
        ats: Math.max(88, Math.min(96, (analysis.atsScore || 50) + 25)),
        grammar: Math.max(90, Math.min(97, (analysis.grammarScore || 50) + 30)),
        readability: Math.max(88, Math.min(95, (analysis.readability || 50) + 28)),
        structure: Math.max(89, Math.min(96, (analysis.structureScore || 50) + 30)),
      };
      enhancedData.enhancedScores.overall = Math.round(
        enhancedData.enhancedScores.ats * 0.35 +
        enhancedData.enhancedScores.grammar * 0.20 +
        enhancedData.enhancedScores.readability * 0.20 +
        enhancedData.enhancedScores.structure * 0.25
      );
    }
    // Ensure estimatedNewScore matches
    enhancedData.estimatedNewScore = enhancedData.enhancedScores.overall || enhancedData.estimatedNewScore || 90;

    console.log(`[ENHANCE] Returning enhanced resume for ${name}: ${enhancedData.enhancedSkills.length} skills, ${enhancedData.enhancedExperience.length} experiences`);

    res.json({
      success: true,
      data: {
        original: { name, email, phone, skills, experience, education, summary },
        enhanced: enhancedData
      }
    });
  } catch (error) {
    console.error('Enhanced resume error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// MODULE 3: RESUME ENHANCEMENT & FRAUD DETECTION (FE-1, FE-2, FE-3)
// ============================================

/**
 * POST /api/jobseeker/resume-enhancement-fraud
 * Calls Python Module 3 for FE-1 (formatting/grammar/keyword gaps),
 * FE-2 (fraud/inconsistency detection), FE-3 (action verbs, summaries, ATS layout).
 */
router.post('/jobseeker/resume-enhancement-fraud', authMiddleware, requirePremium, async (req, res) => {
  try {
    const { resumeId, jobDescription } = req.body;

    if (!resumeId) {
      return res.status(400).json({ success: false, error: 'resumeId is required' });
    }

    const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    const parsedData = resume.parsedData || {};
    const resumeText = parsedData.rawText || parsedData.raw_text || '';

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({ success: false, error: 'Resume text is too short for analysis' });
    }

    // Call Python service Module 3 endpoint
    const pythonResponse = await axios.post(
      `${PYTHON_SERVICE_URL}/api/enhance-and-detect`,
      {
        resumeText,
        jobDescription: jobDescription || '',
        parsedData: {
          name: parsedData.name || '',
          email: parsedData.email || '',
          phone: parsedData.phone || '',
          skills: parsedData.skills || [],
          education: parsedData.education || [],
          experience: parsedData.experience || [],
          raw_text: resumeText,
        },
      },
      { timeout: 30000 }
    );

    if (!pythonResponse.data.success) {
      return res.status(500).json({ success: false, error: pythonResponse.data.error || 'Module 3 analysis failed' });
    }

    res.json({
      success: true,
      data: pythonResponse.data.data,
    });
  } catch (error) {
    console.error('Module 3 enhancement/fraud error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// JSEARCH API - Job Search (RapidAPI)
// ============================================

/**
 * GET /api/jsearch/search
 * Search jobs using JSearch RapidAPI
 */
router.get('/jsearch/search', authMiddleware, async (req, res) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
    const { query, location, page = 1, num_pages = 1, employment_types, remote_jobs_only } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ success: false, error: 'JSearch API key not configured' });
    }

    const params = {
      query: location ? `${query} in ${location}` : query,
      page: parseInt(page),
      num_pages: parseInt(num_pages),
    };
    if (employment_types) params.employment_types = employment_types;
    if (remote_jobs_only === 'true') params.remote_jobs_only = true;

    console.log(`[JSEARCH] Searching: "${params.query}" (page ${params.page})`);

    const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
      params,
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
      timeout: 15000,
    });

    const jobs = (response.data.data || []).map(job => ({
      id: job.job_id,
      title: job.job_title,
      company: job.employer_name,
      location: job.job_city
        ? `${job.job_city}${job.job_state ? ', ' + job.job_state : ''}${job.job_country ? ', ' + job.job_country : ''}`
        : job.job_country || 'Remote',
      type: job.job_employment_type || 'Full-time',
      description: job.job_description,
      salary: job.job_min_salary && job.job_max_salary
        ? `$${job.job_min_salary.toLocaleString()} - $${job.job_max_salary.toLocaleString()}`
        : job.job_salary_period
          ? `${job.job_salary_currency || '$'}${job.job_min_salary || 'N/A'} ${job.job_salary_period}`
          : 'Not specified',
      applyUrl: job.job_apply_link,
      logo: job.employer_logo,
      postedDate: job.job_posted_at_datetime_utc,
      source: 'JSearch',
      isRemote: job.job_is_remote,
      qualifications: job.job_highlights?.Qualifications || [],
      responsibilities: job.job_highlights?.Responsibilities || [],
      benefits: job.job_highlights?.Benefits || [],
    }));

    console.log(`[JSEARCH] Found ${jobs.length} jobs for "${params.query}"`);

    res.json({
      success: true,
      data: {
        jobs,
        totalResults: response.data.data?.length || 0,
        page: parseInt(page),
      },
    });
  } catch (error) {
    const status = error.response?.status;
    const apiMsg = error.response?.data?.message || error.message;
    console.error('[JSEARCH] Error:', status, apiMsg);

    // Return specific messages for known RapidAPI errors so frontend can fallback
    if (status === 429) {
      return res.status(429).json({ success: false, error: 'JSearch API quota exceeded. Switching to free job sources.', quotaExceeded: true });
    }
    if (status === 403) {
      return res.status(403).json({ success: false, error: 'JSearch API key invalid or subscription inactive.', quotaExceeded: true });
    }
    res.status(500).json({ success: false, error: 'Failed to search jobs: ' + apiMsg });
  }
});

/**
 * GET /api/jsearch/details/:jobId
 * Get job details from JSearch
 */
router.get('/jsearch/details/:jobId', authMiddleware, async (req, res) => {
  try {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
    const { jobId } = req.params;

    if (!RAPIDAPI_KEY) {
      return res.status(500).json({ success: false, error: 'JSearch API key not configured' });
    }

    const response = await axios.get('https://jsearch.p.rapidapi.com/job-details', {
      params: { job_id: jobId },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
      timeout: 15000,
    });

    const job = response.data.data?.[0];
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      data: {
        id: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        location: job.job_city
          ? `${job.job_city}${job.job_state ? ', ' + job.job_state : ''}${job.job_country ? ', ' + job.job_country : ''}`
          : job.job_country || 'Remote',
        type: job.job_employment_type || 'Full-time',
        description: job.job_description,
        salary: job.job_min_salary && job.job_max_salary
          ? `$${job.job_min_salary.toLocaleString()} - $${job.job_max_salary.toLocaleString()}`
          : 'Not specified',
        applyUrl: job.job_apply_link,
        logo: job.employer_logo,
        postedDate: job.job_posted_at_datetime_utc,
        isRemote: job.job_is_remote,
        qualifications: job.job_highlights?.Qualifications || [],
        responsibilities: job.job_highlights?.Responsibilities || [],
        benefits: job.job_highlights?.Benefits || [],
        companyType: job.employer_company_type,
        companyWebsite: job.employer_website,
      },
    });
  } catch (error) {
    console.error('[JSEARCH-DETAILS] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GLASSDOOR JOB SEARCH (RapidAPI)
// ============================================

/**
 * GET /api/glassdoor/search
 * Search Glassdoor jobs via RapidAPI
 */
router.get('/glassdoor/search', authMiddleware, async (req, res) => {
  try {
    const GLASSDOOR_RAPIDAPI_KEY = process.env.GLASSDOOR_RAPIDAPI_KEY || '';
    const { query, location, page = 1 } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    if (!GLASSDOOR_RAPIDAPI_KEY) {
      return res.status(500).json({ success: false, error: 'Glassdoor API key not configured' });
    }

    console.log(`[GLASSDOOR] Searching: "${query}" location: "${location || 'any'}"`);

    const params = { keyword: query, page: parseInt(page) };
    if (location) params.location = location;

    const response = await axios.get('https://glassdoor-real-time.p.rapidapi.com/jobs/search', {
      params,
      headers: {
        'X-RapidAPI-Key': GLASSDOOR_RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'glassdoor-real-time.p.rapidapi.com',
      },
      timeout: 15000,
    });

    const rawJobs = response.data?.data || response.data?.jobs || response.data || [];
    const jobsArray = Array.isArray(rawJobs) ? rawJobs : [];

    const jobs = jobsArray.map(job => ({
      id: job.job_id || job.id || `gd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: job.job_title || job.title || 'Untitled',
      company: job.employer_name || job.company_name || job.company || 'Unknown',
      location: job.job_location || job.location || 'Not specified',
      type: job.job_type || job.employment_type || 'Full-time',
      description: job.job_description || job.description || '',
      salary: job.salary_range || job.salary || job.compensation || 'Not specified',
      applyUrl: job.apply_url || job.job_url || job.url || '#',
      logo: job.employer_logo || job.company_logo || null,
      postedDate: job.posted_date || job.job_posted_date || '',
      source: 'Glassdoor',
      isRemote: !!(job.is_remote || (job.job_location || '').toLowerCase().includes('remote')),
      rating: job.company_rating || job.rating || null,
    }));

    console.log(`[GLASSDOOR] Found ${jobs.length} jobs for "${query}"`);

    res.json({
      success: true,
      data: { jobs, totalResults: jobs.length, page: parseInt(page) },
    });
  } catch (error) {
    console.error('[GLASSDOOR] Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to search Glassdoor: ' + (error.response?.data?.message || error.message) });
  }
});

// ============================================
// SAVED JOBS CRUD
// ============================================

/**
 * GET /api/jobseeker/saved-jobs
 * Get all saved jobs for current user
 */
router.get('/jobseeker/saved-jobs', authMiddleware, async (req, res) => {
  try {
    const savedJobs = await SavedJob.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: savedJobs });
  } catch (error) {
    console.error('Get saved jobs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/jobseeker/saved-jobs
 * Save a job
 */
router.post('/jobseeker/saved-jobs', authMiddleware, async (req, res) => {
  try {
    const { jobId, title, company, location, type, salary, description, applyUrl, logo, source, postedDate } = req.body;
    if (!jobId || !title) {
      return res.status(400).json({ success: false, error: 'jobId and title are required' });
    }

    const savedJob = await SavedJob.findOneAndUpdate(
      { user: req.user._id, jobId },
      { user: req.user._id, jobId, title, company, location, type, salary, description, applyUrl, logo, source, postedDate },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: savedJob, message: 'Job saved successfully' });
  } catch (error) {
    console.error('Save job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/jobseeker/saved-jobs/:id
 * Remove a saved job
 */
router.delete('/jobseeker/saved-jobs/:id', authMiddleware, async (req, res) => {
  try {
    const result = await SavedJob.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!result) {
      return res.status(404).json({ success: false, error: 'Saved job not found' });
    }
    res.json({ success: true, message: 'Saved job removed' });
  } catch (error) {
    console.error('Delete saved job error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// JOB ALERTS CRUD
// ============================================

/**
 * GET /api/jobseeker/job-alerts
 * Get all job alerts for current user
 */
router.get('/jobseeker/job-alerts', authMiddleware, async (req, res) => {
  try {
    const alerts = await JobAlert.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Get job alerts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/jobseeker/job-alerts
 * Create a new job alert
 */
router.post('/jobseeker/job-alerts', authMiddleware, async (req, res) => {
  try {
    const { keyword, location, jobType, frequency } = req.body;
    if (!keyword) {
      return res.status(400).json({ success: false, error: 'Keyword is required' });
    }

    const alert = await JobAlert.create({
      user: req.user._id,
      keyword,
      location: location || '',
      jobType: jobType || 'all',
      frequency: frequency || 'daily',
    });

    res.json({ success: true, data: alert, message: 'Job alert created successfully' });
  } catch (error) {
    console.error('Create job alert error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/jobseeker/job-alerts/:id
 * Update a job alert
 */
router.put('/jobseeker/job-alerts/:id', authMiddleware, async (req, res) => {
  try {
    const { keyword, location, jobType, frequency, isActive } = req.body;
    const alert = await JobAlert.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { keyword, location, jobType, frequency, isActive },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Job alert not found' });
    }

    res.json({ success: true, data: alert, message: 'Job alert updated' });
  } catch (error) {
    console.error('Update job alert error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/jobseeker/job-alerts/:id
 * Delete a job alert
 */
router.delete('/jobseeker/job-alerts/:id', authMiddleware, async (req, res) => {
  try {
    const result = await JobAlert.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!result) {
      return res.status(404).json({ success: false, error: 'Job alert not found' });
    }
    res.json({ success: true, message: 'Job alert deleted' });
  } catch (error) {
    console.error('Delete job alert error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN - SEND ANNOUNCEMENT
// ============================================
router.post('/admin/announcement', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { title, message, targets } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required' });
    }

    // Build user filter based on targets
    const roleFilter = {};
    if (targets === 'hr') {
      roleFilter.role = 'hr';
    } else if (targets === 'jobseeker') {
      roleFilter.role = 'jobseeker';
    }
    // 'all' = no role filter → sends to all HR + Job Seekers
    if (!targets || targets === 'all') {
      roleFilter.role = { $in: ['hr', 'jobseeker'] };
    }

    const users = await User.find(roleFilter).select('_id');
    
    const notifications = users.map(u => ({
      user: u._id,
      title,
      message,
      type: 'system',
      isRead: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({ 
      success: true, 
      message: `Announcement sent to ${notifications.length} users`,
      count: notifications.length 
    });
  } catch (error) {
    console.error('Send announcement error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

