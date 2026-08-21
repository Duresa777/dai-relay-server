require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to allow data transfer and increase the file size limit for images
app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// Initialize your Master Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// A simple route to check if the server is awake
app.get('/', (req, res) => {
  res.send('D AI Relay Server is live!');
});

// The main route that your desktop app will talk to
app.post('/api/ask', async (req, res) => {
  const { licenseKey, promptText, imageBase64 } = req.body;

  // 1. Check if they provided a key
  if (!licenseKey) {
    return res.status(401).json({ error: 'License key is required.' });
  }

  // 2. Placeholder for Lemon Squeezy logic
  // For testing today, we will use a secret dummy password: "test-pro-key"
  if (licenseKey !== 'test-pro-key') {
    return res.status(403).json({ error: 'Invalid or expired license key.' });
  }

  // 3. Send to Gemini
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }
      ]
    });

    // 4. Send the answer back to the desktop app
    res.json({ text: response.text });
  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Relay server running on http://localhost:${port}`);
});