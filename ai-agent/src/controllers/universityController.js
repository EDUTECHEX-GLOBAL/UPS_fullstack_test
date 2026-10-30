import { generateResponse, generateUniversityInfo } from '../services/bedrockService.js';

/**
 * ✅ MAIN CHATBOT ENDPOINT - FIXED VERSION
 */
export const getChatResponse = async (req, res) => {
  const requestId = Date.now() + Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();

  console.log(`\n💬 [${requestId}] Chat request received`);

  try {
    const { message, universityName, context = 'auto' } = req.body;

    const inputMessage = message || universityName;

    if (!inputMessage || typeof inputMessage !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid message',
        requestId
      });
    }

    const cleanInput = inputMessage.trim().toLowerCase();

    // =========================================================
    // ✅ 1. GREETING HANDLER (🔥 FIXES YOUR ISSUE)
    // =========================================================
    const greetings = [
      'hi', 'hello', 'hey', 'hii', 'helo',
      'good morning', 'good afternoon', 'good evening'
    ];

    if (greetings.includes(cleanInput)) {
      return res.status(200).json({
        success: true,
        requestId,
        context: 'general',
        response: "Hey! 👋 How can I help you today?"
      });
    }

    // =========================================================
    // ✅ 2. SMART CONTEXT DETECTION
    // =========================================================
    let detectedContext = context;

    if (context === 'auto' || context === 'general') {
      const lowerInput = cleanInput;

      const hasCarOrTractorWords =
        lowerInput.includes('car') ||
        lowerInput.includes('tractor') ||
        lowerInput.includes('mahindra') ||
        lowerInput.includes('price') ||
        lowerInput.includes('features') ||
        lowerInput.includes('model');

      const hasUniWords =
        lowerInput.includes('university') ||
        lowerInput.includes('college') ||
        lowerInput.includes('campus') ||
        lowerInput.includes('harvard') ||
        lowerInput.includes('mit') ||
        lowerInput.includes('stanford') ||
        lowerInput.includes('oxford');

      const looksLikeQuestion =
        lowerInput.includes('what') ||
        lowerInput.includes('how') ||
        lowerInput.includes('which') ||
        lowerInput.includes('?');

      if (hasCarOrTractorWords) {
        detectedContext = 'general';
      } else if (hasUniWords && !looksLikeQuestion) {
        detectedContext = 'university';
      } else {
        detectedContext = 'general';
      }
    }

    console.log(`   [${requestId}] "${cleanInput}" → [${detectedContext}]`);

    // =========================================================
    // ✅ 3. CALL AI SERVICE
    // =========================================================
    let responseData;

    if (detectedContext === 'university') {
      responseData = await generateUniversityInfo(cleanInput);
    } else {
      responseData = await generateResponse(cleanInput, 'general');
    }

    const duration = Date.now() - startTime;

    // =========================================================
    // ✅ 4. RESPONSE
    // =========================================================
    res.status(200).json({
      success: true,
      requestId,
      input: cleanInput,
      context: detectedContext,
      response: responseData,
      metadata: {
        responseTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`❌ Error:`, error.message);

    res.status(500).json({
      success: false,
      error: error.message,
      requestId
    });
  }
};

/**
 * ✅ UNIVERSITY ONLY (UNCHANGED)
 */
export const getUniversityInfo = async (req, res) => {
  try {
    const { universityName } = req.body;

    if (!universityName) {
      return res.status(400).json({
        success: false,
        error: 'Missing universityName'
      });
    }

    const result = await generateUniversityInfo(universityName);

    res.json({
      success: true,
      universityName,
      information: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
export const testEndpoint = (req, res) => {
  res.json({
    success: true,
    message: "✅ Chatbot API is working perfectly!",
    endpoints: {
      chat: "POST /api/chat-response",
      university: "POST /api/university-info"
    },
    testCases: {
      greeting: "hi → Hey! 👋 How can I help you today?",
      university: "Harvard → university info",
      general: "tractor price → general answer"
    },
    timestamp: new Date().toISOString()
  });
};