// js/lessonLoader.js
(function () {
  function qs(name) {
    try { return new URLSearchParams(window.location.search).get(name); }
    catch (e) { return null; }
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function fmtParts(d) {
    return {
      YYYY: d.getUTCFullYear(),
      MM: pad2(d.getUTCMonth() + 1),
      DD: pad2(d.getUTCDate()),
      HH: pad2(d.getUTCHours()),
      mm: pad2(d.getUTCMinutes())
    };
  }

  function applyPattern(pattern, dUtc) {
    const p = fmtParts(dUtc);
    return pattern
      .replaceAll("{YYYY}", String(p.YYYY))
      .replaceAll("{MM}", p.MM)
      .replaceAll("{DD}", p.DD)
      .replaceAll("{HH}", p.HH)
      .replaceAll("{mm}", p.mm);
  }

  async function fetchJson(url) {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error("Fetch failed: " + r.status + " " + url);
    return await r.json();
  }

  // IMPORTANT: set this once and never duplicate index files again.
  // You can move this into a manifest later; for now keep it simple.
  const LESSON_URLS = {
    "derecho-2022": "https://YOURNAME.github.io/wdl-data-derecho-2022/lesson.json"
  };

  // Expose a tiny API your existing app code can call
  window.WDL = window.WDL || {};
  window.WDL.loadLessonConfig = async function () {
    const lessonId = qs("lesson");
    if (!lessonId) return null;

    const lessonUrl = LESSON_URLS[lessonId];
    if (!lessonUrl) throw new Error("Unknown lesson: " + lessonId);

    const cfg = await fetchJson(lessonUrl);

    // helpers for the rest of your app:
    cfg._resolve = function (relativeUrl) {
      // resolve relative to the lesson.json directory
      const base = lessonUrl.substring(0, lessonUrl.lastIndexOf("/") + 1);
      return new URL(relativeUrl, base).toString();
    };
    cfg._patternUrl = function (pattern, dUtc) {
      return cfg._resolve(applyPattern(pattern, dUtc));
    };

    return cfg;
  };
})();
