const logsBody = document.getElementById('logsBody');
const refreshLogs = document.getElementById('refreshLogs');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchLogs() {
  try {
    const resp = await fetch('/api/logs');
    const rows = await resp.json();
    if (rows.length === 0) {
      logsBody.innerHTML = '<tr><td colspan="11">No logs found.</td></tr>';
      return;
    }
    logsBody.innerHTML = rows.map(r => {
      const entry = r.entry_time ? new Date(r.entry_time) : null;
      const exit = r.exit_time ? new Date(r.exit_time) : null;
      const entryDate = entry ? entry.toLocaleDateString() : '';
      const entryTime = entry ? entry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const exitDate = exit ? exit.toLocaleDateString() : '';
      const exitTime = exit ? exit.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return `
      <tr>
        <td>${escapeHtml(r.vehicle_id)}</td>
        <td>${escapeHtml(r.plate || '')}</td>
        <td>${escapeHtml(r.owner_name || '')}</td>
        <td>${escapeHtml(r.vehicle_type || '')}</td>
        <td>${escapeHtml(entryDate)}</td>
        <td>${escapeHtml(entryTime)}</td>
        <td>${escapeHtml(exitDate)}</td>
        <td>${escapeHtml(exitTime)}</td>
        <td>${escapeHtml(r.parking_slot || '')}</td>
        <td>${r.duration_minutes ?? ''}</td>
        <td>${r.fee ?? ''}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    logsBody.innerHTML = '<tr><td colspan="11">Failed to load logs</td></tr>';
  }
}

async function clearAllLogs() {
  try {
    const resp = await fetch('/api/logs/clear', {
      method: 'DELETE'
    });
    const data = await resp.json();
    if (resp.ok) {
      const message = `✅ Success!\n\n` +
        `📝 Logs cleared: ${data.logsCleared}\n` +
        `🅿️ Slots freed: ${data.slotsFreed}\n\n` +
        `All parking slots are now GREEN (Free)!`;
      alert(message);
      fetchLogs(); // Refresh the table
    } else {
      alert('❌ Failed to clear logs: ' + (data.error || 'Unknown error'));
    }
  } catch (e) {
    alert('❌ Network error while clearing logs');
    console.error('Clear logs error:', e);
  }
}

refreshLogs.addEventListener('click', fetchLogs);
fetchLogs();


