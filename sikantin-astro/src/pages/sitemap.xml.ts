import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const siteUrl = 'https://sikantin.ndhistira.my.id';
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim();
const tenantPageSize = 1000;

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

function getErrorDetails(error: unknown): { code?: string; message: string } {
	if (!error || typeof error !== 'object') return { message: String(error) };
	const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
	const message = 'message' in error && typeof error.message === 'string'
		? error.message
		: 'Penyebab tidak diketahui.';
	return { code, message };
}

function isMissingUpdatedAtColumn(error: unknown): boolean {
	const { code, message } = getErrorDetails(error);
	return code === '42703'
		|| code === 'PGRST204'
		|| /updated_at.*(not found|does not exist|schema cache)|column .*updated_at/i.test(message);
}

function queryErrorMessage(error: unknown): string {
	const { code, message } = getErrorDetails(error);
	if (code === '42501' || code === 'PGRST301') {
		return 'Supabase menolak akses publik ke tabel tenants. Pastikan policy SELECT untuk anon dan GRANT SELECT sudah diterapkan.';
	}
	return `Query Supabase gagal${code ? ` (${code})` : ''}: ${message}`;
}

export const GET: APIRoute = async () => {
	if (!supabaseUrl || !supabaseAnonKey) {
		return new Response(
			'Konfigurasi Supabase belum lengkap. Atur PUBLIC_SUPABASE_URL dan PUBLIC_SUPABASE_ANON_KEY di environment Vercel.',
			{ status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
		);
	}

	const tenants: Array<{ slug: string | null; updated_at?: string | null }> = [];
	try {
		const supabase = createClient(supabaseUrl, supabaseAnonKey, {
			auth: { autoRefreshToken: false, persistSession: false },
		});
		let from = 0;
		let includeUpdatedAt = true;
		while (true) {
			const result = includeUpdatedAt
				? await supabase
					.from('tenants')
					.select('slug, updated_at')
					.not('slug', 'is', null)
					.order('slug')
					.range(from, from + tenantPageSize - 1)
				: await supabase
					.from('tenants')
					.select('slug')
					.not('slug', 'is', null)
					.order('slug')
					.range(from, from + tenantPageSize - 1);

			if (result.error && includeUpdatedAt && isMissingUpdatedAtColumn(result.error)) {
				includeUpdatedAt = false;
				console.warn('Kolom tenants.updated_at tidak tersedia; sitemap dibuat tanpa lastmod.');
				from = 0;
				tenants.length = 0;
				continue;
			}
			if (result.error) throw result.error;

			const page = result.data ?? [];
			tenants.push(...page);
			if (page.length < tenantPageSize) break;
			from += tenantPageSize;
		}
	} catch (error) {
		const detail = queryErrorMessage(error);
		console.error('Gagal membuat sitemap tenant:', detail, error);
		return new Response(`Gagal membuat sitemap tenant. ${detail}`, {
			status: 500,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' },
		});
	}

	const urls = [
		{ loc: `${siteUrl}/` },
		{ loc: `${siteUrl}/bantuan` },
		...tenants
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
