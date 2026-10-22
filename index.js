const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Crucial for accepting large Base64 images

app.post('/api/ask', async (req, res) => {
  try {
    const { appSecret, promptText, imageBase64, userKey } = req.body;

    // 1. Verify the request is actually coming from your desktop app
    if (appSecret !== 'glance-ms-store-2026') {
      return res.status(403).json({ error: 'Unauthorized app request.' });
    }

    // 2. Ensure the user provided an API key
    if (!userKey) {
      return res.status(400).json({ error: 'No API key provided. Please check your settings.' });
    }

    // 3. Initialize Gemini using the user's specific key
    const genAI = new GoogleGenerativeAI(userKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/jpeg'
      }
    };

    let retries = 3;
    let delay = 2000; // Start with a 2-second delay
    let text = "";

    // Exponential backoff loop
    while (retries > 0) {
      try {
        const result = await model.generateContent([promptText, imagePart]);
        const response = await result.response;
        text = response.text();
        break; // Success, exit the retry loop
      } catch (error) {
        if (error.status === 503 && retries > 1) {
          console.log(`Google API overloaded (503). Retrying in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries--;
          delay *= 2; // Double the delay for the next attempt (4s)
        } else {
          throw error; // Re-throw if it's not a 503 or out of retries
        }
      }
    }

    res.json({ text: text });
  } catch (error) {
    console.error('Backend Error:', error);
    res.status(500).json({ error: 'Failed to process image with AI. Verify your API key is valid.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
