"""
VeriResume Resume Parser
Extracts text and structured data from resume files (PDF, DOCX, TXT)
"""

import os
import re
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

# File processing
try:
    import fitz  # PDF reading
except ImportError:
    try:
        import pymupdf as fitz
    except ImportError:
        fitz = None

try:
    from docx import Document  # DOCX reading
except ImportError:
    Document = None

# NLP libraries
nlp = None
try:
    import spacy
    try:
        # Use a shorter timeout to avoid hanging
        import signal
        
        class TimeoutError(Exception):
            pass
        
        def timeout_handler(signum, frame):
            raise TimeoutError("spaCy model loading timed out")
        
        # Try to load with timeout (skip on Windows or if it takes too long)
        nlp = spacy.load("en_core_web_sm")
    except Exception as e:
        print(f"⚠️ spaCy model not available: {e}")
        print("   Continuing without NLP features (name extraction may be less accurate)")
        nlp = None
except ImportError:
    print("⚠️ spaCy not installed, skipping NLP features")
    nlp = None


class ResumeParser:
    """Extracts text and structured data from resume files"""
    
    def __init__(self):
        self.nlp = nlp
        self.supported_formats = ['.pdf', '.docx', '.txt']
        
        # Comprehensive skill database
        self.skill_keywords = {
            # Programming
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby',
            'go', 'rust', 'swift', 'kotlin', 'scala', 'r', 'matlab',
            
            # Web Development
            'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express',
            'django', 'flask', 'spring', 'asp.net', 'laravel', 'rest api',
            
            # Data Science & ML
            'machine learning', 'deep learning', 'data science', 'data analysis',
            'ai', 'ml', 'nlp', 'computer vision', 'tensorflow', 'pytorch',
            'pandas', 'numpy', 'scikit-learn', 'tableau', 'power bi',
            
            # Databases
            'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'oracle',
            
            # Cloud & DevOps
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git'
        }
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF"""
        if not fitz:
            raise ImportError("PyMuPDF not installed")
        
        text = ""
        try:
            with fitz.open(file_path) as doc:
                for page in doc:
                    text += page.get_text()
        except Exception as e:
            print(f"❌ Error reading PDF: {e}")
        
        return text.strip()
    
    def extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX"""
        if not Document:
            raise ImportError("python-docx not installed")
        
        try:
            doc = Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            return text.strip()
        except Exception as e:
            print(f"❌ Error reading DOCX: {e}")
            return ""
    
    def extract_text(self, file_path: str) -> str:
        """Extract text based on file extension"""
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif ext == '.docx':
            return self.extract_text_from_docx(file_path)
        elif ext == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        else:
            raise ValueError(f"Unsupported format: {ext}")

    def parse_resume_from_file(self, file_path: str) -> Dict:
        """Compatibility wrapper for file-based callers."""
        return self.parse_resume(file_path)
    
    def extract_name(self, text: str) -> str:
        """Extract candidate name"""
        lines = text.split('\n')
        for line in lines[:5]:
            line = line.strip()
            if line and len(line.split()) <= 4:
                if self.nlp:
                    try:
                        doc = self.nlp(line)
                        if any(ent.label_ == 'PERSON' for ent in doc.ents):
                            return line
                    except:
                        pass
                # Fallback: capitalized words
                if all(word[0].isupper() for word in line.split() if word):
                    return line
        return "Unknown Candidate"
    
    def extract_email(self, text: str) -> Optional[str]:
        """Extract email address"""
        pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(pattern, text)
        return emails[0] if emails else None
    
    def extract_phone(self, text: str) -> Optional[str]:
        """Extract phone number"""
        patterns = [
            r'\+92[-.\s]?\d{2,3}[-.\s]?\d{7,8}',  # Pakistani
            r'03\d{9}',  # Pakistani mobile
            r'\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
            r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # US/Canada
        ]
        
        for pattern in patterns:
            phones = re.findall(pattern, text)
            if phones:
                return phones[0].strip()
        return None
    
    def extract_skills(self, text: str) -> List[str]:
        """Extract technical skills"""
        text_lower = text.lower()
        found_skills = set()
        
        # Direct keyword matching
        for skill in self.skill_keywords:
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                found_skills.add(skill.title())
        
        # Extract from skills section
        skills_pattern = r'(?:skills?|technical skills?)[\s:]*([^\n]+(?:\n(?![\n])[^\n]+)*)'
        skills_match = re.search(skills_pattern, text_lower, re.IGNORECASE)
        
        if skills_match:
            skills_text = skills_match.group(1)
            potential_skills = re.split(r'[,|•·\n]', skills_text)
            for skill in potential_skills:
                skill = skill.strip()
                if skill and len(skill.split()) <= 4:
                    found_skills.add(skill.title())
        
        return list(found_skills)[:50]
    
    def extract_education(self, text: str) -> List[Dict]:
        """Extract education details"""
        education = []
        education_keywords = ['bachelor', 'master', 'phd', 'diploma', 'degree', 
                             'university', 'college', 'bs', 'ms', 'mba', 'bcs']
        
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if any(kw in line.lower() for kw in education_keywords):
                year_match = re.search(r'\b(19|20)\d{2}\b', line)
                education.append({
                    'degree': line.strip(),
                    'institution': lines[i+1].strip() if i+1 < len(lines) else 'Unknown',
                    'year': year_match.group(0) if year_match else None
                })
        
        return education
    
    def extract_experience(self, text: str) -> List[Dict]:
        """Extract work experience"""
        experience = []
        experience_keywords = ['developer', 'engineer', 'manager', 'analyst', 
                              'consultant', 'intern', 'trainee']
        
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if any(kw in line.lower() for kw in experience_keywords):
                duration_match = re.search(r'((?:19|20)\d{2})\s*[-–to]+\s*((?:19|20)\d{2}|present)', 
                                          text[max(0, i-2):min(len(text), i+3)], re.IGNORECASE)
                experience.append({
                    'title': line.strip(),
                    'company': 'Not specified',
                    'duration': duration_match.group(0) if duration_match else 'Unknown'
                })
        
        return experience[:5]
    
    def parse_resume(self, file_path: str) -> Dict:
        """Main parsing function"""
        print(f"\n📄 Parsing: {os.path.basename(file_path)}")
        
        text = self.extract_text(file_path)
        if not text:
            raise ValueError("Could not extract text")
        
        parsed_data = {
            'raw_text': text,
            'candidate_info': {
                'name': self.extract_name(text),
                'email': self.extract_email(text),
                'phone': self.extract_phone(text)
            },
            'skills': self.extract_skills(text),
            'education': self.extract_education(text),
            'experience': self.extract_experience(text),
            'file_path': file_path,
            'parsed_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        print(f"✅ Parsed: {parsed_data['candidate_info']['name']}")
        return parsed_data
