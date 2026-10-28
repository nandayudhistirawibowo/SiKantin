import { n as createComponent, r as __exportAll, t as createAstro } from "./compiler_BOdqOS3r.mjs";
// src/pages/login.astro
var login_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Login,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Login = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Login;
	return Astro.redirect("/");
}, "D:/SiKantin V2/sikantin-astro/src/pages/login.astro", void 0);
var $$file = "D:/SiKantin V2/sikantin-astro/src/pages/login.astro";
var $$url = "/login";
// \0virtual:astro:page:src/pages/login@_@astro
var page = () => login_exports;
export { page };
