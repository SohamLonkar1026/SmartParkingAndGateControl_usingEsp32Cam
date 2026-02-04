import 'dotenv/config';
import { getDb, runMigrations } from './db.js';

async function seed() {
	await runMigrations();
	const db = await getDb();

	// Seed vehicles if empty
	const vehicleCount = await db.get('SELECT COUNT(*) as c FROM vehicles');
	if (vehicleCount.c === 0) {
		const vehicles = [
			{ driver_name: 'John', vehicle_number: 'MH12AB1234', vehicle_type: 'car', qr_code: 'QR-MH12AB1234' },
			{ driver_name: 'Rohit', vehicle_number: 'MH12XY9876', vehicle_type: 'bike', qr_code: 'QR-MH12XY9876' },
			{ driver_name: 'Akash', vehicle_number: 'MH14TR5555', vehicle_type: 'truck', qr_code: 'QR-MH14TR5555' }
		];
		for (const v of vehicles) {
			await db.run(
				'INSERT INTO vehicles (driver_name, vehicle_number, vehicle_type, qr_code) VALUES (?, ?, ?, ?)',
				[v.driver_name, v.vehicle_number, v.vehicle_type, v.qr_code]
			);
		}
		console.log('Seeded vehicles');
	}

	// Seed spots if empty
	const spotCount = await db.get('SELECT COUNT(*) as c FROM parking_spots');
	if (spotCount.c === 0) {
		const spots = [];
		for (let i = 1; i <= 5; i++) spots.push({ spot_name: `C${i}`, vehicle_type: 'car' });
		for (let i = 1; i <= 5; i++) spots.push({ spot_name: `B${i}`, vehicle_type: 'bike' });
		for (let i = 1; i <= 3; i++) spots.push({ spot_name: `T${i}`, vehicle_type: 'truck' });
		for (const s of spots) {
			await db.run(
				'INSERT INTO parking_spots (spot_name, vehicle_type, status, current_vehicle) VALUES (?, ?, ?, ?)',
				[s.spot_name, s.vehicle_type, 'available', null]
			);
		}
		console.log('Seeded parking spots');
	}

	console.log('Database ready');
}

seed().catch(err => {
	console.error(err);
	process.exit(1);
});


