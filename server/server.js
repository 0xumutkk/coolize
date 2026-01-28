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
const systemInstruction = `Sen bir kentsel tasarım uzmanısın. Sadece sana verilen tez verilerine dayanarak cevap ver.
Kentsel ısı adası etkisini azaltmak için doğa tabanlı çözümler öner. Türkçe cevap ver.

ÖNEMLI: Yanıtını MUTLAKA aşağıdaki JSON formatında ver, başka bir format kullanma:
{
  "visualAnalysis": {
    "strength": "Alanın güçlü yönü - tek cümle",
    "weakness": "Alanın zayıf yönü - tek cümle", 
    "opportunity": "Fırsat - tek cümle"
  },
  "strategy": {
    "title": "Strateji başlığı",
    "category": "Kategori (örn: Yeşil Altyapı)",
    "description": "Strateji açıklaması - 2-3 cümle",
    "impact": "Beklenen etki"
  },
  "recommendation": {
    "title": "Öneri başlığı",
    "description": "Öneri açıklaması - 2-3 cümle"
  }
}

Tez İçeriği:
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
    let prompt = `Bu konum için kentsel serinlik analizi yap ve öneriler sun.`;

    if (locationData) {
      prompt = `
Bu konum için kentsel serinlik analizi yap ve öneriler sun:

Konum: ${locationData.name || 'Bilinmiyor'}
Koordinatlar: ${locationData.lat}, ${locationData.lon}
${locationData.scores ? `
Mevcut Skorlar:
- NEI (Doğa Entegrasyonu): ${locationData.scores.NEI}/100
- SWE (Su Yönetimi): ${locationData.scores.SWE}/100
- HEAT (Isı Yönetimi): ${locationData.scores.HEAT}/100
- TCI (Termal Konfor): ${locationData.scores.TCI}/100
- BCI (Biyoiklim): ${locationData.scores.BCI}/100
- UCIS (Kentsel Serinlik): ${locationData.scores.UCIS}/100
` : ''}

Tez bilgilerine dayanarak bu alan için:
1. Görsel analiz (güçlü yön, zayıf yön, fırsat)
2. Bir strateji önerisi
3. Bir uygulama önerisi

JSON formatında yanıt ver.
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
