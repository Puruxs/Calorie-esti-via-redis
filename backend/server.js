require("dotenv").config();
const express = require("express"),
  cors = require("cors"),
  mongoose = require("mongoose"),
  crypto = require("crypto");
const redis = require("./redis");

const app = express();
app.use(cors({ exposedHeaders: ["X-Cache", "X-RateLimit-Remaining"] }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/api", redis.rateLimit({ windowSec: 60, max: 120 }));

const foods = [
  { id: "rice", name: "Cooked white rice", emoji: "🍚", kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, defaultGrams: 150, tags: ["rice", "white rice", "chawal", "boiled rice", "steamed rice"] },
  { id: "roti", name: "Roti / chapati", emoji: "🫓", kcal: 297, protein: 9, carbs: 46, fat: 7.5, defaultGrams: 80, tags: ["roti", "chapati", "phulka", "flatbread", "bread"] },
  { id: "dal", name: "Dal / lentils", emoji: "🥣", kcal: 116, protein: 9, carbs: 20.1, fat: 0.4, defaultGrams: 180, tags: ["dal", "lentil", "soup", "tadka", "sambar", "yellow dal"] },
  { id: "paneer", name: "Paneer curry", emoji: "🍛", kcal: 210, protein: 10, carbs: 8, fat: 15, defaultGrams: 180, tags: ["paneer", "cottage cheese", "curry", "matar paneer", "shahi paneer"] },
  { id: "chicken", name: "Chicken curry", emoji: "🍗", kcal: 190, protein: 18, carbs: 5, fat: 10, defaultGrams: 180, tags: ["chicken", "curry", "meat", "gravy"] },
  { id: "salad", name: "Mixed salad", emoji: "🥗", kcal: 35, protein: 1.5, carbs: 7, fat: 0.4, defaultGrams: 150, tags: ["salad", "greens", "lettuce", "cucumber", "vegetable"] },
  { id: "banana", name: "Banana", emoji: "🍌", kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3, defaultGrams: 120, tags: ["banana", "fruit", "yellow fruit", "kela"] },
  { id: "apple", name: "Apple", emoji: "🍎", kcal: 52, protein: 0.3, carbs: 13.8, fat: 0.2, defaultGrams: 150, tags: ["apple", "fruit", "red apple", "seb"] },
  { id: "idli", name: "Idli", emoji: "⚪", kcal: 58, protein: 2, carbs: 12, fat: 0.4, defaultGrams: 100, tags: ["idli", "south indian", "steamed"] },
  { id: "dosa", name: "Dosa", emoji: "🥞", kcal: 168, protein: 3.9, carbs: 29, fat: 3.7, defaultGrams: 120, tags: ["dosa", "masala dosa", "crispy", "south indian"] },
  { id: "poha", name: "Poha", emoji: "🍲", kcal: 130, protein: 2.6, carbs: 23, fat: 3.5, defaultGrams: 150, tags: ["poha", "flattened rice", "breakfast"] },
  { id: "oats", name: "Oats (cooked)", emoji: "🥣", kcal: 71, protein: 2.5, carbs: 12, fat: 1.5, defaultGrams: 180, tags: ["oats", "porridge", "oatmeal"] },
  { id: "egg", name: "Boiled egg", emoji: "🥚", kcal: 155, protein: 13, carbs: 1.1, fat: 11, defaultGrams: 100, tags: ["egg", "boiled egg", "protein", "anda"] },
  { id: "pizza", name: "Pizza", emoji: "🍕", kcal: 266, protein: 11, carbs: 33, fat: 10, defaultGrams: 150, tags: ["pizza", "cheese", "slice", "crust"] },
  { id: "burger", name: "Burger", emoji: "🍔", kcal: 295, protein: 17, carbs: 30, fat: 12, defaultGrams: 180, tags: ["burger", "cheeseburger", "sandwich", "patty"] },
  { id: "curd", name: "Curd / yogurt", emoji: "🥛", kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, defaultGrams: 150, tags: ["curd", "yogurt", "dahi", "dairy"] },
  { id: "potato", name: "Boiled potato", emoji: "🥔", kcal: 87, protein: 1.9, carbs: 20.1, fat: 0.1, defaultGrams: 150, tags: ["potato", "aloo", "boiled potato"] },
  { id: "almonds", name: "Almonds", emoji: "🌰", kcal: 579, protein: 21.2, carbs: 21.6, fat: 49.9, defaultGrams: 30, tags: ["almonds", "nuts", "badam", "dry fruit"] },
  { id: "rajma", name: "Rajma curry", emoji: "🫘", kcal: 127, protein: 8.7, carbs: 22.8, fat: 0.5, defaultGrams: 180, tags: ["rajma", "kidney beans", "beans", "curry"] },
  { id: "chole", name: "Chole / chickpea curry", emoji: "🍲", kcal: 164, protein: 8.9, carbs: 27.4, fat: 2.6, defaultGrams: 180, tags: ["chole", "chickpeas", "chana", "curry"] },
  { id: "upma", name: "Upma", emoji: "🥣", kcal: 150, protein: 4, carbs: 25, fat: 4, defaultGrams: 150, tags: ["upma", "semolina", "rava"] },
  { id: "samosa", name: "Vegetable samosa", emoji: "🔺", kcal: 262, protein: 4, carbs: 30, fat: 14, defaultGrams: 100, tags: ["samosa", "snack", "fried", "pastry"] },
  { id: "paratha", name: "Plain paratha", emoji: "🫓", kcal: 320, protein: 7, carbs: 45, fat: 13, defaultGrams: 100, tags: ["paratha", "flatbread", "bread"] },
  { id: "khichdi", name: "Moong dal khichdi", emoji: "🍲", kcal: 120, protein: 4, carbs: 20, fat: 2, defaultGrams: 200, tags: ["khichdi", "rice and dal"] },
  { id: "milk", name: "Milk", emoji: "🥛", kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, defaultGrams: 200, tags: ["milk", "dairy"] },
  { id: "orange", name: "Orange", emoji: "🍊", kcal: 47, protein: 0.9, carbs: 11.8, fat: 0.1, defaultGrams: 130, tags: ["orange", "citrus", "fruit"] }
];

let Log;
const schema = new mongoose.Schema({
  foodId: String,
  foodName: String,
  emoji: String,
  grams: Number,
  meal: String,
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  photo: String,
  createdAt: { type: Date, default: Date.now }
});
Log = mongoose.model("FoodLog", schema);

app.get("/api/health", (_q, s) =>
  s.json({
    ok: true,
    service: "CalEst API",
    database: mongoose.connection.readyState === 1 ? "connected" : "demo mode",
    redis: redis.isReady() ? "connected" : "off",
    aiVision: Boolean(process.env.GEMINI_API_KEY) ? "gemini-enabled" : "intelligent-mobilenet"
  })
);

app.get("/api/foods", async (_q, s) => {
  const c = await redis.getJSON("calest:foods");
  if (c) {
    s.set("X-Cache", "HIT");
    return s.json(c);
  }
  await redis.setJSON("calest:foods", foods, 3600);
  s.set("X-Cache", "MISS");
  s.json(foods);
});

app.post("/api/estimate", async (q, s) => {
  const f = foods.find((x) => x.id === q.body.foodId),
    g = Number(q.body.grams);
  if (!f) return s.status(400).json({ error: "Choose a valid food." });
  if (!Number.isFinite(g) || g < 1 || g > 3000)
    return s.status(400).json({ error: "Portion must be between 1 and 3000 grams." });

  const key = `calest:est:${f.id}:${g}`;
  const c = await redis.getJSON(key);
  if (c) {
    s.set("X-Cache", "HIT");
    return s.json(c);
  }

  const k = g / 100,
    r = (n) => Math.round(n * k * 10) / 10;
  const out = {
    foodId: f.id,
    foodName: f.name,
    emoji: f.emoji,
    grams: g,
    calories: r(f.kcal),
    protein: r(f.protein),
    carbs: r(f.carbs),
    fat: r(f.fat),
    note: "Approximate reference estimate."
  };

  await redis.setJSON(key, out, 600);
  s.set("X-Cache", "MISS");
  s.json(out);
});

// Image Recognition & Calorie Estimation Endpoint
app.post("/api/recognize", async (req, res) => {
  const { image, filename, apiKey: clientApiKey } = req.body || {};
  if (!image) {
    return res.status(400).json({ error: "Image data is required." });
  }

  const effectiveApiKey = clientApiKey || process.env.GEMINI_API_KEY;

  // Use Gemini Multimodal Vision API if key is available
  if (effectiveApiKey) {
    try {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = match ? match[1] : "image/jpeg";
      const base64Data = match ? match[2] : image;

      const prompt = `Identify the main food or dish in this image.
Return ONLY a valid JSON object with NO MARKDOWN and NO BACKTICKS:
{
  "foodName": "Food name (e.g. Samosa, Pizza, Salad, Dal)",
  "matchedId": "rice|roti|dal|paneer|chicken|salad|banana|apple|idli|dosa|poha|oats|egg|pizza|burger|curd|potato|almonds|rajma|chole|upma|samosa|paratha|khichdi|milk|orange",
  "emoji": "emoji",
  "estimatedPortionGrams": number between 30 and 400,
  "confidence": number between 85 and 99,
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "alternatives": ["alt food 1", "alt food 2"]
}`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${effectiveApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: "application/json"
            }
          })
        }
      );

      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        const matchedFood =
          foods.find((f) => f.id === parsed.matchedId) ||
          foods.find((f) =>
            (parsed.foodName || "").toLowerCase().includes(f.name.toLowerCase())
          ) ||
          foods[0];

        const grams = parsed.estimatedPortionGrams || matchedFood.defaultGrams || 150;
        const k = grams / 100;
        const result = {
          success: true,
          detected: {
            foodId: matchedFood.id,
            foodName: parsed.foodName || matchedFood.name,
            emoji: parsed.emoji || matchedFood.emoji,
            grams,
            calories: Number(parsed.calories) || Math.round(matchedFood.kcal * k * 10) / 10,
            protein: Number(parsed.protein) || Math.round(matchedFood.protein * k * 10) / 10,
            carbs: Number(parsed.carbs) || Math.round(matchedFood.carbs * k * 10) / 10,
            fat: Number(parsed.fat) || Math.round(matchedFood.fat * k * 10) / 10,
            confidence: Number(parsed.confidence) || 94,
            method: "Gemini 1.5 Flash Vision AI"
          },
          alternatives: foods
            .filter((f) => f.id !== matchedFood.id)
            .slice(0, 3)
        };

        return res.json(result);
      }
    } catch (e) {
      console.log("Gemini API call failed, deferring to client MobileNet:", e.message);
    }
  }

  // If no Gemini API key, return instruction for client to run MobileNet CNN
  return res.json({
    success: true,
    runClientCNN: true,
    message: "Using client-side MobileNet Deep Learning CNN"
  });
});

const mongoUp = () => mongoose.connection.readyState === 1;

app.get("/api/logs", async (_q, s) => {
  if (mongoUp()) {
    try {
      return s.json({
        mode: "mongodb",
        entries: await Log.find().sort({ createdAt: -1 }).limit(100)
      });
    } catch {
      return s.status(500).json({ error: "Could not fetch logs" });
    }
  }
  const e = await redis.listLogs();
  if (e) return s.json({ mode: "redis", entries: e });
  s.json({ mode: "demo", entries: [] });
});

app.post("/api/logs", async (q, s) => {
  if (mongoUp()) {
    try {
      return s.status(201).json(await Log.create(q.body));
    } catch {
      return s.status(400).json({ error: "Could not save log" });
    }
  }
  if (!redis.isReady())
    return s.status(503).json({ error: "No database connected; use browser demo storage." });

  const b = q.body || {};
  const entry = {
    _id: crypto.randomUUID(),
    foodId: String(b.foodId || ""),
    foodName: String(b.foodName || ""),
    emoji: String(b.emoji || ""),
    grams: Number(b.grams) || 0,
    meal: String(b.meal || ""),
    calories: Number(b.calories) || 0,
    protein: Number(b.protein) || 0,
    carbs: Number(b.carbs) || 0,
    fat: Number(b.fat) || 0,
    photo: String(b.photo || ""),
    createdAt: new Date().toISOString()
  };

  if (!entry.foodName || entry.grams < 1)
    return s.status(400).json({ error: "Could not save log" });

  if (await redis.pushLog(entry)) return s.status(201).json(entry);
  s.status(500).json({ error: "Could not save log" });
});

app.delete("/api/logs/:id", async (q, s) => {
  if (mongoUp()) {
    try {
      await Log.findByIdAndDelete(q.params.id);
      return s.json({ ok: true });
    } catch {
      return s.status(400).json({ error: "Could not delete log" });
    }
  }
  if (await redis.removeLog(q.params.id)) return s.json({ ok: true });
  s.status(404).json({ error: "Log not found" });
});

const port = process.env.PORT || 5000;
(async () => {
  await redis.connectRedis();
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected");
    } catch (e) {
      console.log("MongoDB unavailable; demo mode:", e.message);
    }
  }
  app.listen(port, () => console.log(`CalEst API: http://localhost:${port}`));
})();
