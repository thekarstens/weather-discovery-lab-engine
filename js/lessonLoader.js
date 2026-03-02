(function () {
  function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || "";
  }

  function normalizeBase(base) {
    if (!base) return "";
    return base.endsWith("/") ? base : base + "/";
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Lesson config HTTP ${res.status}: ${url}`);
    return await res.json();
  }

  function deriveBaseFromUrl(url) {
    // base is the directory containing the lesson.json
    return normalizeBase(new URL("./", url).toString());
  }

  async function loadLessonConfig(lessonId) {
    if (!lessonId) return null;

    // Default data pack base (can override with ?packBase=... later)
    const DEFAULT_PACK_BASE =
      "https://cdn.jsdelivr.net/gh/thekarstens/wdl-data-derecho-2022@main/lessons/";

    const packBase = normalizeBase(getParam("packBase") || DEFAULT_PACK_BASE);

    // Primary candidate: data pack
    const packUrl = `${packBase}${lessonId}/lesson.json?v=${Date.now()}`;

    // Fallback candidate: local engine lessons (nice for offline/dev)
    const localUrl = `./lessons/${lessonId}/lesson.json?v=${Date.now()}`;

    let cfg = null;
    let sourceUrl = "";

    try {
      cfg = await fetchJson(packUrl);
      sourceUrl = packUrl;
    } catch (e) {
      console.warn("Pack lesson.json failed, falling back to local:", e);
      cfg = await fetchJson(localUrl);
      sourceUrl = localUrl;
    }

    // Provide a robust base URL for resolving relative assets
    cfg.__lessonId = lessonId;
    cfg.__sourceUrl = sourceUrl;
    cfg.__baseUrl = deriveBaseFromUrl(sourceUrl);

    // If lesson.json doesn't specify dataBase, default it to the lesson's folder
    // so existing relative paths keep working.
    if (!cfg.dataBase) cfg.dataBase = cfg.__baseUrl;

    return cfg;
  }

  window.lessonLoader = { loadLessonConfig };

  window.addEventListener("DOMContentLoaded", async () => {
    const lessonId = getParam("lesson");
    if (!lessonId) return;

    try {
      const cfg = await loadLessonConfig(lessonId);
      console.log("✅ Loaded lesson:", lessonId, cfg);
      window.__LESSON_CFG__ = cfg;
    } catch (e) {
      console.error("❌ Lesson load failed:", e);
    }
  });
})();
