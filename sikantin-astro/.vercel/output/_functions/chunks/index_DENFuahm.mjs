import { n as createComponent, r as __exportAll, t as createAstro } from "./compiler_BOdqOS3r.mjs";
// src/pages/admin/index.astro
var admin_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Index = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	return Astro.redirect("/admin/login");
}, "D:/SiKantin V2/sikantin-astro/src/pages/admin/index.astro", void 0);
var $$file = "D:/SiKantin V2/sikantin-astro/src/pages/admin/index.astro";
var $$url = "/admin";
// \0virtual:astro:page:src/pages/admin/index@_@astro
var page = () => admin_exports;
export { page };
