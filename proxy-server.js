// proxy-server.js
// Simple Express proxy for Bank of Thailand BOT APIs
// ---------------------------------------------------
// Load environment variables (API key, optional clientId)
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const BOT_BASE = 'https://gateway.api.bot.or.th';
const API_KEY = process.env.BOT_API_KEY; // set in .env
if (!API_KEY) {
  console.error('⚠️ BOT_API_KEY not set in environment');
}

// Specific endpoint for AuthorizedDetail (optional helper)
app.get('/api/bot/license', async (req, res) => {
  try {
    const targetUrl = `${BOT_BASE}/BotLicenseCheckAPI/AuthorizedDetail`;
    const response = await axios.get(targetUrl, {
      params: req.query,
      headers: { Authorization: API_KEY },
    });
    res.json(response.data);
  } catch (err) {
    console.error('License proxy error:', err.message);
    if (err.response) {
      res.status(err.response.status).json({ error: err.response.data });
    } else {
      res.status(500).json({ error: 'Proxy internal error' });
    }
  }
});

// DEBUG endpoint – คืนค่า header ที่ Proxy รับจาก client (เพิ่ม console log เพื่อตรวจสอบว่าถูกเรียก)
app.get('/debug', (req, res) => {
  console.log('🔍 /debug requested');
  console.log('Headers received:', req.headers);
  res.json({
    receivedHeaders: req.headers,
    query: req.query
  });
});
// Simple health‑check endpoint (เพื่อยืนยันว่า server ทำงาน)
app.get('/ping', (req, res) => {
  res.send('pong');
});



const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Bot proxy server listening on http://localhost:${PORT}`);
});
