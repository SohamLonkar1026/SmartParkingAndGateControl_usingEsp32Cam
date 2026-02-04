const priceType = document.getElementById('priceType');
const priceRate = document.getElementById('priceRate');
const savePrice = document.getElementById('savePrice');
const loadPrices = document.getElementById('loadPrices');
const pricingList = document.getElementById('pricingList');
const slotsGrid = document.getElementById('slotsGrid');
const slotsStatus = document.getElementById('slotsStatus');

savePrice.addEventListener('click', async () => {
  const vt = priceType.value;
  const rate = Number(priceRate.value);
  if (!vt || !Number.isFinite(rate)) {
    alert('Enter a valid rate');
    return;
  }
  try {
    const resp = await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_type: vt, rate_per_minute: rate })
    });
    await resp.json();
    await loadPricing();
  } catch (e) {
    alert('Failed to save rate');
  }
});

loadPrices.addEventListener('click', loadPricing);

async function loadPricing() {
  try {
    const resp = await fetch('/api/pricing');
    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      pricingList.textContent = 'No pricing loaded.';
    } else {
      pricingList.textContent = rows.map(r => `${r.vehicle_type}: ₹${r.rate_per_minute}/min`).join('\n');
    }
  } catch (e) {
    pricingList.textContent = 'Failed to load pricing.';
  }
}

async function clearAllPricing() {
  try {
    const resp = await fetch('/api/pricing/clear', {
      method: 'DELETE'
    });
    const data = await resp.json();
    if (resp.ok) {
      alert('✅ All pricing rates cleared successfully!');
      await loadPricing(); // Refresh the list
    } else {
      alert('❌ Failed to clear pricing: ' + (data.error || 'Unknown error'));
    }
  } catch (e) {
    alert('❌ Network error while clearing pricing');
    console.error('Clear pricing error:', e);
  }
}

loadPricing();

async function loadSlots() {
  try {
    const resp = await fetch('/api/slots');
    const rows = await resp.json();
    // Order in 3x3: t1 t2 t3 / b1 b2 b3 / c1 c2 c3
    const order = ['t1','t2','t3','b1','b2','b3','c1','c2','c3'];
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    slotsGrid.innerHTML = order.map(id => {
      const r = byId[id] || { id, type: id[0]==='t'?'truck':id[0]==='b'?'bike':'car', occupied_by: null };
      const occupied = !!r.occupied_by;
      const color = occupied ? '#ef4444' : '#10b981';
      const label = `${id.toUpperCase()}\n${r.type}${occupied ? `\nOccupied by ${r.occupied_by}` : '\nFree'}`;
      const icon = iconForType(r.type);
      return `<div style="border:1px solid #1f2937; border-radius:12px; padding:16px; background:#0b1220; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="background:${color}; width:14px; height:14px; border-radius:50%;"></div>
          <div>${icon}</div>
        </div>
        <div style="white-space:pre-wrap; font-size:14px; line-height:1.2;">${label}</div>
      </div>`;
    }).join('');
    slotsStatus.textContent = 'Live status loaded.';
  } catch (e) {
    slotsStatus.textContent = 'Failed to load slots.';
  }
}

loadSlots();
setInterval(loadSlots, 5000);

function iconForType(type) {
  if (type === 'truck') {
    return `<svg width="28" height="18" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="10" width="34" height="16" rx="2" fill="#60a5fa"/>
      <rect x="38" y="16" width="14" height="10" rx="2" fill="#93c5fd"/>
      <circle cx="16" cy="30" r="5" fill="#111827" stroke="#e5e7eb"/>
      <circle cx="44" cy="30" r="5" fill="#111827" stroke="#e5e7eb"/>
    </svg>`;
  }
  if (type === 'bike') {
    return `<svg width="28" height="18" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="28" r="6" stroke="#e5e7eb" fill="#111827"/>
      <circle cx="42" cy="28" r="6" stroke="#e5e7eb" fill="#111827"/>
      <path d="M18 28 L26 20 L32 20 L38 28" stroke="#93c5fd" stroke-width="2"/>
    </svg>`;
  }
  // car
  return `<svg width="28" height="18" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="14" width="40" height="10" rx="3" fill="#34d399"/>
    <rect x="16" y="12" width="16" height="6" rx="2" fill="#6ee7b7"/>
    <circle cx="20" cy="26" r="4" fill="#111827" stroke="#e5e7eb"/>
    <circle cx="36" cy="26" r="4" fill="#111827" stroke="#e5e7eb"/>
  </svg>`;
}


