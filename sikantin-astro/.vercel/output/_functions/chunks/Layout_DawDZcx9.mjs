import { n as createComponent, t as createAstro } from "./compiler_BOdqOS3r.mjs";
import { c as renderSlot, d as renderTemplate, h as createRenderInstruction, m as addAttribute, p as renderHead } from "./server_B1Vq6yng.mjs";
import { t as createImageAsset } from "./image-asset_9P4BGFA9.mjs";
// node_modules/astro/dist/runtime/server/render/script.js
/**
* Relies on the `renderScript: true` compiler option
* @experimental
*/
async function renderScript(result, id) {
	const inlined = result.inlinedScripts.get(id);
	let content = "";
	if (inlined != null) {
		if (inlined) content = `<script type="module">${inlined}<\/script>`;
	} else {
		const resolved = await result.resolve(id);
		content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"><\/script>`;
	}
	return createRenderInstruction({
		type: "script",
		id,
		content
	});
}
// src/assets/favicon-uym.png
var favicon_uym_default = createImageAsset({
	"src": "/_astro/favicon-uym.CRmphoCj.png",
	"width": 516,
	"height": 483,
	"format": "png"
}, "D:/SiKantin V2/sikantin-astro/src/assets/favicon-uym.png", false);
// src/assets/logo-uym.png
var logo_uym_default = createImageAsset({
	"src": "/_astro/logo-uym.CUpRo727.png",
	"width": 1024,
	"height": 958,
	"format": "jpg"
}, "D:/SiKantin V2/sikantin-astro/src/assets/logo-uym.png", false);
// src/layouts/Layout.astro
createAstro("https://astro.build");
var $$Layout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Layout;
	const { title, themeColor = "#172b40", bodyClass = "", description = "SiKantin Universitas Yatsi Madani." } = Astro.props;
	return renderTemplate`<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color"${addAttribute(themeColor, "content")}><meta name="description"${addAttribute(description, "content")}><link rel="icon" type="image/png"${addAttribute(favicon_uym_default.src, "href")}><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"><title>${title}</title>${renderHead($$result)}</head><body${addAttribute(bodyClass, "class")}${addAttribute(logo_uym_default.src, "data-logo-url")}>${renderSlot($$result, $$slots["default"])}</body></html>`;
}, "D:/SiKantin V2/sikantin-astro/src/layouts/Layout.astro", void 0);
export { logo_uym_default as n, renderScript as r, $$Layout as t };
