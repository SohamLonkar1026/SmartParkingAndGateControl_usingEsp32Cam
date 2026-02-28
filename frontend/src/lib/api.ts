const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3000/api');

export async function getDashboard() {
	const res = await fetch(`${API_BASE}/dashboard`);
	if (!res.ok) throw new Error('Failed to load dashboard');
	const data = await res.json();

	// Transform backend data to match frontend expectations
	const transformedSpots = data.spots.map((spot: any) => ({
		...spot,
		status: spot.status === 'occupied' ? 'occupied' : 'available',
		current_vehicle: spot.current_vehicle || null
	}));

	return {
		...data,
		spots: transformedSpots
	};
}

export async function registerVehicle(input: { driver_name: string; vehicle_number: string; vehicle_type: 'car' | 'bike' | 'truck'; }) {
	const res = await fetch(`${API_BASE}/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}


