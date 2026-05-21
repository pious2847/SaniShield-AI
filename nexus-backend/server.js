require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');
const { initDb } = require('./src/config/database');

const sensorCtrl = require('./src/controllers/sensorController');
const predictionCtrl = require('./src/controllers/predictionController');
const reportCtrl = require('./src/controllers/reportController');
const gathererCtrl = require('./src/controllers/gathererController');
const broadcastCtrl = require('./src/controllers/broadcastController');
const communityWatchCtrl = require('./src/controllers/communityWatchController');
const sludgeJobCtrl = require('./src/controllers/sludgeJobController');
const floodAssessmentCtrl = require('./src/controllers/floodAssessmentController');
const simulatorCtrl = require('./src/controllers/simulatorController');
const { startAllCrons } = require('./src/services/cronService');

const app = express();
const httpServer = http.createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

sensorCtrl.setIo(io);
predictionCtrl.setIo(io);
reportCtrl.setIo(io);
gathererCtrl.setIo(io);
broadcastCtrl.setIo(io);
communityWatchCtrl.setIo(io);
sludgeJobCtrl.setIo(io);
floodAssessmentCtrl.setIo(io);
simulatorCtrl.setIo(io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/v1', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

app.use(errorHandler);

io.on('connection', socket => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('join_district', district => socket.join(`district:${district}`));
  socket.on('leave_district', district => socket.leave(`district:${district}`));
  socket.on('disconnect', () => console.log(`[Socket.io] Disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Warm up Neon connection before running schema
    const { query } = require('./src/config/database');
    for (let attempt = 1; attempt <= 5; attempt++) {
      try { await query('SELECT 1'); break; }
      catch { if (attempt === 5) throw new Error('DB unreachable after 5 attempts'); await new Promise(r => setTimeout(r, 3000 * attempt)); }
    }
    await initDb();
    startAllCrons(io);
    httpServer.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║         N.E.X.U.S. Backend API Server             ║
║  Northern Environmental X-system for Universal    ║
║               Sanitation                          ║
╠═══════════════════════════════════════════════════╣
║  Status:  RUNNING on Neon PostgreSQL              ║
║  Port:    ${PORT}                                      ║
║  Mode:    ${(process.env.NODE_ENV || 'development').padEnd(10)}                        ║
║  API:     http://localhost:${PORT}/api/v1             ║
║  V4:      Sludge Chain, Flood Assessment, QR       ║
╚═══════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();

module.exports = { app, io };
