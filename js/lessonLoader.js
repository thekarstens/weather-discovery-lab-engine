// lessonLoader.js (config-driven)
// Loads lesson.json from the data-pack repo based on ?lesson=... query param.

export function getLessonIdFromURL(defaultId="derecho-2022") {
  const params = new URLSearchParams(window.location.search);
  return params.get("lesson") || defaultId;
}

export async function loadLessonConfig({ dataPackBase, lessonId }) {
  const base = dataPackBase.endsWith("/") ? dataPackBase : (dataPackBase + "/");
  const url = `${base}lessons/${lessonId}/lesson.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load lesson config: ${url} (${res.status})`);
  const cfg = await res.json();
  cfg._resolved = {
    lessonId,
    dataPackBase: base,
    lessonBase: `${base}lessons/${lessonId}/`
  };
  return cfg;
}

export function formatZToLocal(zIso, tz) {
  try {
    const d = new Date(zIso);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz || "UTC",
      year: "numeric", month: "short", day: "2-digit",
      hour: "numeric", minute: "2-digit"
    }).format(d);
  } catch(e) {
    return zIso;
  }
}

export function buildUrlFromPattern(pattern, dt) {
  // pattern tokens: {YYYY}{MM}{DD}{HH}{mm}
  const pad2 = (n)=> String(n).padStart(2,"0");
  const y = dt.getUTCFullYear();
  const mo = pad2(dt.getUTCMonth()+1);
  const da = pad2(dt.getUTCDate());
  const hh = pad2(dt.getUTCHours());
  const mi = pad2(dt.getUTCMinutes());
  return pattern
    .replaceAll("{YYYY}", String(y))
    .replaceAll("{MM}", mo)
    .replaceAll("{DD}", da)
    .replaceAll("{HH}", hh)
    .replaceAll("{mm}", mi);
}
