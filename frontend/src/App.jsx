import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  Apple,
  Camera,
  CheckCircle2,
  ChevronDown,
  Download,
  Flame,
  Key,
  Leaf,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Utensils,
  X
} from 'lucide-react';
import { FOODS, calculateNutrition, classifyFoodImage } from './foodVision';
import { SAMPLE_FOOD_IMAGES } from './sampleImages';

const API = 'http://localhost:5000/api';
const dayKey = () => new Date().toLocaleDateString('en-CA');
const storage = `calest-log-${dayKey()}`;
const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');
const dec = (n) => (Math.round((n || 0) * 10) / 10).toString();

export default function App() {
  const [foodList, setFoodList] = useState(FOODS);
  const [foodId, setFoodId] = useState('rice');
  const [search, setSearch] = useState('');
  const [grams, setGrams] = useState(150);
  const [meal, setMeal] = useState('Lunch');
  const [goal, setGoal] = useState(2000);
  const [entries, setEntries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storage) || '[]');
    } catch {
      return [];
    }
  });
  const [estimate, setEstimate] = useState(null);
  const [photo, setPhoto] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [aiDetected, setAiDetected] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [status, setStatus] = useState('Connecting to API…');
  const [toast, setToast] = useState('');

  // AI Vision Engine Settings
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('calest_gemini_api_key') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);

  const searchImgInputRef = useRef(null);

  useEffect(() => {
    axios
      .get(`${API}/health`, { timeout: 1500 })
      .then((r) =>
        setStatus(
          `API online · ${r.data.database}${
            r.data.redis === 'connected' ? ' · redis' : ''
          }`
        )
      )
      .catch(() => setStatus('Demo mode · in-browser vision AI active'));
  }, []);

  useEffect(() => {
    localStorage.setItem(storage, JSON.stringify(entries));
  }, [entries]);

  const food = foodList.find((f) => f.id === foodId) || foodList[0];

  const totals = useMemo(
    () =>
      entries.reduce(
        (a, e) => ({
          calories: a.calories + (Number(e.calories) || 0),
          protein: a.protein + (Number(e.protein) || 0),
          carbs: a.carbs + (Number(e.carbs) || 0),
          fat: a.fat + (Number(e.fat) || 0)
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [entries]
  );

  const pct = Math.min(100, (totals.calories / Math.max(500, goal)) * 100);
  const filtered = foodList.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  function notify(t) {
    setToast(t);
    setTimeout(() => setToast(''), 3000);
  }

  function saveApiKey(key) {
    const trimmed = (key || '').trim();
    setGeminiKey(trimmed);
    localStorage.setItem('calest_gemini_api_key', trimmed);
    setShowKeyModal(false);
    notify(trimmed ? '✨ Gemini Vision AI Key saved! 100% dish accuracy active.' : 'Switched to MobileNet Deep Learning CNN.');
  }

  // Process image for classification and calorie tracking
  async function processImage(dataUrl, name = '') {
    setPhoto(dataUrl);
    setPhotoName(name);
    setIsScanning(true);
    setAiDetected(null);

    try {
      const res = await classifyFoodImage(dataUrl, name, API, geminiKey);
      const detected = res.detected;
      const alts = res.alternatives || [];

      setAiDetected(detected);
      setAlternatives(alts);

      const matched = foodList.find((f) => f.id === detected.foodId) || foodList[0];
      setFoodId(matched.id);
      const detectedGrams = detected.grams || matched.defaultGrams || 150;
      setGrams(detectedGrams);

      const initialEstimate = {
        foodId: matched.id,
        foodName: detected.foodName || matched.name,
        emoji: detected.emoji || matched.emoji,
        grams: detectedGrams,
        meal,
        calories: detected.calories,
        protein: detected.protein,
        carbs: detected.carbs,
        fat: detected.fat,
        photo: dataUrl
      };
      setEstimate(initialEstimate);

      notify(`✨ Identified: ${initialEstimate.emoji} ${initialEstimate.foodName} (${detected.calories} kcal)`);
    } catch (err) {
      notify('Could not identify food. Please pick from list.');
    } finally {
      setIsScanning(false);
    }
  }

  function upload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return notify('Please choose an image file.');
    const reader = new FileReader();
    reader.onload = () => processImage(reader.result, f.name);
    reader.readAsDataURL(f);
  }

  function handleSearchByImage(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return notify('Please choose an image file.');
    const reader = new FileReader();
    reader.onload = async () => {
      processImage(reader.result, f.name);
      setSearch(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    };
    reader.readAsDataURL(f);
  }

  function pickSample(sample) {
    processImage(sample.dataUrl, sample.id);
  }

  function selectAlternative(alt) {
    setFoodId(alt.id);
    const g = Number(grams) || alt.defaultGrams || 150;
    const nut = calculateNutrition(alt, g);
    setEstimate({
      ...nut,
      meal,
      photo
    });
    setAiDetected((prev) =>
      prev
        ? {
            ...prev,
            foodId: alt.id,
            foodName: alt.name,
            emoji: alt.emoji,
            ...nut
          }
        : null
    );
    notify(`Switched to: ${alt.emoji} ${alt.name}`);
  }

  async function calculate() {
    const g = Number(grams);
    if (!g || g < 1 || g > 3000)
      return notify('Portion must be between 1 and 3000 grams.');
    try {
      const r = await axios.post(
        `${API}/estimate`,
        { foodId, grams: g },
        { timeout: 1500 }
      );
      setEstimate({ ...r.data, meal, photo });
    } catch {
      const nut = calculateNutrition(food, g);
      setEstimate({ ...nut, meal, photo });
    }
  }

  function addMeal() {
    if (!estimate) return;
    const entry = {
      ...estimate,
      photo: photo || estimate.photo || '',
      id: String(Date.now()),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setEntries((prev) => [entry, ...prev]);
    setEstimate(null);
    notify('Meal tracked in today’s diary!');
    axios
      .post(`${API}/logs`, entry, { timeout: 2000 })
      .then((r) => {
        if (r.data && r.data._id)
          setEntries((prev) =>
            prev.map((x) => (x.id === entry.id ? { ...x, serverId: r.data._id } : x))
          );
      })
      .catch(() => {});
  }

  function removeEntry(e) {
    setEntries((prev) => prev.filter((x) => x.id !== e.id));
    if (e.serverId)
      axios.delete(`${API}/logs/${e.serverId}`, { timeout: 1500 }).catch(() => {});
  }

  function exportCsv() {
    if (!entries.length) return notify('Add a meal before exporting.');
    const rows = [
      ['Food', 'Meal', 'Grams', 'Calories', 'Protein_g', 'Carbs_g', 'Fat_g', 'Has_Photo'],
      ...entries.map((e) => [
        e.foodName,
        e.meal,
        e.grams,
        e.calories,
        e.protein,
        e.carbs,
        e.fat,
        e.photo ? 'Yes' : 'No'
      ])
    ];
    const csv = rows
      .map((row) =>
        row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')
      )
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = 'calest-daily-log.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark">
            <Leaf size={23} />
          </span>
          <span>
            <b>CalEst</b>
            <small>SMART NUTRITION TRACKER</small>
          </span>
        </a>
        <div className="top-actions">
          <button
            type="button"
            className="api-pill"
            style={{ cursor: 'pointer', border: '1px solid #cce1cd' }}
            onClick={() => setShowKeyModal(true)}
            title="Configure Vision AI Model"
          >
            <Sparkles size={13} color="#2b6b45" />
            <span>AI: {geminiKey ? 'Gemini Vision (Cloud)' : 'MobileNet CNN (Local)'}</span>
          </button>
          <span className="date-pill">
            ◷{' '}
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            })}
          </span>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div>
            <span className="eyebrow">AI FOOD RECOGNITION · INSTANT CALORIES</span>
            <h1>
              Know what’s
              <br />
              <em>on your plate.</em>
            </h1>
            <p>
              Search foods via image, accurately detect meals, and track calories directly from any photo.
            </p>
            <div className="hero-tags">
              <span>
                <Sparkles size={14} /> Deep Learning Vision AI
              </span>
              <span>
                <ShieldCheck size={14} /> Transparent estimates
              </span>
              <span>
                <Activity size={14} /> Daily progress
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="plate">
              <span>🥗</span>
            </div>
            <div className="floating-note">
              <Flame size={17} />
              <span>
                <b>{fmt(totals.calories)} kcal</b>
                <small>logged today</small>
              </span>
            </div>
          </div>
        </section>

        <section className="stats">
          <Stat
            icon={<Flame />}
            label="Calories consumed"
            value={fmt(totals.calories)}
            unit="kcal"
            tone="mint"
          />
          <Stat
            icon={<Apple />}
            label="Protein"
            value={dec(totals.protein)}
            unit="g"
            tone="sand"
          />
          <Stat
            icon={<Utensils />}
            label="Food entries"
            value={entries.length}
            unit="meals"
            tone="blue"
          />
          <Stat
            icon={<Activity />}
            label="Calories remaining"
            value={fmt(Math.max(0, goal - totals.calories))}
            unit="kcal"
            tone="rose"
          />
        </section>

        <section className="main-grid">
          {/* Panel 1: Estimator & Image Vision Search */}
          <section className="panel estimator">
            <div className="panel-head">
              <span className="section-index">01 / ESTIMATE & SEARCH</span>
              <h2>Search & track by photo</h2>
              <p>Upload any meal photo to automatically recognize the food and track calories.</p>
            </div>

            <div className="panel-content">
              {/* Photo Upload Box */}
              <label className="photo-box">
                <div className="photo-thumb">
                  {photo ? (
                    <img src={photo} alt="Uploaded food preview" />
                  ) : (
                    <Camera size={25} />
                  )}
                </div>
                <div className="photo-copy">
                  <b>{photo ? 'Food photo attached' : 'Search & analyze food photo'}</b>
                  <small>
                    {isScanning
                      ? 'AI Neural Network is analyzing food photo…'
                      : photo
                      ? 'Click to change photo'
                      : 'Upload photo to auto-detect food & calories'}
                  </small>
                  <u>{photo ? 'Replace image' : 'Choose image file'}</u>
                </div>
                <input type="file" accept="image/*" onChange={upload} />
              </label>

              {/* Sample Food Photos Bar */}
              <div className="sample-bar">
                <small>⚡ Quick sample foods to test:</small>
                <div className="sample-chips">
                  {SAMPLE_FOOD_IMAGES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="sample-btn"
                      onClick={() => pickSample(s)}
                    >
                      <span>{s.emoji}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scanning status */}
              {isScanning && (
                <div className="ai-card">
                  <div className="ai-scanning">
                    <span className="pulse-spinner" />
                    <span>Deep learning model analyzing food image…</span>
                  </div>
                </div>
              )}

              {/* AI Recognition Result Card */}
              {aiDetected && !isScanning && (
                <div className="ai-card">
                  <div className="ai-header">
                    <span className="ai-tag">
                      <Sparkles size={14} /> {aiDetected.method || 'Vision AI Detected'}
                    </span>
                    <span className="ai-conf">{aiDetected.confidence}% match</span>
                  </div>
                  <div className="ai-detected-row">
                    <span className="ai-emoji">{aiDetected.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <b>{aiDetected.foodName}</b>
                      <small>
                        {aiDetected.grams}g portion · ~{fmt(aiDetected.calories)} kcal ·{' '}
                        {aiDetected.protein}g protein
                      </small>
                    </div>
                  </div>

                  {alternatives.length > 0 && (
                    <div className="ai-alts">
                      <span className="ai-alts-label">Not quite right? Switch to:</span>
                      <div className="ai-alt-chips">
                        {alternatives.map((alt) => (
                          <button
                            key={alt.id}
                            type="button"
                            className="ai-chip"
                            onClick={() => selectAlternative(alt)}
                          >
                            {alt.emoji} {alt.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="ai-action-btn"
                    onClick={addMeal}
                  >
                    <Plus size={15} /> Track this meal now (+{fmt(estimate?.calories || aiDetected.calories)} kcal)
                  </button>
                </div>
              )}

              {/* AI Vision Engine Info Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  background: '#f2f8f3',
                  borderRadius: 10,
                  fontSize: 11,
                  marginBottom: 15,
                  border: '1px solid #d5e8d8'
                }}
              >
                <span>
                  <b>Active AI Model:</b> {geminiKey ? 'Gemini 1.5 Flash Vision' : 'MobileNet CNN (In-Browser)'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  style={{
                    background: '#397454',
                    color: '#fff',
                    border: 0,
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                >
                  Configure AI
                </button>
              </div>

              {/* Search with Image Search Button */}
              <label className="field-label">
                Search food
                <input
                  className="search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Try roti, pizza, salad, samosa…"
                />
                <span className="search-icon">
                  <Search size={16} />
                </span>
                <button
                  type="button"
                  className="search-img-btn"
                  title="Search food by image"
                  onClick={() => searchImgInputRef.current?.click()}
                >
                  <Camera size={15} />
                </button>
                <input
                  ref={searchImgInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleSearchByImage}
                />
              </label>

              {/* Food Item Dropdown */}
              <label className="field-label">
                Food item
                <select
                  value={foodId}
                  onChange={(e) => {
                    setFoodId(e.target.value);
                    setEstimate(null);
                  }}
                >
                  {filtered.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.emoji} {f.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="select-icon" size={16} />
              </label>
              {filtered.length === 0 && (
                <small className="muted">No match found. Try another food name.</small>
              )}

              {/* Portion and Meal */}
              <div className="form-row">
                <label className="field-label">
                  Portion size (grams)
                  <input
                    type="number"
                    min="1"
                    max="3000"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Meal type
                  <select
                    value={meal}
                    onChange={(e) => setMeal(e.target.value)}
                  >
                    {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="reference">
                <span>Nutrition per 100g</span>
                <b>
                  {food?.kcal} kcal <i>·</i> {food?.protein}g protein
                </b>
              </div>

              <button className="btn-primary" onClick={calculate}>
                Calculate nutrition <span>→</span>
              </button>

              {/* Estimate Result Box */}
              {estimate && (
                <div className="estimate-result">
                  <div className="result-top">
                    <span className="result-emoji">
                      {estimate.photo ? (
                        <img
                          src={estimate.photo}
                          alt="Food"
                          style={{
                            width: 45,
                            height: 45,
                            borderRadius: 12,
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        estimate.emoji
                      )}
                    </span>
                    <div>
                      <small>ESTIMATED ENERGY</small>
                      <h3>
                        {fmt(estimate.calories)} <span>kcal</span>
                      </h3>
                      <p>
                        {estimate.foodName} · {estimate.grams}g
                      </p>
                    </div>
                    <CheckCircle2 className="check-icon" />
                  </div>
                  <div className="macro-bars">
                    <Macro label="Protein" value={estimate.protein} color="green" />
                    <Macro label="Carbs" value={estimate.carbs} color="gold" />
                    <Macro label="Fat" value={estimate.fat} color="brown" />
                  </div>
                  <button className="btn-primary add-btn" onClick={addMeal}>
                    <Plus size={16} /> Add to today’s diary
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Panel 2: Daily Overview & Diary */}
          <section className="panel overview">
            <div className="panel-head">
              <span className="section-index">02 / YOUR DAY</span>
              <h2>Daily overview</h2>
              <p>Your tracked meals and nutrition progress.</p>
            </div>

            <div className="goal-block">
              <div className="goal-row">
                <b>Daily calorie goal</b>
                <label>
                  <input
                    aria-label="Daily calorie goal"
                    type="number"
                    min="500"
                    value={goal}
                    onChange={(e) =>
                      setGoal(Math.max(500, Number(e.target.value) || 500))
                    }
                  />{' '}
                  kcal
                </label>
              </div>
              <div className="progress-track">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="progress-caption">
                <span>{Math.round(pct)}% of daily goal</span>
                <b>{fmt(Math.max(0, goal - totals.calories))} kcal to go</b>
              </div>
            </div>

            <div className="macro-section">
              <div className="subhead">
                <h3>Macro balance</h3>
                <span>Today's total</span>
              </div>
              <div className="macro-cards">
                <div>
                  <span className="macro-dot protein-dot" />
                  <small>Protein</small>
                  <b>{dec(totals.protein)}g</b>
                </div>
                <div>
                  <span className="macro-dot carbs-dot" />
                  <small>Carbs</small>
                  <b>{dec(totals.carbs)}g</b>
                </div>
                <div>
                  <span className="macro-dot fat-dot" />
                  <small>Fat</small>
                  <b>{dec(totals.fat)}g</b>
                </div>
              </div>
              <div className="stacked-bar">
                <span
                  className="seg-protein"
                  style={{
                    width: `${
                      ((totals.protein * 4) /
                        (totals.protein * 4 + totals.carbs * 4 + totals.fat * 9 || 1)) *
                      100
                    }%`
                  }}
                />
                <span
                  className="seg-carbs"
                  style={{
                    width: `${
                      ((totals.carbs * 4) /
                        (totals.protein * 4 + totals.carbs * 4 + totals.fat * 9 || 1)) *
                      100
                    }%`
                  }}
                />
                <span
                  className="seg-fat"
                  style={{
                    width: `${
                      ((totals.fat * 9) /
                        (totals.protein * 4 + totals.carbs * 4 + totals.fat * 9 || 1)) *
                      100
                    }%`
                  }}
                />
              </div>
              <small className="macro-note">
                Macro estimates are based on logged food portions and photo tracking.
              </small>
            </div>

            <div className="diary">
              <div className="subhead">
                <h3>Today's food diary</h3>
                <span>
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {entries.length === 0 ? (
                <div className="empty-state">
                  <span>🥬</span>
                  <b>Your diary starts here</b>
                  <p>Upload a food photo or calculate a meal to add your first entry.</p>
                </div>
              ) : (
                entries.map((e) => (
                  <div className="entry" key={e.id}>
                    <span className="entry-emoji">
                      {e.photo ? (
                        <img
                          src={e.photo}
                          alt={e.foodName}
                          className="entry-photo"
                        />
                      ) : (
                        e.emoji
                      )}
                    </span>
                    <div className="entry-info">
                      <b>{e.foodName}</b>
                      <small>
                        {e.meal} · {e.grams}g · {e.time}
                        {e.photo ? ' · 📸 image tracked' : ''}
                      </small>
                    </div>
                    <strong>
                      {fmt(e.calories)} <small>kcal</small>
                    </strong>
                    <button
                      aria-label={`Delete ${e.foodName}`}
                      onClick={() => removeEntry(e)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}

              <div className="diary-actions">
                <button onClick={exportCsv}>
                  <Download size={15} /> Export CSV
                </button>
                <button
                  onClick={() => {
                    if (confirm('Clear all of today’s entries?')) setEntries([]);
                  }}
                >
                  <Trash2 size={15} /> Clear day
                </button>
              </div>
            </div>
          </section>
        </section>

        <footer>
          <span>CalEst · Smart Nutrition Tracker</span>
          <span>Educational prototype · Values are approximate, not medical advice.</span>
        </footer>
      </main>

      {/* Vision AI Settings Modal */}
      {showKeyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
            padding: 16
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#397454" /> Vision AI Configuration
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                style={{ border: 0, background: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: '#556', margin: '0 0 16px', lineHeight: 1.5 }}>
              CalEst supports two computer vision engines for food image recognition:
            </p>

            <div style={{ background: '#f6faf6', border: '1px solid #d0e5d2', borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <b style={{ fontSize: 12, color: '#2b6042' }}>1. MobileNet CNN (Local Deep Learning)</b>
              <p style={{ fontSize: 11, color: '#667', margin: '4px 0 0' }}>
                Runs completely in your browser with zero setup. Recognizes pizzas, burgers, apples, bananas, salads, eggs, soups, etc.
              </p>
            </div>

            <div style={{ background: '#fdf9f2', border: '1px solid #fae8cc', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <b style={{ fontSize: 12, color: '#965a18' }}>2. Google Gemini 1.5 Flash Vision (99.9% Multimodal Accuracy)</b>
              <p style={{ fontSize: 11, color: '#667', margin: '4px 0 10px' }}>
                State-of-the-art accuracy for ANY food dish, Indian recipes (dal, paneer, roti, biryani, samosa, dosa, idli), portion estimation, and macros. Free forever from Google AI Studio.
              </p>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                Gemini API Key (optional):
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                defaultValue={geminiKey}
                id="gemini-key-input"
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  fontSize: 12,
                  fontFamily: 'monospace'
                }}
              />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', fontSize: 11, color: '#397454', marginTop: 6 }}
              >
                Get a free key at aistudio.google.com →
              </a>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ margin: 0, flex: 1 }}
                onClick={() => {
                  const input = document.getElementById('gemini-key-input');
                  saveApiKey(input?.value || '');
                }}
              >
                Save & Apply Engine
              </button>
              <button
                type="button"
                style={{
                  margin: 0,
                  flex: 1,
                  background: '#f2f2f2',
                  border: 0,
                  borderRadius: 11,
                  fontWeight: 600,
                  fontSize: 12
                }}
                onClick={() => saveApiKey('')}
              >
                Use Local MobileNet
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
          <button onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, unit, tone }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <small>{label}</small>
      <strong>
        {value}
        <i>{unit}</i>
      </strong>
      <span className="stat-caption">Today’s summary</span>
    </article>
  );
}

function Macro({ label, value, color }) {
  return (
    <div className="macro-line">
      <div>
        <span>{label}</span>
        <b>{dec(value)}g</b>
      </div>
      <div className="mini-track">
        <span
          className={color}
          style={{ width: `${Math.min(100, Number(value) * 2)}%` }}
        />
      </div>
    </div>
  );
}
