import express from 'express';
import QRCode from 'qrcode';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db.js';
import { recognizePlate } from '../services/licensePlateService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: (req, file, cb) => {
    cb(null, `plate-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (JPEG, JPG, PNG)'));
  }
});

let ioInstance = null;
export function setIOInstance(io) {
	ioInstance = io;
}

export const router = express.Router();

async function getSpotSummary(db) {
	const spots = await db.all('SELECT * FROM parking_spots ORDER BY spot_name');
	return spots;
}

async function getLogs(db, limit = 100) {
	const rows = await db.all(
		`SELECT l.id, v.driver_name, v.vehicle_number, v.vehicle_type, l.spot_name, l.entry_time, l.exit_time
		 FROM logs l JOIN vehicles v ON v.id = l.vehicle_id
		 ORDER BY l.id DESC LIMIT ?`,
		[limit]
	);
	return rows;
}

// POST /api/scan
router.post('/scan', async (req, res) => {
	try {
		const { qr_code } = req.body || {};
		if (!qr_code) return res.status(400).json({ status: 'error', message: 'qr_code required' });
		const db = await getDb();
		const vehicle = await db.get('SELECT * FROM vehicles WHERE qr_code = ?', [qr_code]);
		if (!vehicle) return res.json({ status: 'unregistered' });

		const activeLog = await db.get(
			`SELECT l.*, s.spot_name as s_spot
			 FROM logs l
			 LEFT JOIN parking_spots s ON s.current_vehicle = l.vehicle_id
			 WHERE l.vehicle_id = ? AND l.exit_time IS NULL
			 ORDER BY l.id DESC LIMIT 1`,
			[vehicle.id]
		);

		if (!activeLog) {
			// Entry flow: assign nearest available spot for type
			const spot = await db.get(
				'SELECT * FROM parking_spots WHERE vehicle_type = ? AND status = ? ORDER BY spot_name LIMIT 1',
				[vehicle.vehicle_type, 'available']
			);
			if (!spot) return res.json({ status: 'no_spot_available' });

			const nowIso = new Date().toISOString();
			await db.run('UPDATE parking_spots SET status = ?, current_vehicle = ? WHERE id = ?', [
				'occupied',
				vehicle.id,
				spot.id
			]);
			await db.run(
				'INSERT INTO logs (vehicle_id, spot_name, entry_time, exit_time) VALUES (?, ?, ?, NULL)',
				[vehicle.id, spot.spot_name, nowIso]
			);

			const payload = {
				status: 'entry_success',
				spot: spot.spot_name,
				driver: vehicle.driver_name,
				vehicle: vehicle.vehicle_number
			};
			ioInstance?.emit('parking:update', { type: 'entry', data: payload });
			return res.json(payload);
		} else {
			// Exit flow: free spot and close log
			const spot = await db.get('SELECT * FROM parking_spots WHERE current_vehicle = ?', [vehicle.id]);
			if (!spot) {
				// Fallback: close any open log
				await db.run('UPDATE logs SET exit_time = ? WHERE vehicle_id = ? AND exit_time IS NULL', [
					new Date().toISOString(),
					vehicle.id
				]);
				const payload = { status: 'exit_success', message: 'Vehicle exited successfully' };
				ioInstance?.emit('parking:update', { type: 'exit', data: { vehicle_id: vehicle.id } });
				return res.json(payload);
			}

			const nowIso = new Date().toISOString();
			await db.run('UPDATE parking_spots SET status = ?, current_vehicle = NULL WHERE id = ?', [
				'available',
				spot.id
			]);
			await db.run(
				'UPDATE logs SET exit_time = ? WHERE vehicle_id = ? AND exit_time IS NULL',
				[nowIso, vehicle.id]
			);
			const payload = { status: 'exit_success', message: 'Vehicle exited successfully' };
			ioInstance?.emit('parking:update', { type: 'exit', data: { spot: spot.spot_name, vehicle_id: vehicle.id } });
			return res.json(payload);
		}
	} catch (err) {
		console.error(err);
		return res.status(500).json({ status: 'error', message: 'Internal server error' });
	}
});

// GET /api/dashboard
router.get('/dashboard', async (_req, res) => {
	try {
		const db = await getDb();
		const spots = await getSpotSummary(db);
		const logs = await getLogs(db, 100);
		const stats = {
			cars_available: (await db.get('SELECT COUNT(*) as c FROM parking_spots WHERE vehicle_type = ? AND status = ?', ['car', 'available'])).c,
			bikes_available: (await db.get('SELECT COUNT(*) as c FROM parking_spots WHERE vehicle_type = ? AND status = ?', ['bike', 'available'])).c,
			trucks_available: (await db.get('SELECT COUNT(*) as c FROM parking_spots WHERE vehicle_type = ? AND status = ?', ['truck', 'available'])).c
		};
		return res.json({ spots, logs, stats });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ status: 'error', message: 'Internal server error' });
	}
});

// POST /api/register
router.post('/register', async (req, res) => {
	try {
		const { driver_name, vehicle_number, vehicle_type } = req.body || {};
		if (!driver_name || !vehicle_number || !vehicle_type) {
			return res.status(400).json({ status: 'error', message: 'missing fields' });
		}
		const db = await getDb();
		const qr_code = `QR-${vehicle_number}`;
		await db.run(
			'INSERT INTO vehicles (driver_name, vehicle_number, vehicle_type, qr_code) VALUES (?, ?, ?, ?)',
			[driver_name, vehicle_number, vehicle_type, qr_code]
		);
		const qrDataURL = await QRCode.toDataURL(qr_code, { margin: 1, width: 256 });
		ioInstance?.emit('parking:update', { type: 'register', data: { vehicle_number } });
		return res.json({ status: 'ok', qr_code, qr_png_data_url: qrDataURL });
	} catch (err) {
		if (String(err?.message || '').includes('UNIQUE')) {
			return res.status(409).json({ status: 'error', message: 'Vehicle or QR already exists' });
		}
		console.error(err);
		return res.status(500).json({ status: 'error', message: 'Internal server error' });
	}
});

// POST /api/recognize-plate
router.post('/recognize-plate', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No image file provided' });
        }

        // Process the image to recognize license plate
        const plateData = await recognizePlate(req.file.path);
        
        // Find the vehicle in the database
        const db = await getDb();
        const vehicle = await db.get(
            'SELECT * FROM vehicles WHERE vehicle_number = ?', 
            [plateData.plateNumber]
        );

        if (!vehicle) {
            return res.json({ 
                status: 'unregistered',
                plate: plateData.plateNumber,
                confidence: plateData.confidence
            });
        }

        // Check if vehicle is already parked
        const activeLog = await db.get(
            `SELECT l.*, s.spot_name as s_spot
             FROM logs l
             LEFT JOIN parking_spots s ON s.current_vehicle = l.vehicle_id
             WHERE l.vehicle_id = ? AND l.exit_time IS NULL
             ORDER BY l.id DESC LIMIT 1`,
            [vehicle.id]
        );

        if (activeLog) {
            // Exit flow
            const exitTime = new Date().toISOString();
            const entryTime = new Date(activeLog.entry_time);
            const durationMs = new Date(exitTime) - entryTime;
            const durationMinutes = Math.ceil(durationMs / (1000 * 60));
            
            // Calculate fee (simplified example)
            const fee = durationMinutes * 10; // 10 INR per minute
            
            await db.run(
                'UPDATE logs SET exit_time = ?, duration_minutes = ?, fee = ? WHERE id = ?',
                [exitTime, durationMinutes, fee, activeLog.id]
            );
            
            await db.run(
                'UPDATE parking_spots SET status = ?, current_vehicle = NULL WHERE spot_name = ?',
                ['available', activeLog.s_spot]
            );
            
            ioInstance?.emit('parking:update', { 
                type: 'exit', 
                data: { 
                    spot: activeLog.s_spot,
                    vehicle: vehicle.vehicle_number,
                    duration: durationMinutes,
                    fee
                } 
            });
            
            return res.json({ 
                status: 'exit',
                plate: plateData.plateNumber,
                spot: activeLog.s_spot,
                duration: durationMinutes,
                fee
            });
        } else {
            // Entry flow: assign nearest available spot for type
            const spot = await db.get(
                'SELECT * FROM parking_spots WHERE vehicle_type = ? AND status = ? ORDER BY spot_name LIMIT 1',
                [vehicle.vehicle_type, 'available']
            );
            
            if (!spot) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'No available parking spots' 
                });
            }
            
            const entryTime = new Date().toISOString();
            
            await db.run(
                'INSERT INTO logs (vehicle_id, spot_name, entry_time) VALUES (?, ?, ?)',
                [vehicle.id, spot.spot_name, entryTime]
            );
            
            await db.run(
                'UPDATE parking_spots SET status = ?, current_vehicle = ? WHERE spot_name = ?',
                ['occupied', vehicle.id, spot.spot_name]
            );
            
            ioInstance?.emit('parking:update', { 
                type: 'entry', 
                data: { 
                    spot: spot.spot_name,
                    vehicle: vehicle.vehicle_number,
                    entryTime
                } 
            });
            
            return res.json({ 
                status: 'entry',
                plate: plateData.plateNumber,
                spot: spot.spot_name
            });
        }
    } catch (error) {
        console.error('License plate recognition error:', error);
        return res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Failed to process license plate' 
        });
    } finally {
        // Clean up the uploaded file
        if (req.file) {
            try {
                const fs = await import('fs/promises');
                await fs.unlink(req.file.path);
            } catch (e) {
                console.error('Error cleaning up file:', e);
            }
        }
    }
});

// GET /api/slots
router.get('/slots', async (_req, res) => {
	try {
		const db = await getDb();
		const spots = await db.all('SELECT * FROM parking_spots ORDER BY spot_name');
		res.json(spots);
	} catch (err) {
		console.error(err);
		res.status(500).json({ status: 'error', message: 'Failed to load slots' });
	}
});

// GET /api/logs
router.get('/logs', async (_req, res) => {
	try {
		const db = await getDb();
		const rows = await db.all(
			`SELECT l.id, v.qr_code as vehicle_id, v.vehicle_number as plate, v.driver_name as owner_name, 
			 v.vehicle_type, l.spot_name as parking_slot, l.entry_time, l.exit_time, 
			 l.duration_minutes, l.fee
			 FROM logs l 
			 JOIN vehicles v ON v.id = l.vehicle_id
			 ORDER BY l.id DESC LIMIT 100`
		);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ status: 'error', message: 'Failed to load logs' });
	}
});

// DELETE /api/logs/clear
router.delete('/logs/clear', async (_req, res) => {
	try {
		const db = await getDb();
		
		// Get counts before clearing
		const logsCount = await db.get('SELECT COUNT(*) as c FROM logs');
		const occupiedSpots = await db.get('SELECT COUNT(*) as c FROM parking_spots WHERE status = ?', ['occupied']);
		
		// Clear all logs
		await db.run('DELETE FROM logs');
		
		// Free all parking spots
		await db.run('UPDATE parking_spots SET status = ?, current_vehicle = NULL', ['available']);
		
		// Emit update to clients
		ioInstance?.emit('parking:update', { type: 'clear_all' });
		
		res.json({ 
			status: 'ok', 
			logsCleared: logsCount.c,
			slotsFreed: occupiedSpots.c
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ status: 'error', message: 'Failed to clear logs' });
	}
});

