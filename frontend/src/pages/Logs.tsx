import { useEffect, useState } from 'react';

type LogRow = {
  id: number;
  vehicle_id: string;
  plate: string;
  owner_name: string;
  vehicle_type: string;
  parking_slot: string;
  entry_time: string;
  exit_time: string | null;
  duration_minutes: number | null;
  fee: number | null;
};

export default function Logs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/logs');
      if (!res.ok) throw new Error('Failed to load logs');
      const rows = await res.json();
      setLogs(rows);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function clearAllLogs() {
    if (!confirm('⚠️ Delete ALL entry/exit logs? This cannot be undone!')) return;
    
    try {
      const res = await fetch('http://localhost:3000/api/logs/clear', {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        const message = `✅ Success!\n\n` +
          `📝 Logs cleared: ${data.logsCleared}\n` +
          `🅿️ Slots freed: ${data.slotsFreed}\n\n` +
          `All parking slots are now GREEN (Free)!`;
        alert(message);
        fetchLogs();
      } else {
        alert('❌ Failed to clear logs: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Network error while clearing logs');
      console.error('Clear logs error:', err);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  function formatDate(dateString: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  }

  function formatTime(dateString: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}>
      <header style={{ padding: '16px 24px', background: '#111827', borderBottom: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Entry/Exit Logs</h2>
          <div>
            <label htmlFor="navSelect" style={{ marginRight: '6px', color: '#93c5fd' }}>Navigate:</label>
            <select 
              id="navSelect" 
              style={{ background: '#0b1220', color: '#e2e8f0', border: '1px solid #1f2937', padding: '6px 10px', borderRadius: '8px' }}
              onChange={(e) => {
                if (e.target.value === '/') window.location.href = '/';
                else if (e.target.value === '/register') window.location.href = '/register';
                else if (e.target.value === '/logs') window.location.href = '/logs';
              }}
            >
              <option value="/">Scanner</option>
              <option value="/register">Registered Vehicles</option>
              <option value="/logs" selected>Entry/Exit Logs</option>
            </select>
          </div>
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
        <section style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', justifyContent: 'space-between' }}>
            <button 
              onClick={fetchLogs}
              disabled={loading}
              style={{ 
                background: loading ? '#4b5563' : '#374151', 
                color: 'white', 
                border: '0', 
                padding: '10px 14px', 
                borderRadius: '8px', 
                cursor: loading ? 'not-allowed' : 'pointer' 
              }}
            >
              {loading ? 'Loading...' : 'Refresh Logs'}
            </button>
            <button 
              onClick={clearAllLogs}
              style={{ background: '#dc2626', color: 'white', border: '0', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}
            >
              🗑️ Clear All Logs
            </button>
          </div>

          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Vehicle QR ID</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Number Plate</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Owner Name</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Vehicle Type</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Entry Date</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Entry Time</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Exit Date</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Exit Time</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Slot</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Duration (min)</th>
                  <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937', color: '#93c5fd' }}>Fee (₹)</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                      {loading ? 'Loading logs...' : 'No logs found.'}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{log.vehicle_id}</td>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{log.plate || ''}</td>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{log.owner_name || ''}</td>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{log.vehicle_type || ''}</td>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{formatDate(log.entry_time)}</td>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{formatTime(log.entry_time)}</td>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{formatDate(log.exit_time || '')}</td>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{formatTime(log.exit_time || '')}</td>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{log.parking_slot || ''}</td>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{log.duration_minutes ?? ''}</td>
                      <td style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid #1f2937' }}>{log.fee ?? ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
