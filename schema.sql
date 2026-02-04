-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate TEXT,
  owner_name TEXT,
  vehicle_type TEXT DEFAULT 'car',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parking logs
CREATE TABLE IF NOT EXISTS parking_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id TEXT NOT NULL,
  entry_time TIMESTAMP NOT NULL,
  exit_time TIMESTAMP,
  duration_minutes INTEGER,
  fee INTEGER,
  parking_slot TEXT,
  FOREIGN KEY(vehicle_id) REFERENCES vehicles(id)
);

-- Pricing rates per vehicle type (₹/minute)
CREATE TABLE IF NOT EXISTS pricing (
  vehicle_type TEXT PRIMARY KEY,
  rate_per_minute INTEGER NOT NULL
);

-- Parking slots inventory
CREATE TABLE IF NOT EXISTS parking_slots (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- car | bike | truck
  occupied_by TEXT,   -- vehicle_id when occupied
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



