import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import './index.css';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import Logs from './pages/Logs';

function App() {
	return (
		<div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', margin: 0, background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
			<header style={{ padding: '16px 24px', background: '#111827', borderBottom: '1px solid #1f2937' }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
					<h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#e2e8f0' }}>Smart Parking</h1>
					<nav style={{ display: 'flex', gap: '16px' }}>
						<Link to="/" style={{ color: '#93c5fd', textDecoration: 'none' }}>Dashboard</Link>
						<Link to="/register" style={{ color: '#93c5fd', textDecoration: 'none' }}>Register Vehicle</Link>
						<Link to="/logs" style={{ color: '#93c5fd', textDecoration: 'none' }}>Logs</Link>
						<a href="http://localhost:3000" style={{ color: '#93c5fd', textDecoration: 'none' }}>Original UI</a>
					</nav>
				</div>
			</header>
			<main style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
				<Routes>
					<Route path="/" element={<Dashboard />} />
					<Route path="/register" element={<Register />} />
					<Route path="/logs" element={<Logs />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</main>
		</div>
	);
}

createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</React.StrictMode>
);


