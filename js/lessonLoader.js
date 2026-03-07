(function () {
  function getLessonId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("lesson") || "";
  }

  async function loadLessonConfig(lessonId) {
    if (!lessonId) return null;

    const url = `./lessons/${lessonId}/lesson.json?v=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Lesson config HTTP ${res.status}: ${url}`);
    return await res.json();
  }

  window.lessonLoader = { loadLessonConfig };

  window.addEventListener("DOMContentLoaded", async () => {
    const lessonId = getLessonId();
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
