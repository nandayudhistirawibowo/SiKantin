// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	adapter: node({ mode: 'standalone' }),
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
	},
});
