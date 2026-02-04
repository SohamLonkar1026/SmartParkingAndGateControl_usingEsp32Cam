import { useState } from 'react';
import { registerVehicle } from '../lib/api';

export default function Register() {
	const [driver_name, setDriver] = useState('');
	const [vehicle_number, setVehicle] = useState('');
	const [vehicle_type, setType] = useState<'car' | 'bike' | 'truck'>('car');
	const [qr, setQr] = useState<{ qr_code: string; qr_png_data_url: string } | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await registerVehicle({ driver_name, vehicle_number, vehicle_type });
			setQr({ qr_code: res.qr_code, qr_png_data_url: res.qr_png_data_url });
		} catch (err: any) {
			setError(err?.message || 'Registration failed');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div style={{ maxWidth: '600px' }}>
			<form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '24px' }}>
				<div>
					<label style={{ display: 'block', marginBottom: '4px', color: '#e2e8f0', fontSize: '14px' }}>Driver Name</label>
					<input 
						value={driver_name} 
						onChange={e => setDriver(e.target.value)} 
						style={{ 
							width: '100%', 
							border: '1px solid #1f2937', 
							borderRadius: '8px', 
							padding: '8px 12px',
							background: '#0b1220',
							color: '#e2e8f0'
						}} 
						required 
					/>
				</div>
				<div>
					<label style={{ display: 'block', marginBottom: '4px', color: '#e2e8f0', fontSize: '14px' }}>Vehicle Number</label>
					<input 
						value={vehicle_number} 
						onChange={e => setVehicle(e.target.value)} 
						style={{ 
							width: '100%', 
							border: '1px solid #1f2937', 
							borderRadius: '8px', 
							padding: '8px 12px',
							background: '#0b1220',
							color: '#e2e8f0'
						}} 
						required 
					/>
				</div>
				<div>
					<label style={{ display: 'block', marginBottom: '4px', color: '#e2e8f0', fontSize: '14px' }}>Vehicle Type</label>
					<select 
						value={vehicle_type} 
						onChange={e => setType(e.target.value as any)} 
						style={{ 
							width: '100%', 
							border: '1px solid #1f2937', 
							borderRadius: '8px', 
							padding: '8px 12px',
							background: '#0b1220',
							color: '#e2e8f0'
						}}
					>
						<option value="car">Car</option>
						<option value="bike">Bike</option>
						<option value="truck">Truck</option>
					</select>
				</div>
				<button 
					type="submit" 
					disabled={loading} 
					style={{ 
						background: loading ? '#4b5563' : '#2563eb', 
						color: 'white', 
						border: '0', 
						padding: '10px 16px', 
						borderRadius: '8px',
						cursor: loading ? 'not-allowed' : 'pointer'
					}}
				>
					{loading ? 'Registering...' : 'Register Vehicle'}
				</button>
				{error && <div style={{ color: '#ef4444', fontSize: '14px' }}>{error}</div>}
			</form>

			{qr && (
				<div style={{ marginTop: '24px', background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '24px' }}>
					<div style={{ marginBottom: '8px', fontWeight: '600', color: '#e2e8f0' }}>QR for: {qr.qr_code}</div>
					<img src={qr.qr_png_data_url} alt="QR Code" style={{ border: '1px solid #1f2937', display: 'inline-block', borderRadius: '8px' }} />
					<div style={{ marginTop: '8px' }}>
						<a href={qr.qr_png_data_url} download={`QR-${vehicle_number}.png`} style={{ color: '#93c5fd', textDecoration: 'none' }}>Download QR</a>
					</div>
				</div>
			)}
		</div>
	);
}


