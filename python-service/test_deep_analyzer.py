#!/usr/bin/env python
import sys
sys.path.insert(0, 'd:\\python VS code\\website-VeriResume\\python-service')

from modules.deep_analyzer import DeepResumeAnalyzer

print("="*60)
print("Testing DeepResumeAnalyzer.analyze() method")
print("="*60)

try:
    analyzer = DeepResumeAnalyzer()
    
    # Test 1: With 2 arguments
    print("\n✓ Test 1: Calling analyze(resume_text, job_description)")
    result = analyzer.analyze("Test resume content", "Software Engineer job")
    print(f"  Result keys: {list(result.keys())}")
    print(f"  ATS Score: {result.get('ats_score', 'N/A')}")
    print("  ✅ PASS: Method accepts 2 arguments")
    
    # Test 2: With 1 argument
    print("\n✓ Test 2: Calling analyze(resume_text) with default job_description")
    result = analyzer.analyze("Test resume content")
    print(f"  ATS Score: {result.get('ats_score', 'N/A')}")
    print("  ✅ PASS: Method accepts 1 argument with defaults")
    
    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED - Method signature is correct!")
    print("="*60)
    
except TypeError as e:
    print(f"\n❌ ERROR: {e}")
    print("The method signature is WRONG!")
    sys.exit(1)

except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
