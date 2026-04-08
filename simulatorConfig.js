window.WDL_SIM_CONFIG = {
  lessonId: "derecho-2022",
  dataPackBase: "https://thekarstens.github.io/wdl-data-derecho-2022/",
  storyboardUrl: "storyboard/simulator_storyboard.json",
  startZ: "2022-05-12T20:00:00Z",
  endZ: "2022-05-13T00:00:00Z",
  defaultPanelOpen: true,
  autoplayOnLoad: false,
  nextEventDurationMs: 2200,
  masterClock: {
    label: "Master Simulator Clock",
    displayStartZ: "2022-05-12T15:00:00-05:00",
    displayEndZ: "2022-05-12T19:00:00-05:00"
  },
  ui: {
    title: "Weather Discovery Lab",
    subtitle: "Live Severe Weather Simulator — May 12, 2022 Derecho",
    region: "Eastern South Dakota • Western Minnesota • Northwestern Iowa",
    productFallback: "RADAR",
    stepKickerFallback: "LIVE SIMULATION"
  },
  defaultTicker: [
    "Sim timeline active",
    "Radar, warnings, reports, and lightning can be called from the banner row",
    "Right-side slide alerts are ready for timed tornado warning moments"
  ],
  eventThemes: {
    severeWarning: "severe",
    tornadoWarning: "tornado",
    radarFocus: "info",
    reports: "reports",
    lightning: "info"
  },
  timelineEvents: [
    {
      id: "torwarn-434",
      displayTime: "4:34 PM",
      type: "tornadoWarning",
      theme: "tornado",
      kicker: "New warning",
      headline: "TORNADO WARNING JUST ISSUED",
      message: "Kingsbury, Brookings, and nearby counties should move to shelter now.",
      ticker: [
        "Tornado warning just issued near Brookings and Kingsbury Counties",
        "Move to shelter now",
        "Radar-indicated rotation with damaging winds also possible"
      ],
      rearmOnBacktrack: true
    },
    {
      id: "reports-505",
      displayTime: "5:05 PM",
      type: "reports",
      theme: "reports",
      kicker: "Storm reports",
      headline: "DAMAGE REPORTS START COMING IN",
      message: "Wind damage reports are increasing as the line accelerates east.",
      ticker: [
        "Damage reports increasing across eastern South Dakota",
        "Trees and power lines reported down",
        "Continue tracking the bowing line on radar"
      ],
      rearmOnBacktrack: true
    }
  ],
  onStorySceneApplied: function(payload){
    try { window.__SIM_LAST_SCENE__ = payload || null; } catch (e) {}
  },
  onUpdateAll: function(payload){
    try { window.__SIM_LAST_CLOCK__ = payload && payload.curZ ? payload.curZ : null; } catch (e) {}
  }
};
