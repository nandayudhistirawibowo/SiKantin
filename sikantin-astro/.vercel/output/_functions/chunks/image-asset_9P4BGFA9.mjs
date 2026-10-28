// node_modules/astro/dist/core/render-scope/scope.js
/**
* The channel is a write-once immutable *conduit* shared so every compiled copy
* of this module resolves the same AsyncLocalStorage instance (the prerender
* runtime is bundled, so the build orchestrator and the bundled runtime hold
* different module instances of this file); all mutable per-render state lives
* in stores reachable only through async execution context. Never installed in
* dev or production SSR runtimes. It holds no state, so it stays installed across builds.
*/
var SCOPE_KEY = Symbol.for("astro:render-scope");
/** The installed render scope, or `undefined` when none was installed. */
function getInstalledRenderScope() {
	return globalThis[SCOPE_KEY];
}
/** The current render's collectors store, or `undefined` when not collecting. */
function getRenderCollectors() {
	return getInstalledRenderScope()?.getStore();
}
// node_modules/astro/dist/core/render-scope/record.js
function isCollectingStaticImages() {
	return getRenderCollectors()?.staticImages !== void 0;
}
/** Keeps repeats; `collectPrerenderMetadata()` dedupes them. */
function recordStaticImage(image) {
	getRenderCollectors()?.staticImages?.push(image);
}
/** Records an untransformed image reference against the active render. */
function recordReferencedImage(fsPath) {
	getRenderCollectors()?.referencedImages?.add(fsPath);
}
// node_modules/astro/dist/assets/utils/image-asset.js
var RAW_SRC = Symbol.for("astro:image-asset:raw-src");
function createImageAsset(metadata, fsPath, track) {
	const asset = { ...metadata };
	Object.defineProperty(asset, "fsPath", {
		value: fsPath,
		enumerable: false
	});
	if (track) {
		let src = metadata.src;
		Object.defineProperty(asset, RAW_SRC, { get: () => src });
		Object.defineProperty(asset, "src", {
			enumerable: true,
			configurable: true,
			get() {
				recordReferencedImage(fsPath);
				return src;
			},
			set(value) {
				src = value;
			}
		});
	} else Object.defineProperty(asset, RAW_SRC, { get: () => asset.src });
	return asset;
}
function getUntrackedImage(image) {
	if (typeof image !== "object" || image === null || !(RAW_SRC in image)) return image;
	const asset = image;
	const copy = {};
	for (const key of Object.keys(asset)) copy[key] = key === "src" ? asset[RAW_SRC] : asset[key];
	Object.defineProperty(copy, "fsPath", {
		value: asset.fsPath,
		enumerable: false
	});
	return copy;
}
export { recordStaticImage as i, getUntrackedImage as n, isCollectingStaticImages as r, createImageAsset as t };
