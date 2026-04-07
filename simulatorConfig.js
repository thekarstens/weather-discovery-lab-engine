window.WDL_SIM_CONFIG = {
  lessonId: "derecho-2022",
  dataPackBase: "https://thekarstens.github.io/wdl-data-derecho-2022/",
  storyboardUrl: "storyboard/simulator_storyboard.json",
  startZ: "2022-05-12T20:00:00Z",
  endZ: "2022-05-12T23:20:00Z",
  defaultPanelOpen: true,
  autoplayOnLoad: false,
  initialSpeedMs: 900,
  ui: {
    title: "Weather Discovery Lab",
    subtitle: "Live Severe Weather Simulator — May 12, 2022 Derecho",
    region: "Eastern South Dakota • Western Minnesota • Northwestern Iowa",
    productFallback: "RADAR",
    stepKickerFallback: "LIVE SIMULATION"
  },
  eventThemes: {
    severeWarning: "severe",
    tornadoWarning: "tornado",
    radarFocus: "info",
    reports: "reports",
    lightning: "info"
  },
  onStorySceneApplied: function(payload){
    try {
      window.__SIM_LAST_SCENE__ = payload || null;
    } catch (e) {}
  },
  onUpdateAll: function(payload){
    try {
      window.__SIM_LAST_CLOCK__ = payload && payload.curZ ? payload.curZ : null;
    } catch (e) {}
  }
};
