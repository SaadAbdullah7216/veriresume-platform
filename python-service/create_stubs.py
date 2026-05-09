import os

base = r'D:\python VS code\website-VeriResume\python-service\modules'

files = {
    'anomaly_detector': "class AnomalyDetector:\n    def __init__(self):\n        pass\n    def detect(self, data):\n        return {'hasAnomalies': False, 'anomalies': []}\n",
    'deep_analyzer': "TECH_SKILLS = []\nSOFT_SKILLS = []\n\nclass DeepResumeAnalyzer:\n    def __init__(self):\n        pass\n    def analyze(self, resume_text, job_description='', *args, **kwargs):\n        return {'grammar_score': 70, 'readability_score': 70, 'structure_score': 70, 'ats_score': 75}\n",
    'ai_analyzer': "class AIAnalyzer:\n    def __init__(self): pass\n    def analyze_resume(self, data): return {}\n",
    'groq_analyzer': "class GroqAnalyzer:\n    def __init__(self): pass\n    def analyze_resume(self, data): return {}\n",
    'gemini_analyzer': "class GeminiAnalyzer:\n    def __init__(self): pass\n    def analyze_resume(self, data): return {}\n",
    'fraud_detection': "class FraudDetector:\n    def __init__(self): pass\n    def detect(self, data): return {}\n",
    'job_api_scraper': "class JobAPIScraper:\n    def __init__(self): pass\n    def scrape(self, query): return []\n",
    'indeed_api_scraper': "class IndeedAPIScraper:\n    def __init__(self): pass\n    def scrape(self, query): return []\n",
    'linkedin_api_scraper': "class LinkedInAPIScraper:\n    def __init__(self): pass\n    def scrape(self, query): return []\n",
    'deep_ai_analyzer': "import re\ndef analyze_resume_deep(resume_text, groq_key='', gemini_key='', **kwargs):\n    if isinstance(resume_text, dict):\n        resume_text = resume_text.get('resumeText') or resume_text.get('resume_text') or resume_text.get('text') or ''\n    text = str(resume_text or '')\n    return {'success': True, 'ats_score': 55, 'recommended_job_keywords': [], 'suggested_job_titles': []}\n",
    'job_scraper_fast': "class FastJobScraper:\n    def __init__(self): pass\n    def scrape(self, query): return []\n",
    'job_scraper': "class JobScraper:\n    def __init__(self): pass\n    def scrape(self, query): return []\n",
    'job_matcher': "class JobMatcher:\n    def __init__(self): pass\n    def match(self, resume, jobs): return []\n\njob_matcher = JobMatcher()\n",
    'hr_system_enhanced': "class HRSystem:\n    def __init__(self): pass\n",
    'hr_system': "class HRSystem:\n    def __init__(self): pass\n",
    'resume_enhancement_fraud': "class ResumeEnhancementAndFraudModule:\n    def __init__(self): pass\n    def analyze(self, parsed_data, resume_text, job_description): return {'success': True}\n",
}

for name, content in files.items():
    path = os.path.join(base, name + '.py')
    with open(path, 'w') as f:
        f.write(content)
    print(f'Written: {name}.py')

print("\nDone! All stubs created.")