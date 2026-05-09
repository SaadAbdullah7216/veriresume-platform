class AnomalyDetector:
    def __init__(self):
        pass
    def detect_anomalies(self, resume_data=None, resume_text=None, existing_resumes=None):
        return {'hasAnomalies': False, 'anomalies': [], 'risk_level': 'Low', 'risk_score': 0, 'indicators': [], 'duplicates': []}
    def detect(self, data):
        return {'hasAnomalies': False, 'anomalies': []}
