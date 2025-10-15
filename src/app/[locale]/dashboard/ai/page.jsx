'use client';
import { useState } from 'react';


export default function MealPlansOpenRouterPage() {
  const [description, setDescription] = useState('Client: Ahmed, age 28, male. Goal: recomposition.\nCalories target: 2400.\nAllergies: peanuts.\nCuisine: Mediterranean.\nDays: 7.\nNotes: High-protein breakfasts. Simple dinners. Avoid added sugar.');
  const [loading, setLoading] = useState(false);
  const [rawOutput, setRawOutput] = useState('');
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  const systemPrompt = `You are a nutrition expert that MUST return a single valid JSON object only, with no extra text. If JSON mode is enabled, comply strictly.`;

  const userPrompt = desc =>
    `
أنت خبير تغذية محترف. لديك الوصف التالي للعميل وخطته المطلوبة:

"""
${desc}
"""

أعد خطة وجبات بصيغة JSON صالحة فقط (بدون أي نص إضافي أو Markdown).
المتطلبات:
- days: عدد الأيام كما هو مذكور في الوصف (ولو غير مذكور اجعله 7).
- لكل يوم 3–5 وجبات (Breakfast/Snack/Lunch/Snack/Dinner).
- لكل وجبة الحقول: name, items[], calories, protein_g, carbs_g, fat_g.
- اجمالي السعرات اليومية قريب من الهدف المذكور (±10%).
- التزم بالحساسية/الممنوعات والمطبخ المذكور.

أعد **كائن JSON واحد فقط** بهذا الشكل العام:
{
  "client": {
    "name": "string",
    "age": number,
    "sex": "male|female",
    "goal": "string",
    "target_calories": number,
    "allergies": ["..."]
  },
  "plan": [
    {
      "day": 1,
      "total_calories": 0,
      "meals": [
        { "name": "Breakfast", "items": ["..."], "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0 }
      ]
    }
  ],
  "notes": ["..."]
}
`.trim();

  function extractJsonFlexible(text) {
    if (!text) throw new Error('Empty output from model');
    const fence = text.match(/```json([\s\S]*?)```/i);
    if (fence?.[1]) return JSON.parse(fence[1].trim());
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(text.slice(first, last + 1));
    }
    throw new Error('No JSON blob found in model output.');
  }

  async function generate() {
    try {
      setLoading(true);
      setError('');
      setPlan(null);
      setRawOutput('');

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'openai/gpt-3.5-turbo',
          temperature: 0.2,
          max_tokens: 900,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt(description) },
          ],
		  signal: false,
        }),
      });

      const text = await res.text();
      setRawOutput(text);

      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 800)}`);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Non-JSON HTTP response encountered.');
      }

      const msg = data?.choices?.[0]?.message || {};
      const candidate = (msg.content || '').trim() || (typeof msg.reasoning === 'string' ? msg.reasoning : '');

      if (!candidate) throw new Error('Model returned no usable text.');

      const json = extractJsonFlexible(candidate);
      if (!json?.plan || !Array.isArray(json.plan)) throw new Error('Invalid JSON (missing plan array).');

      setPlan(json);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  function downloadJSON() {
    if (!plan) return;
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meal-plan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 820, margin: '40px auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>AI Meal Plan — OpenRouter</h1>
      <p style={{ color: '#b03a2e', fontWeight: 700 }}>Testing only — don’t expose this key in production.</p>

      <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        <span style={{ fontWeight: 600 }}>Description</span>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={10} style={{ padding: 10, border: '1px solid #ccc', borderRadius: 10 }} />
      </label>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #111',
            background: '#111',
            color: '#fff',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}>
          {loading ? 'Generating...' : 'Generate Meal Plan'}
        </button>

        <button
          onClick={downloadJSON}
          disabled={!plan}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid #111',
            background: '#fff',
            color: '#111',
            fontWeight: 700,
            cursor: !plan ? 'not-allowed' : 'pointer',
            opacity: !plan ? 0.6 : 1,
          }}>
          Download JSON
        </button>
      </div>

      {error && <div style={{ marginTop: 16, color: 'crimson', fontWeight: 600 }}>{error}</div>}

      {plan && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Result (JSON)</h2>
          <pre style={{ background: '#f7f7f7', padding: 16, borderRadius: 10, overflowX: 'auto' }}>{JSON.stringify(plan, null, 2)}</pre>
        </section>
      )}

      {rawOutput && (
        <section style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Raw response (debug)</h3>
          <pre style={{ background: '#fafafa', padding: 12, borderRadius: 10, overflowX: 'auto', border: '1px dashed #ddd' }}>{rawOutput}</pre>
        </section>
      )}
    </div>
  );
}
