// Redis helper: fails open. If Redis is down, the API still works (just uncached).
const { createClient } = require("redis");

let client = null;
let ready = false;

async function connectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("REDIS_URL not set; running without Redis");
    return;
  }
  client = createClient({
    url,
    socket: {
      connectTimeout: 2000,
      // retry with backoff, give up after ~5 attempts so the app stays in no-cache mode
      reconnectStrategy: (n) => (n > 5 ? false : Math.min(n * 300, 2000)),
    },
  });
  client.on("ready", () => { ready = true; console.log("Redis connected"); });
  client.on("end", () => { ready = false; });
  client.on("error", (e) => { ready = false; if (!client.__warned) { console.log("Redis unavailable:", e.message); client.__warned = true; } });
  try { await client.connect(); } catch (e) { console.log("Redis unavailable; running without cache:", e.message); }
}

const isReady = () => ready && client && client.isReady;

async function getJSON(key) {
  if (!isReady()) return null;
  try { const v = await client.get(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
async function setJSON(key, value, ttlSec) {
  if (!isReady()) return false;
  try { await client.set(key, JSON.stringify(value), ttlSec ? { EX: ttlSec } : undefined); return true; } catch { return false; }
}
async function del(...keys) {
  if (!isReady()) return;
  try { await client.del(keys); } catch {}
}

// Fixed-window rate limiter middleware (fails open when Redis is down).
function rateLimit({ windowSec = 60, max = 60, prefix = "rl" } = {}) {
  return async (req, res, next) => {
    if (!isReady()) return next();
    try {
      const key = `calest:${prefix}:${req.ip}`;
      const count = await client.incr(key);
      if (count === 1) await client.expire(key, windowSec);
      res.set("X-RateLimit-Limit", String(max));
      res.set("X-RateLimit-Remaining", String(Math.max(0, max - count)));
      if (count > max) return res.status(429).json({ error: "Too many requests. Please slow down." });
    } catch {}
    next();
  };
}

// Simple capped list used to store food logs when MongoDB is not connected.
const LOG_KEY = "calest:logs";
async function pushLog(entry) {
  if (!isReady()) return false;
  try {
    await client.lPush(LOG_KEY, JSON.stringify(entry));
    await client.lTrim(LOG_KEY, 0, 99);
    return true;
  } catch { return false; }
}
async function listLogs() {
  if (!isReady()) return null;
  try { return (await client.lRange(LOG_KEY, 0, 99)).map((s) => JSON.parse(s)); } catch { return null; }
}
async function removeLog(id) {
  if (!isReady()) return false;
  try {
    const all = await client.lRange(LOG_KEY, 0, -1);
    const target = all.find((s) => { try { return JSON.parse(s)._id === id; } catch { return false; } });
    if (!target) return false;
    await client.lRem(LOG_KEY, 1, target);
    return true;
  } catch { return false; }
}

async function quit() { try { if (client) await client.quit(); } catch {} }

module.exports = { connectRedis, isReady, getJSON, setJSON, del, rateLimit, pushLog, listLogs, removeLog, quit };
