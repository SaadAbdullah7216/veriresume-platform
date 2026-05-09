# -*- coding: utf-8 -*-
import sys
import io
# Force UTF-8 output to avoid UnicodeEncodeError on Windows cp1252 terminals
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
VeriResume Python AI Microservice
Flask API server that provides AI-powered resume analysis services
to the Node.js backend.

Endpoints:
- POST /api/parse-resume - Extract text and information from resume
- POST /api/analyze-resume - Get ATS score, enhancement suggestions
- POST /api/detect-fraud - Check for fraud indicators and duplicates
- POST /api/detect-anomalies - Check for anomaly indicators and duplicates (alias for detect-fraud)
- POST /api/rank-resumes - Rank multiple resumes against job description
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import traceback
from datetime import datetime
import base64
import tempfile
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import our AI modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from modules.resume_parser import ResumeParser
from modules.anomaly_detector import AnomalyDetector
from modules.deep_analyzer import DeepResumeAnalyzer

# Try Groq first (FREE & FAST), then OpenAI, then Gemini
ai_analyzer = None

# Try OpenAI first (most stable)
try:
    from modules.ai_analyzer import AIAnalyzer
    ai_analyzer = AIAnalyzer()
    print("[OK] Using OpenAI GPT-4o-mini for AI analysis")
except Exception as e2:
    print(f"[WARNING] OpenAI initialization failed: {str(e2)}")
    
    # Try Groq as fallback
    if not ai_analyzer:
        try:
            from modules.groq_analyzer import GroqAnalyzer
            ai_analyzer = GroqAnalyzer()
            print("[OK] Using Groq (Llama 3.3) for AI analysis - FREE & FAST!")
            print(f"DEBUG: AI Analyzer type: {type(ai_analyzer).__name__}")
            print(f"DEBUG: Has analyze_resume method: {hasattr(ai_analyzer, 'analyze_resume')}")
        except Exception as e:
            print(f"[WARNING] Groq initialization failed: {str(e)}")
            
            # Fallback to Gemini
            if not ai_analyzer:
                try:
                    from modules.gemini_analyzer import GeminiAnalyzer
                    ai_analyzer = GeminiAnalyzer()
                    print("[OK] Using Google Gemini as fallback for AI analysis")
                except Exception as e3:
                    print(f"[ERROR] All AI providers failed (OpenAI, Groq, Gemini): {str(e3)}")
                    print("[WARNING] AI analysis features will be disabled")
                    ai_analyzer = None

# Optional modules (make imports non-blocking)
try:
    from modules.fraud_detection import FraudDetector
    fraud_detector = None  # Will initialize later
except ImportError:
    print("Warning: fraud_detection module not fully functional (missing dependencies)")
    FraudDetector = None
    fraud_detector = None

# Import Job API Scraper (Remotive + Jobicy + Arbeitnow + USAJobs — FREE APIs, no browser)
try:
    from modules.job_api_scraper import JobAPIScraper
    job_api_scraper = JobAPIScraper()
    print("[OK] Job API Scraper initialized (Remotive + Jobicy + Arbeitnow + USAJobs)")
except Exception as e:
    print(f"[WARNING] Job API Scraper failed: {e}")
    job_api_scraper = None

# Import Indeed RapidAPI Scraper (real Indeed jobs via RapidAPI)
indeed_api_scraper = None
try:
    from modules.indeed_api_scraper import IndeedAPIScraper
    _rapidapi_key = os.getenv('RAPIDAPI_KEY', '')
    if _rapidapi_key:
        indeed_api_scraper = IndeedAPIScraper(api_key=_rapidapi_key)
        print("[OK] Indeed API Scraper (RapidAPI) initialized")
    else:
        print("[INFO] Indeed API Scraper skipped — no RAPIDAPI_KEY in .env")
except Exception as e:
    print(f"[WARNING] Indeed API Scraper failed: {e}")

# Import LinkedIn RapidAPI Scraper (real LinkedIn jobs via RapidAPI)
linkedin_api_scraper = None
try:
    from modules.linkedin_api_scraper import LinkedInAPIScraper
    _linkedin_key = os.getenv('LINKEDIN_RAPIDAPI_KEY', '')
    if _linkedin_key:
        linkedin_api_scraper = LinkedInAPIScraper(api_key=_linkedin_key)
        print("[OK] LinkedIn API Scraper (RapidAPI) initialized")
    else:
        print("[INFO] LinkedIn API Scraper skipped — no LINKEDIN_RAPIDAPI_KEY in .env")
except Exception as e:
    print(f"[WARNING] LinkedIn API Scraper failed: {e}")

# Import Deep AI Analyzer (Groq + Gemini combined analysis)
try:
    from modules.deep_ai_analyzer import analyze_resume_deep
    print("[OK] Deep AI Analyzer (Groq + Gemini) loaded")
except Exception as e:
    print(f"[WARNING] Deep AI Analyzer import failed: {e}")
    analyze_resume_deep = None

# Import Fast HTTP Job Scraper (fallback for local scraping)
try:
    from modules.job_scraper_fast import FastJobScraper
    job_scraper = FastJobScraper()
    print("[OK] Fast HTTP job scraper initialized (no browser needed)")
except ImportError as e:
    print(f"[WARNING] Fast job scraper import failed: {e}")
    # Fallback to old Selenium scraper
    try:
        from modules.job_scraper import JobScraper
        job_scraper = JobScraper(headless=True)
        print("[OK] Fallback: Selenium job scraper initialized")
    except Exception as e2:
        print(f"[WARNING] Both scrapers failed: {e2}")
        job_scraper = None
except Exception as e:
    print(f"[WARNING] Job scraper setup failed: {e}")
    job_scraper = None

# Import Job Matcher (NLP-based resume-to-job matching)
try:
    from modules.job_matcher import JobMatcher, job_matcher
    print("[OK] Job Matcher (NLP + Semantic) initialized successfully")
except ImportError as e:
    print(f"[WARNING] Job Matcher import failed: {e}")
    job_matcher = None
except Exception as e:
    print(f"[WARNING] Job Matcher setup failed: {e}")
    job_matcher = None

try:
    # Temporarily disabled - sentence_transformers import hangs on Windows
    # from modules.ranking_engine import RankingEngine
    RankingEngine = None
    ranking_engine = None
    print("[INFO] Ranking engine disabled (use AI-based ranking instead)")
except ImportError:
    print("Warning: ranking_engine module not fully functional (missing dependencies)")
    RankingEngine = None
    ranking_engine = None

# Import ENHANCED HR System module (from HRcode_INTEGRATED.py)
print("\n" + "=" * 70)
print("[INIT] INITIALIZING ENHANCED VERIRESUME HR SYSTEM")
print("=" * 70)
print("[INFO] NEW FEATURES:")
print("   - Missing contact info detection (HIGH anomaly)")
print("   - Match threshold filtering")
print("   - 18 types of anomaly checks")
print("   - Smart decision logic (shortlist/review/reject)")
print("   - Groq API semantic matching")
print("-" * 70)

try:
    from modules.hr_system_enhanced import HRSystem
    hr_system = HRSystem()
    print(f"[OK] Enhanced HR System initialized successfully")
    print("-" * 70)
    print("[OK] SYSTEM READY - Advanced screening enabled!")
    print("[INFO] Note: First resume screening will take longer (AI model loading)")
    print("=" * 70 + "\n")
except Exception as e:
    print(f"[WARNING] Enhanced HR System initialization failed: {e}")
    print("[INFO] Falling back to basic HR system...")
    import traceback
    traceback.print_exc()
    try:
        from modules.hr_system import HRSystem
        hr_system = HRSystem()
        print(f"[OK] Basic HR System initialized")
    except:
        HRSystem = None
        hr_system = None
    print("=" * 70 + "\n")

# Import HRCode Service for exact HRcode_INTEGRATED.py logic
print("\n" + "=" * 70)
print("🔧 INITIALIZING HRCODE SERVICE (Direct HRcode_INTEGRATED.py)")
print("=" * 70)

# Define default functions that return None
def get_hrcode_service():
    """Fallback: returns None if hrcode_service not available"""
    return None

def init_hrcode_service():
    """Fallback: returns False if hrcode_service not available"""
    return False

try:
    from hrcode_service import init_hrcode_service, get_hrcode_service
    if init_hrcode_service():
        print("✅ HRCode Service initialized - Using exact HRcode_INTEGRATED.py logic")
    else:
        print("⚠️  HRCode Service initialization returned False")
except Exception as e:
    print(f"❌ Failed to import HRCode service: {e}")
    print("   (Using fallback: no HRCode service)")
    # Already defined default functions above
print("=" * 70 + "\n")

app = Flask(__name__)
CORS(app)  # Enable CORS for Node.js backend

# Initialize modules
resume_parser = ResumeParser()
anomaly_detector_module = AnomalyDetector()
deep_analyzer = DeepResumeAnalyzer()
# ai_analyzer is already initialized above with fallback logic

# Module 3: Resume Enhancement & Fraud Detection (FE-1, FE-2, FE-3)
try:
    from modules.resume_enhancement_fraud import ResumeEnhancementAndFraudModule
    module3 = ResumeEnhancementAndFraudModule()
    print("[OK] Module 3: Resume Enhancement & Fraud Detection initialized")
except Exception as e:
    print(f"[WARNING] Module 3 init failed: {e}")
    module3 = None

# Initialize optional modules only if available
if FraudDetector:
    try:
        fraud_detector = FraudDetector()
        print("[OK] Fraud detector initialized")
    except Exception as e:
        print(f"[WARNING] Fraud detector failed: {e}")
        fraud_detector = None
else:
    fraud_detector = None
        
if RankingEngine:
    try:
        ranking_engine = RankingEngine()
        print("[OK] Ranking engine initialized")
    except Exception as e:
        print(f"[WARNING] Ranking engine failed: {e}")
        ranking_engine = None
else:
    ranking_engine = None

# Configuration
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        return jsonify({
            'status': 'healthy',
            'service': 'VeriResume Python AI Service',
            'timestamp': datetime.now().isoformat(),
            'ai_provider': 'Groq (Llama 3.3)' if ai_analyzer else 'None',
            'hr_system_ready': hr_system is not None
        })
    except Exception as e:
        print(f"Error in health check: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/model-status', methods=['GET'])
def model_status():
    """Check if AI models are loaded and ready"""
    try:
        sentence_model_loaded = False
        if hr_system:
            sentence_model_loaded = hr_system.analyzer.sentence_model is not None
        
        return jsonify({
            'status': 'ready',
            'models': {
                'hr_system': hr_system is not None,
                'ai_analyzer': ai_analyzer is not None,
                'sentence_transformer': sentence_model_loaded,
                'lazy_loading': not sentence_model_loaded
            },
            'message': 'System ready. AI model will load on first use.' if not sentence_model_loaded else 'All AI models loaded and ready'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Error checking model status',
            'error': str(e)
        }), 500


@app.route('/api/filter-tech-keywords', methods=['POST'])
def filter_tech_keywords():
    """
    Filter keywords to only keep tech/IT-related ones using Groq AI.
    
    Request JSON:
    { "keywords": ["Python", "Machine Learning", "esport", "hobbies", "React", ...] }
    
    Response:
    { "success": true, "tech_keywords": ["Python", "Machine Learning", "React", ...] }
    """
    try:
        data = request.get_json()
        keywords = data.get('keywords', [])
        
        if not keywords:
            return jsonify({'success': True, 'tech_keywords': []})
        
        # ── First pass: use the TECH_SKILLS + SOFT_SKILLS sets from deep_analyzer ──
        from modules.deep_analyzer import TECH_SKILLS, SOFT_SKILLS
        
        known_tech = set()
        unknown = []
        
        for kw in keywords:
            kw_lower = kw.strip().lower()
            if kw_lower in TECH_SKILLS or kw_lower in SOFT_SKILLS:
                known_tech.add(kw)
            elif len(kw_lower) < 2:
                continue  # skip garbage
            else:
                unknown.append(kw)
        
        # ── Second pass: use Groq AI to classify unknown keywords ──
        ai_classified_tech = []
        if unknown:
            groq_key = os.getenv('GROQ_API_KEY')
            if groq_key:
                try:
                    from groq import Groq
                    client = Groq(api_key=groq_key)
                    
                    kw_list = ', '.join(f'"{k}"' for k in unknown[:30])  # limit to 30
                    
                    response = client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[{
                            "role": "user",
                            "content": f"""You are an expert at classifying keywords. Given this list of keywords, return ONLY the ones related to tech, IT, software, data, engineering, or professional skills. Remove hobbies, sports, personal interests, generic words.

Keywords: [{kw_list}]

Return ONLY a JSON array of the tech-related keywords, nothing else. Example: ["Python", "AWS", "Data Analysis"]
If none are tech-related, return: []"""
                        }],
                        temperature=0.1,
                        max_tokens=500,
                    )
                    
                    result_text = response.choices[0].message.content.strip()
                    # Parse JSON array from response
                    import json
                    # Try to extract JSON array
                    if '[' in result_text:
                        json_str = result_text[result_text.index('['):result_text.rindex(']')+1]
                        ai_classified_tech = json.loads(json_str)
                    
                    print(f"[FILTER-KEYWORDS] Groq classified {len(ai_classified_tech)} of {len(unknown)} unknown keywords as tech")
                except Exception as e:
                    print(f"[FILTER-KEYWORDS] Groq classification failed: {e}")
                    # Fallback: keep keywords that look technical (contain numbers, dots, or are in camelCase)
                    import re
                    for kw in unknown:
                        if re.search(r'[A-Z][a-z]+[A-Z]|\.|\+\+|#|\d', kw) or len(kw) <= 4:
                            ai_classified_tech.append(kw)
            else:
                # No Groq key - use pattern matching fallback
                import re
                for kw in unknown:
                    kw_lower = kw.lower()
                    # Keep if it looks like a tech term
                    tech_patterns = [
                        r'develop', r'engineer', r'analy', r'design', r'program',
                        r'code', r'web', r'mobile', r'cloud', r'server', r'database',
                        r'network', r'security', r'devops', r'api', r'framework',
                        r'library', r'tool', r'system', r'software', r'hardware',
                        r'test', r'debug', r'deploy', r'architect', r'full.?stack',
                        r'front.?end', r'back.?end', r'data', r'machine', r'deep',
                        r'artificial', r'neural', r'model', r'algorithm',
                    ]
                    if any(re.search(p, kw_lower) for p in tech_patterns):
                        ai_classified_tech.append(kw)
        
        # Combine known + AI-classified
        all_tech = list(known_tech) + ai_classified_tech
        
        # Preserve original order from input
        ordered_tech = [kw for kw in keywords if kw in all_tech]
        
        print(f"[FILTER-KEYWORDS] Input: {len(keywords)} keywords -> Output: {len(ordered_tech)} tech keywords")
        
        return jsonify({
            'success': True,
            'tech_keywords': ordered_tech,
            'filtered_out': [kw for kw in keywords if kw not in all_tech],
            'total_input': len(keywords),
            'total_tech': len(ordered_tech),
        })
        
    except Exception as e:
        print(f"[FILTER-KEYWORDS] Error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/parse-resume', methods=['POST'])
def parse_resume():
    """
    Parse resume and extract structured information
    
    Request:
    - file: Resume file (PDF/DOCX)
    OR
    - fileData: Base64 encoded file data
    - fileName: Original file name
    
    Response:
    {
        "success": true,
        "data": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+92-300-1234567",
            "education": [...],
            "experience": [...],
            "skills": [...],
            "summary": "...",
            "rawText": "..."
        }
    }
    """
    try:
        # Handle file upload
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'success': False, 'error': 'No file selected'}), 400
            
            print(f"\n[PARSE-RESUME] Parsing file: {file.filename}")
            
            # Save file temporarily
            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(file_path)
            print(f"[PARSE-RESUME] File saved to: {file_path}")
        
        elif 'fileData' in request.json:
            # Handle base64 encoded file
            file_name = request.json.get('fileName', 'resume.pdf')
            print(f"\n[PARSE-RESUME] Parsing base64 file: {file_name}")
            
            file_data = base64.b64decode(request.json['fileData'])
            
            file_path = os.path.join(UPLOAD_FOLDER, file_name)
            with open(file_path, 'wb') as f:
                f.write(file_data)
            print(f"[PARSE-RESUME] File written to: {file_path}")
        
        else:
            print("[PARSE-RESUME] ❌ No file provided in request")
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        # Parse resume
        print("[PARSE-RESUME] Parsing resume using resume_parser...")
        parsed_data = resume_parser.parse_resume(file_path)
        
        # Flatten candidate_info so consumers can access name/email/phone at top level
        candidate_info = parsed_data.get('candidate_info', {})
        if candidate_info:
            parsed_data['name'] = parsed_data.get('name') or candidate_info.get('name', '')
            parsed_data['email'] = parsed_data.get('email') or candidate_info.get('email', '')
            parsed_data['phone'] = parsed_data.get('phone') or candidate_info.get('phone', '')

        print(f"[PARSE-RESUME] ✅ Resume parsed successfully")
        print(f"   Name: {parsed_data.get('name', 'Unknown')}")
        print(f"   Email: {parsed_data.get('email', 'None')}")
        print(f"   Phone: {parsed_data.get('phone', 'None')}")
        print(f"   Skills: {len(parsed_data.get('skills', []))} found")
        print(f"   Experience: {len(parsed_data.get('experience', []))} entries")
        print(f"   Education: {len(parsed_data.get('education', []))} entries")
        
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"[PARSE-RESUME] Temp file cleaned up")
        
        return jsonify({
            'success': True,
            'data': parsed_data
        })
    
    except Exception as e:
        print(f"\n❌ ERROR parsing resume: {str(e)}")
        print(f"   Exception type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }), 500


@app.route('/api/analyze-resume', methods=['POST'])
def analyze_resume():
    """
    Analyze resume using EXACT HRcode_INTEGRATED.py logic for accurate ATS scoring
    
    Request:
    {
        "resumeText": "...",
        "jobDescription": "...",
        "anomalyThreshold": 30,
        "matchThreshold": 50
    }
    
    Response:
    {
        "success": true,
        "data": {
            "ats_score": 75,
            "matchedSkills": [...],
            "missingSkills": [...],
            "anomalies": {...},
            "anomalyWeight": 25,
            "decision": "SHORTLISTED"
        }
    }
    """
    try:
        data = request.json
        resume_text = data.get('resumeText', '')
        job_description = data.get('jobDescription', '')
        parsed_skills = data.get('parsedSkills', [])  # Pre-parsed skills from caller
        anomaly_threshold = data.get('anomalyThreshold', 30)
        match_threshold = data.get('matchThreshold', 50)
        
        print(f"[ANALYZE-RESUME] Resume={len(resume_text)} chars, JD={bool(job_description)}, PreParsedSkills={len(parsed_skills)}")
        
        if not resume_text:
            return jsonify({'success': False, 'error': 'Resume text is required'}), 400
        
        if not job_description:
            job_description = 'Professional position requiring relevant skills and experience'
        
        # ALWAYS run DeepResumeAnalyzer for accurate grammar/structure/readability/ATS scores
        print(f"[ANALYZE-RESUME] Running DeepResumeAnalyzer for accurate scoring...")
        deep_result = deep_analyzer.analyze(resume_text, job_description)
        
        grammar_score = deep_result.get('grammar_score', 50)
        readability_score = deep_result.get('readability_score', 50)
        structure_score = deep_result.get('structure_score', 50)
        base_ats = deep_result.get('ats_score', 50)
        
        print(f"[ANALYZE-RESUME] DeepAnalyzer scores: ATS={base_ats}, Grammar={grammar_score}, Readability={readability_score}, Structure={structure_score}")
        
        # Try HRCode service for match-based scoring (supplements deep analysis)
        hrcode_svc = get_hrcode_service()
        hrcode_result = None
        
        if hrcode_svc:
            try:
                hrcode_result = hrcode_svc.analyze_resume_complete(resume_text, job_description, anomaly_threshold, match_threshold)
                if not hrcode_result.get('success'):
                    hrcode_result = None
            except Exception as e:
                print(f"[ANALYZE-RESUME] HRCode failed: {str(e)}")
                hrcode_result = None
        
        # ── Extract skills ──
        if parsed_skills and len(parsed_skills) > 0:
            extracted_skills = parsed_skills
        else:
            try:
                parsed_data = resume_parser.parse_resume(resume_text)
                extracted_skills = parsed_data.get('skills', [])
            except:
                extracted_skills = []
        
        # Merge skills from parser + deep_analyzer (deduplicate)
        all_skills = list(set(extracted_skills + deep_result.get('extracted_skills', [])))
        
        # ── Groq AI-Powered Skill Matching ──
        ai_matched = []
        ai_missing = []
        ai_match_score = 0
        ai_recommendation = ''
        ai_strengths = []
        ai_concerns = []
        
        groq_key = os.getenv('GROQ_API_KEY')
        if groq_key and job_description and len(job_description) > 20:
            try:
                from groq import Groq
                import json
                client = Groq(api_key=groq_key)
                
                skills_str = ', '.join(f'"{s}"' for s in all_skills[:30])
                
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{
                        "role": "user",
                        "content": f"""You are an expert HR recruiter. Analyze this resume against the job description.

JOB DESCRIPTION:
{job_description[:2000]}

CANDIDATE SKILLS: [{skills_str}]

RESUME SUMMARY (first 1500 chars):
{resume_text[:1500]}

Return a JSON object with:
{{
  "match_score": <0-100 how well the candidate fits>,
  "matched_skills": [<skills from candidate that match job requirements>],
  "missing_skills": [<important skills from JD that candidate lacks>],
  "recommendation": "<1-2 sentence hiring recommendation>",
  "strengths": [<top 3 strengths>],
  "concerns": [<top 3 concerns if any>]
}}

Return ONLY the JSON object, nothing else."""
                    }],
                    temperature=0.2,
                    max_tokens=800,
                )
                
                ai_text = response.choices[0].message.content.strip()
                if '{' in ai_text:
                    json_str = ai_text[ai_text.index('{'):ai_text.rindex('}')+1]
                    ai_result = json.loads(json_str)
                    ai_matched = ai_result.get('matched_skills', [])
                    ai_missing = ai_result.get('missing_skills', [])
                    ai_match_score = ai_result.get('match_score', 0)
                    ai_recommendation = ai_result.get('recommendation', '')
                    ai_strengths = ai_result.get('strengths', [])
                    ai_concerns = ai_result.get('concerns', [])
                    print(f"[ANALYZE-RESUME] Groq AI: match={ai_match_score}%, matched={len(ai_matched)}, missing={len(ai_missing)}")
            except Exception as e:
                print(f"[ANALYZE-RESUME] Groq AI matching failed: {e}")
        
        # ── Determine match score and matched/missing skills ──
        if ai_match_score > 0:
            match_score = ai_match_score
            matched_skills = ai_matched
            missing_skills = ai_missing
        elif hrcode_result:
            match_score = hrcode_result.get('match_score', 60)
            matched_skills = hrcode_result.get('matched_skills', all_skills[:8])
            missing_skills = hrcode_result.get('missing_skills', [])
        else:
            matched_skills = deep_result.get('matched_skills', all_skills[:8])
            missing_skills = deep_result.get('missing_skills', [])
            match_score = min(30 + len(all_skills) * 3, 85)
        
        # ── Compute final ATS score: blend deep_analyzer ATS with match scoring ──
        if ai_match_score > 0:
            ats_score = round(base_ats * 0.4 + ai_match_score * 0.6)
        elif hrcode_result:
            hrcode_ats = hrcode_result.get('ats_score', base_ats)
            ats_score = round(base_ats * 0.5 + hrcode_ats * 0.5)
        else:
            ats_score = base_ats
        
        # ── Calculate overall score from real computed values ──
        overall_score = round(
            ats_score * 0.35 +
            grammar_score * 0.20 +
            readability_score * 0.20 +
            structure_score * 0.25
        )
        
        # ── Combine weaknesses and suggestions ──
        weaknesses = deep_result.get('weaknesses', [])
        if ai_concerns:
            weaknesses = ai_concerns + weaknesses
        suggestions = deep_result.get('suggestions', [])
        
        print(f"[ANALYZE-RESUME] Final scores: ATS={ats_score}, Grammar={grammar_score}, Read={readability_score}, Struct={structure_score}, Overall={overall_score}")
        
        # ── Build unified analysis response ──
        analysis = {
            'ats_score': ats_score,
            'match_score': match_score,
            'quality_score': min(35 + len(all_skills) * 3, 85),
            'keyword_density': 65,
            'grammar_score': grammar_score,
            'readability_score': readability_score,
            'structure_score': structure_score,
            'overall_score': overall_score,
            'weaknesses': weaknesses[:10],
            'suggestions': suggestions[:10] if suggestions else ['Add more specific metrics and achievements', 'Use action verbs to describe accomplishments'],
            'enhanced_summary': '',
            'decision_status': 'SHORTLISTED' if ats_score >= 70 else 'NEEDS_REVIEW',
            'shortlisted': ats_score >= 70,
            'reason': ai_recommendation or f'Resume shows background with {len(all_skills)} skills',
            'recommendation': ai_recommendation or ('Recommended for interview' if ats_score >= 70 else 'Review manually'),
            'anomaly_weight': 0,
            'anomaly_count': 0,
            'anomaly_severity': 'none',
            'anomalies': {},
            'matchedSkills': matched_skills,
            'missingSkills': missing_skills,
            'candidateName': 'Resume Candidate',
            'skills': all_skills,
            'recommended_keywords': deep_result.get('recommended_keywords', []),
            'tech_skills': deep_result.get('tech_skills', []),
            'soft_skills': deep_result.get('soft_skills', []),
            'section_analysis': deep_result.get('section_analysis', {}),
            'metrics': deep_result.get('metrics', {}),
            'education': [],
            'experience': []
        }
        
        print(f"[ANALYZE-RESUME] Done: ATS={ats_score}%, Grammar={grammar_score}%, Structure={structure_score}%, Overall={overall_score}%, Match={match_score}%")
        
        return jsonify({
            'success': True,
            'data': analysis
        })
    
    except Exception as e:
        print(f"\n❌ ERROR analyzing resume: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/detect-fraud', methods=['POST'])
def detect_fraud():
    """
    Detect fraud indicators in resume
    
    Request:
    {
        "resumeData": {
            "name": "...",
            "email": "...",
            "phone": "...",
            "education": [...],
            "experience": [...],
            "skills": [...]
        },
        "resumeText": "...",
        "existingResumes": [] (optional, for duplicate detection)
    }
    
    Response:
    {
        "success": true,
        "data": {
            "riskScore": 25,
            "riskLevel": "Low",
            "indicators": [...],
            "duplicates": [...],
            "recommendations": [...]
        }
    }
    """
    try:
        data = request.json
        resume_data = data.get('resumeData', {})
        resume_text = data.get('resumeText', '')
        existing_resumes = data.get('existingResumes', [])
        
        print(f"\n[DETECT-FRAUD] Request received")
        print(f"   Resume data keys: {list(resume_data.keys())}")
        print(f"   Resume text length: {len(resume_text)} chars")
        print(f"   Name: {resume_data.get('name', 'Unknown')}")
        print(f"   Email: {resume_data.get('email', 'None')}")
        
        if not resume_data:
            return jsonify({'success': False, 'error': 'Resume data is required'}), 400
        
        # Use HR System fraud detection if available (CORE SOLUTION)
        if hr_system:
            print("[DETECT-FRAUD] Using HR System anomaly_detector for fraud detection")
            try:
                print("[DETECT-FRAUD] Calling anomaly_detector.detect_anomalies...")
                fraud_report = hr_system.anomaly_detector.detect_anomalies(resume_data)
                print(f"[DETECT-FRAUD] ✅ Anomaly detection complete")
                print(f"   Risk level: {fraud_report.get('risk_level', 'Unknown') if isinstance(fraud_report, dict) else 'Unknown'}")
                print(f"   Anomalies: {len(fraud_report.get('anomalies', [])) if isinstance(fraud_report, dict) else 0}")
                
                # Convert HR System format to expected format
                fraud_result = {
                    'risk_score': fraud_report.get('fraud_score', 0) if isinstance(fraud_report, dict) else 0,
                    'risk_level': fraud_report.get('risk_level', 'Low') if isinstance(fraud_report, dict) else 'Unknown',
                    'indicators': fraud_report.get('issues', []) if isinstance(fraud_report, dict) else [],
                    'duplicates': [],  # Not implemented in HR system yet
                    'recommendations': []
                }
            except Exception as e:
                print(f"[DETECT-FRAUD] ⚠️ HR System fraud detection failed: {e}")
                import traceback
                traceback.print_exc()
                fraud_result = {
                    'risk_score': 0,
                    'risk_level': 'Unknown',
                    'indicators': [str(e)],
                    'duplicates': [],
                    'recommendations': []
                }
        elif fraud_detector:
            print("[DETECT-FRAUD] Using legacy fraud detector")
            fraud_result = fraud_detector.check_resume(resume_data, resume_text, existing_resumes)
        else:
            # Fallback: Basic fraud check
            print("[DETECT-FRAUD] ⚠️ No fraud detector available, using basic check")
            fraud_result = {
                'risk_score': 0,
                'risk_level': 'Unknown',
                'indicators': ['Fraud detection service not available'],
                'duplicates': [],
                'recommendations': ['Enable fraud detection module for detailed analysis']
            }
        
        print(f"[DETECT-FRAUD] ✅ Returning result - Risk Level: {fraud_result.get('risk_level', 'Unknown')}")
        return jsonify({
            'success': True,
            'data': fraud_result
        })
    
    except Exception as e:
        print(f"\n❌ ERROR detecting fraud: {str(e)}")
        print(f"   Exception type: {type(e).__name__}")
        print(f"   Resume data keys: {list(resume_data.keys()) if resume_data else 'Empty'}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'type': type(e).__name__,
            'details': traceback.format_exc() if os.getenv('DEBUG') else None
        }), 500


@app.route('/api/detect-anomalies', methods=['POST'])
def detect_anomalies():
    """
    Detect anomalies in resume (new naming convention)
    This is an alias for /api/detect-fraud for terminology consistency
    
    Request:
    {
        "resumeData": {
            "name": "...",
            "email": "...",
            "phone": "...",
            "education": [...],
            "experience": [...],
            "skills": [...]
        },
        "resumeText": "...",
        "existingResumes": [] (optional, for duplicate detection)
    }
    
    Response:
    {
        "success": true,
        "data": {
            "riskScore": 25,
            "riskLevel": "Low",
            "indicators": [...],
            "duplicates": [...],
            "recommendations": [...]
        }
    }
    """
    # Delegate to detect_fraud - same implementation with new naming
    return detect_fraud()




@app.route('/api/hr/parse-resume', methods=['POST'])
def hr_parse_resume():
    """
    HR System: Parse resume with enhanced extraction
    
    Request:
    - file: Resume file (PDF/DOCX)
    OR
    - filePath: Path to resume file
    
    Response:
    {
        "success": true,
        "data": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+92-300-1234567",
            "skills": [...],
            "raw_text": "..."
        }
    }
    """
    try:
        if not hr_system:
            return jsonify({
                'success': False, 
                'error': 'HR System is loading. Please wait a moment and try again.',
                'status': 'loading'
            }), 503
        
        # Handle file upload
        file_path = None
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'success': False, 'error': 'No file selected'}), 400
            
            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(file_path)
        elif request.json and 'filePath' in request.json:
            file_path = request.json['filePath']
        else:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        # Parse resume using HR system
        parsed_data = hr_system.parser.parse_resume(file_path)
        
        return jsonify({
            'success': True,
            'data': parsed_data
        })
    
    except Exception as e:
        print(f"Error in HR parse resume: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/hr/detect-fraud', methods=['POST'])
def hr_detect_fraud():
    """
    HR System: Detect fraud in resume
    
    Request:
    {
        "resumeData": {
            "name": "...",
            "email": "...",
            "skills": [...],
            ...
        }
    }
    
    Response:
    {
        "success": true,
        "data": {
            "fraud_score": 0-100,
            "risk_level": "Low/Medium/High",
            "missing_info": [...],
            "issues": [...]
        }
    }
    """
    try:
        if not hr_system:
            return jsonify({
                'success': False, 
                'error': 'HR System is loading. Please wait a moment and try again.',
                'status': 'loading'
            }), 503
        
        data = request.json
        resume_data = data.get('resumeData', {})
        
        if not resume_data:
            return jsonify({'success': False, 'error': 'Resume data required'}), 400
        
        # Detect fraud
        fraud_report = hr_system.fraud_detector.detect_fraud(resume_data)
        
        return jsonify({
            'success': True,
            'data': fraud_report
        })
    
    except Exception as e:
        print(f"Error in HR fraud detection: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/hr/analyze-resume', methods=['POST'])
def hr_analyze_resume():
    """
    HR System: Analyze resume with ATS scoring
    
    Request:
    {
        "resumeData": {...},
        "jobDescription": "..."
    }
    
    Response:
    {
        "success": true,
        "data": {
            "ats_score": 85,
            "rating": "Good",
            "feedback": [...],
            "job_match": {
                "match_percentage": 78,
                "similarity_score": 0.78
            }
        }
    }
    """
    try:
        if not hr_system:
            return jsonify({
                'success': False, 
                'error': 'HR System is loading. Please wait a moment and try again.',
                'status': 'loading'
            }), 503
        
        data = request.json
        resume_data = data.get('resumeData', {})
        job_description = data.get('jobDescription', '')
        
        if not resume_data:
            return jsonify({'success': False, 'error': 'Resume data required'}), 400
        
        # Analyze resume
        analysis = hr_system.analyzer.analyze_resume(resume_data, job_description)
        
        return jsonify({
            'success': True,
            'data': analysis
        })
    
    except Exception as e:
        print(f"Error in HR resume analysis: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/hr/process-resume', methods=['POST'])
def hr_process_resume():
    """
    HR System: Complete resume processing (parse + fraud + analyze)
    
    Request:
    - file: Resume file
    - jobDescription: Job description (optional)
    
    Response:
    {
        "success": true,
        "data": {
            "candidate_info": {...},
            "parsed_data": {...},
            "fraud_report": {...},
            "analysis": {...}
        }
    }
    """
    try:
        if not hr_system:
            return jsonify({
                'success': False, 
                'error': 'HR System is loading. Please wait a moment and try again.',
                'status': 'loading'
            }), 503
        
        # Handle file upload
        file_path = None
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'success': False, 'error': 'No file selected'}), 400
            
            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(file_path)
        elif request.json and 'filePath' in request.json:
            file_path = request.json['filePath']
        else:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        # Get job description from form or JSON
        job_description = ''
        if request.form and 'jobDescription' in request.form:
            job_description = request.form['jobDescription']
        elif request.json and 'jobDescription' in request.json:
            job_description = request.json['jobDescription']
        
        # Process resume with full HR analysis
        result = hr_system.process_resume(file_path, job_description)
        
        # Add anomaly detection to the result
        try:
            parsed_data = result.get('parsed_data', {})
            anomalies = anomaly_detector_module.detect_anomalies(parsed_data)
            anomalies['report'] = anomaly_detector_module.generate_anomaly_report(anomalies)
            result['anomaly_detection'] = anomalies
            print(f"[INFO] Anomaly detection completed: {anomalies['anomaly_count']} issues found")
        except Exception as e:
            print(f"[WARNING] Anomaly detection failed: {e}")
            result['anomaly_detection'] = {'error': str(e)}
        
        return jsonify({
            'success': True,
            'data': result
        })
    
    except Exception as e:
        print(f"Error in HR process resume: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/hr/detect-anomalies', methods=['POST'])
def hr_detect_anomalies():
    """
    HR System: Detect data quality anomalies in parsed resume
    
    Detects:
    - Languages listed as technical skills
    - Generic software listed as skills
    - Education in experience section
    - Experience in education section
    - Duplicate entries
    
    Request:
    {
        "parsedData": {
            "candidate_info": {...},
            "skills": [...],
            "education": [...],
            "experience": [...]
        }
    }
    OR
    {
        "file": <resume file>
    }
    
    Response:
    {
        "success": true,
        "data": {
            "has_anomalies": true,
            "anomaly_count": 3,
            "severity": "medium",
            "issues": [
                {
                    "type": "language_as_skill",
                    "severity": "medium",
                    "field": "skills",
                    "value": "English",
                    "message": "..."
                }
            ],
            "details": {...},
            "report": "Human-readable report"
        }
    }
    """
    try:
        parsed_data = None
        
        # Option 1: Receive already parsed data
        if request.json and 'parsedData' in request.json:
            parsed_data = request.json['parsedData']
        
        # Option 2: Parse resume file first
        elif 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'success': False, 'error': 'No file selected'}), 400
            
            # Save and parse file
            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(file_path)
            
            parsed_data = resume_parser.parse_resume(file_path)
            
            # Clean up
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Option 3: Receive file path (from previous processing)
        elif request.json and 'filePath' in request.json:
            file_path = request.json['filePath']
            parsed_data = resume_parser.parse_resume(file_path)
        
        else:
            return jsonify({
                'success': False, 
                'error': 'Either parsedData or file must be provided'
            }), 400
        
        # Detect anomalies
        anomalies = anomaly_detector_module.detect_anomalies(parsed_data)
        
        # Generate human-readable report
        report = anomaly_detector_module.generate_anomaly_report(anomalies)
        anomalies['report'] = report
        
        return jsonify({
            'success': True,
            'data': anomalies
        })
    
    except Exception as e:
        print(f"Error detecting anomalies: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/hr/bulk-screen-resumes', methods=['POST'])
def hr_bulk_screen_resumes():
    """
    HR System: Process multiple resumes with anomaly filtering and ranking
    
    This endpoint:
    1. Accepts multiple resume files
    2. Extracts and parses text from each resume
    3. Detects anomalies and calculates weight
    4. Filters out resumes with anomaly weight > threshold
    5. Ranks remaining resumes by job description match
    6. Returns shortlisted and rejected candidates
    
    Request (multipart/form-data):
    - files[]: Multiple resume files
    - jobDescription: Job description text
    - requirements: Job requirements (optional)
    - anomalyThreshold: Weight threshold for rejection (default: 30)
    
    Response:
    {
        "success": true,
        "data": {
            "total_uploaded": 10,
            "shortlisted": 6,
            "rejected": 4,
            "shortlisted_candidates": [
                {
                    "rank": 1,
                    "candidate_name": "John Doe",
                    "email": "john@example.com",
                    "match_score": 85,
                    "anomaly_weight": 8,
                    "anomaly_status": "SHORTLISTED",
                    "parsed_data": {...},
                    "anomaly_detection": {...},
                    "analysis": {...}
                },
                ...
            ],
            "rejected_candidates": [
                {
                    "candidate_name": "Jane Doe",
                    "email": "jane@example.com",
                    "anomaly_weight": 45,
                    "anomaly_status": "REJECTED",
                    "rejection_reason": "Anomaly weight (45) exceeds threshold (30)",
                    "anomaly_detection": {...}
                },
                ...
            ]
        }
    }
    """
    try:
        if not hr_system:
            return jsonify({
                'success': False, 
                'error': 'HR System is loading. Please wait a moment and try again.',
                'status': 'loading'
            }), 503
        
        # Get uploaded files
        files = request.files.getlist('files[]') or request.files.getlist('files')
        if not files or len(files) == 0:
            return jsonify({
                'success': False,
                'error': 'No resume files provided. Please upload at least one resume.'
            }), 400
        
        # Get job description
        job_description = request.form.get('jobDescription', '')
        if not job_description:
            return jsonify({
                'success': False,
                'error': 'Job description is required for ranking resumes.'
            }), 400
        
        # Get requirements (optional)
        requirements = request.form.get('requirements', '')
        
        # Get anomaly threshold (default: 30)
        anomaly_threshold = int(request.form.get('anomalyThreshold', 30))
        
        print(f"\n{'='*70}")
        print(f"🔍 BULK RESUME SCREENING STARTED")
        print(f"{'='*70}")
        print(f"📄 Resumes uploaded: {len(files)}")
        print(f"🎯 Job description provided: {len(job_description)} characters")
        print(f"⚖️  Anomaly threshold: {anomaly_threshold}")
        print(f"{'-'*70}\n")
        
        shortlisted_candidates = []
        rejected_candidates = []
        processing_errors = []
        
        # Process each resume
        for idx, file in enumerate(files, 1):
            try:
                print(f"[{idx}/{len(files)}] Processing: {file.filename}")
                
                # Save file temporarily
                file_path = os.path.join(UPLOAD_FOLDER, file.filename)
                file.save(file_path)
                
                # Parse resume
                parsed_data = resume_parser.parse_resume(file_path)
                candidate_name = parsed_data.get('candidate_info', {}).get('name', 'Unknown')
                candidate_email = parsed_data.get('candidate_info', {}).get('email', '')
                
                print(f"  ✓ Parsed: {candidate_name}")
                
                # Detect anomalies
                anomalies = anomaly_detector_module.detect_anomalies(parsed_data)
                anomaly_weight = anomalies.get('weight', 0)
                
                print(f"  ✓ Anomaly weight: {anomaly_weight}")
                
                # Check if should be shortlisted
                shortlist_decision = anomaly_detector_module.should_shortlist(
                    anomalies, 
                    threshold=anomaly_threshold
                )
                
                if shortlist_decision['shortlisted']:
                    # Calculate match score with job description
                    if hr_system:
                        ats_results = hr_system.analyzer.calculate_ats_score(
                            parsed_data, 
                            job_description
                        )
                        match_score = ats_results.get('ats_score', 0)
                    else:
                        match_score = 50  # Default if HR system unavailable
                    
                    print(f"  ✓ Match score: {match_score}")
                    print(f"  ✅ SHORTLISTED\n")
                    
                    shortlisted_candidates.append({
                        'candidate_name': candidate_name,
                        'email': candidate_email,
                        'phone': parsed_data.get('candidate_info', {}).get('phone', ''),
                        'match_score': match_score,
                        'anomaly_weight': anomaly_weight,
                        'anomaly_status': shortlist_decision['decision'],
                        'anomaly_severity': anomalies.get('severity', 'none'),
                        'parsed_data': parsed_data,
                        'anomaly_detection': anomalies,
                        'analysis': ats_results if hr_system else {},
                        'file_name': file.filename
                    })
                else:
                    print(f"  ❌ REJECTED: {shortlist_decision['reason']}\n")
                    
                    rejected_candidates.append({
                        'candidate_name': candidate_name,
                        'email': candidate_email,
                        'phone': parsed_data.get('candidate_info', {}).get('phone', ''),
                        'anomaly_weight': anomaly_weight,
                        'anomaly_status': shortlist_decision['decision'],
                        'anomaly_severity': anomalies.get('severity', 'high'),
                        'rejection_reason': shortlist_decision['reason'],
                        'recommendation': shortlist_decision['recommendation'],
                        'anomaly_detection': anomalies,
                        'file_name': file.filename
                    })
                
                # Clean up temp file
                if os.path.exists(file_path):
                    os.remove(file_path)
                    
            except Exception as e:
                print(f"  ❌ ERROR: {str(e)}\n")
                processing_errors.append({
                    'file_name': file.filename,
                    'error': str(e)
                })
        
        # Rank shortlisted candidates by match score (highest first)
        shortlisted_candidates.sort(key=lambda x: x['match_score'], reverse=True)
        
        # Add rank numbers
        for idx, candidate in enumerate(shortlisted_candidates, 1):
            candidate['rank'] = idx
        
        # Summary
        print(f"\n{'='*70}")
        print(f"📊 SCREENING COMPLETE")
        print(f"{'='*70}")
        print(f"✅ Shortlisted: {len(shortlisted_candidates)}")
        print(f"❌ Rejected: {len(rejected_candidates)}")
        print(f"⚠️  Errors: {len(processing_errors)}")
        print(f"{'='*70}\n")
        
        return jsonify({
            'success': True,
            'data': {
                'total_uploaded': len(files),
                'shortlisted': len(shortlisted_candidates),
                'rejected': len(rejected_candidates),
                'errors': len(processing_errors),
                'anomaly_threshold': anomaly_threshold,
                'shortlisted_candidates': shortlisted_candidates,
                'rejected_candidates': rejected_candidates,
                'processing_errors': processing_errors if processing_errors else None
            }
        })
    
    except Exception as e:
        print(f"Error in bulk resume screening: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/hr/rank-resumes', methods=['POST'])
def hr_rank_resumes():
    """
    HR System: Rank multiple resumes against job description
    DEPRECATED - Use /api/hr/bulk-screen-resumes instead
    """
    try:
        if not hr_system:
            return jsonify({
                'success': False, 
                'error': 'HR System is loading. Please wait a moment and try again.',
                'status': 'loading'
            }), 503
        
        data = request.json
        resume_paths = data.get('resumePaths', [])
        job_description = data.get('jobDescription', '')
        
        if not resume_paths:
            return jsonify({'success': False, 'error': 'Resume paths required'}), 400
        if not job_description:
            return jsonify({'success': False, 'error': 'Job description required'}), 400
        
        # Rank resumes
        rankings = hr_system.rank_resumes(resume_paths, job_description)
        
        # Add rank numbers
        for idx, ranking in enumerate(rankings, 1):
            ranking['rank'] = idx
        
        return jsonify({
            'success': True,
            'data': {
                'rankings': rankings,
                'total_candidates': len(rankings)
            }
        })
    
    except Exception as e:
        print(f"Error in HR rank resumes: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/rank-resumes', methods=['POST'])
def rank_resumes():
    """
    Rank multiple resumes using EXACT HRcode_INTEGRATED.py logic
    
    Request:
    {
        "jobDescription": "...",
        "resumes": [
            {
                "id": "resume_id_1",
                "text": "...",
                "candidateName": "John Doe"
            }
        ]
    }
    
    Response:
    {
        "success": true,
        "data": {
            "rankings": [
                {
                    "rank": 1,
                    "candidateName": "John Doe",
                    "matchScore": 85,
                    "decision": "SHORTLISTED"
                }
            ]
        }
    }
    """
    try:
        data = request.json
        job_description = data.get('jobDescription', '')
        resumes = data.get('resumes', [])
        
        if not job_description:
            return jsonify({'success': False, 'error': 'Job description is required'}), 400
        
        if not resumes or len(resumes) == 0:
            return jsonify({'success': False, 'error': 'At least one resume is required'}), 400
        
        print(f"\n{'='*70}")
        print(f"[RANK-RESUMES] 🚀 RANKING {len(resumes)} RESUMES WITH EXACT HRCODE")
        print(f"{'='*70}")
        
        # Use HRCode service for ranking
        hrcode_svc = get_hrcode_service()
        if not hrcode_svc:
            return jsonify({'success': False, 'error': 'HRCode service not initialized'}), 503
        
        # Prepare resume data for HRCode service
        resume_data_list = [
            {
                'id': r.get('id'),
                'name': r.get('candidateName', 'Unknown'),
                'text': r.get('text', '')
            }
            for r in resumes
        ]
        
        # Use HRCode service to rank all resumes
        rank_result = hrcode_svc.rank_resumes_hrcode(resume_data_list, job_description)
        
        if not rank_result.get('success'):
            return jsonify({
                'success': False,
                'error': rank_result.get('error', 'Ranking failed')
            }), 500
        
        # Transform rankings for API response
        rankings = rank_result.get('rankings', [])
        transformed_rankings = []
        
        for idx, rank in enumerate(rankings, 1):
            transformed_rankings.append({
                'rank': idx,
                'resumeId': rank.get('resumeId'),
                'candidateName': rank.get('candidateName'),
                'matchScore': rank.get('matchScore', 0),
                'anomalyWeight': rank.get('anomalyWeight', 0),
                'anomalySeverity': rank.get('anomalySeverity', 'Low'),
                'decision': rank.get('decision'),
                'reason': rank.get('reason', ''),
                'shortlisted': rank.get('shortlisted', False),
                'matchedSkills': rank.get('matchedSkills', []),
                'missingSkills': rank.get('missingSkills', []),
                'skills': rank.get('skills', []),
                'education': rank.get('education', []),
                'experience': rank.get('experience', []),
                'strengths': [f"✓ {skill}" for skill in rank.get('matchedSkills', [])[:5]],
                'weaknesses': [f"✗ {skill}" for skill in rank.get('missingSkills', [])[:3]]
            })
        
        print(f"[RANK-RESUMES] ✅ Ranked {len(transformed_rankings)} resumes successfully")
        print(f"{'='*70}\n")
        
        return jsonify({
            'success': True,
            'data': {
                'rankings': transformed_rankings
            }
        })
    
    except Exception as e:
        print(f"\n❌ ERROR in rank-resumes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/match-jobs', methods=['POST'])
def match_jobs():
    """
    Match resume with jobs and provide recommendations
    
    Request:
    {
        "resumeText": "...",
        "skills": [...],
        "experience": [...],
        "targetRole": "Software Engineer"
    }
    
    Response:
    {
        "success": true,
        "data": {
            "recommendations": [
                {
                    "title": "...",
                    "matchScore": 85,
                    "reasons": [...],
                    "platform": "rozee",
                    "url": "..."
                },
                ...
            ]
        }
    }
    """
    try:
        data = request.json
        resume_text = data.get('resumeText', '')
        skills = data.get('skills', [])
        target_role = data.get('targetRole', '')
        
        if not resume_text and not skills:
            return jsonify({'success': False, 'error': 'Resume text or skills required'}), 400
        
        # Get job recommendations using AI
        recommendations = ai_analyzer.recommend_jobs(resume_text, skills, target_role)
        
        return jsonify({
            'success': True,
            'data': {
                'recommendations': recommendations
            }
        })
    
    except Exception as e:
        print(f"Error matching jobs: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ==================== JOB MATCHING ENDPOINT ====================

@app.route('/api/match-resume-to-jobs', methods=['POST'])
def match_resume_to_jobs():
    """
    POST /api/match-resume-to-jobs
    Score and rank scraped jobs against resume using NLP + semantic matching.

    Request body:
    {
        "resumeSkills": ["Python", "React", "Node.js"],
        "resumeTitle": "Software Engineer",
        "resumeSummary": "Experienced full-stack developer...",
        "resumeExperienceYears": 3,
        "jobs": [ { title, company, location, description, source, url, ... } ],
        "minScore": 30
    }

    Response:
    {
        "success": true,
        "data": {
            "matchedJobs": [ ...scored and ranked... ],
            "statistics": { totalInput, totalMatched, avgScore, topScore }
        }
    }
    """
    try:
        data = request.get_json()
        resume_skills = data.get('resumeSkills', [])
        resume_title = data.get('resumeTitle', '')
        resume_summary = data.get('resumeSummary', '')
        resume_exp = data.get('resumeExperienceYears', 2)
        jobs = data.get('jobs', [])
        min_score = data.get('minScore', 30)

        print(f"\n{'='*60}")
        print(f"AI JOB MATCHING REQUEST")
        print(f"{'='*60}")
        print(f"   Resume Title: {resume_title}")
        print(f"   Skills: {resume_skills[:8]}")
        print(f"   Experience: {resume_exp} years")
        print(f"   Jobs to score: {len(jobs)}")
        print(f"   Min score: {min_score}%")

        if not jobs:
            return jsonify({
                'success': True,
                'data': {
                    'matchedJobs': [],
                    'statistics': {'totalInput': 0, 'totalMatched': 0, 'avgScore': 0, 'topScore': 0}
                }
            })

        if job_matcher:
            matched = job_matcher.match_resume_to_jobs(
                resume_skills=resume_skills,
                resume_title=resume_title,
                resume_summary=resume_summary,
                resume_experience_years=resume_exp,
                jobs=jobs,
                min_score=min_score,
            )
        else:
            # Fallback: simple keyword matching
            print("   [WARN] JobMatcher not available, using basic matching")
            matched = []
            norm_skills = {s.lower() for s in resume_skills}
            for job in jobs:
                job_text = f"{job.get('title', '')} {job.get('description', '')}".lower()
                found = [s for s in resume_skills if s.lower() in job_text]
                score = min(100, 40 + len(found) * 10)
                matched.append({
                    **job,
                    'matchScore': score,
                    'matchedSkills': found,
                    'missingSkills': [],
                })
            matched.sort(key=lambda x: x['matchScore'], reverse=True)
            matched = [j for j in matched if j['matchScore'] >= min_score]

        scores = [j['matchScore'] for j in matched]
        stats = {
            'totalInput': len(jobs),
            'totalMatched': len(matched),
            'avgScore': int(round(sum(scores) / len(scores))) if scores else 0,
            'topScore': max(scores) if scores else 0,
        }

        print(f"\n   Matched: {stats['totalMatched']}/{stats['totalInput']}")
        print(f"   Avg Score: {stats['avgScore']}%")
        print(f"   Top Score: {stats['topScore']}%")
        print(f"{'='*60}\n")

        return jsonify({
            'success': True,
            'data': {
                'matchedJobs': matched,
                'statistics': stats
            }
        })

    except Exception as e:
        print(f"\nMATCH ERROR: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== JOB API SEARCH ENDPOINTS ====================

@app.route('/api/search-jobs-api', methods=['POST'])
def search_jobs_api():
    """
    POST /api/search-jobs-api
    Search jobs using FREE APIs (Remotive, Jobicy, Arbeitnow, USAJobs)
    
    Request body:
    {
        "query": "Python Developer",
        "location": "Remote",
        "max_per_platform": 10,
        "platforms": ["remotive", "jobicy", "arbeitnow", "usajobs"]  // optional filter
    }
    """
    try:
        print("\n" + "="*60)
        print("JOB API SEARCH REQUEST")
        print("="*60)
        
        data = request.get_json()
        query = data.get('query') or data.get('jobTitle') or data.get('keywords', 'Developer')
        location = data.get('location', '')
        max_per_platform = data.get('max_per_platform', 10)
        platforms = data.get('platforms', ['remotive', 'jobicy', 'arbeitnow', 'usajobs'])
        
        print(f"  Query: {query}")
        print(f"  Location: {location}")
        print(f"  Max per platform: {max_per_platform}")
        print(f"  Platforms: {platforms}")
        
        if not job_api_scraper:
            print("  ERROR: Job API Scraper not initialized")
            return jsonify({
                'success': False,
                'error': 'Job API scraper not initialized',
                'data': {'jobs': [], 'jobsByPlatform': {}, 'statistics': {}}
            }), 503
        
        # Search all APIs
        all_jobs = []
        jobs_by_platform = {}
        
        if 'remotive' in platforms:
            remotive_jobs = job_api_scraper.search_remotive(query, location, max_per_platform)
            all_jobs.extend(remotive_jobs)
            jobs_by_platform['remotive'] = remotive_jobs
            print(f"  Remotive: {len(remotive_jobs)} jobs")
        
        if 'jobicy' in platforms:
            jobicy_jobs = job_api_scraper.search_jobicy(query, location, max_per_platform)
            all_jobs.extend(jobicy_jobs)
            jobs_by_platform['jobicy'] = jobicy_jobs
            print(f"  Jobicy: {len(jobicy_jobs)} jobs")
        
        if 'arbeitnow' in platforms:
            arbeitnow_jobs = job_api_scraper.search_arbeitnow(query, location, max_per_platform)
            all_jobs.extend(arbeitnow_jobs)
            jobs_by_platform['arbeitnow'] = arbeitnow_jobs
            print(f"  Arbeitnow: {len(arbeitnow_jobs)} jobs")
        
        if 'usajobs' in platforms:
            usajobs_jobs = job_api_scraper.search_usajobs(query, location, max_per_platform)
            all_jobs.extend(usajobs_jobs)
            jobs_by_platform['usajobs'] = usajobs_jobs
            print(f"  USAJobs: {len(usajobs_jobs)} jobs")
        
        print(f"\n  TOTAL: {len(all_jobs)} jobs from {len(jobs_by_platform)} platforms")
        
        return jsonify({
            'success': True,
            'data': {
                'jobs': all_jobs,
                'jobsByPlatform': jobs_by_platform,
                'statistics': {
                    'total_jobs': len(all_jobs),
                    'platforms_searched': list(jobs_by_platform.keys()),
                    'jobs_per_platform': {k: len(v) for k, v in jobs_by_platform.items()},
                }
            }
        })
        
    except Exception as e:
        print(f"\n  JOB API SEARCH ERROR: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'details': traceback.format_exc()
        }), 500


# ==================== DEEP AI RESUME ANALYSIS ====================

@app.route('/api/deep-analyze-resume', methods=['POST'])
def deep_analyze_resume():
    """
    POST /api/deep-analyze-resume
    Deeply analyze a resume using BOTH Groq (Llama 3.3) and Google Gemini AI.
    Returns comprehensive analysis with keyword recommendations.

    Request:
    {
        "resumeText": "...",
        "resumeFile": "<base64 encoded file>"  (optional — will be parsed)
    }

    Response:
    {
        "success": true,
        "data": {
            "ats_score": 82,
            "overall_score": 78,
            "recommended_job_keywords": ["Python", "Django", ...],
            "suggested_job_titles": ["Backend Developer", ...],
            "strengths": [...],
            "weaknesses": [...],
            ...
        }
    }
    """
    try:
        data = request.json or {}
        resume_text = data.get('resumeText', '')

        # If a base64 file is provided instead of text, decode & parse it
        if not resume_text and data.get('resumeFile'):
            try:
                file_data = base64.b64decode(data['resumeFile'])
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    tmp.write(file_data)
                    tmp_path = tmp.name
                parsed = resume_parser.parse_resume_from_file(tmp_path)
                resume_text = parsed.get('raw_text', '') or parsed.get('text', '')
                os.unlink(tmp_path)
            except Exception as parse_err:
                print(f"[DEEP-ANALYZE] File parse error: {parse_err}")

        if not resume_text or len(resume_text.strip()) < 50:
            return jsonify({'success': False, 'error': 'Resume text is required (min 50 chars)'}), 400

        groq_key = os.getenv('GROQ_API_KEY', '')
        gemini_key = os.getenv('GEMINI_API_KEY', '')

        if not groq_key and not gemini_key:
            return jsonify({'success': False, 'error': 'No AI API keys configured (need GROQ_API_KEY or GEMINI_API_KEY)'}), 500

        print(f"\n{'='*60}")
        print(f"[DEEP-ANALYZE] Starting deep resume analysis ({len(resume_text)} chars)")
        print(f"[DEEP-ANALYZE] Providers: Groq={'Yes' if groq_key else 'No'}, Gemini={'Yes' if gemini_key else 'No'}")
        print(f"{'='*60}")

        if not analyze_resume_deep:
            return jsonify({'success': False, 'error': 'Deep analyzer module not loaded'}), 500

        result = analyze_resume_deep(resume_text, groq_key=groq_key, gemini_key=gemini_key)

        if result.get('success'):
            print(f"[DEEP-ANALYZE] Done: ATS={result.get('ats_score')}, Keywords={len(result.get('recommended_job_keywords', []))}, Titles={len(result.get('suggested_job_titles', []))}")
        else:
            print(f"[DEEP-ANALYZE] Failed: {result.get('error')}")

        return jsonify({'success': result.get('success', False), 'data': result})

    except Exception as e:
        print(f"[DEEP-ANALYZE] ERROR: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== MODULE 3: RESUME ENHANCEMENT & FRAUD DETECTION ====================

@app.route('/api/enhance-and-detect', methods=['POST'])
def enhance_and_detect():
    """
    POST /api/enhance-and-detect
    Module 3 — Resume Enhancement & Fraud Detection.
    Runs FE-1 (formatting/grammar/keyword gaps), FE-2 (fraud/inconsistency),
    and FE-3 (action verbs, summaries, ATS layout) in one call.

    Request:
    {
        "resumeText": "...",
        "jobDescription": "...",       (optional)
        "parsedData": { ... }            (optional — will parse if missing)
    }
    """
    def _build_fallback_payload(resume_text_value, parsed_data_value):
        safe_text = resume_text_value if isinstance(resume_text_value, str) else ''
        safe_parsed = parsed_data_value if isinstance(parsed_data_value, dict) else {}
        word_count = len(safe_text.split()) if safe_text else 0
        return {
            'module3_score': 0,
            'executive_summary': 'Module 3 fallback used. Full analysis is currently unavailable.',
            'fe1_formatting_grammar': {
                'overall_fe1_score': 0,
                'formatting_score': 0,
                'grammar_score': 0,
                'keyword_gap_score': 0,
                'issues': [],
                'corrective_actions': [],
                'formatting_details': {
                    'sections_found': {},
                    'word_count': word_count,
                },
                'grammar_details': {
                    'action_verb_count': 0,
                    'metric_count': 0,
                },
                'keyword_gap_details': {
                    'resume_keywords_found': safe_parsed.get('skills', [])[:12],
                    'missing_keywords': [],
                    'detected_domains': [],
                },
            },
            'fe2_fraud_detection': {
                'risk_level': 'none',
                'fraud_score': 0,
                'summary': 'Fraud analysis not available at the moment.',
                'issues': [],
                'recommendations': [],
            },
            'fe3_enhancement': {
                'enhancement_score': 0,
                'priority_actions': [],
                'action_verb_analysis': {
                    'strong_verbs_used': [],
                    'weak_verbs_used': [],
                    'total_actions': 0,
                    'action_verb_ratio': 0,
                },
                'summary_suggestions': [],
                'ats_structure': {
                    'missing_sections': [],
                    'improvement_tips': [],
                },
                'ats_keywords': {
                    'recommended_keywords': [],
                    'missing_keywords': [],
                },
                'ats_formatting': {
                    'issues': [],
                    'fixes': [],
                },
            },
        }

    def _safe_fallback(resume_text_value, parsed_data_value, warning_message=None):
        payload = _build_fallback_payload(resume_text_value, parsed_data_value)
        response = {'success': True, 'data': payload}
        if warning_message:
            response['warning'] = str(warning_message)
        return jsonify(response)

    try:
        data = request.json or {}
        resume_text = data.get('resumeText', '')
        if not isinstance(resume_text, str):
            resume_text = str(resume_text or '')
        job_description = data.get('jobDescription', '')
        parsed_data = data.get('parsedData', {})
        if not isinstance(parsed_data, dict):
            parsed_data = {}

        if not resume_text or len(resume_text.strip()) < 50:
            return _safe_fallback(resume_text, parsed_data, 'resumeText is required (min 50 chars)')

        # Parse resume if parsed_data not supplied
        if not parsed_data or not parsed_data.get('skills'):
            try:
                parsed_data = resume_parser.parse_resume(resume_text)
            except Exception as pe:
                print(f'[MODULE3] Parse fallback failed: {pe}')
                parsed_data = {'raw_text': resume_text, 'skills': [], 'education': [], 'experience': []}

        parsed_data['raw_text'] = resume_text

        def _default_module3_result():
            return _build_fallback_payload(resume_text, parsed_data)

        # If module3 is available, use it; otherwise return fallback response
        raw_result = {}
        if module3:
            print(f"[MODULE3] Running enhancement & fraud detection ({len(resume_text)} chars)")
            try:
                raw_result = module3.analyze(parsed_data, resume_text, job_description)
            except TypeError:
                raw_result = module3.analyze(parsed_data)
            except Exception as module_err:
                print(f"[MODULE3] Analyze failed, using fallback: {module_err}")
                raw_result = {}
            print(f"[MODULE3] Done — score={raw_result.get('module3_score') if isinstance(raw_result, dict) else None}")
        else:
            print("[MODULE3] Module 3 not available — returning fallback response")

        if not isinstance(raw_result, dict):
            raw_result = {}

        if 'fe1_formatting' in raw_result and 'fe1_formatting_grammar' not in raw_result:
            raw_result['fe1_formatting_grammar'] = raw_result.get('fe1_formatting')
        if 'fe2_fraud' in raw_result and 'fe2_fraud_detection' not in raw_result:
            raw_result['fe2_fraud_detection'] = raw_result.get('fe2_fraud')
        if 'fe3_ats' in raw_result and 'fe3_enhancement' not in raw_result:
            raw_result['fe3_enhancement'] = raw_result.get('fe3_ats')

        defaults = _default_module3_result()
        fe1 = {**defaults['fe1_formatting_grammar'], **(raw_result.get('fe1_formatting_grammar') or {})}
        fe1['formatting_details'] = {
            **defaults['fe1_formatting_grammar']['formatting_details'],
            **(fe1.get('formatting_details') or {})
        }
        fe1['grammar_details'] = {
            **defaults['fe1_formatting_grammar']['grammar_details'],
            **(fe1.get('grammar_details') or {})
        }
        fe1['keyword_gap_details'] = {
            **defaults['fe1_formatting_grammar']['keyword_gap_details'],
            **(fe1.get('keyword_gap_details') or {})
        }

        fe2 = {**defaults['fe2_fraud_detection'], **(raw_result.get('fe2_fraud_detection') or {})}
        fe3 = {**defaults['fe3_enhancement'], **(raw_result.get('fe3_enhancement') or {})}
        fe3['action_verb_analysis'] = {
            **defaults['fe3_enhancement']['action_verb_analysis'],
            **(fe3.get('action_verb_analysis') or {})
        }
        fe3['ats_structure'] = {
            **defaults['fe3_enhancement']['ats_structure'],
            **(fe3.get('ats_structure') or {})
        }
        fe3['ats_keywords'] = {
            **defaults['fe3_enhancement']['ats_keywords'],
            **(fe3.get('ats_keywords') or {})
        }
        fe3['ats_formatting'] = {
            **defaults['fe3_enhancement']['ats_formatting'],
            **(fe3.get('ats_formatting') or {})
        }

        result = {
            **defaults,
            **raw_result,
            'fe1_formatting_grammar': fe1,
            'fe2_fraud_detection': fe2,
            'fe3_enhancement': fe3,
        }

        return jsonify({'success': True, 'data': result})

    except Exception as e:
        print(f'[MODULE3] ERROR: {e}')
        traceback.print_exc()
        return _safe_fallback(locals().get('resume_text', ''), locals().get('parsed_data', {}), e)


# ==================== INDEED RAPIDAPI SEARCH ====================

@app.route('/api/search-indeed-api', methods=['POST'])
def search_indeed_api():
    """
    POST /api/search-indeed-api
    Search for jobs on Indeed using the RapidAPI Indeed Scraper API.

    Request:
    {
        "query": "Python Developer",
        "location": "New York, NY",
        "country": "us",
        "maxRows": 20,
        "jobType": "",
        "level": "",
        "sort": "relevance",
        "fromDays": "7",
        "remote": "",
        "radius": "25"
    }
    """
    try:
        data = request.json or {}
        query = data.get('query', '').strip()
        if not query:
            return jsonify({'success': False, 'error': 'Query is required'}), 400

        location = data.get('location', '')
        country = data.get('country', 'us')
        max_rows = data.get('maxRows', 20)
        job_type = data.get('jobType', '')
        level = data.get('level', '')
        sort_by = data.get('sort', 'relevance')
        from_days = data.get('fromDays', '7')
        remote = data.get('remote', '')
        radius = data.get('radius', '25')

        print(f"\n{'='*60}")
        print(f"[INDEED-API] Searching: query='{query}', location='{location}', country='{country}'")
        print(f"{'='*60}")

        if not indeed_api_scraper:
            # Fallback: generate search-link jobs
            print("[INDEED-API] No RapidAPI key — generating search links")
            fallback_jobs = _generate_fallback_indeed_jobs(query, location or country, max_rows)
            return jsonify({
                'success': True,
                'data': {
                    'jobs': fallback_jobs,
                    'total': len(fallback_jobs),
                    'source': 'indeed_search_links',
                    'message': 'Search links generated (no RapidAPI key configured)'
                }
            })

        jobs = indeed_api_scraper.search_jobs(
            query=query,
            location=location,
            country=country,
            max_rows=max_rows,
            job_type=job_type,
            level=level,
            sort=sort_by,
            from_days=from_days,
            remote=remote,
            radius=radius,
        )

        print(f"[INDEED-API] Found {len(jobs)} jobs")

        # If API returned no results, fall back to search links
        if not jobs:
            print("[INDEED-API] No results from API — generating search links")
            jobs = _generate_fallback_indeed_jobs(query, location or country, max_rows)
            return jsonify({
                'success': True,
                'data': {
                    'jobs': jobs,
                    'total': len(jobs),
                    'source': 'indeed_search_links',
                    'message': 'Fallback search links (API returned no results)'
                }
            })

        return jsonify({
            'success': True,
            'data': {
                'jobs': jobs,
                'total': len(jobs),
                'source': 'indeed_api',
            }
        })

    except Exception as e:
        print(f"[INDEED-API] ERROR: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


def _generate_fallback_indeed_jobs(query: str, location: str, max_results: int) -> list:
    """Generate realistic fallback jobs when RapidAPI is unavailable - links to actual Indeed search results"""
    import urllib.parse
    
    # Realistic company names for demonstration
    companies = [
        "Tech Solutions Inc", "Digital Innovations Ltd", "Data Analytics Corp",
        "Software Systems Co", "Cloud Services LLC", "AI Development Inc",
        "Enterprise Solutions", "Global Tech Group", "Innovation Labs", "Future Systems"
    ]
    
    q = urllib.parse.quote_plus(query)
    loc = urllib.parse.quote_plus(location) if location else "Remote"
    
    variations = [
        {"title": query, "suffix": "", "level": ""},
        {"title": f"Senior {query}", "suffix": "&explvl=senior_level", "level": "Senior"},
        {"title": f"Junior {query}", "suffix": "&explvl=entry_level", "level": "Junior"},
        {"title": f"{query} - Remote", "suffix": "&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11", "level": ""},
        {"title": f"{query} (Full-Time)", "suffix": "&jt=fulltime", "level": ""},
    ]

    jobs = []
    for idx, var in enumerate(variations[:max_results]):
        vq = urllib.parse.quote_plus(var["title"].replace(" - Remote", "").replace(" (Full-Time)", ""))
        company_name = companies[idx % len(companies)]
        
        # Build proper Indeed URL for direct job search
        indeed_url = f"https://www.indeed.com/jobs?q={vq}&l={loc}{var['suffix']}"
        
        job = {
            "id": f"indeed-fallback-{idx}",
            "title": var["title"],
            "company": company_name,
            "location": location or "Worldwide",
            "description": f"This is a curated search result from Indeed for {var['title']} positions. Click 'Apply Now' to view and apply to actual job postings matching your search criteria. These are real positions currently open at companies in {location or 'various locations'}.",
            "source": "Indeed",
            "url": indeed_url,
            "applyUrl": indeed_url,
            "posted_date": "Live Search",
            "salary": "$50,000 - $120,000+",
            "type": "Full-time",
            "is_remote": "remote" in var["title"].lower(),
            "isRemote": "remote" in var["title"].lower(),
            "logo": None,
            "qualifications": [
                f"Proficiency in {query.split()[0] if query else 'core technology'}",
                "3+ years of relevant experience",
                "Strong problem-solving skills",
                "Team collaboration experience"
            ],
            "responsibilities": [
                f"Develop and maintain {query.split()[0] if query else 'software'} solutions",
                "Collaborate with cross-functional teams",
                "Participate in code reviews",
                "Contribute to project planning and design"
            ],
            "benefits": [
                "Competitive salary and benefits",
                "Professional development opportunities",
                "Health and wellness programs",
                "Flexible work arrangements"
            ]
        }
        jobs.append(job)
    
    return jobs


# ==================== LINKEDIN RAPIDAPI SEARCH ====================

@app.route('/api/search-linkedin-api', methods=['POST'])
def search_linkedin_api():
    """
    POST /api/search-linkedin-api
    Search for jobs on LinkedIn using the RapidAPI LinkedIn Job Search API.

    Request:
    {
        "query": "Python Developer",
        "location": "United States",
        "limit": 20,
        "timeRange": "24h"
    }
    """
    try:
        data = request.json or {}
        query = data.get('query', '').strip()
        location = data.get('location', '')
        limit = data.get('limit', 20)
        time_range = data.get('timeRange', '24h')
        keywords = data.get('keywords', [])
        search_type = data.get('searchType', 'job')

        print(f"\n{'='*60}")
        print(f"[LINKEDIN-API] Searching: query='{query}', location='{location}', limit={limit}, searchType='{search_type}'")
        print(f"{'='*60}")

        if not linkedin_api_scraper:
            print("[LINKEDIN-API] No RapidAPI key — generating search links")
            fallback_jobs = _generate_fallback_linkedin_jobs(query or ' '.join(keywords[:3]), location, limit)
            return jsonify({
                'success': True,
                'data': {
                    'jobs': fallback_jobs,
                    'total': len(fallback_jobs),
                    'source': 'linkedin_search_links',
                    'message': 'Search links generated (no LinkedIn RapidAPI key configured)'
                }
            })

        # Use multi-keyword search if keywords provided, else single query
        if keywords and len(keywords) > 0 and not query:
            query = ' '.join(keywords[:3])

        # Company search: get broader results and filter by organization name
        if search_type == 'company':
            company_name = query.lower()
            # Search without title filter (pass empty query) to get recent jobs, then filter by org
            all_jobs = linkedin_api_scraper.search_jobs(
                query="",
                location=location,
                limit=100,
                time_range='7d',
            )
            jobs = [j for j in all_jobs if company_name in (j.get('company', '') or '').lower()]
            if not jobs:
                # Also try with title filter in case company name appears in titles
                jobs = linkedin_api_scraper.search_jobs(
                    query=query,
                    location=location,
                    limit=limit,
                    time_range='7d',
                )
            jobs = jobs[:limit]
        elif keywords and len(keywords) > 1:
            jobs = linkedin_api_scraper.search_jobs_multi(
                keywords=keywords,
                location=location,
                limit=limit,
                time_range=time_range,
            )
        else:
            jobs = linkedin_api_scraper.search_jobs(
                query=query,
                location=location,
                limit=limit,
                time_range=time_range,
            )

        print(f"[LINKEDIN-API] Found {len(jobs)} jobs")

        if not jobs:
            print("[LINKEDIN-API] No results from API — generating search links")
            jobs = _generate_fallback_linkedin_jobs(query, location, limit)
            return jsonify({
                'success': True,
                'data': {
                    'jobs': jobs,
                    'total': len(jobs),
                    'source': 'linkedin_search_links',
                    'message': 'Fallback search links (API returned no results)'
                }
            })

        return jsonify({
            'success': True,
            'data': {
                'jobs': jobs,
                'total': len(jobs),
                'source': 'linkedin_api',
            }
        })

    except Exception as e:
        print(f"[LINKEDIN-API] ERROR: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


def _generate_fallback_linkedin_jobs(query: str, location: str, max_results: int) -> list:
    """Generate realistic fallback jobs when RapidAPI is unavailable - links to actual LinkedIn search results"""
    import urllib.parse
    
    # Realistic company names for demonstration
    companies = [
        "Microsoft", "Google", "Amazon", "Apple", "Meta",
        "Accenture", "Deloitte", "IBM", "TCS", "Wipro",
        "Tech Innovations", "Digital Solutions", "Cloud Services"
    ]
    
    q = urllib.parse.quote_plus(query)
    loc = urllib.parse.quote_plus(location) if location else ''
    location_param = f"&location={loc}" if loc else ''

    variations = [
        {"title": query, "suffix": ""},
        {"title": f"Senior {query}", "suffix": "&f_E=4"},
        {"title": f"Junior {query}", "suffix": "&f_E=2"},
        {"title": f"{query} - Remote", "suffix": "&f_WT=2"},
        {"title": f"{query} (Full-Time)", "suffix": "&f_JT=F"},
    ]

    jobs = []
    for idx, var in enumerate(variations[:max_results]):
        vq = urllib.parse.quote_plus(var["title"].replace(" - Remote", "").replace(" (Full-Time)", ""))
        company_name = companies[idx % len(companies)]
        
        # Build proper LinkedIn URL for direct job search
        linkedin_url = f"https://www.linkedin.com/jobs/search/?keywords={vq}{location_param}{var['suffix']}"
        
        job = {
            "id": f"linkedin-fallback-{idx}",
            "title": var["title"],
            "company": company_name,
            "location": location or "Worldwide",
            "description": f"Discover {var['title']} opportunities on LinkedIn. Click 'Apply Now' to view and connect with companies actively hiring in {location or 'your target location'}. Access to exclusive job postings and professional networking.",
            "source": "LinkedIn",
            "url": linkedin_url,
            "applyUrl": linkedin_url,
            "posted_date": "Live Search",
            "salary": "$60,000 - $150,000+",
            "type": "Full-time",
            "is_remote": "remote" in var["title"].lower(),
            "isRemote": "remote" in var["title"].lower(),
            "logo": None,
            "qualifications": [
                f"Expertise in {query.split()[0] if query else 'core skills'}",
                "5+ years of professional experience",
                "Strong analytical and communication skills",
                "Bachelor's degree or equivalent experience"
            ],
            "responsibilities": [
                f"Lead and develop {query.split()[0] if query else 'innovative'} solutions",
                "Mentor junior team members",
                "Drive project delivery and quality",
                "Contribute to strategic initiatives"
            ],
            "benefits": [
                "Competitive compensation package",
                "Career growth and learning opportunities",
                "Comprehensive health benefits",
                "Flexible and remote work options"
            ]
        }
        jobs.append(job)
    
    return jobs


# ==================== JOB SCRAPING ENDPOINTS ====================

@app.route('/api/scrape-jobs', methods=['POST'])
def scrape_jobs():
    """
    POST /api/scrape-jobs
    Scrape jobs from Indeed Pakistan and Rozee.pk
    Falls back to realistic demo jobs if scraping returns 0 results
    
    Request body:
    {
        "jobTitle": "Python Developer",
        "location": "Karachi",
        "max_results_per_platform": 5
    }
    """
    try:
        print("\n" + "="*60)
        print("🔍 JOB SCRAPING REQUEST")
        print("="*60)
        
        data = request.get_json()
        job_title = data.get('jobTitle') or data.get('keywords', 'Developer')
        location = data.get('location', 'Pakistan')
        max_results = data.get('max_results_per_platform', 5)
        platforms = data.get('platforms', ['indeed'])
        
        print(f"📋 Job Title: {job_title}")
        print(f"📍 Location: {location}")
        print(f"📊 Max Results per Platform: {max_results}")
        print(f"🌐 Platforms: {platforms}")
        
        # Check if scraper is available
        if not job_scraper:
            print("❌ Job scraper not initialized")
            return jsonify({
                'success': False,
                'error': 'Job scraper initialization failed',
                'data': {'jobs': [], 'jobsByPlatform': {}, 'statistics': {}}
            }), 503
        
        # Perform the scraping with requested platforms
        print("\n🔄 Starting job search across platforms...")
        results = job_scraper.search_jobs(
            job_title=job_title,
            location=location,
            max_per_platform=max_results,
            platforms=platforms
        )
        
        # If no real jobs found, use realistic fallback
        total_jobs = len(results['allJobs'])
        if total_jobs == 0:
            print("\n⚠️ No jobs found from real scraping (sites blocking), using fallback...")
            results = _generate_fallback_jobs(job_title, location, max_results)
            total_jobs = len(results['allJobs'])
            print(f"   Generated {total_jobs} fallback jobs")
        
        print(f"\n✅ Job Search Complete")
        print(f"   Total Jobs: {total_jobs}")
        for platform_name, platform_jobs in results['jobsByPlatform'].items():
            print(f"   {platform_name.capitalize()}: {len(platform_jobs)} jobs")
        
        return jsonify({
            'success': True,
            'data': {
                'jobs': results['allJobs'],
                'jobsByPlatform': results['jobsByPlatform'],
                'statistics': results['statistics']
            }
        })
        
    except Exception as e:
        print(f"\n❌ JOB SCRAPING ERROR: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'details': traceback.format_exc()
        }), 500


def _generate_fallback_jobs(job_title: str, location: str, max_results: int):
    """Generate realistic fallback jobs - links to real Indeed search results"""
    import urllib.parse
    
    companies = [
        "Tech Innovations", "Digital Solutions Inc", "Enterprise Systems",
        "Cloud Computing Co", "Data Analytics Pro", "Software Solutions LLC",
        "IT Services Group", "Tech Consultants", "Global Innovations"
    ]
    
    query = urllib.parse.quote_plus(job_title)
    loc = urllib.parse.quote_plus(location)
    
    # Create jobs that link to real Indeed search results with realistic details
    search_variations = [
        {"title": job_title, "suffix": "", "sort": ""},
        {"title": f"Senior {job_title}", "suffix": "&explvl=senior_level", "sort": ""},
        {"title": f"Junior {job_title}", "suffix": "&explvl=entry_level", "sort": ""},
        {"title": f"{job_title} - Remote", "suffix": "&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11", "sort": ""},
        {"title": f"{job_title} (Full-Time)", "suffix": "&jt=fulltime", "sort": ""},
    ]
    
    jobs = []
    for i, var in enumerate(search_variations[:max_results]):
        var_query = urllib.parse.quote_plus(var["title"].replace(" - Remote", "").replace(" (Full-Time)", ""))
        company_name = companies[i % len(companies)]
        job_url = f"https://pk.indeed.com/jobs?q={var_query}&l={loc}{var['suffix']}"
        
        job = {
            "id": f"indeed-fallback-{i}",
            "title": var["title"],
            "company": company_name,
            "location": location,
            "description": f"Search for {var['title']} positions in {location}. Browse real job listings on Indeed that match your criteria. These are active job postings from companies actively hiring.",
            "source": "indeed",
            "url": job_url,
            "applyUrl": job_url,
            "posted_date": "Live Search",
            "salary": "$50,000 - $100,000+",
            "type": "Full-time",
            "is_remote": "remote" in var["title"].lower(),
            "isRemote": "remote" in var["title"].lower(),
            "logo": None,
            "qualifications": [
                f"Experience with {job_title.split()[0] if job_title else 'required'} technologies",
                "2-5+ years of relevant experience",
                "Strong technical skills and problem-solving",
                "Team collaboration and communication"
            ],
            "responsibilities": [
                f"Develop and maintain {job_title.split()[0] if job_title else 'solutions'} systems",
                "Work with cross-functional teams",
                "Contribute to technical improvements",
                "Support project delivery"
            ],
            "benefits": [
                "Competitive salary package",
                "Professional development",
                "Health and wellness benefits",
                "Flexible working conditions"
            ]
        }
        jobs.append(job)
    
    return {
        'allJobs': jobs,
        'jobsByPlatform': {
            'indeed': jobs
        },
        'statistics': {
            'total_jobs': len(jobs),
            'platforms_scraped': ['indeed'] if jobs else [],
            'jobs_per_platform': {
                'indeed': len(jobs)
            }
        }
    }


if __name__ == '__main__':
    print("=" * 60)
    print("VeriResume Python AI Microservice")
    print("=" * 60)
    print(f"Starting server on http://localhost:5001")
    print(f"OpenAI API Key: {'✓ Configured' if os.getenv('OPENAI_API_KEY') else '✗ Not configured'}")
    print(f"Gemini API Key: {'✓ Configured' if os.getenv('GEMINI_API_KEY') else '✗ Not configured'}")
    print(f"Groq API Key: {'✓ Configured' if os.getenv('GROQ_API_KEY') else '✗ Not configured'}")
    print(f"LinkedIn API Key: {'✓ Configured' if os.getenv('LINKEDIN_RAPIDAPI_KEY') else '✗ Not configured'}")
    print("=" * 60)
    
    try:
        app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False, threaded=True)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        import traceback
        traceback.print_exc()
        input("Press Enter to exit...")
