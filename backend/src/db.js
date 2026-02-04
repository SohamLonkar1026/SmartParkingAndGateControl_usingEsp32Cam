import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DEFAULT_DB_FILE = process.env.DATABASE_FILE || './data/parking.db';

let dbPromise;

export function getDb() {
	if (!dbPromise) {
		const dbFile = DEFAULT_DB_FILE;
		const dir = path.dirname(dbFile);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		dbPromise = open({ filename: dbFile, driver: sqlite3.Database });
	}
	return dbPromise;
}

export async function runMigrations() {
	const db = await getDb();
	await db.exec(`
		CREATE TABLE IF NOT EXISTS vehicles (
			id INTEGER PRIMARY KEY,
			driver_name TEXT,
			vehicle_number TEXT,
			vehicle_type TEXT,
			qr_code TEXT UNIQUE
		);
		CREATE TABLE IF NOT EXISTS parking_spots (
			id INTEGER PRIMARY KEY,
			spot_name TEXT,
			vehicle_type TEXT,
			status TEXT,
			current_vehicle INTEGER
		);
		CREATE TABLE IF NOT EXISTS logs (
			id INTEGER PRIMARY KEY,
			vehicle_id INTEGER,
			spot_name TEXT,
			entry_time DATETIME,
			exit_time DATETIME
		);
	`);
}


