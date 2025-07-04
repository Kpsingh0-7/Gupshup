import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIO } from 'socket.io';

import createRouter from './routes/controllerRoutes.js';

const app = express();

// === CORS config ===
const corsOptions = {
  origin: '*', // Adjust in production
  methods: ['GET', 'POST'],
  credentials: false,
};

app.use(cors(corsOptions));
app.use(express.json());


// ✅ First, create the HTTP server
const server = http.createServer(app);

// ✅ Then, pass it to Socket.IO
const io = new SocketIO(server, {
  cors: corsOptions,
});

// ✅ Now pass `io` to your routes
const router = createRouter(io);
app.use('/', router);

// === Error handler ===
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});
// === Socket.IO Events ===
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join_conversation', (conversation_id) => {
    socket.join(conversation_id);
    console.log(`Socket ${socket.id} joined conversation: ${conversation_id}`);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// === Start Unified Server ===
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server (API + Socket.IO) running on http://localhost:${PORT}`);
});
