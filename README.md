# CalEst Full-Stack Project (Smart Nutrition Tracker)

Stack: React + Vite frontend, Node.js + Express backend, optional MongoDB & Redis.

## Features Added
- **Search via Image (AI Food Vision)**: Upload any food image or take a photo to automatically detect the dish, calculate portion size, and retrieve full nutritional data.
- **Track Calories from Image**: Instantly estimates calories (kcal), protein, carbs, and fat from the food in the photo. Track the meal directly into today's diary with 1 click.
- **Food Photo Diary**: Tracked meals preserve their photo thumbnails in the daily diary.
- **Built-in Sample Photos**: Fast 1-click test photos (Pizza, Salad, Samosa, Apple, Banana, Paneer Curry) for immediate verification.
- **Flexible AI Vision Engine**:
  - Out of the box: Intelligent built-in food vision classifier (analyzes visual features, color palettes, textures, and food characteristics).
  - Optional cloud AI: Add `GEMINI_API_KEY=your_key` in `backend/.env` to enable Google Gemini 1.5 Flash Vision for recognizing dishes and estimating calories with generative multimodal AI.

## Quick Start
1. Run `START_PROJECT.bat` or run:
   ```bash
   npm install
   npm --prefix backend install
   npm --prefix frontend install
   npm run dev
   ```
2. Open Vite address in browser (normally `http://localhost:5173`).
3. Backend health check: `http://localhost:5000/api/health`.

## How to Use the Image Search & Calorie Tracker
1. Go to **Panel 01: Build your meal / Search & track by photo**.
2. Click **"Choose image file"** to upload any food picture, OR click one of the quick sample foods (e.g. 🍕 Pizza, 🥗 Salad, 🔺 Samosa).
3. The AI Vision system scans the image, identifies the food, and auto-fills:
   - Identified food item
   - Default portion in grams
   - Calories, Protein, Carbs, and Fat
   - Quick alternatives if you want to switch dishes
4. Click **"Track this meal now"** or **"Add to today's diary"**.
5. View the tracked meal, photo thumbnail, and updated daily progress in **Panel 02: Daily overview**!
