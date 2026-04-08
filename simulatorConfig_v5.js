window.WDL_SIM_CONFIG = {
  lessonId: "derecho-2022",
  dataPackBase: "https://thekarstens.github.io/wdl-data-derecho-2022/",
  storyboardUrl: "storyboard/simulator_storyboard_v5.json",
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
    region: "Eastern South Dakota • Western Minnesota • Northwestern Iowa"
  },
  defaultTicker: [
    "Simulator v5 loaded",
    "Storyboard now works as time-group topic cards",
    "Advance Timeline moves the master clock forward",
    "Story Topic buttons change discussion focus at the current time"
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
      detailsHint: "Click for details.",
      activeMinutes: 35,
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
      detailsHint: "Click for details.",
      activeMinutes: 40,
      ticker: [
        "Damage reports increasing across eastern South Dakota",
        "Trees and power lines reported down",
        "Continue tracking the bowing line on radar"
      ],
      rearmOnBacktrack: true
    },
    {
      id: "svr-600",
      displayTime: "6:00 PM",
      type: "severeWarning",
      theme: "severe",
      kicker: "New warning",
      headline: "SEVERE T-STORM WARNING IN EFFECT",
      message: "Damaging wind threat continues as the line pushes east across southeastern South Dakota.",
      detailsHint: "Click for details.",
      activeMinutes: 30,
      ticker: [
        "Severe thunderstorm warning in effect until 6:30 PM",
        "Damaging wind remains the main threat",
        "Monitor the bowing segment closely on radar"
      ],
      rearmOnBacktrack: true
    }
  ]
};
