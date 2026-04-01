(function () {
  var playBtn = document.getElementById("simPlayBtn");
  var pauseBtn = document.getElementById("simPauseBtn");
  var storyPanel = document.getElementById("storyPanel");
  var storyTitle = document.getElementById("storyTitle");
  var storyBody = document.getElementById("storyBody");
  var storyStep = document.getElementById("storyStep");
  var hideGuideBtn = document.getElementById("hideGuideBtn");
  var exploreBtn = document.getElementById("exploreBtn");
  var simClockReadout = document.getElementById("simClockReadout");
  var simClockState = document.getElementById("simClockState");

  var simTimer = null;
  var simState = "paused";
  var simSpeedMinutes = 5;
  var simStartUtc = Date.parse("2022-05-12T19:30:00Z"); // 2:30 PM CDT
  var simUtc = simStartUtc;

  var storyMoments = [
    {
      title: "SPC Day 1 Outlook",
      step: "Step 1 of 6",
      html: "<p><b>2:30 PM setup.</b> The SPC Day 1 outlook has already highlighted our area for dangerous severe weather later today.</p><p><b>Question:</b> What areas are under the greatest risk, and how close is that threat to Sioux Falls?</p><p>Click the outlook polygons on the map to inspect the risk area.</p>"
    },
    {
      title: "Live Doppler",
      step: "Step 2 of 6",
      html: "<p><b>Radar becomes the centerpiece.</b> Use the sweep and evolving volume scans to show students how the storm organizes.</p><p><b>Question:</b> What clues suggest the line is strengthening?</p>"
    },
    {
      title: "Warnings",
      step: "Step 3 of 6",
      html: "<p><b>Warning phase.</b> This is where the story gets dramatic.</p><p><b>Question:</b> What evidence would support issuing a warning right now?</p>"
    },
    {
      title: "Reports",
      step: "Step 4 of 6",
      html: "<p><b>Storm reports begin arriving.</b> Connect the radar picture to real impacts on the ground.</p><p><b>Question:</b> What do the reports confirm about the storm?</p>"
    },
    {
      title: "Investigate",
      step: "Step 5 of 6",
      html: "<p><b>Pause and investigate.</b> Let students probe the scene you have just explained.</p><p><b>Question:</b> What do you notice near the leading edge of the storm?</p>"
    },
    {
      title: "Recap",
      step: "Step 6 of 6",
      html: "<p><b>Lessons learned.</b> Review the warning process, reports, and storm evolution.</p><p><b>Question:</b> What early clues suggested this could become a dangerous long-lived windstorm?</p>"
    }
  ];

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

  function updateClock() {
    if (simClockReadout) simClockReadout.textContent = formatLocalSimTime(simUtc);
    if (simClockState) {
      simClockState.textContent = simState === "playing" ? "▶ ×" + simSpeedMinutes : "❚❚";
    }
  }

  function setStoryMoment(index) {
    var m = storyMoments[index];
    if (!m) return;
    if (storyTitle) storyTitle.textContent = m.title;
    if (storyBody) storyBody.innerHTML = m.html;
    if (storyStep) storyStep.textContent = m.step;
  }

  function startSimulator() {
    if (simTimer) return;
    simState = "playing";
    updateClock();
    simTimer = setInterval(function () {
      simUtc += simSpeedMinutes * 60 * 1000;
      try {
        if (typeof window.curZ !== "undefined") {
          window.curZ = new Date(simUtc);
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

  setStoryMoment(0);
  openGuide();
  updateClock();
})();
