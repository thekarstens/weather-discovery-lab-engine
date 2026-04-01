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
  var clockWrap = simClockReadout ? simClockReadout.closest("div") : null;

  var simTimer = null;
  var simState = "paused";
  var simSpeedMinutes = 5;
  var simStartUtc = Date.parse("2022-05-12T19:30:00Z");
  var simUtc = simStartUtc;
  var currentExploreMode = false;

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

  function setClockVisibility(visible) {
    if (!clockWrap) return;
    clockWrap.style.display = visible ? "flex" : "none";
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
    if (exploreBtn) exploreBtn.textContent = currentExploreMode ? "Guided" : "Explore";

    var showTools = currentExploreMode;
    if (opts && typeof opts.showTools === "boolean") showTools = opts.showTools;
    setToolDockVisibility(showTools);

    if (currentExploreMode) closeGuide();
    else openGuide();
  }

  function nudgeBannerLayout() {
    try {
      if (clockWrap) {
        clockWrap.style.transform = "translateX(96px)";
        clockWrap.style.maxWidth = "460px";
      }
      if (playWrap) {
        playWrap.style.transform = "translateX(112px)";
        playWrap.style.marginLeft = "18px";
      }
      var imgs = Array.prototype.slice.call(document.querySelectorAll("img"));
      var logo = null;
      for (var i = 0; i < imgs.length; i++) {
        var img = imgs[i];
        var src = String(img.getAttribute("src") || img.src || "");
        var rect = img.getBoundingClientRect ? img.getBoundingClientRect() : null;
        var looksLikeBottomRight = rect && rect.bottom > window.innerHeight * 0.65 && rect.right > window.innerWidth * 0.65;
        if (/weather.?workshops|logo/i.test(src) || looksLikeBottomRight) {
          logo = img;
          if (looksLikeBottomRight) break;
        }
      }
      if (logo) {
        var target = logo.parentElement && logo.parentElement !== document.body ? logo.parentElement : logo;
        target.style.transform = "translate(24px, 18px)";
      }
    } catch (e) {}
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
      applyMode(!currentExploreMode);
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

    var showPlay = detail.allowPlay !== false;
    var showClock = (typeof detail.showClock === "boolean") ? detail.showClock : (showPlay && Number(detail.index || 0) >= 2);
    var showTools = (typeof detail.showTools === "boolean") ? detail.showTools : currentExploreMode;
    var nextExplore = (typeof detail.startInExplore === "boolean") ? detail.startInExplore : currentExploreMode;

    setPlayVisibility(showPlay);
    setClockVisibility(showClock);
    applyMode(nextExplore, { showTools: showTools });
    updateClock();
    nudgeBannerLayout();
  });

  applyMode(false);
  setPlayVisibility(false);
  setClockVisibility(false);
  updateClock();
  setTimeout(nudgeBannerLayout, 150);
  window.addEventListener("load", nudgeBannerLayout);
  window.addEventListener("resize", nudgeBannerLayout);
})();
