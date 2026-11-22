"""Optional local inference API. Requires a trained food101_mobilenet.keras model.
Run: python inference_api.py (serves http://127.0.0.1:8000)
"""
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import tensorflow as tf
from io import BytesIO

ROOT = Path(__file__).parent
MODEL_PATH = ROOT / 'food101_mobilenet.keras'
LABELS_PATH = ROOT / 'labels.txt'
app = Flask(__name__)
CORS(app)
model = None
labels = []
if MODEL_PATH.exists() and LABELS_PATH.exists():
    model = tf.keras.models.load_model(MODEL_PATH)
    labels = LABELS_PATH.read_text(encoding='utf-8').splitlines()

@app.get('/health')
def health():
    return jsonify({'ok': True, 'modelLoaded': model is not None, 'message': 'CNN ready' if model is not None else 'Model not trained yet; run prepare_dataset.py then train_cnn.py.'})

@app.post('/recognize')
def recognize():
    if model is None:
        return jsonify({'error': 'CNN model is not available yet. Prepare Food-101 and train the model first.'}), 503
    if 'image' not in request.files:
        return jsonify({'error': 'Upload an image using field name image.'}), 400
    try:
        image = Image.open(BytesIO(request.files['image'].read())).convert('RGB').resize((224,224))
        arr = np.asarray(image, dtype=np.float32) / 255.0
        probs = model.predict(np.expand_dims(arr, 0), verbose=0)[0]
        ids = np.argsort(probs)[-3:][::-1]
        return jsonify({'predictions':[{'food': labels[int(i)], 'confidence': round(float(probs[i]),4)} for i in ids], 'portionGrams': None, 'note':'Image classifier only. Portion mass is not reliably inferable from a single photo without scale/depth information.'})
    except Exception as e:
        return jsonify({'error': f'Could not process image: {e}'}), 400

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8000, debug=False)
