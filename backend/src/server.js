import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { router as apiRouter, setIOInstance } from './web/routes.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

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

app.get('/health', (_req, res) => {
	res.json({ ok: true });
});

app.use('/api', apiRouter);

io.on('connection', socket => {
	// Optionally authenticate or log
	// console.log('Client connected', socket.id);
	socket.on('disconnect', () => {
		// console.log('Client disconnected', socket.id);
	});
});

server.listen(PORT, () => {
	console.log(`Backend listening on http://localhost:${PORT}`);
});


