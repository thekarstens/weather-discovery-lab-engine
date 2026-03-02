(function () {
  function getLessonId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("lesson") || "";
  }

  async function loadLessonConfig(lessonId) {
    if (!lessonId) return null;

    // IMPORTANT: correct path from site root
    const DATA_PACK_BASE = (new URLSearchParams(window.location.search)).get('data') || 'https://thekarstens.github.io/wdl-data-derecho-2022/';
    const base = DATA_PACK_BASE.endsWith('/') ? DATA_PACK_BASE : (DATA_PACK_BASE + '/');
    const url = `${base}lessons/${encodeURIComponent(lessonId)}/lesson.json?v=${Date.now()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Lesson config HTTP ${res.status}: ${url}`);
    const cfg = await res.json();
    // If lesson.json does not specify dataBase, default to the lesson folder in the data pack
    if (!cfg.dataBase) cfg.dataBase = `${base}lessons/${encodeURIComponent(lessonId)}/`;
    return cfg;
  }

  // expose for index.html to call if needed
  window.lessonLoader = { loadLessonConfig };

  // auto-load on page load
  window.addEventListener("DOMContentLoaded", async () => {
    const lessonId = getLessonId();
    if (!lessonId) return;

    try {
      const cfg = await loadLessonConfig(lessonId);
      console.log("✅ Loaded lesson:", lessonId, cfg);
      window.__LESSON_CFG__ = cfg; // your index can read from this
    } catch (e) {
      console.error("❌ Lesson load failed:", e);
    }
  });
})();
