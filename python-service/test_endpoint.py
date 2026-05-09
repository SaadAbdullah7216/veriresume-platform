import requests
import json

url = "http://localhost:5001/api/analyze-resume"
payload = {
    "resumeText": "Python developer with 5 years experience in Django, Flask, AWS, Docker. Strong backend skills.",
    "jobDescription": "Senior Software Engineer - Python, AWS required"
}

try:
    response = requests.post(url, json=payload, timeout=30)
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Success: {result.get('success')}")
    if result.get('success'):
        print(f"ATS Score: {result.get('data', {}).get('ats_score')}")
        print("✅ ANALYZE ENDPOINT WORKS!")
    else:
        print(f"Error: {result.get('error')}")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
