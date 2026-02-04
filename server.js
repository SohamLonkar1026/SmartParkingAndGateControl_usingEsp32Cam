const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const http = require('http');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'parking.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// ===== ESP32 Controller Configuration =====
// Set this to your ESP32 controller's IP address
const ESP32_CONTROLLER_IP = '10.187.14.240'; // ✓ ESP32 Gate Controller IP (Updated)
const ESP32_CONTROLLER_ENABLED = true; // ✓ ENABLED - Ready to control gates & LEDs
// ===========================================

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Explicit root route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ESP32-CAM proxy to avoid CORS issues
app.get('/esp32-proxy', (req, res) => {
  const esp32Url = req.query.url; // e.g., http://192.168.1.100:81/
  
  if (!esp32Url) {
    return res.status(400).send('Missing url parameter');
  }
  
  console.log('[ESP32-PROXY] Proxying stream from:', esp32Url);
  
  // Parse the ESP32 URL
  const url = new URL(esp32Url);
  
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname,
    method: 'GET',
    headers: {
      'User-Agent': 'Smart-Parking-Proxy'
    }
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    // Forward status and headers
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'multipart/x-mixed-replace',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Pipe the ESP32 stream to the response
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('[ESP32-PROXY] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Failed to connect to ESP32-CAM');
    }
  });
  
  // Handle client disconnect
  req.on('close', () => {
    proxyReq.destroy();
  });
  
  proxyReq.end();
});

function initializeDatabase() {
  const dbExists = fs.existsSync(DB_PATH);
  const db = new sqlite3.Database(DB_PATH);

  return new Promise((resolve, reject) => {
    const applySchema = () => {
      fs.readFile(SCHEMA_PATH, 'utf8', (err, schemaSql) => {
        if (err) {
          return reject(err);
        }
        db.exec(schemaSql, (execErr) => {
          if (execErr) {
            return reject(execErr);
          }
          // Run lightweight migrations for existing DBs
          runMigrations(db)
            .then(() => resolve(db))
            .catch(reject);
        });
      });
    };

    if (!dbExists) {
      console.log('[DB] Creating new SQLite database and applying schema...');
      applySchema();
    } else {
      // Ensure tables exist even if DB file exists
      console.log('[DB] SQLite database found. Ensuring schema...');
      applySchema();
    }
  });
}

function runMigrations(db) {
  return new Promise((resolve, reject) => {
    // Ensure vehicles.vehicle_type exists
    db.all('PRAGMA table_info(vehicles);', [], (err, rows) => {
      if (err) return reject(err);
      const hasVehicleType = Array.isArray(rows) && rows.some((r) => r.name === 'vehicle_type');

      const ensureOthers = () => {
        // Ensure pricing, parking_slots tables and parking_logs.parking_slot column exist
        db.exec(
          "CREATE TABLE IF NOT EXISTS pricing (vehicle_type TEXT PRIMARY KEY, rate_per_minute INTEGER NOT NULL);\n" +
            "CREATE TABLE IF NOT EXISTS parking_slots (id TEXT PRIMARY KEY, type TEXT NOT NULL, occupied_by TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);",
          (e2) => {
            if (e2) return reject(e2);
            db.all('PRAGMA table_info(parking_logs);', [], (plErr, plCols) => {
              if (plErr) return reject(plErr);
              const hasParkingSlotCol = Array.isArray(plCols) && plCols.some((c) => c.name === 'parking_slot');
              const seedSlots = () => {
                const slots = [
                  ['t1', 'truck'], ['t2', 'truck'], ['t3', 'truck'],
                  ['b1', 'bike'], ['b2', 'bike'], ['b3', 'bike'],
                  ['c1', 'car'], ['c2', 'car'], ['c3', 'car'],
                ];
                let remaining = slots.length;
                if (remaining === 0) return resolve();
                slots.forEach(([id, type]) => {
                  db.run('INSERT OR IGNORE INTO parking_slots (id, type) VALUES (?, ?)', [id, type], (se) => {
                    if (se) return reject(se);
                    remaining -= 1;
                    if (remaining === 0) resolve();
                  });
                });
              };
              if (!hasParkingSlotCol) {
                db.run('ALTER TABLE parking_logs ADD COLUMN parking_slot TEXT;', (ae) => {
                  if (ae) return reject(ae);
                  seedSlots();
                });
              } else {
                seedSlots();
              }
            });
          }
        );
      };

      if (!hasVehicleType) {
        db.run('ALTER TABLE vehicles ADD COLUMN vehicle_type TEXT DEFAULT "car";', (altErr) => {
          if (altErr) return reject(altErr);
          ensureOthers();
        });
      } else {
        ensureOthers();
      }
    });
  });
}

async function seedSampleVehicle(db) {
  const seeds = [
    { id: 'ABC123', plate: 'DL-01-AB-1234', owner: 'Sample Owner' },
    { id: 'MH42AB', plate: 'MH-42-AB-0001', owner: 'Default Owner' },
  ];

  return new Promise((resolve, reject) => {
    let remaining = seeds.length;
    const done = () => {
      remaining -= 1;
      if (remaining === 0) resolve();
    };

    seeds.forEach((s) => {
      db.run(
        'INSERT OR IGNORE INTO vehicles (id, plate, owner_name) VALUES (?, ?, ?)',
        [s.id, s.plate, s.owner],
        (err) => {
          if (err) return reject(err);
          db.get('SELECT id FROM vehicles WHERE id = ?', [s.id], (getErr, row) => {
            if (getErr) return reject(getErr);
            if (row) {
              console.log(`[DB] Vehicle ${s.id} is present (seeded or existing).`);
            }
            done();
          });
        }
      );
    });
  });
}

function computeDurationMinutes(entryIso, exitIso) {
  const entryMs = new Date(entryIso).getTime();
  const exitMs = new Date(exitIso).getTime();
  const diffMs = Math.max(0, exitMs - entryMs);
  return Math.ceil(diffMs / 60000); // round up to next minute
}

function getRateForType(db, vehicleType) {
  return new Promise((resolve) => {
    db.get('SELECT rate_per_minute FROM pricing WHERE vehicle_type = ?', [vehicleType], (err, row) => {
      if (err || !row) return resolve(2); // default ₹2/min
      resolve(row.rate_per_minute || 2);
    });
  });
}

// ===== ESP32 Controller Functions =====
function sendToESP32(endpoint, method = 'POST', jsonData = {}) {
  if (!ESP32_CONTROLLER_ENABLED) {
    console.log('[ESP32] Controller disabled - skipping command:', endpoint);
    return Promise.resolve({ skipped: true });
  }

  return new Promise((resolve, reject) => {
    const url = new URL(`http://${ESP32_CONTROLLER_IP}${endpoint}`);
    const postData = JSON.stringify(jsonData);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log(`[ESP32] Sending ${method} to ${url.href}`, jsonData);
    
    const request = http.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        console.log('[ESP32] Response:', data);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });
    
    request.on('error', (error) => {
      console.error('[ESP32] Error:', error.message);
      resolve({ error: error.message }); // Don't reject, just log
    });
    
    request.setTimeout(5000, () => {
      request.destroy();
      console.error('[ESP32] Timeout');
      resolve({ error: 'timeout' });
    });
    
    if (method === 'POST') {
      request.write(postData);
    }
    request.end();
  });
}

function triggerEntry(vehicleId, vehicleType, parkingSlot) {
  console.log(`[ESP32] 🚗 Triggering entry sequence for ${vehicleId} (${vehicleType}) -> Slot: ${parkingSlot}`);
  return sendToESP32('/entry', 'POST', { 
    vehicleId: vehicleId,
    vehicleType: vehicleType,
    slotId: parkingSlot 
  });
}

function triggerExit(vehicleId, parkingSlot, fee) {
  console.log(`[ESP32] 🚗 Triggering exit sequence for ${vehicleId} from slot: ${parkingSlot} | Fee: ₹${fee}`);
  return sendToESP32('/exit', 'POST', { 
    vehicleId: vehicleId,
    slotId: parkingSlot,
    fee: fee 
  });
}
// ======================================

function createApi(db) {
  // Delete vehicle
  app.delete('/api/vehicles/:id', (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing vehicle id' });
    }
    db.run('DELETE FROM vehicles WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('[API] /api/vehicles/:id error:', err);
        return res.status(500).json({ error: 'DB error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      res.status(200).json({ status: 'deleted', id });
    });
  });

  // List vehicles
  app.get('/api/vehicles', (req, res) => {
    db.all('SELECT id, plate, owner_name, vehicle_type, created_at FROM vehicles ORDER BY created_at DESC', [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows);
    });
  });

  // List logs
  app.get('/api/logs', (req, res) => {
    db.all(
      `SELECT pl.id, pl.vehicle_id, v.plate, v.owner_name, v.vehicle_type,
              pl.entry_time, pl.exit_time, pl.duration_minutes, pl.fee, pl.parking_slot
         FROM parking_logs pl
         LEFT JOIN vehicles v ON v.id = pl.vehicle_id
        ORDER BY pl.id DESC
        LIMIT 200`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(rows);
      }
    );
  });

  // Clear all logs AND free all parking slots
  app.delete('/api/logs/clear', (req, res) => {
    // Clear logs
    db.run('DELETE FROM parking_logs', [], function (logsErr) {
      if (logsErr) {
        console.error('[API] /api/logs/clear error:', logsErr);
        return res.status(500).json({ error: 'DB error' });
      }
      const logsCleared = this.changes;
      
      // Also free all parking slots (set occupied_by to NULL)
      db.run('UPDATE parking_slots SET occupied_by = NULL', [], function (slotsErr) {
        if (slotsErr) {
          console.error('[API] /api/logs/clear - slots error:', slotsErr);
          return res.status(500).json({ error: 'Failed to free slots' });
        }
        const slotsFreed = this.changes;
        
        console.log(`[API] Cleared ${logsCleared} parking logs and freed ${slotsFreed} parking slots`);
        res.status(200).json({ 
          status: 'cleared', 
          logsCleared: logsCleared,
          slotsFreed: slotsFreed
        });
      });
    });
  });

  // Slots status
  app.get('/api/slots', (req, res) => {
    db.all('SELECT id, type, occupied_by, updated_at FROM parking_slots ORDER BY id', [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows);
    });
  });

  // Pricing CRUD (simple get/set)
  app.get('/api/pricing', (req, res) => {
    db.all('SELECT vehicle_type, rate_per_minute FROM pricing', [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows);
    });
  });

  app.post('/api/pricing', (req, res) => {
    const { vehicle_type, rate_per_minute } = req.body || {};
    if (!vehicle_type || typeof rate_per_minute !== 'number') {
      return res.status(400).json({ error: 'vehicle_type and numeric rate_per_minute required' });
    }
    db.run(
      'INSERT INTO pricing (vehicle_type, rate_per_minute) VALUES (?, ?) ON CONFLICT(vehicle_type) DO UPDATE SET rate_per_minute = excluded.rate_per_minute',
      [vehicle_type, rate_per_minute],
      (err) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json({ status: 'ok', vehicle_type, rate_per_minute });
      }
    );
  });

  // Clear all pricing
  app.delete('/api/pricing/clear', (req, res) => {
    db.run('DELETE FROM pricing', [], function (err) {
      if (err) {
        console.error('[API] /api/pricing/clear error:', err);
        return res.status(500).json({ error: 'DB error' });
      }
      console.log(`[API] Cleared ${this.changes} pricing entries`);
      res.status(200).json({ status: 'cleared', count: this.changes });
    });
  });

  app.post('/api/register', (req, res) => {
    const { id, plate, owner_name, vehicle_type } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }
    db.run(
      'INSERT OR IGNORE INTO vehicles (id, plate, owner_name, vehicle_type) VALUES (?, ?, ?, ?)',
      [id, plate || null, owner_name || null, vehicle_type || 'car'],
      function (err) {
        if (err) {
          console.error('[API] /api/register error:', err);
          return res.status(500).json({ error: 'DB error' });
        }
        if (this.changes === 0) {
          return res.json({ status: 'exists', id });
        }
        return res.json({ status: 'registered', id });
      }
    );
  });

  app.post('/api/scan', (req, res) => {
    const { qr } = req.body || {};
    if (!qr) {
      return res.status(400).json({ error: 'Missing qr' });
    }
    const vehicleId = String(qr).trim();
    console.log(`[SCAN] Received QR for vehicle_id="${vehicleId}"`);

    db.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId], (vehErr, vehicle) => {
      if (vehErr) {
        console.error('[API] Vehicle lookup error:', vehErr);
        return res.status(500).json({ error: 'DB error' });
      }
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not registered' });
      }

      db.get(
        'SELECT * FROM parking_logs WHERE vehicle_id = ? AND exit_time IS NULL ORDER BY entry_time DESC LIMIT 1',
        [vehicleId],
        (logErr, activeLog) => {
          if (logErr) {
            console.error('[API] Active log lookup error:', logErr);
            return res.status(500).json({ error: 'DB error' });
          }

          if (!activeLog) {
            // No active log -> create new entry and allocate slot
            const entryTime = new Date().toISOString();
            db.get('SELECT vehicle_type FROM vehicles WHERE id = ?', [vehicleId], (vtErr, vRow) => {
              if (vtErr) {
                console.error('[API] Vehicle type lookup error:', vtErr);
                return res.status(500).json({ error: 'DB error' });
              }
              const type = vRow?.vehicle_type || 'car';
              db.get('SELECT id FROM parking_slots WHERE type = ? AND occupied_by IS NULL ORDER BY id LIMIT 1', [type], (slErr, slot) => {
                if (slErr) {
                  console.error('[API] Slot lookup error:', slErr);
                  return res.status(500).json({ error: 'DB error' });
                }
                if (!slot) {
                  return res.status(409).json({ error: `No free ${type} slots available` });
                }
                const parkingSlot = slot.id;
                db.run('UPDATE parking_slots SET occupied_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [vehicleId, parkingSlot], (occErr) => {
                  if (occErr) {
                    console.error('[API] Occupy slot error:', occErr);
                    return res.status(500).json({ error: 'DB error' });
                  }
                  db.run(
                    'INSERT INTO parking_logs (vehicle_id, entry_time, parking_slot) VALUES (?, ?, ?)',
                    [vehicleId, entryTime, parkingSlot],
                    function (insErr) {
                      if (insErr) {
                        console.error('[API] Insert entry log error:', insErr);
                        return res.status(500).json({ error: 'DB error' });
                      }
                      console.log(`[SCAN] Entry logged for ${vehicleId} at ${entryTime} | Slot ${parkingSlot}`);
                      
                      // Trigger ESP32 entry sequence (gate + LED)
                      triggerEntry(vehicleId, type, parkingSlot).catch(err => {
                        console.error('[ESP32] Entry trigger failed:', err);
                      });
                      
                      return res.json({
                        status: 'entry',
                        vehicle_id: vehicleId,
                        entry_time: entryTime,
                        exit_time: null,
                        duration: null,
                        fee: null,
                        parking_slot: parkingSlot,
                      });
                    }
                  );
                });
              });
            });
          } else {
            // Active log exists -> close it
            const exitTime = new Date().toISOString();
            const durationMinutes = computeDurationMinutes(activeLog.entry_time, exitTime);
            // Get vehicle type rate
            db.get('SELECT vehicle_type FROM vehicles WHERE id = ?', [vehicleId], async (vErr, vRow) => {
              const type = vRow?.vehicle_type || 'car';
              const rate = await getRateForType(db, type);
              const fee = durationMinutes * rate;
              const slotId = activeLog.parking_slot || null;
              const finalize = () => {
                db.run(
                  'UPDATE parking_logs SET exit_time = ?, duration_minutes = ?, fee = ? WHERE id = ?',
                  [exitTime, durationMinutes, fee, activeLog.id],
                  function (updErr) {
                    if (updErr) {
                      console.error('[API] Update exit log error:', updErr);
                      return res.status(500).json({ error: 'DB error' });
                    }
                    console.log(`[SCAN] Exit logged for ${vehicleId} at ${exitTime} | Duration: ${durationMinutes} min | Rate: ₹${rate}/min | Fee: ₹${fee}${slotId ? ` | Freed slot ${slotId}` : ''}`);
                    
                    // Trigger ESP32 exit sequence (turn off LED + open gate)
                    if (slotId) {
                      triggerExit(vehicleId, slotId, fee).catch(err => {
                        console.error('[ESP32] Exit trigger failed:', err);
                      });
                    }
                    
                    return res.json({
                      status: 'exit',
                      vehicle_id: vehicleId,
                      entry_time: activeLog.entry_time,
                      exit_time: exitTime,
                      duration: durationMinutes,
                      fee,
                      parking_slot: slotId,
                    });
                  }
                );
              };
              if (slotId) {
                db.run('UPDATE parking_slots SET occupied_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [slotId], (frErr) => {
                  if (frErr) {
                    console.error('[API] Free slot error:', frErr);
                  }
                  finalize();
                });
              } else {
                finalize();
              }
            });
          }
        }
      );
    });
  });
}

(async () => {
  try {
    const db = await initializeDatabase();
    await seedSampleVehicle(db);
    // Seed default pricing if missing
    db.run('INSERT OR IGNORE INTO pricing (vehicle_type, rate_per_minute) VALUES (?, ?)', ['car', 2]);
    db.run('INSERT OR IGNORE INTO pricing (vehicle_type, rate_per_minute) VALUES (?, ?)', ['bike', 1]);
    db.run('INSERT OR IGNORE INTO pricing (vehicle_type, rate_per_minute) VALUES (?, ?)', ['truck', 3]);
    createApi(db);
    app.listen(PORT, () => {
      console.log(`[SERVER] Smart Parking running at http://localhost:${PORT}`);
      console.log('[INFO] Open the URL in a browser to use the webcam scanner.');
    });
  } catch (err) {
    console.error('[FATAL] Failed to initialize application:', err);
    process.exit(1);
  }
})();


