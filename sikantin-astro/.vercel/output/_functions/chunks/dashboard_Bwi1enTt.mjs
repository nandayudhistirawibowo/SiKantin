import { n as createComponent, r as __exportAll, t as createAstro } from "./compiler_BOdqOS3r.mjs";
import { t as supabaseServer } from "./supabase-server_BHQsFtb_.mjs";
// src/pages/tenant/[slug]/dashboard.astro
var dashboard_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Dashboard,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Dashboard = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Dashboard;
	const slug = Astro.params.slug || "";
	const { data: tenant, error } = await supabaseServer.from("tenants").select("id").eq("slug", slug).maybeSingle();
	if (error) {
		console.error("Gagal mencari tenant untuk dashboard:", error.message);
		Astro.response.status = 500;
		return Astro.rewrite("/tenant-dashboard");
	}
	if (!tenant) {
		Astro.response.status = 404;
		return Astro.rewrite("/tenant-dashboard");
	}
	return Astro.rewrite("/tenant-dashboard");
}, "D:/SiKantin V2/sikantin-astro/src/pages/tenant/[slug]/dashboard.astro", void 0);
var $$file = "D:/SiKantin V2/sikantin-astro/src/pages/tenant/[slug]/dashboard.astro";
var $$url = "/tenant/[slug]/dashboard";
// \0virtual:astro:page:src/pages/tenant/[slug]/dashboard@_@astro
var page = () => dashboard_exports;
export { page };
