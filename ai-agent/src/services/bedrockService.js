import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Initializing Bedrock Service...');

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

console.log('📋 AWS Config:');
console.log(`  Region: ${AWS_REGION}`);
console.log(`  AccessKey: ${AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`  SecretKey: ${AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`);

let bedrockClient;

try {
  const clientConfig = {
    region: AWS_REGION,
    maxAttempts: 5,
    retryMode: 'standard'
  };

  if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    };
  }

  bedrockClient = new BedrockRuntimeClient(clientConfig);
  console.log('✅ Bedrock client ready');
} catch (error) {
  console.error('❌ Bedrock init failed:', error.message);
  throw error;
}

/**
 * 🔥 UPGRADED RETRY LOGIC - Handles Bedrock Rate Limits Perfectly
 */
const retryWithBackoff = async (fn, retries = 5, initialDelay = 3000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const isRetryable = 
        error.name === 'ThrottlingException' ||
        error.name === 'TooManyRequestsException' ||
        error.name === 'InternalServerException' ||
        error.message?.includes('timeout') ||
        error.message?.includes('Too many requests') ||
        error.message?.includes('ResourceInUseException') ||
        error.statusCode === 429 ||
        error.statusCode === 503;
      
      if (!isRetryable || attempt === retries) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 2000;
      console.warn(`🔄 Retry ${attempt}/${retries} [${error.name || error.statusCode}] → ${Math.round(delay/1000)}s wait`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

/**
 * 🆕 CONVERSATION HISTORY MANAGEMENT
 * Stores conversation history by user/session
 */
const conversationHistory = new Map();

/**
 * Clean old conversations to prevent memory leaks
 */
const cleanupOldConversations = () => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const [sessionId, data] of conversationHistory.entries()) {
    if (now - data.lastActivity > ONE_HOUR) {
      conversationHistory.delete(sessionId);
      console.log(`🗑️  Cleaned up old conversation: ${sessionId}`);
    }
  }
};

/**
 * Get or create conversation history for a session
 */
const getConversationHistory = (sessionId, maxMessages = 20) => {
  cleanupOldConversations();
  
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, {
      messages: [],
      lastActivity: Date.now()
    });
  }
  
  const session = conversationHistory.get(sessionId);
  session.lastActivity = Date.now();
  
  // Return only the last N messages to avoid token limits
  return session.messages.slice(-maxMessages);
};

/**
 * Add message to conversation history
 */
const addToConversationHistory = (sessionId, role, content) => {
  if (!conversationHistory.has(sessionId)) {
    conversationHistory.set(sessionId, {
      messages: [],
      lastActivity: Date.now()
    });
  }
  
  const session = conversationHistory.get(sessionId);
  session.messages.push({ role, content });
  session.lastActivity = Date.now();
  
  // Keep conversation manageable (max 30 messages)
  if (session.messages.length > 30) {
    session.messages = session.messages.slice(-30);
  }
};

/**
 * Clear conversation history for a session
 */
export const clearConversationHistory = (sessionId) => {
  if (conversationHistory.has(sessionId)) {
    conversationHistory.delete(sessionId);
    console.log(`🧹 Cleared conversation history for: ${sessionId}`);
    return true;
  }
  return false;
};

/**
 * ✅ FIXED: UNIVERSAL AI CHATBOT WITH CONVERSATION HISTORY
 * Now maintains context across multiple messages
 */
export const generateResponse = async (message, context = 'general', sessionId = 'default') => {
  const startTime = Date.now();
  
  try {
    console.log(`\n💬 Processing [${context}] for session ${sessionId}: "${message.substring(0, 50)}..."`);
    
    if (!message?.trim()) {
      throw new Error('Invalid message');
    }
    
    const cleanMessage = message.trim();
    
    // Get conversation history for this session
    const historyMessages = getConversationHistory(sessionId);
    
    // Add user's new message to history
    addToConversationHistory(sessionId, 'user', cleanMessage);
    
    // Build system prompt based on context
    let systemPrompt;
    if (context === 'university') {
      systemPrompt = `You are an expert on universities and international admissions.
      
You have access to previous conversation history. Reference it when relevant.
Current conversation context: ${historyMessages.length > 0 ? 'Continuing discussion about universities/admissions' : 'Starting new conversation'}

Instructions:
- Consider the full conversation history when answering.
- If the user mentions a university name, provide relevant information about it.
- Answer follow-up questions based on what was discussed earlier.
- Use markdown for formatting when helpful.
- Keep responses informative and accurate.`;
    } else {
      // 🔥 FIXED: UNIVERSAL AI WITH CONTEXT AWARENESS
      systemPrompt = `You are a universal AI assistant that answers ALL questions accurately.

CONVERSATION CONTEXT:
- You have access to the full conversation history with this user.
- Reference previous topics when answering follow-up questions.
- If the user asks about something discussed earlier, continue from there.
- Provide comprehensive, accurate information on any topic.

<response_guidelines>
- Acknowledge context from previous messages when relevant
- Begin with 1-2 short factual sentences
- Use ## headers for sections when needed
- Use markdown tables for comparisons
- Cover any topic: cars, tractors, technology, education, etc.
- Be conversational and follow the flow of discussion
</response_guidelines>`;
    }
    
    // ✅ FIXED: Build messages array with alternating user/assistant roles
    const messages = [];
    
    // Add conversation history first (already in alternating format)
    const recentHistory = historyMessages.slice(-10);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    });
    
    // Add current user message
    messages.push({
      role: "user",
      content: `${systemPrompt}\n\nUser's current message: ${cleanMessage}`
    });
    
    // 🔥 RATE LIMIT FIX: Use Haiku for general (faster), Sonnet for university
   // ✅ Use Mistral model
const modelId = context === 'university'
  ? "mistral.mixtral-8x7b-instruct-v0:1"
  : "mistral.mistral-7b-instruct-v0:2";

console.log(`🤖 Using: ${modelId} [${context}] | History: ${recentHistory.length} messages`);

// 🔧 Convert messages → prompt
const buildPrompt = (systemPrompt, historyMessages, userMessage) => {
  let prompt = `<s>[INST] ${systemPrompt}\n\n`;

  historyMessages.slice(-5).forEach(msg => {
    if (msg.role === 'user') {
      prompt += `User: ${msg.content}\n`;
    } else {
      prompt += `Assistant: ${msg.content}\n`;
    }
  });

  prompt += `User: ${userMessage} [/INST]`;

  return prompt;
};

const prompt = buildPrompt(systemPrompt, historyMessages, cleanMessage);

// ✅ Mistral request format
const params = {
  modelId,
  contentType: "application/json",
  accept: "application/json",
  body: JSON.stringify({
    prompt: prompt,
    max_tokens: context === 'university' ? 3000 : 1500,
    temperature: context === 'university' ? 0.2 : 0.3,
    top_p: 0.9
  })
};
    console.log('📤 Sending to Bedrock...');
    
    const response = await retryWithBackoff(async () => {
      const command = new InvokeModelCommand(params);
      return await bedrockClient.send(command);
    });
    
    if (!response.body) {
      throw new Error('Empty Bedrock response');
    }
    
    const bodyContent = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(bodyContent);
    
   let content = responseBody.outputs?.[0]?.text?.trim();
    
    if (!content) {
      throw new Error('No content in response');
    }
    
    // Add assistant's response to conversation history
    addToConversationHistory(sessionId, 'assistant', content);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Success: ${content.length} chars (${duration}ms)`);
    
    return content;
    
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`❌ Bedrock Error (${duration}ms):`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // 🔹 Known Bedrock / Claude issues
    const isModelUnavailable =
      error.name === 'ValidationException' ||
      error.name === 'ThrottlingException' ||
      error.name === 'TooManyRequestsException' ||
      error.message?.includes('model') ||
      error.message?.includes('unavailable');

    if (isModelUnavailable) {
      console.warn('⚠️ AI unavailable → returning fallback response');

      return {
        type: 'fallback',
        message: 'AI model unavailable - using backup data',
        data: {
          answer:
            'Our AI is temporarily unavailable. Please try again shortly or continue browsing university information.',
          source: 'backup'
        }
      };
    }

    // 🔴 REAL unexpected errors → still throw
    throw error;
  }
};

/**
 * ✅ YOUR ORIGINAL UNIVERSITY FUNCTION (UPDATED WITH SESSION SUPPORT)
 */
export const generateUniversityInfo = async (universityName, sessionId = 'default') => {
  return generateResponse(universityName, 'university', sessionId);
};

/**
 * 🆕 Get conversation history for debugging
 */
export const getDebugConversationHistory = (sessionId = 'default') => {
  if (conversationHistory.has(sessionId)) {
    const session = conversationHistory.get(sessionId);
    return {
      sessionId,
      messageCount: session.messages.length,
      lastActivity: new Date(session.lastActivity).toISOString(),
      messages: session.messages.slice(-5) // Last 5 messages
    };
  }
  return { sessionId, messageCount: 0, messages: [] };
};

export { bedrockClient };