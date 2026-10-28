// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	adapter: vercel(), // <-- Ganti adapter Node ke Vercel
	redirects: {
		'/index.html': '/',
		'/login.html': '/login',
		'/dashboard.html': '/dashboard',
		'/profile.html': '/profile',
		'/admin-dashboard.html': '/admin-dashboard',
		'/tenant-dashboard.html': '/tenant-dashboard',
		'/tenant-login.html': '/tenant/login',
	},
	vite: {
		plugins: [tailwindcss()],
		server: {
			allowedHosts: [
				'.trycloudflare.com',
				'.ngrok-free.dev',
				'localhost'
			]
		}
	},
});