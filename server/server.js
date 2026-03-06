require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Load thesis context on startup
let thesisContext = '';
const thesisPath = path.join(__dirname, 'thesis_context.txt');

try {
  thesisContext = fs.readFileSync(thesisPath, 'utf-8');
  console.log('✅ Thesis context loaded successfully');
  console.log(`   - File: ${thesisPath}`);
  console.log(`   - Size: ${thesisContext.length} characters`);
} catch (error) {
  console.warn('⚠️ Could not load thesis_context.txt:', error.message);
  console.warn('   Please create thesis_context.txt in the server directory.');
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System instruction for the AI - returns structured JSON
const systemInstruction = `You are an urban design expert. Answer only based on the thesis data provided to you.
Suggest nature-based solutions to reduce urban heat island effect. Respond in English.

IMPORTANT: You MUST respond in the following JSON format only, do not use any other format:
{
  "visualAnalysis": {
    "strength": "Area's strength - single sentence",
    "weakness": "Area's weakness - single sentence", 
    "opportunity": "Opportunity - single sentence"
  },
  "strategy": {
    "title": "Strategy title",
    "category": "Category (e.g., Green Infrastructure)",
    "description": "Strategy description - 2-3 sentences",
    "impact": "Expected impact"
  },
  "recommendation": {
    "title": "Recommendation title",
    "description": "Recommendation description - 2-3 sentences"
  }
}

Thesis Content:
${thesisContext}`;

// POST /api/analyze endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { locationData } = req.body;

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file.'
      });
    }

    console.log('📝 Processing AI recommendations request...');

    // Create the model with Gemini 3 Flash Preview (latest)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: systemInstruction,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    // Build the prompt with location context
    let prompt = `Analyze this location for urban cooling and provide recommendations.`;

    if (locationData) {
      prompt = `
Analyze this location for urban cooling and provide recommendations:

Location: ${locationData.name || 'Unknown'}
Coordinates: ${locationData.lat}, ${locationData.lon}
${locationData.scores ? `
Current Scores:
- NEI (Nature Integration): ${locationData.scores.NEI}/100
- SWE (Water Management): ${locationData.scores.SWE}/100
- HEAT (Heat Management): ${locationData.scores.HEAT}/100
- TCI (Thermal Comfort): ${locationData.scores.TCI}/100
- BCI (Bioclimate): ${locationData.scores.BCI}/100
- UCIS (Urban Coolness): ${locationData.scores.UCIS}/100
` : ''}

Based on the thesis data, provide for this area:
1. Visual analysis (strength, weakness, opportunity)
2. One strategy recommendation
3. One implementation recommendation

Respond in JSON format.
`;
    }

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('✅ AI recommendations generated successfully');

    // Parse JSON response
    let aiRecommendations;
    try {
      aiRecommendations = JSON.parse(text);
    } catch (parseError) {
      console.error('⚠️ JSON parse error, returning raw text');
      aiRecommendations = { raw: text };
    }

    res.json({
      success: true,
      recommendations: aiRecommendations
    });
  } catch (error) {
    console.error('❌ Analysis error:', error);
    res.status(500).json({
      error: 'An error occurred during analysis',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    thesisLoaded: thesisContext.length > 0,
    thesisSize: thesisContext.length
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Urban Cool AI Server');
  console.log('========================');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
  console.log('');
});
