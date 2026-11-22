# CalEst ML module (CNN, dataset, preprocessing)

This folder provides a real training/inference pipeline, but the trained model is NOT included in the zip.

## Requirements
- Python 3.10 or 3.11 recommended
- Enough disk space and a reliable connection; Food-101 download is large
- Training can take a long time and may be slow on a CPU-only laptop

## Steps
1. Open a terminal in this `ml` folder.
2. `python -m venv .venv`
3. Windows PowerShell: `.\.venv\Scripts\Activate.ps1`
4. `pip install -r requirements.txt`
5. `python prepare_dataset.py` (downloads Food-101; dataset is not bundled)
6. `python train_cnn.py` (trains a transfer-learning CNN; saves model and labels)
7. `python inference_api.py` (starts local image classifier at port 8000)
8. Test `http://127.0.0.1:8000/health`.

The classifier identifies likely Food-101 classes. It does not calculate real-world weight from pixels. Portion size must be supplied by the user or estimated by a separately validated method. Nutrition numbers in the web app are approximate reference values, not medical advice.
