(function () {
  var backBtn = document.getElementById("simBackBtn");
  var pauseBtn = document.getElementById("simPauseBtn");
  var playBtn = document.getElementById("simPlayBtn");
  var loopBtn = document.getElementById("simLoopBtn");
  var fwdBtn = document.getElementById("simFwdBtn");
  var playWrap = document.getElementById("playPauseWrap");
  var simControlsWrap = document.getElementById("simControlsWrap");
  var simClockBox = document.getElementById("simClockBox");

  var storyPanel = document.getElementById("storyPanel");
    var openLessonBtn = document.getElementById("openLessonBtn");
  var exploreBtn = document.getElementById("exploreBtn");

  var simClockReadout = document.getElementById("simClockReadout");
  var scrubWrap = document.getElementById("scrubWrap");
  var scrubber = document.getElementById("cbScrubber");
  var storyDopplerBtn = document.getElementById("storyDopplerBtn");
  var floatingSweepBtn = document.getElementById("exploreDopplerBtn");
  var storyCollapseBtn = document.getElementById("storyCollapseBtn");

  var stormTrackArrivalBox = document.getElementById("stormTrackArrivalBox");
  var stormTrackArrivalHead = document.querySelector(".storm-track-arrivals-head");
  function makeStormTrackWindowDraggable(){
    if (!stormTrackArrivalBox || !stormTrackArrivalHead) return;
    var dragging = false, startX = 0, startY = 0, origL = 0, origT = 0;
    stormTrackArrivalHead.onmousedown = function(e){
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      var rect = stormTrackArrivalBox.getBoundingClientRect();
      origL = rect.left; origT = rect.top;
      stormTrackArrivalBox.style.left = origL + "px";
      stormTrackArrivalBox.style.top = origT + "px";
      stormTrackArrivalBox.style.bottom = "auto";
      stormTrackArrivalBox.style.transform = "none";
      e.preventDefault();
    };
    window.addEventListener("mousemove", function(e){
      if (!dragging) return;
      stormTrackArrivalBox.style.left = (origL + e.clientX - startX) + "px";
      stormTrackArrivalBox.style.top = (origT + e.clientY - startY) + "px";
    });
    window.addEventListener("mouseup", function(){ dragging = false; });
  }

  var simTimer = null;
  var simState = "paused";
  var simSpeedMinutes = 5;
  var simStartUtc = Date.parse("2022-05-12T19:30:00Z");
  var simUtc = simStartUtc;
  var currentExploreMode = false;
  var lessonEverOpened = false;
  var loopEnabled = false;

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

  function formatLocalSimTime(msUtc) {
    try {
      return new Date(msUtc).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Chicago"
      });
    } catch (e) {
      return "May 12 2:30 PM";
    }
  }

  function updateClock() {
    syncFromEngineClock();
    if (simClockReadout) simClockReadout.textContent = formatLocalSimTime(simUtc);
    if (loopBtn) loopBtn.classList.toggle("active", !!loopEnabled);
  }

  function syncDopplerButtons(visible) {
    var on = !!window.radarSweepEnabled;
    [storyDopplerBtn, floatingSweepBtn].forEach(function(btn){
      if (!btn) return;
      btn.textContent = on ? "LIVE Doppler ON" : "LIVE Doppler OFF";
      btn.classList.remove("active");
      btn.classList.remove("pulsing");
      if (on) btn.classList.add("active");
      if (!!visible && !on) btn.classList.add("pulsing");
      if (btn === floatingSweepBtn) btn.classList.toggle("visible", !!visible && currentExploreMode);
      else btn.style.display = visible ? "inline-flex" : "none";
    });
  }

  function updateCollapsedState(){
    var collapsed = document.body.classList.contains("guide-collapsed");
    if (storyPanel) {
      storyPanel.classList.toggle("story-collapsed", collapsed);
      storyPanel.classList.add("story-open");
    }
    if (storyCollapseBtn) storyCollapseBtn.textContent = collapsed ? "Resume" : "Hide";
  }

  function updateLessonButton() {
    if (!openLessonBtn || !storyPanel) return;
    var collapsed = document.body.classList.contains("guide-collapsed");
    openLessonBtn.classList.toggle("lesson-open", !collapsed);
    openLessonBtn.classList.toggle("resume-ready", collapsed || lessonEverOpened);
    openLessonBtn.textContent = collapsed ? "Resume Lesson" : "Hide Lesson";
  }

  function openGuide() {
    if (storyPanel) {
      storyPanel.classList.add("story-open");
      storyPanel.classList.remove("story-collapsed");
    }
    document.body.classList.remove("guide-collapsed");
    lessonEverOpened = true;
    updateLessonButton();
  makeStormTrackWindowDraggable();
    updateCollapsedState();
  }

  function closeGuide() {
    if (storyPanel) {
      storyPanel.classList.add("story-open");
      storyPanel.classList.add("story-collapsed");
    }
    document.body.classList.add("guide-collapsed");
    updateLessonButton();
    updateCollapsedState();
  }

  function setPlayVisibility(visible) {
    if (playWrap) playWrap.classList.toggle("is-hidden", !visible);
    if (playBtn) playBtn.style.display = visible ? "" : "none";
    if (pauseBtn) pauseBtn.style.display = visible ? "" : "none";
  }

  function setClockVisibility(visible) {
    if (!simClockBox) return;
    simClockBox.classList.toggle("is-hidden", !visible);
    if (!visible) {
      setPlayVisibility(false);
      setScrubberVisibility(false);
      if (simControlsWrap) simControlsWrap.classList.add("is-hidden");
      return;
    }
    if (simControlsWrap) simControlsWrap.classList.remove("is-hidden");
  }

  function setScrubberVisibility(visible) {
    if (!simClockBox) return;
    simClockBox.classList.toggle("show-scrubber", !!visible);
    if (scrubWrap) scrubWrap.style.display = visible ? "flex" : "none";
    try {
      if (visible && typeof window.syncScrubberToActiveProduct === "function") {
        window.syncScrubberToActiveProduct();
      }
    } catch (e) {}
  }

  function setDopplerVisibility(visible) {
    if (!simClockBox) return;
    simClockBox.classList.toggle("show-doppler", !!visible);
    syncDopplerButtons(visible);
  }


  function findToolDock() {
    var ids = ["toolMeasure", "toolProbe", "toolTrack", "toolHome"];
    var seed = document.getElementById("toolHome") || document.getElementById("toolProbe") || document.getElementById("toolMeasure");
    if (!seed) return null;
    var node = seed.parentElement;
    while (node && node !== document.body) {
      var hits = 0;
      for (var i = 0; i < ids.length; i++) {
        if (node.querySelector && node.querySelector("#" + ids[i])) hits++;
      }
      if (hits >= 3) return node;
      node = node.parentElement;
    }
    return null;
  }

  function setToolDockVisibility(visible) {
    var dock = findToolDock();
    if (!dock) return;
    dock.style.opacity = visible ? "1" : "0";
    dock.style.pointerEvents = visible ? "auto" : "none";
    dock.style.transform = visible ? "translateX(0)" : "translateX(18px)";
    dock.style.transition = "opacity 180ms ease, transform 180ms ease";
  }

  function applyMode(isExplore, opts) {
    currentExploreMode = !!isExplore;
    document.body.classList.toggle("explore-mode", currentExploreMode);
    if (exploreBtn) {
      exploreBtn.textContent = currentExploreMode ? "Guided" : "Explore";
      exploreBtn.classList.toggle("active", currentExploreMode);
    }

    var showTools = currentExploreMode;
    if (opts && typeof opts.showTools === "boolean") showTools = opts.showTools;
    setToolDockVisibility(showTools);

    // Do not change storyboard visibility here.
    syncDopplerButtons(simClockBox && simClockBox.classList.contains("show-doppler"));
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


  function getEffectiveMode() {
    var mode = (typeof window.getActiveScrubberMode === "function") ? window.getActiveScrubberMode() : "lesson";
    try {
      if (mode !== "radar" && simClockBox && simClockBox.classList.contains("show-scrubber") && typeof window.getRadarFramePool === "function") {
        var pool = window.getRadarFramePool() || [];
        if (pool.length) mode = "radar";
      }
    } catch (e) {}
    return mode;
  }

  function startSimulator() {
    if (simTimer) return;
    simState = "playing";
    updateClock();

    simTimer = setInterval(function () {
      var mode = getEffectiveMode();
      if (mode === "radar" && typeof window.stepRadarFrame === "function") {
        var pool = (typeof window.getRadarFramePool === "function") ? window.getRadarFramePool() : [];
        var scrub = scrubber;
        var idx = scrub ? parseInt(scrub.value || "0", 10) : 0;
        var max = scrub ? parseInt(scrub.max || "0", 10) : Math.max(0, pool.length - 1);
        if (isFinite(max) && idx >= max) {
          if (loopEnabled) {
            if (typeof window.setCurrentRadarFrameIndex === "function") window.setCurrentRadarFrameIndex(0);
            if (typeof window.updateAll === "function") window.updateAll();
          } else {
            pauseSimulator();
            return;
          }
        } else {
          window.stepRadarFrame(1);
        }
        syncFromEngineClock();
        try { if (typeof window.syncScrubberToActiveProduct === "function") window.syncScrubberToActiveProduct(); } catch (e) {}
        updateClock();
        return;
      }
      simUtc += simSpeedMinutes * 60 * 1000;
      pushTimeToEngine(simUtc);
      try { if (typeof window.syncScrubberToActiveProduct === "function") window.syncScrubberToActiveProduct(); } catch (e) {}
      updateClock();
    }, 900);
  }

  function pauseSimulator() {
    simState = "paused";
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
    }
    updateClock();
  }

  if (openLessonBtn) {
    openLessonBtn.addEventListener("click", function () {
      if (storyPanel && storyPanel.classList.contains("story-open")) closeGuide();
      else openGuide();
    });
  }

  if (storyCollapseBtn) {
    storyCollapseBtn.addEventListener("click", function () {
      if (document.body.classList.contains("guide-collapsed")) openGuide();
      else closeGuide();
    });
  }

  if (exploreBtn) {
    exploreBtn.addEventListener("click", function () {
      applyMode(!currentExploreMode);
    });
  }

  if (playBtn) playBtn.addEventListener("click", startSimulator);
  if (pauseBtn) pauseBtn.addEventListener("click", pauseSimulator);
  if (backBtn) backBtn.addEventListener("click", function(){
    pauseSimulator();
    try {
      var mode = getEffectiveMode();
      if (mode === "radar" && typeof window.stepRadarFrame === "function") {
        window.stepRadarFrame(-1);
        if (typeof window.syncScrubberToActiveProduct === "function") window.syncScrubberToActiveProduct();
        syncFromEngineClock();
        updateClock();
      }
    } catch(e) {}
  });
  if (fwdBtn) fwdBtn.addEventListener("click", function(){
    pauseSimulator();
    try {
      var mode = getEffectiveMode();
      if (mode === "radar" && typeof window.stepRadarFrame === "function") {
        window.stepRadarFrame(1);
        if (typeof window.syncScrubberToActiveProduct === "function") window.syncScrubberToActiveProduct();
        syncFromEngineClock();
        updateClock();
      }
    } catch(e) {}
  });
  if (loopBtn) loopBtn.addEventListener("click", function(){ loopEnabled = !loopEnabled; updateClock(); });

  if (scrubber) {
    scrubber.addEventListener("input", function () {
      try {
        var mode = getEffectiveMode();
        var v = parseInt(scrubber.value, 10);
        if (!isFinite(v)) return;
        if (mode === "radar" && typeof window.setCurrentRadarFrameIndex === "function") {
          window.setCurrentRadarFrameIndex(v);
          if (typeof window.updateAll === "function") window.updateAll();
          syncFromEngineClock();
          updateClock();
          return;
        }
      } catch (e) {}
    });
  }

  [storyDopplerBtn, floatingSweepBtn].forEach(function(btn){
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (typeof window.toggleSweep === "function") {
        window.toggleSweep();
        setTimeout(function () { syncDopplerButtons(simClockBox && simClockBox.classList.contains("show-doppler")); }, 20);
      }
    });
  });

  window.addEventListener("wdl:dopplerchange", function(){ syncDopplerButtons(simClockBox && simClockBox.classList.contains("show-doppler")); });

  window.addEventListener("wdl:storychange", function (ev) {
    var detail = (ev && ev.detail) || {};
    if (detail.utc) {
      var d = new Date(detail.utc);
      if (!isNaN(d)) simUtc = d.getTime();
    }
    if (detail.pause) pauseSimulator();

    var showPlay = !!detail.allowPlay;
    var showClock = (typeof detail.showClock === "boolean") ? detail.showClock : true;
    var showTools = (typeof detail.showTools === "boolean") ? detail.showTools : currentExploreMode;
    var nextExplore = (typeof detail.startInExplore === "boolean") ? detail.startInExplore : currentExploreMode;
    var showScrubber = !!detail.showScrubber;
    var showDoppler = !!detail.showDoppler;
    if (!showPlay) loopEnabled = false;

    setPlayVisibility(showPlay);
    setClockVisibility(showClock);
    setScrubberVisibility(showScrubber);
    setDopplerVisibility(showDoppler);
    applyMode(nextExplore, { showTools: showTools });
    if (storyDopplerBtn) storyDopplerBtn.classList.toggle("pulsing", showDoppler && !window.radarSweepEnabled);
    try { if (typeof window.syncScrubberToActiveProduct === "function") window.syncScrubberToActiveProduct(); } catch (e) {}
    updateClock();
    updateLessonButton();
  });

  applyMode(false);
  setPlayVisibility(false);
  setClockVisibility(true);
  setScrubberVisibility(false);
  setDopplerVisibility(false);
  updateClock();
  updateLessonButton();
  updateCollapsedState();
  syncDopplerButtons(false);
})();
