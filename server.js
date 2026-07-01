// MentorVerse AI — Backend Proxy Server
// Hides the Gemini API key from users.
// Deploy this on Render (free) so your GitHub Pages frontend can call it.

const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────
app.use(cors());               // Allow requests from your GitHub Pages site
app.use(express.json());       // Parse JSON request bodies

// ── Health check (Render needs this to know server is alive) ──
app.get('/', (req, res) => {
  res.send('MentorVerse AI backend is running ✅');
});

// ── Main proxy endpoint ─────────────────────────────────
// Frontend calls POST /api/gemini with { systemInstruction, userMessage }
app.post('/api/gemini', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const { systemInstruction, userMessage } = req.body;

  if (!systemInstruction || !userMessage) {
    return res.status(400).json({ error: 'Missing systemInstruction or userMessage.' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }]
  };

  try {
    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'Gemini API error' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text });

  } catch (err) {
    res.status(500).json({ error: 'Failed to reach Gemini API.' });
  }
});

// ── Chat endpoint (multi-turn conversation) ─────────────
// Frontend calls POST /api/gemini/chat with { systemInstruction, conversationHistory }
app.post('/api/gemini/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const { systemInstruction, conversationHistory } = req.body;

  if (!systemInstruction || !conversationHistory) {
    return res.status(400).json({ error: 'Missing systemInstruction or conversationHistory.' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: conversationHistory
  };

  try {
    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'Gemini API error' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text });

  } catch (err) {
    res.status(500).json({ error: 'Failed to reach Gemini API.' });
  }
});

// ── Start server ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`MentorVerse AI backend running on port ${PORT}`);
});
