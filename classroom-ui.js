(function () {
  var slowerBtn = document.getElementById("simSlowerBtn");
  var playBtn = document.getElementById("simPlayPauseBtn");
  var fasterBtn = document.getElementById("simFasterBtn");
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
  var toolToggleBtn = document.getElementById("toolToggleBtn");
  var toolBox = document.getElementById("toolBox");
  var toolClear = document.getElementById("toolClear");
  var stormTrackArrivalBox = document.getElementById("stormTrackArrivalBox");
  var stormTrackArrivalHead = document.querySelector(".storm-track-arrivals-head");

  var simTimer = null;
  var simState = "paused";
  var simSpeedMinutes = 5;
  var simUtc = Date.parse("2022-05-12T19:30:00Z");
  var currentExploreMode = false;
  var lessonEverOpened = false;

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
      stormTrackArrivalBox.dataset.dragged = "1";
      e.preventDefault();
    };
    window.addEventListener("mousemove", function(e){
      if (!dragging) return;
      stormTrackArrivalBox.style.left = (origL + e.clientX - startX) + "px";
      stormTrackArrivalBox.style.top = (origT + e.clientY - startY) + "px";
    });
    window.addEventListener("mouseup", function(){ dragging = false; });
  }

  function syncFromEngineClock() {
    try {
      if (window.curZ instanceof Date && !isNaN(window.curZ)) simUtc = window.curZ.getTime();
      else if (typeof window.curZ === "string" || typeof window.curZ === "number") {
        var parsed = new Date(window.curZ);
        if (!isNaN(parsed)) simUtc = parsed.getTime();
      }
    } catch (e) {}
  }

  function formatLocalSimTime(msUtc) {
    try {
      return new Date(msUtc).toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Chicago"
      });
    } catch (e) { return "2:30 PM"; }
  }

  function updateClock() {
    syncFromEngineClock();
    if (simClockReadout) simClockReadout.textContent = formatLocalSimTime(simUtc);
    if (scrubber && typeof window.getActiveScrubberState === "function"){
      try{
        var state = window.getActiveScrubberState();
        if (state && isFinite(state.min) && isFinite(state.max) && state.max > state.min){
          scrubber.min = 0;
          scrubber.max = 100;
          scrubber.value = Math.max(0, Math.min(100, Math.round(((state.value - state.min) / (state.max - state.min)) * 100)));
        }
      }catch(e){}
    }
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
      storyPanel.classList.add("story-open");
      storyPanel.classList.toggle("story-collapsed", collapsed);
    }
    if (storyCollapseBtn) storyCollapseBtn.textContent = collapsed ? "Resume" : "Hide";
  }

  function updateLessonButton() {
    if (!openLessonBtn) return;
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
  }

  function setClockVisibility(visible) {
    if (!simClockBox) return;
    simClockBox.classList.toggle("is-hidden", !visible);
    if (!visible) {
      if (simControlsWrap) simControlsWrap.classList.add("is-hidden");
      if (playWrap) playWrap.classList.add("is-hidden");
      if (scrubWrap) scrubWrap.classList.add("is-hidden");
      simClockBox.classList.remove("show-scrubber");
      return;
    }
    if (simControlsWrap) simControlsWrap.classList.remove("is-hidden");
  }

  function setScrubberVisibility(visible) {
    if (scrubWrap) scrubWrap.classList.toggle("is-hidden", !visible);
    if (simClockBox) simClockBox.classList.toggle("show-scrubber", !!visible);
  }

  function setDopplerVisibility(visible) {
    syncDopplerButtons(visible);
  }

  function setToolDockVisibility() {
    var dock = document.getElementById("toolBox");
    if (!dock) return;
    dock.style.opacity = "1";
    dock.style.pointerEvents = "auto";
    dock.style.transform = "translateX(0)";
  }

  function toggleToolBox(forceOpen){
    if (!toolBox) return;
    var open = (typeof forceOpen === "boolean") ? forceOpen : toolBox.classList.contains("collapsed");
    toolBox.classList.toggle("collapsed", !open);
    if (toolToggleBtn) toolToggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function applyMode(isExplore) {
    currentExploreMode = !!isExplore;
    document.body.classList.toggle("explore-mode", currentExploreMode);
    if (exploreBtn) {
      exploreBtn.textContent = currentExploreMode ? "Guided" : "Explore";
      exploreBtn.classList.toggle("active", currentExploreMode);
    }
    setToolDockVisibility();
    syncDopplerButtons(simClockBox && !simClockBox.classList.contains("is-hidden") && simClockBox.classList.contains("show-doppler"));
  }

  function pauseSimulator(){
    simState = "paused";
    if (simTimer) clearInterval(simTimer);
    simTimer = null;
    if (playBtn) playBtn.textContent = "Play";
  }

  function stepPlayback(){
    try{
      if (typeof window.stepRadarFrame === "function") {
        if (!window.stepRadarFrame(1) && typeof window.updateAll === "function") window.updateAll();
      } else if (typeof window.updateAll === "function") {
        window.updateAll();
      }
    } catch(e){}
    renderDepth();
    updateClock();
  }

  function playSimulator(){
    pauseSimulator();
    simState = "playing";
    if (playBtn) playBtn.textContent = "Pause";
    simTimer = setInterval(stepPlayback, Math.max(250, simSpeedMinutes * 100));
  }

  function togglePlayPause(){
    if (simState === "playing") pauseSimulator(); else playSimulator();
  }

  if (playBtn) playBtn.onclick = togglePlayPause;
  if (slowerBtn) slowerBtn.onclick = function(){ simSpeedMinutes = Math.min(12, simSpeedMinutes + 1); };
  if (fasterBtn) fasterBtn.onclick = function(){ simSpeedMinutes = Math.max(1, simSpeedMinutes - 1); };
  if (toolToggleBtn) toolToggleBtn.addEventListener("click", function(){ toggleToolBox(); });
  if (toolClear){
    toolClear.addEventListener("click", function(){
      try{ if (window.clearStormTrack) window.clearStormTrack(); }catch(e){}
      try{ if (window.clearMeasure) window.clearMeasure(); }catch(e){}
      try{ if (window.clearDrawings) window.clearDrawings(); }catch(e){}
    });
  }
  if (storyDopplerBtn){
    storyDopplerBtn.addEventListener("click", function(){
      try{ if (typeof window.toggleSweep === "function") window.toggleSweep(); }catch(e){}
      syncDopplerButtons(true);
    });
  }
  if (openLessonBtn) openLessonBtn.addEventListener("click", function(){ document.body.classList.contains("guide-collapsed") ? openGuide() : closeGuide(); });
  if (storyCollapseBtn) storyCollapseBtn.addEventListener("click", function(){ document.body.classList.contains("guide-collapsed") ? openGuide() : closeGuide(); });
  if (exploreBtn) exploreBtn.addEventListener("click", function(){ applyMode(!currentExploreMode); });
  if (scrubber){
    scrubber.addEventListener("input", function(){
      try{
        if (typeof window.setActiveScrubberPercent === "function") window.setActiveScrubberPercent(Number(scrubber.value));
      }catch(e){}
      updateClock();
    });
  }

      var detail = (ev && ev.detail) || {};
    if (detail.utc) {
      var d = new Date(detail.utc);
      if (!isNaN(d)) simUtc = d.getTime();
    }
    var showClock = !!detail.showClock;
    var showPlay = !!detail.allowPlay;
    var showScrubber = !!detail.showScrubber;
    var showDoppler = !!detail.showDoppler;
    setClockVisibility(showClock);
    setPlayVisibility(showClock && showPlay);
    setScrubberVisibility(showClock && showScrubber);
    if (simClockBox) simClockBox.classList.toggle("show-doppler", !!showDoppler);
    setDopplerVisibility(showDoppler);
    updateClock();
    updateLessonButton();
  });

  makeStormTrackWindowDraggable();
  toggleToolBox(false);
  setClockVisibility(false);
  applyMode(false);
  updateClock();
  renderDepth();
})();
