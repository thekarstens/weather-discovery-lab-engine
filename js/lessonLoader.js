// lessonLoader.js (engine-compatible, data-pack first)
//
// - Loads lesson.json from data pack using jsDelivr by default (no GitHub Pages needed)
// - Allows override via ?dataBase=...
// - Sets cfg.dataBase and cfg._resolved.lessonBase
// - Flattens cfg.time -> cfg.startZ/cfg.endZ/cfg.stepHours/cfg.stepMinutes for legacy engine compatibility
// - Adds helpers to resolve relative asset URLs + expand token patterns

export function getLessonIdFromURL(defaultId = "derecho-2022") {
  const params = new URLSearchParams(window.location.search);
  return params.get("lesson") || defaultId;
}

function normalizeBase(base) {
  if (!base) return "";
  return base.endsWith("/") ? base : base + "/";
}

function getDataBaseOverride() {
  const params = new URLSearchParams(window.location.search);
  // allow either name
  return params.get("dataBase") || params.get("packBase") || params.get("data") || "";
}

function isAbsoluteUrl(u) {
  return /^https?:\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:");
}

function safeJoin(base, path) {
  base = normalizeBase(base);
  if (!path) return base;
  // avoid double slashes
  if (path.startsWith("/")) path = path.slice(1);
  return base + path;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load lesson config: ${url} (${res.status})`);
  // If GitHub ever returns HTML (404 page), this prevents "Unexpected end of JSON input" confusion
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON at ${url}: ${e.message}`);
  }
}

function applyLegacyShims(cfg) {
  // Legacy engine expects top-level startZ/endZ/stepHours, etc.
  const t = cfg.time || {};
  if (!cfg.startZ && t.startZ) cfg.startZ = t.startZ;
  if (!cfg.endZ && t.endZ) cfg.endZ = t.endZ;

  // Prefer minute stepping if provided
  if (cfg.stepMinutes == null && t.stepMinutes != null) cfg.stepMinutes = t.stepMinutes;
  if (cfg.roundMinutes == null && t.roundMinutes != null) cfg.roundMinutes = t.roundMinutes;

  // Keep stepHours for older code paths if only hours are provided
  if (cfg.stepHours == null && t.stepHours != null) cfg.stepHours = t.stepHours;

  if (!cfg.displayTimezone && t.displayTimezone) cfg.displayTimezone = t.displayTimezone;

  return cfg;
}

export async function loadLessonConfig({ dataPackBase, lessonId }) {
  const override = getDataBaseOverride();

  // Default: jsDelivr (works even if data repo GitHub Pages is off)
  const DEFAULT_PACK_BASE =
    "https://cdn.jsdelivr.net/gh/thekarstens/wdl-data-derecho-2022@main/";

  const base = normalizeBase(override || dataPackBase || DEFAULT_PACK_BASE);

  // Support two styles of base:
  //  A) base points to repo root (DEFAULT) -> lesson at /lessons/<id>/lesson.json
  //  B) base points directly to /lessons/ -> lesson at /<id>/lesson.json
  const looksLikeLessonsRoot = /\/lessons\/$/i.test(base);

  const lessonJsonUrl = looksLikeLessonsRoot
    ? `${base}${lessonId}/lesson.json?v=${Date.now()}`
    : `${base}lessons/${lessonId}/lesson.json?v=${Date.now()}`;

  const cfg = await fetchJson(lessonJsonUrl);

  // Resolve the lesson base folder (where relative assets should come from)
  const lessonBase = looksLikeLessonsRoot
    ? `${base}${lessonId}/`
    : `${base}lessons/${lessonId}/`;

  cfg._resolved = {
    lessonId,
    dataPackBase: base,
    lessonBase,
    lessonJsonUrl
  };

  // If lesson.json doesn't define dataBase, set it so every relative path resolves correctly
  if (!cfg.dataBase) cfg.dataBase = lessonBase;

  // Compatibility for your existing full engine UI
  applyLegacyShims(cfg);

  return cfg;
}

export function resolveAssetUrl(cfg, urlOrPath) {
  if (!urlOrPath) return "";
  if (isAbsoluteUrl(urlOrPath)) return urlOrPath;

  // Use GitHub Pages base (cfg.database) for binary assets (png/jpg/webp/gif),
  // because CDN proxies (jsDelivr) can sometimes block or 403 large/binary fetches.
  const isBinary = /\.(png|jpg|jpeg|webp|gif)$/i.test(urlOrPath);

  const base =
    (isBinary && (cfg?.database || cfg?.dataBaseBinary)) ? (cfg.database || cfg.dataBaseBinary) :
    (cfg?.dataBase || cfg?._resolved?.lessonBase || "");

  return safeJoin(base, urlOrPath);
}

export function formatZToLocal(zIso, tz) {
  try {
    const d = new Date(zIso);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz || "UTC",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit"
    }).format(d);
  } catch (e) {
    return zIso;
  }
}

export function buildUrlFromPattern(pattern, dt, cfg = null) {
  // pattern tokens: {YYYY}{MM}{DD}{HH}{mm}
  const pad2 = (n) => String(n).padStart(2, "0");
  const y = dt.getUTCFullYear();
  const mo = pad2(dt.getUTCMonth() + 1);
  const da = pad2(dt.getUTCDate());
  const hh = pad2(dt.getUTCHours());
  const mi = pad2(dt.getUTCMinutes());

  let out = pattern
    .replaceAll("{YYYY}", String(y))
    .replaceAll("{MM}", mo)
    .replaceAll("{DD}", da)
    .replaceAll("{HH}", hh)
    .replaceAll("{mm}", mi);

  // If the pattern is relative, resolve it off dataBase/lessonBase
  if (cfg) out = resolveAssetUrl(cfg, out);
  return out;
}
