class HRSystem:
    def __init__(self):
        from modules.anomaly_detector import AnomalyDetector
        self.anomaly_detector = AnomalyDetector()
