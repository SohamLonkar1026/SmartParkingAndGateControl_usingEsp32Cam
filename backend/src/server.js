import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { router as apiRouter, setIOInstance } from './web/routes.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*'; // Fallback to all for production if needed, or set specifically

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
	cors: {
		origin: CLIENT_ORIGIN,
		methods: ['GET', 'POST']
	}
});

setIOInstance(io);

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Serve static files from the frontend build
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

app.get('/health', (_req, res) => {
	res.json({ ok: true });
});

app.use('/api', apiRouter);

// Catch-all route to serve the SPA index.html
app.get('*', (req, res) => {
	if (req.path.startsWith('/api')) return; // Don't catch API routes
	res.sendFile(path.join(publicPath, 'index.html'));
});

io.on('connection', socket => {
	// Optionally authenticate or log
	// console.log('Client connected', socket.id);
	socket.on('disconnect', () => {
		// console.log('Client disconnected', socket.id);
	});
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`Backend listening on port ${PORT}`);
});


