import re


def analyze_resume_deep(resume_text, groq_key='', gemini_key='', **kwargs):
    if isinstance(resume_text, dict):
        resume_text = (
            resume_text.get('resumeText')
            or resume_text.get('resume_text')
            or resume_text.get('text')
            or resume_text.get('raw_text')
            or ''
        )

    text = str(resume_text or '')
    normalized = text.lower()

    keyword_patterns = [
        ('Python', r'\bpython\b'),
        ('Java', r'\bjava\b'),
        ('JavaScript', r'\bjavascript\b|\bnode\.js\b'),
        ('TypeScript', r'\btypescript\b'),
        ('Django', r'\bdjango\b'),
        ('Flask', r'\bflask\b'),
        ('React', r'\breact\b'),
        ('SQL', r'\bsql\b|\bpostgresql\b|\bmysql\b'),
        ('AWS', r'\baws\b'),
        ('Docker', r'\bdocker\b'),
        ('Kubernetes', r'\bkubernetes\b|\bk8s\b'),
        ('Git', r'\bgit\b'),
    ]

    recommended_job_keywords = [
        keyword for keyword, pattern in keyword_patterns if re.search(pattern, normalized)
    ]

    suggested_job_titles = []
    if 'python' in normalized:
        suggested_job_titles.append('Python Developer')
    if 'django' in normalized or 'flask' in normalized:
        suggested_job_titles.append('Backend Engineer')
    if 'react' in normalized or 'javascript' in normalized or 'typescript' in normalized:
        suggested_job_titles.append('Frontend Developer')
    if 'data' in normalized or 'machine learning' in normalized:
        suggested_job_titles.append('Data Engineer')

    if not suggested_job_titles and ('engineer' in normalized or 'developer' in normalized):
        suggested_job_titles.append('Software Engineer')

    ats_score = 55
    if text:
        ats_score = min(95, 40 + min(len(text) // 120, 25) + len(recommended_job_keywords) * 3)

    return {
        'success': True,
        'ats_score': ats_score,
        'recommended_job_keywords': recommended_job_keywords,
        'suggested_job_titles': suggested_job_titles,
        'strengths': [],
        'weaknesses': [],
        'suggestions': [],
        'grammar_score': 70,
        'readability_score': 70,
        'structure_score': 70,
        'summary': 'Heuristic deep analysis completed locally.',
    }
