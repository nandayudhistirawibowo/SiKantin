import { n as createComponent, r as __exportAll } from "./compiler_BOdqOS3r.mjs";
import { d as renderTemplate, f as maybeRenderHead, i as renderComponent, m as addAttribute } from "./server_B1Vq6yng.mjs";
import { n as logo_uym_default, r as renderScript, t as $$Layout } from "./Layout_DawDZcx9.mjs";
/* empty css                       */
// src/pages/tenant/login.astro
var login_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Login,
	file: () => $$file,
	url: () => $$url
});
var $$Login = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {
		"title": "Login Pemilik Tenant | SiKantin",
		"themeColor": "#172b40",
		"bodyClass": "login-screen flex min-h-screen items-center justify-center px-4 py-8 text-slate-100"
	}, { "default": async ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="w-full max-w-md rounded-[1.75rem] border border-white/15 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl sm:p-10"><a href="/" class="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-100/75 hover:text-white">← Kembali ke katalog</a><div class="mb-7 text-center"><img${addAttribute(logo_uym_default.src, "src")} alt="Logo Universitas Yatsi Madani" class="mx-auto mb-4 h-16 w-16 rounded-full bg-white p-1 shadow"><p class="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">SiKantin UYM</p><h1 class="mt-2 text-3xl font-extrabold">Login Pemilik Tenant</h1></div><form id="tenantLoginForm" class="space-y-5"><label class="block text-sm font-semibold" for="tenantEmail">Email akun<input id="tenantEmail" type="email" autocomplete="username" required class="login-input mt-2" placeholder="Email akun Supabase"></label><label class="block text-sm font-semibold" for="tenantPassword">Password<input id="tenantPassword" type="password" autocomplete="current-password" required class="login-input mt-2" placeholder="Masukkan password"></label><button id="tenantLoginButton" type="submit" class="w-full rounded-xl bg-blue-600 px-4 py-3 font-extrabold hover:bg-blue-500 disabled:opacity-60">Masuk ke Dashboard Tenant <span aria-hidden="true">→</span></button></form><p id="tenantLoginMessage" role="status" aria-live="polite" class="mt-4 hidden text-center text-sm font-bold"></p></main>${renderScript($$result, "D:/SiKantin V2/sikantin-astro/src/pages/tenant/login.astro?astro&type=script&index=0&lang.ts")}` })}`;
}, "D:/SiKantin V2/sikantin-astro/src/pages/tenant/login.astro", void 0);
var $$file = "D:/SiKantin V2/sikantin-astro/src/pages/tenant/login.astro";
var $$url = "/tenant/login";
// \0virtual:astro:page:src/pages/tenant/login@_@astro
var page = () => login_exports;
export { page };
