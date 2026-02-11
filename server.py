"""
خادم Flask لنموذج YOLO
Python Server for YOLO Model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import time

app = Flask(__name__)
CORS(app)

# تحميل النموذج
model = YOLO('model/best.pt')

# أسماء المراحل بالعربية
STAGE_NAMES_AR = {
    'Bud': 'برعم',
    'Flower': 'زهرة',
    'Early-growth': 'نمو مبكر',
    'Mid-Growth': 'نمو متوسط',
    'Maturity': 'ناضج',
    'Dry': 'جاف',
    'not-pomegranate': 'ليس رمان'
}

@app.route('/predict', methods=['POST'])
def predict():
    start_time = time.time()
    
    if 'image' not in request.files:
        return jsonify({'error': 'لم يتم إرسال صورة'}), 400
    
    file = request.files['image']
    img_bytes = file.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return jsonify({'error': 'فشل في قراءة الصورة'}), 400
    
    # تشغيل النموذج
    results = model(img)
    
    detections = []
    stage_counts = {}
    
    for r in results:
        for box in r.boxes:
            class_id = int(box.cls)
            class_name = model.names[class_id]
            confidence = float(box.conf)
            bbox = box.xyxyn.tolist()[0]  # normalized coordinates
            
            detections.append({
                'stage': class_name,
                'stageAr': STAGE_NAMES_AR.get(class_name, class_name),
                'confidence': confidence,
                'bbox': bbox
            })
            
            stage_counts[class_name] = stage_counts.get(class_name, 0) + 1
    
    # تحديد المرحلة الغالبة
    dominant = max(stage_counts, key=stage_counts.get) if stage_counts else 'unknown'
    
    processing_time = time.time() - start_time
    
    return jsonify({
        'dominant': dominant,
        'dominantAr': STAGE_NAMES_AR.get(dominant, dominant),
        'total': len(detections),
        'detections': detections,
        'stageCounts': stage_counts,
        'time': round(processing_time, 2)
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': 'loaded'})

if __name__ == '__main__':
    print("🚀 خادم YOLO يعمل على http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)