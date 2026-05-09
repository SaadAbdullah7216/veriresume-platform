TECH_SKILLS = []
SOFT_SKILLS = []

class DeepResumeAnalyzer:
    def __init__(self):
        pass
    def analyze(self, resume_text, job_description="", *args, **kwargs):
        if isinstance(resume_text, dict):
            job_description = job_description or resume_text.get('job_description', '')
            resume_text = (
                resume_text.get('resume_text')
                or resume_text.get('resumeText')
                or resume_text.get('text')
                or resume_text.get('raw_text')
                or ''
            )

        if args:
            job_description = job_description or (args[0] if len(args) > 0 else '')

        resume_text = str(resume_text or '')
        job_description = str(job_description or '')

        return {
            'grammar_score': 70,
            'readability_score': 70,
            'structure_score': 70,
            'ats_score': 75,
            'extracted_skills': [],
            'matched_skills': [],
            'missing_skills': [],
            'weaknesses': [],
            'suggestions': [],
            'recommended_keywords': [],
            'tech_skills': [],
            'soft_skills': [],
            'section_analysis': {},
            'metrics': {}
        }
