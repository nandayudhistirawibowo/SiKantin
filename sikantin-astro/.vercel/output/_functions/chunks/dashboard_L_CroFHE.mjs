import { n as createComponent, r as __exportAll, t as createAstro } from "./compiler_BOdqOS3r.mjs";
// src/pages/dashboard.astro
var dashboard_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Dashboard,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Dashboard = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Dashboard;
	return Astro.redirect("/");
}, "D:/SiKantin V2/sikantin-astro/src/pages/dashboard.astro", void 0);
var $$file = "D:/SiKantin V2/sikantin-astro/src/pages/dashboard.astro";
var $$url = "/dashboard";
// \0virtual:astro:page:src/pages/dashboard@_@astro
var page = () => dashboard_exports;
export { page };
