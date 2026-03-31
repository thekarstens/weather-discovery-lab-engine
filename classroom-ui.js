(function () {
  var playBtn = document.getElementById("simPlayBtn");
  var pauseBtn = document.getElementById("simPauseBtn");
  var resetBtn = document.getElementById("simResetBtn");

  var setupBtn = document.getElementById("sceneSetupBtn");
  var dopplerBtn = document.getElementById("sceneDopplerBtn");
  var warningsBtn = document.getElementById("sceneWarningsBtn");
  var reportsBtn = document.getElementById("sceneReportsBtn");
  var recapBtn = document.getElementById("sceneRecapBtn");
  var investigateBtn = document.getElementById("sceneInvestigateBtn");

  var storyPanel = document.getElementById("storyPanel");
  var storyTitle = document.getElementById("storyTitle");
  var storyBody = document.getElementById("storyBody");
  var storyStep = document.getElementById("storyStep");
  var hideGuideBtn = document.getElementById("hideGuideBtn");
  var exploreBtn = document.getElementById("exploreBtn");

  var heroProductLabel = document.getElementById("heroProductLabel");
  var simClockReadout = document.getElementById("simClockReadout");
  var simClockState = document.getElementById("simClockState");

  var simTimer = null;
  var simState = "paused";
  var simSpeedMinutes = 5;
  var simStartUtc = Date.parse("2022-05-12T20:00:00Z");
  var simUtc = simStartUtc;

  function updateClock() {
    if (simClockReadout) simClockReadout.textContent = new Date(simUtc).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Chicago"
    }).replace(",", "");

    if (simClockState) {
      simClockState.textContent = simState === "playing"
        ? "▶ ×" + simSpeedMinutes
        : "❚❚";
    }
  }

  function startSimulator() {
    if (simTimer) return;
    simState = "playing";
    updateClock();

    simTimer = setInterval(function () {
      simUtc += simSpeedMinutes * 60 * 1000;

      try {
        if (typeof window.curZ !== "undefined") {
          window.curZ = new Date(simUtc).toISOString();
        }
        if (typeof window.updateAll === "function") {
          window.updateAll();
        }
      } catch (e) {}

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

    try {
      if (typeof window.curZ !== "undefined") {
        window.curZ = new Date(simUtc).toISOString();
      }
      if (typeof window.updateAll === "function") {
        window.updateAll();
      }
    } catch (e) {}

    updateClock();
  }

  if (playBtn) playBtn.addEventListener("click", startSimulator);
  if (pauseBtn) pauseBtn.addEventListener("click", pauseSimulator);
  if (resetBtn) resetBtn.addEventListener("click", resetSimulator);

  updateClock();
})();
