(function () {
  var playBtn = document.getElementById("simPlayBtn");
  var pauseBtn = document.getElementById("simPauseBtn");
  var resetBtn = document.getElementById("simResetBtn");
  var playWrap = document.getElementById("playPauseWrap") || null;

  var storyPanel = document.getElementById("storyPanel");
  var hideGuideBtn = document.getElementById("hideGuideBtn");
  var openLessonBtn = document.getElementById("openLessonBtn");
  var exploreBtn = document.getElementById("exploreBtn");

  var simClockReadout = document.getElementById("simClockReadout");
  var simClockState = document.getElementById("simClockState");

  var simTimer = null;
  var simState = "paused";
  var simSpeedMinutes = 5;
  var simStartUtc = Date.parse("2022-05-12T19:30:00Z");
  var simUtc = simStartUtc;

  function openGuide() {
    if (storyPanel) storyPanel.classList.add("story-open");
  }

  function closeGuide() {
    if (storyPanel) storyPanel.classList.remove("story-open");
  }

  function formatLocalSimTime(msUtc) {
    try {
      return new Date(msUtc).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Chicago"
      }).replace(",", "");
    } catch (e) {
      return "May 12 2:30 PM";
    }
  }

  function syncFromEngineClock() {
    try {
      if (window.curZ instanceof Date && !isNaN(window.curZ)) {
        simUtc = window.curZ.getTime();
      } else if (typeof window.curZ === "string" || typeof window.curZ === "number") {
        var parsed = new Date(window.curZ);
        if (!isNaN(parsed)) simUtc = parsed.getTime();
      }
    } catch (e) {}
  }

  function updateClock() {
    syncFromEngineClock();
    if (simClockReadout) simClockReadout.textContent = formatLocalSimTime(simUtc);
    if (simClockState) {
      simClockState.textContent = simState === "playing" ? "▶ ×" + simSpeedMinutes : "❚❚";
    }
  }

  function setPlayVisibility(visible) {
    if (playWrap) playWrap.style.display = visible ? "flex" : "none";
    if (playBtn) playBtn.style.display = visible ? "" : "none";
    if (pauseBtn) pauseBtn.style.display = visible ? "" : "none";
    if (resetBtn) resetBtn.style.display = visible ? "" : "none";
  }

  function pushTimeToEngine(msUtc) {
    if (typeof window.setMasterTime === "function") {
      window.setMasterTime(new Date(msUtc));
      return;
    }
    try {
      window.curZ = new Date(msUtc);
      if (typeof window.updateAll === "function") window.updateAll();
    } catch (e) {}
  }

  function startSimulator() {
    if (simTimer) return;
    simState = "playing";
    updateClock();

    simTimer = setInterval(function () {
      simUtc += simSpeedMinutes * 60 * 1000;
      pushTimeToEngine(simUtc);
      updateClock();
    }, 1000);
  }

  function pauseSimulator() {
    simState = "paused";
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
    }
    updateClock();
  }

  function resetSimulator() {
    pauseSimulator();
    simUtc = simStartUtc;
    pushTimeToEngine(simUtc);
    updateClock();
  }

  if (openLessonBtn) {
    openLessonBtn.addEventListener("click", function () {
      if (storyPanel && storyPanel.classList.contains("story-open")) closeGuide();
      else openGuide();
    });
  }

  if (hideGuideBtn) hideGuideBtn.addEventListener("click", closeGuide);

  if (exploreBtn) {
    exploreBtn.addEventListener("click", function () {
      try {
        var probeBtn = document.getElementById("toolProbe");
        if (probeBtn) probeBtn.click();
      } catch (e) {}
    });
  }

  if (playBtn) playBtn.addEventListener("click", startSimulator);
  if (pauseBtn) pauseBtn.addEventListener("click", pauseSimulator);
  if (resetBtn) resetBtn.addEventListener("click", resetSimulator);

  window.addEventListener("wdl:storychange", function (ev) {
    var detail = (ev && ev.detail) || {};
    if (detail.utc) {
      var d = new Date(detail.utc);
      if (!isNaN(d)) simUtc = d.getTime();
    }
    if (detail.pause) pauseSimulator();
    setPlayVisibility(detail.allowPlay !== false);
    updateClock();
  });

  setPlayVisibility(true);
  updateClock();
})();
