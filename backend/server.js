// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');

// Load environment variables FIRST
dotenv.config();

// Import middleware (after dotenv)
const { securityHeaders, limiter, authLimiter } = require('./middleware/security');
const { languageMiddleware } = require('./middleware/language');

// Check if .env loaded correctly
console.log('📁 Environment variables loaded');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing!');
  console.log('Please create a .env file in the backend folder with:');
  console.log('MONGODB_URI=mongodb://localhost:27017/smart_queue');
  process.exit(1);
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const queueRoutes = require('./routes/queueRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const branchRoutes = require('./routes/branchRoutes');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT"],
    credentials: true
  }
});

// Make io available to controllers for realtime broadcasts
const { setIO } = require('./config/socket');
setIO(io);

// ============ MIDDLEWARE (Order matters!) ============
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(securityHeaders);
app.use(limiter);
app.use(languageMiddleware);

// ============ DATABASE CONNECTION ============
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    // Create indexes after successful connection
    const createIndexes = require('./config/dbIndexes');
    await createIndexes();

    // Seed default admin user for local development/demo
    try {
      const seedAdminUser = require('./config/seedAdmin');
      await seedAdminUser();
    } catch (e) {
      console.log('Admin seeding skipped:', e.message);
    }

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure MongoDB is installed and running');
    console.log('2. For local MongoDB: Run "mongod" in terminal');
    console.log('3. Or use MongoDB Atlas cloud database');
    console.log('4. Check your .env file has correct MONGODB_URI\n');
    process.exit(1);
  }
};

connectDB();

// ============ REDIS CONNECTION (Optional - won't crash if unavailable) ============
const { connectRedis } = require('./config/redis');
connectRedis().catch(() => {
  console.log('⚠️ Redis not available - continuing without cache');
});

// ============ ROUTES ============
// Apply stricter rate limiting to auth routes (must be BEFORE authRoutes)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/branches', branchRoutes);

// ============ SWAGGER API DOCS ============
try {
  const { swaggerUi, specs } = require('./config/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  console.log('📚 API Docs available at /api-docs');
} catch (error) {
  console.log('⚠️ Swagger not available - API docs disabled');
}

// ============ SOCKET.IO HANDLER ============
io.on('connection', (socket) => {
  console.log('✅ New client connected:', socket.id);

  // Join a service-type room for queue-wide broadcast updates
  socket.on('join-queue', (data) => {
    if (data?.serviceType) {
      socket.join(`queue-${data.serviceType}`);
      console.log(`Socket ${socket.id} joined queue-${data.serviceType}`);
    }
  });

  // Join a per-token room so the individual customer receives their turn-alert
  socket.on('join-token', (data) => {
    if (data?.tokenNumber) {
      socket.join(`token-${data.tokenNumber}`);
      console.log(`Socket ${socket.id} joined token-${data.tokenNumber}`);
    }
  });

  // Admin secondary channel (main state changes go through REST + emitQueueUpdate)
  socket.on('admin-action', (data) => {
    if (data?.serviceType) {
      io.to(`queue-${data.serviceType}`).emit('queue-update', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ============ ROOT ROUTE ============
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Queue System API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      tokens: '/api/tokens',
      queue: '/api/queue',
      appointments: '/api/appointments',
      branches: '/api/branches',
      docs: '/api-docs'
    }
  });
});

// ============ HEALTH CHECK ENDPOINT ============
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl} on this server`
  });
});

// ============ ERROR HANDLING MIDDLEWARE ============
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready for connections`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs\n`);
});
