const vehiclesBody = document.getElementById('vehiclesBody');
const regId = document.getElementById('regId');
const regPlate = document.getElementById('regPlate');
const regOwner = document.getElementById('regOwner');
const regType = document.getElementById('regType');
const regBtn = document.getElementById('regBtn');
const regStatus = document.getElementById('regStatus');
const refreshVehicles = document.getElementById('refreshVehicles');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function fetchVehicles() {
  try {
    const resp = await fetch('/api/vehicles');
    const rows = await resp.json();
    vehiclesBody.innerHTML = rows.map(r => `
      <tr>
        <td>${escapeHtml(r.id)}</td>
        <td>${escapeHtml(r.plate || '')}</td>
        <td>${escapeHtml(r.owner_name || '')}</td>
        <td>${escapeHtml(r.vehicle_type || '')}</td>
        <td>${escapeHtml(r.created_at || '')}</td>
        <td><button class="delete-btn secondary" data-id="${escapeHtml(r.id)}">Delete</button></td>
      </tr>
    `).join('');
  } catch (e) {
    vehiclesBody.innerHTML = '<tr><td colspan="6">Failed to load vehicles</td></tr>';
  }
}

regBtn.addEventListener('click', async () => {
  const id = (regId.value || '').trim();
  const plate = (regPlate.value || '').trim();
  const owner_name = (regOwner.value || '').trim();
  const vehicle_type = regType.value || 'car';
  if (!id) {
    regStatus.textContent = 'Please enter an id to register.';
    return;
  }
  regStatus.textContent = 'Registering...';
  try {
    const resp = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, plate, owner_name, vehicle_type }),
    });
    const data = await resp.json();
    regStatus.textContent = JSON.stringify(data);
    await fetchVehicles();
  } catch (e) {
    regStatus.textContent = 'Network error while registering vehicle';
  }
});

refreshVehicles.addEventListener('click', fetchVehicles);

fetchVehicles();

vehiclesBody.addEventListener('click', async (event) => {
  if (event.target.classList.contains('delete-btn')) {
    const vehicleId = event.target.dataset.id;
    if (!vehicleId) return;

    try {
      const resp = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
      });
      if (resp.ok) {
        await fetchVehicles();
      } else {
        const err = await resp.json();
        alert(`Failed to delete vehicle: ${err.error}`);
      }
    } catch (e) {
      alert('Network error while deleting vehicle.');
    }
  }
});


