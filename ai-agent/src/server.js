import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import universityRoutes from './routes/universityRoutes.js';  // ✅ ADDED ROUTER IMPORT

// Load environment variables FIRST
dotenv.config();

console.log('\n🔍 ENVIRONMENT VARIABLES CHECK:');
console.log('================================');
console.log('AWS_REGION:', process.env.AWS_REGION || '❌ NOT SET');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ MISSING');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ MISSING');
console.log('PORT:', process.env.PORT || 5001);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('================================\n');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5001;

// 🔥 FIXED CORS - SOLVES <!DOCTYPE HTML ERROR
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 🚀 API Routes - ROUTER INTEGRATION (Replaces direct controller calls)
// ✅ MOUNTS router at /api/university-info
app.use('/api/university-info', universityRoutes);

// 🔥 BACKWARD COMPATIBILITY - WORKING DIRECT CONTROLLER CALL (FIXED!)
app.post('/api/chat-response', async (req, res) => {
  console.log('🔄 [BACKWARD COMPAT] /api/chat-response → Direct controller call');
  
  try {
    const { getChatResponse } = await import('./controllers/universityController.js');
    await getChatResponse(req, res);
  } catch (error) {
    console.error('🔄 Backward compat error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'University Info API + Universal Chatbot 🚀',
    endpoints: {
      legacy: '/api/chat-response ✅ (direct controller)',
      primary: '/api/university-info/chat-response ✅'
    }
  });
});

// Config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    awsRegion: process.env.AWS_REGION || 'not-set',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    routerEnabled: true,
    backwardCompat: true  // ✅ Shows compat route active
  });
});

// Root endpoint - UPDATED with router paths + backward compat
app.get('/', (req, res) => {
  res.json({
    message: 'University Information API + Universal Chatbot 🚀',
    endpoints: {
      getUniversityInfo: {
        method: 'POST',
        path: '/api/university-info/',
        body: { universityName: 'University Name' }
      },
      chatResponse: {
        method: 'POST',
        path: '/api/university-info/chat-response',
        body: { message: 'Your question or university name', context: 'auto' }
      },
      chatResponseLegacy: {  // ✅ Shows both options
        method: 'POST',
        path: '/api/chat-response',  // ← Your old client works!
        note: '← Backward compatible (direct controller)'
      },
      test: {
        method: 'GET',
        path: '/api/university-info/test'
      },
      health: {
        method: 'GET',
        path: '/api/health'
      },
      config: {
        method: 'GET',
        path: '/api/config'
      }
    }
  });
});

// 404 handler - FIXED: Using app.all() instead of app.use()
app.all('*', (req, res) => {
  console.warn(`404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    available: [
      '/api/university-info/',
      '/api/university-info/chat-response',
      '/api/chat-response ← (legacy, direct controller)', 
      '/api/health'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server - UPDATED startup message
app.listen(PORT, () => {
  console.log(`\n🚀 Server started on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`\n📌 Available endpoints:`);
  console.log(`   POST /api/university-info/               - Get university information`);
  console.log(`   POST /api/university-info/chat-response  - Universal chatbot (NEW)`);
  console.log(`   POST /api/chat-response                 - Universal chatbot (OLD ← WORKS!)`);
  console.log(`   GET  /api/university-info/test          - Chatbot capability test (tractor fixed ✅)`);
  console.log(`   GET  /api/health                        - Health check`);
  console.log(`   GET  /api/config                        - Configuration`);
  console.log(`   GET  /                                   - API documentation`);
  console.log(`\n🎉 CORS FIXED + ROUTER + BACKWARD COMPAT COMPLETE! 🚀`);
});
