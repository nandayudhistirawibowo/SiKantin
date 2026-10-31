import type { APIRoute } from 'astro';
import { supabaseServer } from '../lib/supabase-server.js';

const siteUrl = 'https://sikantin.ndhistira.my.id';

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function formatLastModified(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const timestamp = Date.parse(value);
	return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export const GET: APIRoute = async () => {
	const { data: tenants, error } = await supabaseServer
		.from('tenants')
		.select('slug, updated_at')
		.not('slug', 'is', null)
		.order('slug');

	if (error) {
		console.error('Gagal membuat sitemap tenant:', error.message);
		return new Response('Gagal membuat sitemap.', {
			status: 500,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
		});
	}

	const urls = [
		{ loc: `${siteUrl}/` },
		{ loc: `${siteUrl}/cek-pesanan` },
		...(tenants ?? [])
			.filter((tenant) => typeof tenant.slug === 'string' && tenant.slug.trim())
			.map((tenant) => ({
				loc: `${siteUrl}/tenant/${encodeURIComponent(tenant.slug)}`,
				lastmod: formatLastModified(tenant.updated_at),
			})),
	];
	const entries = urls.map(({ loc, lastmod }) =>
		[
			'  <url>',
			`    <loc>${escapeXml(loc)}</loc>`,
			...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
			'  </url>',
		].join('\n')
	);
	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...entries,
		'</urlset>',
	].join('\n');

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
