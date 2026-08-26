const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// Required to make the Lemon Squeezy API call
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/ask', async (req, res) => {
  try {
    const { appSecret, licenseKey, promptText, imageBase64 } = req.body;

    // 1. Secret handshake validation
    if (appSecret !== 'glance-ms-store-2026') {
      return res.status(403).json({ error: 'Unauthorized app request.' });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided.' });
    }

    // 2. Validate Subscription with Lemon Squeezy
    if (!licenseKey) {
      return res.status(403).json({ error: 'No license key provided. Please activate the app.' });
    }

    const lsResponse = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ license_key: licenseKey })
    });

    const lsData = await lsResponse.json();

    // Block access if the subscription is canceled or expired
    if (!lsData.valid || lsData.license_key.status !== 'active') {
      return res.status(403).json({ error: 'Subscription expired or invalid. Please update your billing.' });
    }

    // 3. Call Gemini (Updated to the correct 1.5-flash model)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', 
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/jpeg'
      }
    };

    const prompt = `
Extract all relevant structured data from this screenshot as a JSON array of objects.
Every row or item in the view should be an object in the array with consistent keys across all objects.
Return ONLY a valid JSON array.
`;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    res.json({ text: responseText });
  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: 'Failed to process image with AI.' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Glance Relay Server (Secured)' });
});

app.listen(port, () => {
  console.log(`Relay server running on port ${port}`);
});