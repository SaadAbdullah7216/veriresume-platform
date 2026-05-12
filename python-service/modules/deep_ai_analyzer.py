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

    suggested_job_titles = []
    recommended_job_keywords = []

    # Attempt Groq API first
    if groq_key and text:
        import requests
        try:
            prompt = f"Based on the following resume text, provide 2 to 4 suggested job titles that perfectly match the candidate's skills and experience. Also provide 5 to 8 recommended keywords for ATS optimization. Reply strictly in valid JSON format: {{\\"titles\\": [\\"Job Title 1\\"], \\"keywords\\": [\\"Keyword 1\\"]}}\\n\\nResume text: {text[:4000]}"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            data = {
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.3
            }
            res = requests.post("https://api.groq.com/openai/v1/chat/completions", json=data, headers=headers, timeout=15)
            if res.status_code == 200:
                import json
                content = res.json()["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                suggested_job_titles = parsed.get("titles", [])
                recommended_job_keywords = parsed.get("keywords", [])
        except Exception as e:
            print("Groq API error:", e)

    # Fallback to Gemini API if Groq fails or is not available
    if not suggested_job_titles and gemini_key and text:
        import requests
        try:
            prompt = f"Based on the following resume text, provide 2 to 4 suggested job titles that perfectly match the candidate's skills and experience. Also provide 5 to 8 recommended keywords for ATS optimization. Reply strictly in valid JSON format: {{\\"titles\\": [\\"Job Title 1\\"], \\"keywords\\": [\\"Keyword 1\\"]}}\\n\\nResume text: {text[:4000]}"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            data = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0.3}
            }
            res = requests.post(url, json=data, timeout=15)
            if res.status_code == 200:
                import json
                content = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(content)
                suggested_job_titles = parsed.get("titles", [])
                recommended_job_keywords = parsed.get("keywords", [])
        except Exception as e:
            print("Gemini API error:", e)

    # Final fallback to heuristics
    if not suggested_job_titles:
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
