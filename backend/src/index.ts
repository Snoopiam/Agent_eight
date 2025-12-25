// backend/src/index.ts
// Agent Eight - The Engine
// Main server entry point: Express + Socket.io + Chokidar integration

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { FileWatcher } from './watcher.js';
import { scannerService } from './services/scanner.js';
import { fixerService } from './services/fixer.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  FixPayload,
} from './types.js';

// Configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const WATCH_DIR = process.env.WATCH_DIR || process.argv[2] || process.cwd();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Initialize Express
const app = express();
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io with typed events
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Initialize File Watcher
const watcher = new FileWatcher({
  watchDir: path.resolve(WATCH_DIR),
  debounceMs: 500,
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    watchDir: watcher.getWatchDir(),
    connectedClients: io.engine.clientsCount,
    rules: scannerService.getRules().map((r) => ({ id: r.id, name: r.name })),
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send initial connection info
  socket.emit('connection:established', {
    watchDir: watcher.getWatchDir(),
  });

  // Handle fix requests
  socket.on('fix:apply', async (payload: FixPayload) => {
    console.log(`[Socket] Fix request received for: ${payload.filePath}`);

    const result = await fixerService.applyFix(payload);

    if (result.success) {
      socket.emit('fix:complete', result);
      // Broadcast to all clients that a fix was applied
      socket.broadcast.emit('fix:complete', result);
    } else {
      socket.emit('fix:error', result);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);
  });
});

// Register file change handler
watcher.onFileChange((event) => {
  // Only scan files that have content (add/change events)
  if (event.type === 'unlink') {
    console.log(`[Engine] File deleted: ${event.filePath}`);
    return;
  }

  if (!event.content) {
    console.log(`[Engine] No content for file: ${event.filePath}`);
    return;
  }

  // Scan the file content
  const result = scannerService.scan(event.content, event.filePath);

  // Emit results to all connected clients if there are alerts
  if (result.alerts.length > 0) {
    console.log(`[Engine] Emitting ${result.alerts.length} alert(s) to clients`);
    io.emit('scan:result', result);
  }
});

// Graceful shutdown handler
async function shutdown(): Promise<void> {
  console.log('\n[Engine] Shutting down...');
  
  try {
    await watcher.stop();
    
    // Close all socket connections
    io.disconnectSockets(true);
    
    httpServer.close(() => {
      console.log('[Engine] Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('[Engine] Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
async function start(): Promise<void> {
  try {
    // Start the file watcher
    await watcher.start();

    // Start the HTTP server
    httpServer.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════╗');
      console.log('║                                                          ║');
      console.log('║     🚀 AGENT EIGHT - THE ENGINE                          ║');
      console.log('║                                                          ║');
      console.log(`║     Server:    http://localhost:${PORT}                      ║`);
      console.log(`║     Watching:  ${watcher.getWatchDir().substring(0, 40).padEnd(40)}║`);
      console.log('║                                                          ║');
      console.log('╚══════════════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('[Engine] Failed to start:', error);
    process.exit(1);
  }
}

start();

