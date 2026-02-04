import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getDashboard } from '../lib/api';

type Spot = { id: number; spot_name: string; vehicle_type: 'car' | 'bike' | 'truck'; status: 'available' | 'occupied'; current_vehicle: number | null };
type LogRow = { id: number; driver_name: string; vehicle_number: string; vehicle_type: string; spot_name: string; entry_time: string; exit_time: string | null };

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export default function Dashboard() {
	const [spots, setSpots] = useState<Spot[]>([]);
	const [logs, setLogs] = useState<LogRow[]>([]);
	const [stats, setStats] = useState<{ cars_available: number; bikes_available: number; trucks_available: number }>({ cars_available: 0, bikes_available: 0, trucks_available: 0 });
	const [filter, setFilter] = useState('');

	const socket: Socket | null = useMemo(() => io(SOCKET_URL, { transports: ['websocket'] }), []);

	async function refresh() {
		const data = await getDashboard();
		setSpots(data.spots);
		setLogs(data.logs);
		setStats(data.stats);
	}

	useEffect(() => {
		refresh();
		const id = setInterval(refresh, 5000);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		if (!socket) return;
		socket.on('parking:update', () => {
			refresh();
		});
		return () => {
			socket.disconnect();
		};
	}, [socket]);

	const filteredLogs = logs.filter(l =>
		(filter.trim() === '') ||
		l.driver_name.toLowerCase().includes(filter.toLowerCase()) ||
		l.vehicle_number.toLowerCase().includes(filter.toLowerCase())
	);

	function renderSpots(type: 'car' | 'bike' | 'truck') {
		const typeSpots = spots.filter(s => s.vehicle_type === type);
		return (
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
				{typeSpots.map(s => (
					<div key={s.id} style={{ 
						padding: '12px', 
						textAlign: 'center', 
						borderRadius: '8px', 
						border: `1px solid ${s.status === 'occupied' ? '#dc2626' : '#10b981'}`,
						background: s.status === 'occupied' ? '#7f1d1d' : '#064e3b'
					}}>
						<div style={{ fontWeight: '600', marginBottom: '4px' }}>{s.spot_name}</div>
						<div style={{ fontSize: '12px', color: '#9ca3af' }}>
							{s.status === 'occupied' ? 'Occupied' : 'Available'}
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
			<section>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
					<div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px' }}>
						<div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Cars Available</div>
						<div style={{ fontSize: '24px', fontWeight: '600', color: '#e2e8f0' }}>{stats.cars_available}</div>
					</div>
					<div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px' }}>
						<div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Bikes Available</div>
						<div style={{ fontSize: '24px', fontWeight: '600', color: '#e2e8f0' }}>{stats.bikes_available}</div>
					</div>
					<div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px' }}>
						<div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Trucks Available</div>
						<div style={{ fontSize: '24px', fontWeight: '600', color: '#e2e8f0' }}>{stats.trucks_available}</div>
					</div>
				</div>
			</section>

			<section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
				<h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#e2e8f0' }}>Parking Spots</h2>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
					<div>
						<h3 style={{ fontWeight: '500', marginBottom: '8px', color: '#e2e8f0' }}>Cars</h3>
						{renderSpots('car')}
					</div>
					<div>
						<h3 style={{ fontWeight: '500', marginBottom: '8px', color: '#e2e8f0' }}>Bikes</h3>
						{renderSpots('bike')}
					</div>
					<div>
						<h3 style={{ fontWeight: '500', marginBottom: '8px', color: '#e2e8f0' }}>Trucks</h3>
						{renderSpots('truck')}
					</div>
				</div>
			</section>

			<section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#e2e8f0' }}>Recent Logs</h2>
					<input 
						value={filter} 
						onChange={e => setFilter(e.target.value)} 
						placeholder="Search driver or vehicle" 
						style={{ 
							border: '1px solid #1f2937', 
							borderRadius: '8px', 
							padding: '8px 12px', 
							fontSize: '14px',
							background: '#111827',
							color: '#e2e8f0'
						}} 
					/>
				</div>
				<div style={{ overflowX: 'auto', background: '#111827', border: '1px solid #1f2937', borderRadius: '12px' }}>
					<table style={{ width: '100%', borderCollapse: 'collapse' }}>
						<thead>
							<tr style={{ background: '#1f2937' }}>
								<th style={{ textAlign: 'left', padding: '12px', color: '#93c5fd', borderBottom: '1px solid #374151' }}>Driver</th>
								<th style={{ textAlign: 'left', padding: '12px', color: '#93c5fd', borderBottom: '1px solid #374151' }}>Vehicle No</th>
								<th style={{ textAlign: 'left', padding: '12px', color: '#93c5fd', borderBottom: '1px solid #374151' }}>Type</th>
								<th style={{ textAlign: 'left', padding: '12px', color: '#93c5fd', borderBottom: '1px solid #374151' }}>Spot</th>
								<th style={{ textAlign: 'left', padding: '12px', color: '#93c5fd', borderBottom: '1px solid #374151' }}>Entry</th>
								<th style={{ textAlign: 'left', padding: '12px', color: '#93c5fd', borderBottom: '1px solid #374151' }}>Exit</th>
							</tr>
						</thead>
						<tbody>
							{filteredLogs.map((l) => (
								<tr key={l.id} style={{ borderBottom: '1px solid #1f2937' }}>
									<td style={{ padding: '12px', color: '#e2e8f0' }}>{l.driver_name}</td>
									<td style={{ padding: '12px', color: '#e2e8f0' }}>{l.vehicle_number}</td>
									<td style={{ padding: '12px', color: '#e2e8f0', textTransform: 'capitalize' }}>{l.vehicle_type}</td>
									<td style={{ padding: '12px', color: '#e2e8f0' }}>{l.spot_name}</td>
									<td style={{ padding: '12px', color: '#e2e8f0' }}>{new Date(l.entry_time).toLocaleString()}</td>
									<td style={{ padding: '12px', color: '#e2e8f0' }}>{l.exit_time ? new Date(l.exit_time).toLocaleString() : '-'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	);
}


