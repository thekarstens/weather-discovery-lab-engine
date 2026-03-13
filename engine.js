/* ---- extracted inline script 2 ---- */
function resolveJetFrameUrl(u){
    if (!u) return u;
    const dir = (typeof JET_ANIM_DIR !== "undefined") ? JET_ANIM_DIR : "jet_anim";
    if (!u.includes("/") && !u.startsWith("http")) return dir + "/" + u;
    return u;
  }


/* ---- extracted inline script 5 ---- */
var storyStarted = false; // do not auto-open storyboard


/* ---- extracted inline script 7 ---- */
(async function(){
  // ---------- Config (loaded per lesson) ----------
  function _qs(name){
    try { return new URLSearchParams(window.location.search).get(name); }
    catch(e){ return null; }
  }

  // ------------------------------------------------------------
  // Lesson loading (optional): ?lesson=<folderName>
  // Loads: ./lessons/<lessonId>/lesson.json
  // ------------------------------------------------------------
  var CFG = {}; // may be populated by lesson.json
  var LESSON_LOADED = false;

  function applyLessonBanner(cfg) {
    if (!cfg) return;

    const b = cfg.banner || {};
    const lessonTitle = b.lessonTitle || cfg.titleTop || cfg.lessonTitle || "";
    const dq = b.drivingQuestion || cfg.drivingQuestion || "";
    const productWord = b.productWord || cfg.productLabel || cfg.productWord || "";

    const elLesson = document.querySelector('.top-lesson');
    if (elLesson && lessonTitle) elLesson.textContent = lessonTitle;

    const elQ = document.querySelector('.top-question');
    if (elQ && dq) elQ.innerHTML = '<span class="top-q-label">Question:</span> ' + dq;

    const elProd = document.getElementById('productLabel');
    if (elProd && productWord) elProd.textContent = productWord;
  }

  const lessonId = (_qs("lesson") || "").trim();

  if (!lessonId) {
    console.log("ℹ️ No ?lesson=... provided; using engine defaults.");
  } else {
    try {
      // Prefer the shared loader if present (js/lessonLoader.js)
      if (window.lessonLoader && typeof window.lessonLoader.loadLessonConfig === "function") {
        CFG = await window.lessonLoader.loadLessonConfig(lessonId);
      } else {
        // Fallback: fetch directly
        const DATA_PACK_BASE = (_qs('data') || 'https://thekarstens.github.io/wdl-data-derecho-2022/');
        const base = DATA_PACK_BASE.endsWith('/') ? DATA_PACK_BASE : (DATA_PACK_BASE + '/');
        const url = `${base}lessons/${encodeURIComponent(lessonId)}/lesson.json?v=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Lesson config HTTP ${res.status}: ${url}`);
        CFG = await res.json();
        if (!CFG.dataBase){
          const base = ( _qs('data') || 'https://thekarstens.github.io/wdl-data-derecho-2022/' );
          const b = base.endsWith('/') ? base : (base + '/');
          CFG.dataBase = `${b}lessons/${encodeURIComponent(lessonId)}/`;
        }
      }

      window.__LESSON_CFG__ = CFG;
      console.log("✅ Loaded lesson config for:", lessonId, CFG);

      LESSON_LOADED = true;
      // Banner will be applied after lesson loading completes
    } catch (e) {
      console.warn("⚠️ Lesson config load failed; using engine defaults.", e);
    }
  }

  if (LESSON_LOADED) {
    applyLessonBanner(CFG);
  }

  // Data pack base (GitHub Pages). Can be overridden by lesson.json via cfg.dataBase
  var DATA_PACK_BASE = "https://thekarstens.github.io/wdl-data-derecho-2022/";
  // Base for assets: prefer cfg.dataBase; otherwise default to data pack lesson folder when ?lesson= is used
  var DATA_BASE = String((CFG && CFG.dataBase)
    ? CFG.dataBase
    : (lessonId ? (DATA_PACK_BASE + "lessons/" + encodeURIComponent(lessonId) + "/") : "./")
  );

  // Provide a simple token replacer if lessonLoader didn't supply one
  if (!CFG._patternUrl){
    CFG._patternUrl = function(tpl, d){
      function pad(n){ return String(n).padStart(2,"0"); }
      var YYYY = String(d.getUTCFullYear());
      var MM = pad(d.getUTCMonth()+1);
      var DD = pad(d.getUTCDate());
      var HH = pad(d.getUTCHours());
      var mm = pad(d.getUTCMinutes());
      var HHMM = HH + mm;
      var YYYYMMDD = YYYY + MM + DD;
      var out = String(tpl)
        .replaceAll("{YYYY}", YYYY)
        .replaceAll("{MM}", MM)
        .replaceAll("{DD}", DD)
        .replaceAll("{HH}", HH)
        .replaceAll("{mm}", mm)
        .replaceAll("{HHMM}", HHMM)
        .replaceAll("{YYYYMMDD}", YYYYMMDD);

      // If it's already absolute, return it; otherwise prefix DATA_BASE
      if (/^https?:\/\//i.test(out)) return out;
      return DATA_BASE + out.replace(/^\.\//,"");
    };
  }

  // -------------------- Time window + step (supports nested cfg.time) --------------------
  var TIME_CFG = (CFG && CFG.time) ? CFG.time : CFG;

  var STEP_HOURS = Number(TIME_CFG.stepHours || 3);
  var STEP_MINUTES = (TIME_CFG.stepMinutes != null) ? Number(TIME_CFG.stepMinutes) : null;

  // Use minutes step if provided; otherwise fall back to hours step.
  var STEP_MS = (isFinite(STEP_MINUTES) && STEP_MINUTES > 0)
    ? (STEP_MINUTES * 60 * 1000)
    : (STEP_HOURS * 60 * 60 * 1000);

  var STEP_LABEL = (isFinite(STEP_MINUTES) && STEP_MINUTES > 0)
    ? (STEP_MINUTES + " min")
    : (STEP_HOURS + " hours");

  var startZ = TIME_CFG.startZ ? new Date(TIME_CFG.startZ) : new Date(Date.UTC(2018, 3, 10, 0, 0, 0));
  var endZ   = TIME_CFG.endZ   ? new Date(TIME_CFG.endZ)   : new Date(Date.UTC(2018, 3, 15, 12, 0, 0, 0));
  var curZ   = new Date(startZ.getTime());

  // Radar bounds (optional per lesson)
  var SHIFT_LAT = (typeof CFG.shiftLat === "number") ? CFG.shiftLat : -1.09;
  var SHIFT_LON = (typeof CFG.shiftLon === "number") ? CFG.shiftLon : 0.49;

  var RADAR_BOUNDS = (CFG.radarBounds && CFG.radarBounds.sw && CFG.radarBounds.ne)
    ? L.latLngBounds(
        L.latLng(CFG.radarBounds.sw[0], CFG.radarBounds.sw[1]),
        L.latLng(CFG.radarBounds.ne[0], CFG.radarBounds.ne[1])
      )
    : L.latLngBounds(
        L.latLng(24 + SHIFT_LAT, -126 + SHIFT_LON),
        L.latLng(50 + SHIFT_LAT,  -66 + SHIFT_LON)
      );

  // ---------------- Manifest-driven radar support ----------------
  var RADAR_MANIFEST = null;
  var RADAR_MANIFEST_URL = "";
  var RADAR_MANIFEST_FOLDER = "";
  var currentRadarFrameIndex = 0;
  var useManifestFrameScrubber = false;

  function _isAbsUrl(u){
    return /^https?:\/\//i.test(String(u||"")) || String(u||"").startsWith("data:") || String(u||"").startsWith("blob:");
  }

  function _joinUrl(base, rel){
    if (!rel) return String(base || "");
    if (_isAbsUrl(rel)) return String(rel);
    var b = String(base || "");
    var r = String(rel).replace(/^\.\//, "").replace(/^\//, "");
    if (!b) return r;
    return (b.endsWith('/') ? b : (b + '/')) + r;
  }

  async function loadRadarManifestIfNeeded(){
    try{
      var radarCfg = (CFG && CFG.layers && CFG.layers.radar) ? CFG.layers.radar : ((CFG && CFG.radar) ? CFG.radar : {});
      var mfPath = radarCfg.manifestFile || radarCfg.manifest || radarCfg.framesManifest || radarCfg.framesManifestFile || "";
      if (!mfPath) return;

      RADAR_MANIFEST_URL = _joinUrl(DATA_BASE, mfPath);
      RADAR_MANIFEST_FOLDER = RADAR_MANIFEST_URL.split('/').slice(0,-1).join('/') + '/';

      var res = await fetch(RADAR_MANIFEST_URL + (RADAR_MANIFEST_URL.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
      if (!res.ok) throw new Error('Radar manifest HTTP ' + res.status + ': ' + RADAR_MANIFEST_URL);
      RADAR_MANIFEST = await res.json();
      window.__RADAR_MANIFEST__ = RADAR_MANIFEST;
      console.log('✅ Loaded radar manifest:', RADAR_MANIFEST_URL, RADAR_MANIFEST);

      if (RADAR_MANIFEST && Array.isArray(RADAR_MANIFEST.leaflet_bounds) && RADAR_MANIFEST.leaflet_bounds.length === 2){
        RADAR_BOUNDS = L.latLngBounds(RADAR_MANIFEST.leaflet_bounds);
      }

      if (RADAR_MANIFEST && RADAR_MANIFEST.start_utc && RADAR_MANIFEST.end_utc){
        if (!(TIME_CFG && TIME_CFG.startZ)) startZ = new Date(RADAR_MANIFEST.start_utc);
        if (!(TIME_CFG && TIME_CFG.endZ)) endZ = new Date(RADAR_MANIFEST.end_utc);
      }

      if (RADAR_MANIFEST && Array.isArray(RADAR_MANIFEST.frames) && RADAR_MANIFEST.frames.length){
        useManifestFrameScrubber = true;
        currentRadarFrameIndex = 0;
        var firstUtc = RADAR_MANIFEST.frames[0].utc || RADAR_MANIFEST.frames[0].t || RADAR_MANIFEST.frames[0].time || null;
        if (firstUtc) curZ = new Date(firstUtc);
      }
    }catch(e){
      console.warn('⚠️ Radar manifest load failed:', e);
      RADAR_MANIFEST = null;
    }
  }

  function findNearestRadarFrame(d){
    if (!RADAR_MANIFEST || !Array.isArray(RADAR_MANIFEST.frames) || !RADAR_MANIFEST.frames.length) return null;
    var target = d.getTime();
    var best = null;
    var bestDelta = Infinity;
    for (var i=0;i<RADAR_MANIFEST.frames.length;i++){
      var f = RADAR_MANIFEST.frames[i];
      if (!f) continue;
      var rawT = f.utc || f.t || f.time || null;
      var png = f.png || f.file || f.filename || f.name || null;
      if (!png) continue;
      var t = rawT ? Date.parse(rawT) : NaN;
      var delta = isFinite(t) ? Math.abs(t - target) : i;
      if (delta < bestDelta){ bestDelta = delta; best = f; }
    }
    return best;
  }

  // URL builders (templates per lesson, with fallback to your current 2018 defaults)
  function getManifestFrameAtIndex(idx){
    if (!RADAR_MANIFEST || !Array.isArray(RADAR_MANIFEST.frames) || !RADAR_MANIFEST.frames.length) return null;
    idx = Math.max(0, Math.min(RADAR_MANIFEST.frames.length - 1, idx|0));
    return RADAR_MANIFEST.frames[idx] || null;
  }

  function getManifestFrameUtc(f){
    return f ? (f.utc || f.t || f.time || null) : null;
  }

  function setCurrentRadarFrameIndex(idx){
    if (!RADAR_MANIFEST || !Array.isArray(RADAR_MANIFEST.frames) || !RADAR_MANIFEST.frames.length) return;
    currentRadarFrameIndex = Math.max(0, Math.min(RADAR_MANIFEST.frames.length - 1, idx|0));
    var f = getManifestFrameAtIndex(currentRadarFrameIndex);
    var rawUtc = getManifestFrameUtc(f);
    if (rawUtc) curZ = new Date(rawUtc);
  }

  function stepRadarFrame(delta){
    if (useManifestFrameScrubber && RADAR_MANIFEST && Array.isArray(RADAR_MANIFEST.frames) && RADAR_MANIFEST.frames.length){
      setCurrentRadarFrameIndex(currentRadarFrameIndex + delta);
      updateAll();
      return true;
    }
    return false;
  }

  function radarUrlFor(d){
    var mf = null;
    if (useManifestFrameScrubber && RADAR_MANIFEST && Array.isArray(RADAR_MANIFEST.frames) && RADAR_MANIFEST.frames.length){
      mf = getManifestFrameAtIndex(currentRadarFrameIndex);
    }
    if (!mf) mf = findNearestRadarFrame(d);
    if (mf){
      var png = mf.png || mf.file || mf.filename || mf.name || null;
      if (png){
        return _isAbsUrl(png) ? png : _joinUrl(RADAR_MANIFEST_FOLDER || DATA_BASE, png);
      }
    }
    // Prefer loader-provided helper if present
    if (CFG._patternUrl && CFG.layers && CFG.layers.radar && CFG.layers.radar.framePattern){
      return CFG._patternUrl(CFG.layers.radar.framePattern, d);
    }
    // Lesson template fallback
    if (CFG.radarTemplate){
      return _isAbsUrl(CFG.radarTemplate) ? CFG.radarTemplate : _joinUrl(DATA_BASE, CFG.radarTemplate);
    }
    // Legacy fallback only when no lesson radar is defined
    function pad2(n){ return String(n).padStart(2,'0'); }
    var YYYY = String(d.getUTCFullYear());
    var MM = pad2(d.getUTCMonth()+1);
    var DD = pad2(d.getUTCDate());
    var HH = pad2(d.getUTCHours());
    var mm = pad2(d.getUTCMinutes());
    return _joinUrl(DATA_BASE, 'radar_frames/n0q_' + YYYY + MM + DD + HH + mm + '.png');
  }

  function gfsSnowUrlFor(d){
    // If a lesson provides a template, use it. Otherwise keep your old 2018 logic.
    if (CFG.gfsSnowTemplate && CFG._patternUrl){
      return CFG._patternUrl(CFG.gfsSnowTemplate, d);
    }

    var t = d.getTime();
    var t13 = Date.UTC(2018,3,13,0,0,0);
    var t12 = Date.UTC(2018,3,12,0,0,0);
    if (t >= t13) return DATA_BASE + "gfs_snow/gfs_20180413_00z_f48_snow_weatherbell.png";
    if (t >= t12) return DATA_BASE + "gfs_snow/gfs_20180412_00z_f72_snow_weatherbell.png";
    return DATA_BASE + "gfs_snow/gfs_20180411_00z_f96_snow_weatherbell.png";
  }

  // Expose loaded config for debugging
  window.__WDL_CFG__ = CFG;
  await loadRadarManifestIfNeeded();
// ---------- Map ----------
  var initView = (CFG && CFG.map && CFG.map.initialView) ? CFG.map.initialView : { lat: 43.55, lon: -96.73, zoom: 6 };
  var map = L.map("map", { zoomControl:true }).setView([initView.lat || 43.55, initView.lon || -96.73], initView.zoom || 6);
  window.map = map;
window.CFG = CFG;
window.DATA_BASE = DATA_BASE;
window._isAbsUrl = _isAbsUrl;
window._joinUrl = _joinUrl;
window.setStatus = setStatus;

// Engine safety defaults for optional layers/helpers
var gfsSnowEnabled = false;
var gfsSnowOverlay = null;
function syncJetParticlesToClock(){ /* no-op until jet module is wired */ }
function updateEra5Global(){ /* no-op until ERA5 module is wired */ }
window.gfsSnowEnabled = gfsSnowEnabled;
  if (RADAR_MANIFEST && Array.isArray(RADAR_MANIFEST.leaflet_bounds) && RADAR_MANIFEST.leaflet_bounds.length === 2){
    try { map.fitBounds(L.latLngBounds(RADAR_MANIFEST.leaflet_bounds), { padding:[20,20] }); } catch(e){}
  }

  // Custom lower-right zoom buttons
  var zoomCornerPlus = document.getElementById('zoomCornerPlus');
  var zoomCornerMinus = document.getElementById('zoomCornerMinus');
  if (zoomCornerPlus) zoomCornerPlus.onclick = function(){ map.zoomIn(); };
  if (zoomCornerMinus) zoomCornerMinus.onclick = function(){ map.zoomOut(); };

  // Keep the clock bubble pinned above the layer control
  window.addEventListener('resize', function(){ setTimeout(positionClockBubble, 50); });
  setTimeout(positionClockBubble, 300);


  // Custom zoom box buttons (top-right)
  var zoomPlus = document.getElementById("zoomPlus");
  var zoomMinus = document.getElementById("zoomMinus");
  if (zoomPlus) zoomPlus.onclick = function(){ map.zoomIn(); };
  if (zoomMinus) zoomMinus.onclick = function(){ map.zoomOut(); };

  // Map tools (Ruler / Probe / Draw / Home)
  var toolMeasureBtn = document.getElementById("toolMeasure");
  var toolProbeBtn   = document.getElementById("toolProbe");
  var toolDrawBtn    = document.getElementById("toolDraw");
  var toolEraseBtn   = document.getElementById("toolErase");
  var toolHomeBtn    = document.getElementById("toolHome");

  // Teacher/student mode (URL param): ?mode=student to disable teacher tools
  var isTeacherMode = true;
  try{
    var qsMode = new URLSearchParams(window.location.search).get("mode");
    isTeacherMode = (qsMode !== "student");
  }catch(e){ isTeacherMode = true; }

  // Wire OPEN LESSON button in banner (replaces the old floating tab)
  var openLessonBtn = document.getElementById("openLessonBtn");


  var measureStart = null;
  var measureLine = null;
  var measureStartMarker = null;
  var measurePopup = null;

  function clearMeasureGraphics(){
    try{ if (measureLine) map.removeLayer(measureLine); }catch(e){}
    try{ if (measureStartMarker) map.removeLayer(measureStartMarker); }catch(e){}
    try{ if (measurePopup) map.closePopup(measurePopup); }catch(e){}
    measureLine = null; measureStartMarker = null; measurePopup = null;
    measureStart = null;
  }

  function setMeasureMode(on){
    if (on){
      document.body.classList.add("measure-active");
      document.body.classList.remove("probe-active");
      document.body.classList.remove("draw-active");
    } else {
      document.body.classList.remove("measure-active");
      clearMeasureGraphics();
    }

  }


  /* ===== Storm Lab Fix Pack (v6): missing tool functions ===== */

  // Make sure tool buttons show active state
  function setToolActive(btn, on){
    if (!btn) return;
    btn.classList.toggle("active", !!on);
  }

  // ----- Probe mode (HRRR temp only for now) -----
  function setProbeMode(on){
    if (on){
      document.body.classList.add("probe-active");
      document.body.classList.remove("measure-active");
      document.body.classList.remove("draw-active");
    } else {
      document.body.classList.remove("probe-active");
    }
    setToolActive(toolProbeBtn, on);
    if (on){
      setToolActive(toolMeasureBtn, false);
      setToolActive(toolDrawBtn, false);
    }
  }

  // ----- Measure (ruler) -----
  function handleMeasureClick(e){
    if (!e || !e.latlng) return;

    // First click: set start
    if (!measureStart){
      clearMeasureGraphics();

      measureStart = e.latlng;
      measureStartMarker = L.circleMarker(measureStart, {
        radius: 6, color: "rgba(255,255,255,0.95)", weight: 2,
        fillColor: "rgba(30,136,229,0.95)", fillOpacity: 0.95
      }).addTo(map);

      measurePopup = L.popup({ closeButton:true, className:"hrrr-popup" })
        .setLatLng(measureStart)
        .setContent("<div style='font:900 16px/1.1 Arial,sans-serif'>Ruler</div><div style='font:900 16px/1.1 Arial,sans-serif'>Tap a second point…</div>");
      measurePopup.openOn(map);
      return;
    }

    // Second click: compute distance
    var end = e.latlng;
    var meters = map.distance(measureStart, end);
    var miles = meters / 1609.344;
    var km = meters / 1000;

    try{ if (measureLine) map.removeLayer(measureLine); }catch(_){}
    measureLine = L.polyline([measureStart, end], {
      color: "rgba(30,136,229,0.95)",
      weight: 4,
      opacity: 0.95
    }).addTo(map);

    var content =
      "<div style='font:900 14px/1 Arial,sans-serif;opacity:.9'>Distance</div>" +
      "<div style='font:900 26px/1.05 Arial,sans-serif'>" + miles.toFixed(1) + " mi</div>" +
      "<div style='font:900 16px/1.05 Arial,sans-serif;opacity:.9'>" + km.toFixed(1) + " km</div>";

    measurePopup = L.popup({ closeButton:true, className:"hrrr-popup" })
      .setLatLng(end)
      .setContent(content)
      .openOn(map);

    // Reset start so the next click starts a new measurement
    measureStart = null;
  }

  // Keep measure button "active" styling in sync
  var _origSetMeasureMode = setMeasureMode;
  setMeasureMode = function(on){
    _origSetMeasureMode(on);
    setToolActive(toolMeasureBtn, on);
    if (on){
      setToolActive(toolProbeBtn, false);
      setToolActive(toolDrawBtn, false);
    }
  };

  // ----- Draw / telestrator -----
  var drawGroup = L.layerGroup().addTo(map);
  var drawing = false;
  var currentLine = null;

  function clearDrawings(){
    try{ drawGroup.clearLayers(); }catch(e){}
  }

  function setDrawMode(on){
    if (!isTeacherMode){
      // student mode: do nothing, keep disabled
      setToolActive(toolDrawBtn, false);
      setToolActive(toolEraseBtn, false);
      document.body.classList.remove("draw-active");
      return;
    }

    if (on){
      document.body.classList.add("draw-active");
      document.body.classList.remove("measure-active");
      document.body.classList.remove("probe-active");
      setToolActive(toolDrawBtn, true);
      setToolActive(toolEraseBtn, true);
      setToolActive(toolMeasureBtn, false);
      setToolActive(toolProbeBtn, false);

      // prevent map panning while drawing
      try{ map.dragging.disable(); }catch(e){}
    } else {
      document.body.classList.remove("draw-active");
      setToolActive(toolDrawBtn, false);
      setToolActive(toolEraseBtn, false);
      drawing = false;
      currentLine = null;
      try{ map.dragging.enable(); }catch(e){}
    }
  }

  function startDraw(e){
    if (!document.body.classList.contains("draw-active")) return;
    if (!e || !e.latlng) return;
    drawing = true;

    currentLine = L.polyline([e.latlng], {
      color: "#fdd835",
      weight: 5,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(drawGroup);
  }

  function moveDraw(e){
    if (!drawing || !currentLine) return;
    if (!e || !e.latlng) return;
    currentLine.addLatLng(e.latlng);
  }

  function endDraw(){
    if (!drawing) return;
    drawing = false;
    currentLine = null;
  }

  // Pointer/touch drawing
  map.on("mousedown", startDraw);
  map.on("mousemove", moveDraw);
  map.on("mouseup", endDraw);
  map.on("touchstart", startDraw);
  map.on("touchmove", moveDraw);
  map.on("touchend", endDraw);

  // ----- Probe click handler (HRRR temp nearest point) -----
  function handleProbeClick(e){
    if (!e || !e.latlng) return;

    // Require HRRR temp layer + points
    try{
      if (!(typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer) && Array.isArray(hrrrPoints) && hrrrPoints.length)){
        L.popup({ closeButton:true, className:"hrrr-popup" })
          .setLatLng(e.latlng)
          .setContent("<div style='font:900 16px/1.1 Arial,sans-serif'>Probe</div><div style='font:900 16px/1.1 Arial,sans-serif'>Turn on <b>HRRR Temp (2m)</b>.</div>")
          .openOn(map);
        return;
      }
    }catch(_){}

    var best = null;
    var bestD = Infinity;
    for (var i=0; i<hrrrPoints.length; i++){
      var p = hrrrPoints[i];
      if (!p || typeof p.lat !== "number" || typeof p.lon !== "number") continue;
      var d = map.distance(e.latlng, L.latLng(p.lat, p.lon));
      if (d < bestD){ bestD = d; best = p; }
    }
    if (!best) return;

    var tf = (typeof best.tF === "number") ? best.tF : null;
    var content =
      "<div style='font:900 14px/1 Arial,sans-serif;opacity:.9'>Probe</div>" +
      "<div style='font:900 30px/1.05 Arial,sans-serif'>" + (tf==null ? "—" : Math.round(tf) + "°F") + "</div>";

    L.popup({ closeButton:true, className:"hrrr-popup" })
      .setLatLng([best.lat, best.lon])
      .setContent(content)
      .openOn(map);
  }

if (toolMeasureBtn) toolMeasureBtn.onclick = function(){
    var on = !document.body.classList.contains("measure-active");
    setMeasureMode(on);
    if (on) setDrawMode(false);
  };

  if (toolProbeBtn) toolProbeBtn.onclick = function(){
    // Keep probe simple: if HRRR layer isn't on, tell the user and don't enable.
    try{
      if (!(map && typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer))){
        L.popup({ closeButton:true, className:"hrrr-popup" })
          .setLatLng(map.getCenter())
          .setContent("<div style='font:900 16px/1.1 Arial,sans-serif'>Probe</div><div style='font:900 18px/1.1 Arial,sans-serif'>Turn on <b>HRRR Temp (2m)</b> to probe.</div>")
          .openOn(map);
        setProbeMode(false);
        return;
      }
    }catch(e){}
    var on = !document.body.classList.contains("probe-active");
    setProbeMode(on);
    if (on) setDrawMode(false);
  };

  if (toolDrawBtn) toolDrawBtn.onclick = function(){
    var on = !document.body.classList.contains("draw-active");
    setDrawMode(on);
  };

  if (toolEraseBtn) toolEraseBtn.onclick = function(){
    if (!isTeacherMode) return;
    clearDrawings();
  };

  if (toolHomeBtn) toolHomeBtn.onclick = function(){
    setMeasureMode(false); setProbeMode(false); setDrawMode(false);
    clearMeasureGraphics();
    map.setView([43.55, -96.73], 6);
  };

  // OPEN LESSON button in banner toggles the storyteller panel
  if (openLessonBtn){
    openLessonBtn.onclick = function(){
      try{
        if (storyPanelEl && storyPanelEl.classList.contains("story-open")) closeGuide();
        else openGuide();
      }catch(e){}
    };
  }

  // Disable teacher-only tools in student mode
  if (!isTeacherMode){
    if (toolDrawBtn){ toolDrawBtn.classList.add("disabled"); }
    if (toolEraseBtn){ toolEraseBtn.classList.add("disabled"); }
  }




  // --- State boundaries / outlines (GeoJSON first; tile fallback) ---
  map.createPane("lines");
  map.getPane("lines").style.zIndex = 450;         // above dots, below popups         // above dots
  map.getPane("lines").style.pointerEvents = "none"; // keep clicks working

  var usStatesLayer = null;
  var usStatesLoaded = false;

  // Fallback: reliable reference tiles (works even if GeoJSON isn't present)
  var stateLinesTile = L.tileLayer(
    "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places_Alternate/MapServer/tile/{z}/{y}/{x}",
    { pane: "lines", opacity: 0.95 }
  );

  function loadUsStatesGeoJSONOnce(){
    if (usStatesLoaded) return;
    usStatesLoaded = true;

    fetch("gz_2010_us_040_00_5m.json?v="+Date.now())
      .then(function(res){
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function(geojson){
        usStatesLayer = L.geoJSON(geojson, {
          pane: "lines",
          style: function(){
            return { color:"#000000", weight: 1.2, opacity: 1.0, fillOpacity: 0 };
          }
        });
// If user already has HRRR temp on, add immediately
        if (typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer)) addStateLines();
      })
      .catch(function(err){
        // If GeoJSON missing, we just rely on tile fallback
        console.log("State GeoJSON not loaded (using tile fallback):", err);
      });
  }

  function addStateLines(){
    // Prefer GeoJSON outlines if available; otherwise tile fallback
    if (usStatesLayer) {
      if (!map.hasLayer(usStatesLayer)) usStatesLayer.addTo(map);
      if (map.hasLayer(stateLinesTile)) map.removeLayer(stateLinesTile);
    } else {
      if (!map.hasLayer(stateLinesTile)) stateLinesTile.addTo(map);
    }
  }
  function removeStateLines(){
    if (usStatesLayer && map.hasLayer(usStatesLayer)) map.removeLayer(usStatesLayer);
    if (map.hasLayer(stateLinesTile)) map.removeLayer(stateLinesTile);
  }

  // Kick off loading in the background (won't break anything if missing)
  loadUsStatesGeoJSONOnce();
  // Clean base map (no labels) — CARTO Light (white/gray land)
  var base = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    { attribution: "© OpenStreetMap © CARTO", subdomains:"abcd", maxZoom: 19, className: "basemap-tiles" }
  ).addTo(map);
// (No road overlay)

// --- Extra Midwest city labels (shows more as you zoom in) ---
  var cityLabelLayer = L.layerGroup().addTo(map);

  // --- Wide-view national city labels (decluttered) ---
// Shows a handful of major US cities when zoomed out, without crowding.
var nationalCityLayer = L.layerGroup().addTo(map);

// A curated list of major cities across the US (name, lat, lon)
// You can add/remove freely.
var NATIONAL_CITIES = [
  ["Seattle", 47.6062, -122.3321],
  ["Portland", 45.5152, -122.6784],
  ["San Francisco", 37.7749, -122.4194],
  ["Los Angeles", 34.0522, -118.2437],
  ["San Diego", 32.7157, -117.1611],
  ["Las Vegas", 36.1699, -115.1398],
  ["Phoenix", 33.4484, -112.0740],
  ["Denver", 39.7392, -104.9903],
  ["Dallas", 32.7767, -96.7970],
  ["Houston", 29.7604, -95.3698],
  ["Minneapolis", 44.9778, -93.2650],
  ["Chicago", 41.8781, -87.6298],
  ["St. Louis", 38.6270, -90.1994],
  ["Nashville", 36.1627, -86.7816],
  ["Atlanta", 33.7490, -84.3880],
  ["Miami", 25.7617, -80.1918],
  ["Washington, DC", 38.9072, -77.0369],
  ["Philadelphia", 39.9526, -75.1652],
  ["New York", 40.7128, -74.0060],
  ["Boston", 42.3601, -71.0589]
];

function addDeclutteredCityLabels(layer, cityList, minPx){
  layer.clearLayers();
  var b = map.getBounds();
  var placed = []; // container points
  for (var i=0; i<cityList.length; i++){
    var name = cityList[i][0], lat = cityList[i][1], lon = cityList[i][2];
    var ll = L.latLng(lat, lon);
    if (!b.contains(ll)) continue;

    var pt = map.latLngToContainerPoint(ll);
    var ok = true;
    for (var j=0; j<placed.length; j++){
      var dx = pt.x - placed[j].x;
      var dy = pt.y - placed[j].y;
      if (Math.sqrt(dx*dx + dy*dy) < minPx) { ok = false; break; }
    }
    if (!ok) continue;

    placed.push(pt);
    layer.addLayer(makeCityLabel(name, lat, lon));
  }
}


  function makeCityLabel(name, lat, lon){
    return L.marker([lat, lon], {
      interactive: false,
      icon: L.divIcon({
        className: "town-label",
        html: name,
        iconSize: null
      })
    });
  }

  var CITIES_TIER1 = [
    ["Sioux Falls", 43.5446, -96.7311],
    ["Minneapolis", 44.9778, -93.2650],
    ["Des Moines", 41.5868, -93.6250],
    ["Omaha", 41.2565, -95.9345],
    ["Kansas City", 39.0997, -94.5786],
    ["Rapid City", 44.0805, -103.2310],
    ["Denver", 39.7392, -104.9903]
  ];
  
  var CITIES_TIER2 = [
    ["Fargo", 46.8772, -96.7898],
    ["Bismarck", 46.8083, -100.7837],
    ["Grand Forks", 47.9253, -97.0329],
    ["Minot", 48.2325, -101.2963],
    ["Williston", 48.1469, -103.6180],
    ["Dickinson", 46.8792, -102.7896],
    ["Billings", 45.7833, -108.5007],
    ["Missoula", 46.8721, -113.9940],
    ["Helena", 46.5884, -112.0245],
    ["Great Falls", 47.5053, -111.3008],
    ["Bozeman", 45.6770, -111.0429],
    ["Kalispell", 48.1958, -114.3129],
    ["Brookings", 44.3114, -96.7984],
    ["Watertown", 44.8994, -97.1151],
    ["Huron", 44.3633, -98.2143],
    ["Sioux City", 42.4990, -96.4003],
    ["Mankato", 44.1636, -93.9994],
    ["Rochester", 44.0121, -92.4802],
    ["Aberdeen", 45.4647, -98.4865],
    ["Pierre", 44.3683, -100.3509]
  ];

var CITIES_TIER3 = [
    ["Mitchell", 43.7094, -98.0298],
    ["Yankton", 42.8711, -97.3973],
    ["Vermillion", 42.7794, -96.9292],
    ["Worthington", 43.6194, -95.5964],
    ["Marshall", 44.4469, -95.7880],
    ["Luverne", 43.6541, -96.2125],
    ["Pipestone", 43.9970, -96.3175],
    ["Madison", 44.0061, -97.1133],
    ["Norfolk", 42.0327, -97.4170]
  ];
function updateCityLabels(){
  var z = map.getZoom();

  // When we're VERY zoomed-in, let the basemap labels do the work (less clutter).
  if (z >= 11){
    cityLabelLayer.clearLayers();
    nationalCityLayer.clearLayers();
    return;
  }

  cityLabelLayer.clearLayers();

  // 1) Wide CONUS view: show decluttered major US cities (sparse)
  if (z <= 4){
    var minPxNat = (z <= 2) ? 125 : (z === 3 ? 105 : 90);
    addDeclutteredCityLabels(nationalCityLayer, NATIONAL_CITIES, minPxNat);
  } else {
    nationalCityLayer.clearLayers();
  }

  // 2) Regional "bubble" cities: phase in gradually + declutter to avoid crowding
  // Tier 1 (regional anchors) at zoom 5+
  if (z >= 5){
    var minPx1 = (z === 5) ? 70 : 55;
    addDeclutteredCityLabels(cityLabelLayer, CITIES_TIER1, minPx1);
  }
  // Tier 2 (regional fill) at zoom 6+
  if (z >= 6){
    var minPx2 = (z === 6) ? 50 : 40;
    // add on top of existing; do not clear
    (function(){
      var b = map.getBounds();
      var placed = [];
      // seed placed with existing labels to prevent overlaps
      cityLabelLayer.eachLayer(function(layer){
        if (layer.getLatLng){
          placed.push(map.latLngToContainerPoint(layer.getLatLng()));
        }
      });
      for (var i=0; i<CITIES_TIER2.length; i++){
        var c = CITIES_TIER2[i];
        var ll = L.latLng(c[1], c[2]);
        if (!b.contains(ll)) continue;
        var pt = map.latLngToContainerPoint(ll);
        var ok = true;
        for (var j=0; j<placed.length; j++){
          var dx = pt.x - placed[j].x;
          var dy = pt.y - placed[j].y;
          if (Math.sqrt(dx*dx + dy*dy) < minPx2){ ok = false; break; }
        }
        if (!ok) continue;
        placed.push(pt);
        cityLabelLayer.addLayer(makeCityLabel(c[0], c[1], c[2]));
      }
    })();
  }
  // Tier 3 (local 150-mi-ish) at zoom 8+
  if (z >= 8){
    var minPx3 = (z === 8) ? 32 : 26;
    (function(){
      var b = map.getBounds();
      var placed = [];
      cityLabelLayer.eachLayer(function(layer){
        if (layer.getLatLng){
          placed.push(map.latLngToContainerPoint(layer.getLatLng()));
        }
      });
      for (var i=0; i<CITIES_TIER3.length; i++){
        var c = CITIES_TIER3[i];
        var ll = L.latLng(c[1], c[2]);
        if (!b.contains(ll)) continue;
        var pt = map.latLngToContainerPoint(ll);
        var ok = true;
        for (var j=0; j<placed.length; j++){
          var dx = pt.x - placed[j].x;
          var dy = pt.y - placed[j].y;
          if (Math.sqrt(dx*dx + dy*dy) < minPx3){ ok = false; break; }
        }
        if (!ok) continue;
        placed.push(pt);
        cityLabelLayer.addLayer(makeCityLabel(c[0], c[1], c[2]));
      }
    })();
  }
}

  // Update labels as you zoom/pan
  map.on("zoomend", updateCityLabels);
  map.on("moveend", updateCityLabels);
  updateCityLabels();

// Optional labels
// Optional labels (kept on top to help students)
  var labels = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
    { attribution: "", subdomains:"abcd", maxZoom: 19, pane: "overlayPane" }
  );

  function updateBaseLabels(){
    var z = map.getZoom();
    // Only show built-in labels when EXTREMELY zoomed in (local view)
    if (z >= 11){
      if (!map.hasLayer(labels)) labels.addTo(map);
    } else {
      if (map.hasLayer(labels)) map.removeLayer(labels);
    }
  }
  map.on("zoomend", updateBaseLabels);
  map.on("moveend", updateBaseLabels);
  updateBaseLabels();


  // ---------- Story (Google Sheet) ----------
  var SHEET_ID = "17Hzg7R2fSHJGbOKAKMqG4QAqA1GlSJwFM-SQwPhQObY";
  var SHEET_TAB = "April Blizzard Story";
  var storyItems = [];
  var storyMarkers = [];
  var storyIndex = 0;
  var focusRing = null;

  var storyPanel = document.getElementById("storyPanel");
  var storyTitleEl = document.getElementById("storyTitle");
  var storyBodyEl  = document.getElementById("storyBody");
  var storyStepEl  = document.getElementById("storyStep");

  function storyOpen(){
    if (!storyPanel) return; storyPanel.classList.add("story-open");
    var legendPop = document.getElementById("legendPop");
    if (legendPop) legendPop.classList.add("hidden");
    setTimeout(function(){ map.invalidateSize(); }, 220);
  }
  function storyClose(){
  collapseGuide();
  setTimeout(function(){ map.invalidateSize(); }, 220);
}
function storyToggle(){
  if (document.body.classList.contains("guide-collapsed")) openGuide();
  else collapseGuide();
}

function safeLink(url){
    if (!url) return "";
    return String(url).trim();
  }

  function renderStory(i, panTo){
    if (!storyItems.length) return;
    if (i < 0) i = 0;
    if (i >= storyItems.length) i = storyItems.length - 1;
    storyIndex = i;

    var item = storyItems[storyIndex];
    storyTitleEl.textContent = item.title || "Storm Story";

    var html = "";
    if (item.text) {
      // Convert newlines to paragraphs
      var parts = String(item.text).split(/\n+/).filter(Boolean);
      parts.forEach(function(p){ html += "<p>" + escapeHtml(p) + "</p>"; });
    } else {
      html += "<p class='tiny'>No text for this station yet.</p>";
    }

    var img = safeLink(item.image);
    var vid = safeLink(item.video);

    if (img) {
      html += "<div class='story-media'><img src='" + img + "' alt='Story image'></div>";
    }
    if (vid) {
      // Prefer embed links (youtube embed, vimeo embed, etc.)
      html += "<div class='story-media'><iframe src='" + vid + "' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe></div>";
    }

    storyBodyEl.innerHTML = html;
    storyStepEl.textContent = "Station " + (storyIndex + 1) + " of " + storyItems.length;

    // Highlight markers
    storyMarkers.forEach(function(m, idx){
      if (m && m.setStyle) {
        m.setStyle({
          radius: (idx===storyIndex? 12 : 8),
          opacity: 1,
          fillOpacity: (idx===storyIndex? 1 : 0.9),
          weight: (idx===storyIndex? 3 : 2)
        });
        if (idx===storyIndex && m.bringToFront) m.bringToFront();
      }
    });

    // Focus ring around the active station (helps guide attention)
    if (typeof item.lat === "number" && typeof item.lon === "number") {
      var ringRadiusM = 22000; // ~14 miles
      if (!focusRing) {
        focusRing = L.circle([item.lat, item.lon], {
          radius: ringRadiusM,
          color: "rgba(30,136,229,0.95)",
          weight: 2,
          opacity: 0.95,
          fill: false,
          dashArray: "6 6"
        }).addTo(map);
      } else {
        focusRing.setLatLng([item.lat, item.lon]);
        focusRing.setRadius(ringRadiusM);
      }
      if (focusRing.bringToFront) focusRing.bringToFront();
    }

    if (storyStarted) { storyOpen(); }

    if (panTo && item.lat != null && item.lon != null) {
      map.panTo([item.lat, item.lon], { animate:true });
    }
  }

  function escapeHtml(s){
    return String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  function buildStoryMarkers(){
    // Remove existing
    storyMarkers.forEach(function(m){ try{ map.removeLayer(m); }catch(e){} });
    storyMarkers = [];

    storyItems.forEach(function(item, idx){
      if (typeof item.lat !== "number" || typeof item.lon !== "number") return;

      var m = L.circleMarker([item.lat, item.lon], {
        radius: 8,
        color: "rgba(255,255,255,0.95)",
        weight: 2,
        fillColor: "rgba(30,136,229,0.95)",
        fillOpacity: 0.9
      }).addTo(map);

      m.on("click", function(){
        renderStory(idx, false);
      });

      // Short hover tooltip
      if (item.title) {
        m.bindTooltip(item.title, { direction:"top", offset:[0,-8], opacity:0.9 });
      }

      storyMarkers.push(m);
    });

    // Initial highlight
    renderStory(0, false);
  }

  function loadStory(){
    var url = "https://opensheet.elk.sh/" + SHEET_ID + "/" + encodeURIComponent(SHEET_TAB);
    fetch(url).then(function(r){
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function(rows){
      // Normalize rows
      storyItems = (rows || []).map(function(r){
        var lat = parseFloat(r.lat);
        var lon = parseFloat(r.lon);
        return {
          id: r.id,
          title: r.title || "",
          text: r.text || "",
          lat: isFinite(lat) ? lat : null,
          lon: isFinite(lon) ? lon : null,
          image: r.image || "",
          video: r.video || "",
          terms: r.terms || "",
          order: parseFloat(r.order)
        };
      })
      .filter(function(x){ return x.title || x.text || (x.lat!=null && x.lon!=null); })
      .sort(function(a,b){
        var ao = isFinite(a.order) ? a.order : 9999;
        var bo = isFinite(b.order) ? b.order : 9999;
        return ao - bo;
      });

      if (!storyItems.length) {
        storyBodyEl.innerHTML = "<p class='tiny'>No rows found in your Google Sheet tab '" + SHEET_TAB + "'.</p>";
        return;
      }

      buildStoryMarkers();
      setStatus("Story: loaded " + storyItems.length + " stations");
    }).catch(function(err){
      storyBodyEl.innerHTML = "<p class='tiny'>Could not load story from Google Sheet. Check that the sheet is published, and the tab name is '" + SHEET_TAB + "'.</p>";
      setStatus("Story load failed");
    });
  }

  
// Banner actions
// (Start button removed; Open Lesson button now toggles the guide)
// Guided vs Explore mode
// Guided: story panel controls layers (clean UI)
// Explore: show layer toggles + optional opacity slider
function setExploreMode(isExplore){
  document.body.classList.toggle("explore-mode", !!isExplore);
  // In explore mode we usually collapse the guide to maximize map area
  if (isExplore) collapseGuide();
}

// Guide open/close (collapsible)
var storyPanelEl = document.getElementById("storyPanel");
var storyTabEl   = document.getElementById("storyTab");
var hideGuideBtn = document.getElementById("hideGuideBtn");
var exploreBtn   = document.getElementById("exploreBtn");

function openGuide(){
  if (!storyPanelEl) return;
  storyPanelEl.classList.add("story-open");
  document.body.classList.remove("guide-collapsed");
}
function collapseGuide(){
  if (!storyPanelEl) return;
  storyPanelEl.classList.remove("story-open");
  document.body.classList.add("guide-collapsed");
}
if (hideGuideBtn) hideGuideBtn.onclick = function(){ collapseGuide(); };
if (storyTabEl) storyTabEl.onclick = function(){ storyStarted = true; storyToggle(); };

// Explore toggle
if (exploreBtn) exploreBtn.textContent = "Guided";
if (exploreBtn) exploreBtn.onclick = function(){
  var now = !document.body.classList.contains("explore-mode");
  setExploreMode(now);
  if (exploreBtn) exploreBtn.textContent = now ? "Guided" : "Explore";
  if (!now) openGuide();
};

// Default: guided mode
document.body.classList.add("explore-mode");
document.body.classList.remove("guide-collapsed");
// Opacity slider (applies to the currently visible product)
var radarOpacity = document.getElementById("radarOpacity");

// Remember per-layer opacity so kids can flip products without losing their setting
var productOpacity = { radar: 0.70, snow: 0.70, temp: 0.70, global: 0.70, goes: 0.70, metars: 1.00 };

function getActiveProductKey(){
  // Priority: global > snow > temp > radar (matches your product label logic)
  if (typeof era5Apr10Enabled !== "undefined" && (era5Apr10Enabled || era5Apr11Enabled)) return "global";
  if (typeof gfsSnowEnabled !== "undefined" && gfsSnowEnabled) return "snow";
  if (typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer)) return "temp";
  if (typeof goesEnabled !== "undefined" && goesEnabled) return "goes";
  if (typeof metarVisible !== "undefined" && metarVisible && !(typeof obsRadarEnabled !== "undefined" && obsRadarEnabled)) return "metars";
  return "radar";
}

function setTempOpacity(op){
  if (!hrrrTempGeo) return;
  // base halo is softer, core is stronger
  var baseOp = Math.max(0.10, Math.min(0.85, op * 0.55));
  var coreOp = Math.max(0.20, Math.min(1.00, op));

  hrrrTempGeo.eachLayer(function(layerOrGroup){
    if (layerOrGroup && layerOrGroup.eachLayer){
      layerOrGroup.eachLayer(function(l){
        if (!l || !l.setStyle) return;
        var role = (l.options && l.options._role) ? l.options._role : "core";
        l.setStyle({ fillOpacity: (role === "base") ? baseOp : coreOp });
      });
    }
  });
}

function applyActiveOpacity(){
  if (!radarOpacity) return;
  var v = parseInt(radarOpacity.value || "70", 10);
  var op = Math.max(0.2, Math.min(1, v/100));

  var key = getActiveProductKey();
  productOpacity[key] = op;

  if (key === "radar"){
    if (obsRadarOverlay && obsRadarEnabled) obsRadarOverlay.setOpacity(op);
    if (radarSweepCanvas) radarSweepCanvas.style.opacity = String(op);
  } else if (key === "snow"){
    if (gfsSnowOverlay && gfsSnowEnabled) gfsSnowOverlay.setOpacity(op);
  } else if (key === "temp"){
    setTempOpacity(op);
  } else if (key === "global"){
    ensureEra5Overlays();
    if (era5Apr10Overlay) era5Apr10Overlay.setOpacity(op);
    if (era5Apr11Overlay) era5Apr11Overlay.setOpacity(op);
  } else if (key === "goes"){
    if (goesOverlay && goesEnabled) goesOverlay.setOpacity(op);
  }
}

function syncOpacitySliderToActive(){
  if (!radarOpacity) return;
  var key = getActiveProductKey();
  radarOpacity.value = Math.round((productOpacity[key] || 0.7) * 100);
}

// Wire slider
if (radarOpacity){
  radarOpacity.oninput = applyActiveOpacity;
}


  
// GOES control buttons
var goesPlayBtn  = document.getElementById("goesPlayBtn");
var goesPauseBtn = document.getElementById("goesPauseBtn");
var goesFitBtn   = document.getElementById("goesFitBtn");
var goesSaveBtn  = document.getElementById("goesSaveBtn");
var goesResetBtn = document.getElementById("goesResetBtn");

if (goesPlayBtn) goesPlayBtn.onclick = function(){
  // If frames didn't load (CORS), this will just keep the current frame.
  playGoesAnim(400);
};
if (goesPauseBtn) goesPauseBtn.onclick = function(){
  stopGoesAnim();
};
if (goesFitBtn) goesFitBtn.onclick = function(){
  enableGoesFitMode(!goesFitMode);
  // Make sure overlay is visible while fitting
  if (goesEnabled) updateGoes();
};
if (goesSaveBtn) goesSaveBtn.onclick = function(){
  saveBoundsToStorage(GOES_BOUNDS);
  stopGoesAnim(); // optional, keeps kids from moving it while saving
};
if (goesResetBtn) goesResetBtn.onclick = function(){
  try{ localStorage.removeItem(GOES_STORAGE_KEY); }catch(e){}
  setGoesBounds(GOES_DEFAULT_BOUNDS);
  if (goesEnabled) updateGoes();
};
// Story UI buttons

  
  var storyCloseBtn = document.getElementById("storyCloseBtn");
  if (storyCloseBtn) storyCloseBtn.onclick = storyClose;

  var prevBtn = document.getElementById("storyPrevBtn");
  var nextBtn = document.getElementById("storyNextBtn");
  if (prevBtn) prevBtn.onclick = function(){ renderStory(storyIndex - 1, true); };
  if (nextBtn) nextBtn.onclick = function(){ renderStory(storyIndex + 1, true); };

  var sweepToggleBtn = document.getElementById("sweepToggleBtn");
  bindSweepControls();
  if (sweepToggleBtn) sweepToggleBtn.onclick = function(){
    radarSweepEnabled = !radarSweepEnabled;
    updateSweepUi();
    updateRadar();
  };

  // Load story now
  loadStory();


  map.on("zoomend", function(){
    var zl = document.getElementById("zoomLabel"); if (zl) zl.textContent = map.getZoom();
  });

  // Keep HRRR temp blobs sized appropriately as you zoom
  map.on("zoomend", updateHrrrTempRadius);


  map.on("click", function(e){
    if (document.body.classList.contains("measure-active")) { handleMeasureClick(e); return; }
    if (document.body.classList.contains("probe-active")) { handleProbeClick(e); return; }

    var lp = document.getElementById("legendPop");
    if (lp) lp.classList.add("hidden");

    // 1) HRRR temp probe (if that layer is active)
    if (hrrrTempLayer && map.hasLayer(hrrrTempLayer) && Array.isArray(hrrrPoints) && hrrrPoints.length){
      var best = null, bestDist = Infinity;
      for (var i=0; i<hrrrPoints.length; i++){
        var p = hrrrPoints[i];
        var d = L.latLng(e.latlng.lat, e.latlng.lng).distanceTo([p.lat, p.lon]);
        if (d < bestDist){
          bestDist = d;
          best = p;
        }
      }
      if (!best) return;
      var val = (best.tF != null) ? Number(best.tF).toFixed(0) : "—";
      L.popup({
        className: "hrrr-popup",
        closeButton: true,
        autoPan: true,
        offset: [0, -10]
      })
      .setLatLng([best.lat, best.lon])
      .setContent(val + "°F")
      .openOn(map);
      
    }

    // 2) EURO snow probe (if that layer is active) — uses the same popup style
    if (typeof euroSnowLayer !== "undefined" && euroSnowLayer && map.hasLayer(euroSnowLayer) && Array.isArray(euroPoints) && euroPoints.length){
      var bestE = null, bestED = Infinity;
      for (var k=0; k<euroPoints.length; k++){
        var ep = euroPoints[k];
        var dd = L.latLng(e.latlng.lat, e.latlng.lng).distanceTo([ep.lat, ep.lon]);
        if (dd < bestED){ bestED = dd; bestE = ep; }
      }
      if (bestE){
        var inches = (bestE.value != null) ? Number(bestE.value) : NaN;
        var txt = isFinite(inches) ? inches.toFixed(2) + '"' : "—";
        L.popup({
          className: "hrrr-popup",
          closeButton: true,
          autoPan: true,
          offset: [0, -10]
        })
        .setLatLng([bestE.lat, bestE.lon])
        .setContent('EURO 36h Snow: <span class="mono">' + txt + '</span>')
        .openOn(map);
        return;
      }
    }

    // 3) Jet dots probe (match the HRRR probe look/feel)
// 3) Jet dots probe (match the HRRR probe look/feel)
    if (typeof jetPointsLayer !== "undefined" && jetPointsLayer && map.hasLayer(jetPointsLayer)){
      var bestLayer = null, bestD = Infinity;
      jetPointsLayer.eachLayer(function(layer){
        if (!layer || !layer.getLatLng) return;
        var ll = layer.getLatLng();
        var d = e.latlng.distanceTo(ll);
        if (d < bestD){
          bestD = d;
          bestLayer = layer;
        }
      });

      if (!bestLayer) return;

      var props = (bestLayer.feature && bestLayer.feature.properties) ? bestLayer.feature.properties : {};
      var spd = getJetSpeedMph(props);
      var u = Number(props.u);
      var v = Number(props.v);

      var dirTxt = "";
      if (isFinite(u) && isFinite(v)){
        var dir = metDirFromUV(u, v);
        dirTxt = " • Dir " + dir.toFixed(0) + "°";
      }

      var html = '<div class="hrrr-popup">' +
                 '<div class="hrrr-popup-title">Jet (250 mb)</div>' +
                 '<div class="hrrr-popup-row"><span>Speed</span><span class="hrrr-popup-value">' + (isFinite(spd) ? spd.toFixed(0) : "—") + ' mph</span></div>' +
                 (dirTxt ? '<div class="hrrr-popup-row"><span>Direction</span><span class="hrrr-popup-value">' + dirTxt.replace(" • Dir ","") + '</span></div>' : '') +
                 '</div>';

      L.popup({
        className: "hrrr-popup",
        closeButton: true,
        autoPan: true,
        offset: [0, -10]
      })
      .setLatLng(bestLayer.getLatLng())
      .setContent(html)
      .openOn(map);
    }
  });

  // ---------- Layers ----------
  var obsRadarOverlay = null;
  var obsRadarEnabled = true;
  var radarSweepEnabled = false;
  var radarSweepCanvas = null;
  var radarSweepCtx = null;
  var radarSweepBeamCanvas = null;
  var radarSweepBeamCtx = null;
  var radarSweepImage = null;
  var radarSweepImageUrl = "";
  var radarSweepAnim = 0;
  var radarSweepAngle = 0;
  var radarSweepLastTs = 0;
  var radarSweepStartAngle = -Math.PI / 2;
  var radarSweepSwept = 0;
  var radarSweepCompleted = false;

  // ---------- Static METAR layer ----------
  var metarLayer = null;
  var metarVisible = false;
  window.metarVisible = metarVisible;
  window.obsRadarEnabled = obsRadarEnabled;
  window.radarSweepEnabled = radarSweepEnabled;
  window.spcDay1Enabled = false;
  var metarData = [];
  var metarLoadPromise = null;

  function stopRadarSweep(){
    if (radarSweepAnim){ cancelAnimationFrame(radarSweepAnim); radarSweepAnim = 0; }
  }

  function ensureRadarSweepCanvas(){
    if (!radarSweepCanvas){
      var pane = map.getPanes().overlayPane;
      radarSweepCanvas = L.DomUtil.create('canvas', 'radar-sweep-canvas', pane);
      radarSweepCtx = radarSweepCanvas.getContext('2d');
    }
    if (!radarSweepBeamCanvas){
      var pane2 = map.getPanes().overlayPane;
      radarSweepBeamCanvas = L.DomUtil.create('canvas', 'radar-sweep-canvas', pane2);
      radarSweepBeamCtx = radarSweepBeamCanvas.getContext('2d');
    }
    resizeRadarSweepCanvas();
    radarSweepCanvas.style.opacity = String((productOpacity && productOpacity.radar) || 0.7);
    radarSweepBeamCanvas.style.opacity = "1";
    return radarSweepCanvas;
  }

  function resizeRadarSweepCanvas(){
    if (!map) return;
    var s = map.getSize();
    if (radarSweepCanvas){
      if (radarSweepCanvas.width !== s.x) radarSweepCanvas.width = s.x;
      if (radarSweepCanvas.height !== s.y) radarSweepCanvas.height = s.y;
    }
    if (radarSweepBeamCanvas){
      if (radarSweepBeamCanvas.width !== s.x) radarSweepBeamCanvas.width = s.x;
      if (radarSweepBeamCanvas.height !== s.y) radarSweepBeamCanvas.height = s.y;
    }
  }

  function hideRadarSweepCanvas(){
    stopRadarSweep();
    resetRadarSweepState();
    if (radarSweepCanvas){
      radarSweepCanvas.style.display = 'none';
      if (radarSweepCtx) radarSweepCtx.clearRect(0,0,radarSweepCanvas.width,radarSweepCanvas.height);
    }
    if (typeof radarSweepBeamCanvas !== "undefined" && radarSweepBeamCanvas){
      radarSweepBeamCanvas.style.display = 'none';
      if (radarSweepBeamCtx) radarSweepBeamCtx.clearRect(0,0,radarSweepBeamCanvas.width,radarSweepBeamCanvas.height);
    }
  }

  function updateSweepUi(){
    var btn = document.getElementById('sweepToggleBtn');
    if (btn) btn.textContent = radarSweepEnabled ? 'SWEEP ON' : 'SWEEP OFF';
    var panel = document.getElementById('radarSweepControls');
    if (panel) panel.classList.toggle('open', !!radarSweepEnabled);
  }

  if (typeof radarSweepRPM === "undefined") var radarSweepRPM = 2;
  if (typeof radarSweepBeamPx === "undefined") var radarSweepBeamPx = 1;
  if (typeof radarSweepRangeMiles === "undefined") var radarSweepRangeMiles = 150;

  function destinationPoint(lat, lon, bearingDeg, distanceMeters){
    var R = 6371000;
    var brng = bearingDeg * Math.PI / 180;
    var lat1 = lat * Math.PI / 180;
    var lon1 = lon * Math.PI / 180;
    var ang = distanceMeters / R;

    var lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(ang) +
      Math.cos(lat1) * Math.sin(ang) * Math.cos(brng)
    );

    var lon2 = lon1 + Math.atan2(
      Math.sin(brng) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2)
    );

    return L.latLng(lat2 * 180 / Math.PI, lon2 * 180 / Math.PI);
  }

  function bindSweepControls(){
    var speed = document.getElementById('sweepSpeedSlider');
    if (speed) {
      speed.value = String(radarSweepRPM);
      speed.oninput = function(){
        radarSweepRPM = Math.max(1, Math.min(30, parseInt(this.value || '6', 10)));
      };
    }
    var beam = document.getElementById('sweepBeamSlider');
    if (beam) {
      beam.value = String(radarSweepBeamPx);
      beam.oninput = function(){
        radarSweepBeamPx = Math.max(1, Math.min(8, parseInt(this.value || '2', 10)));
      };
    }
    updateSweepUi();
  }

  function getRadarSweepCenterLatLng(){
    try{
      if (RADAR_MANIFEST && Array.isArray(RADAR_MANIFEST.radar_latlon) && RADAR_MANIFEST.radar_latlon.length === 2){
        return L.latLng(RADAR_MANIFEST.radar_latlon[0], RADAR_MANIFEST.radar_latlon[1]);
      }
    }catch(e){}
    return RADAR_BOUNDS.getCenter();
  }

  function getRadarSweepCenterPoint(){
    return map.latLngToLayerPoint(getRadarSweepCenterLatLng());
  }

  function getRadarSweepRangePx(){
    var centerLL = getRadarSweepCenterLatLng();
    var eastRange = destinationPoint(centerLL.lat, centerLL.lng, 90, radarSweepRangeMiles * 1609.344);
    var c = map.latLngToLayerPoint(centerLL);
    var e = map.latLngToLayerPoint(eastRange);
    var px = Math.hypot(e.x - c.x, e.y - c.y);
    return Math.max(20, px);
  }

  function thetaToBearingDeg(theta){
    var deg = (theta * 180 / Math.PI) + 90;
    deg = ((deg % 360) + 360) % 360;
    return deg;
  }

  function getRadarSweepEndpointPoint(theta){
    var centerLL = getRadarSweepCenterLatLng();
    var endLL = destinationPoint(centerLL.lat, centerLL.lng, thetaToBearingDeg(theta), radarSweepRangeMiles * 1609.344);
    return map.latLngToLayerPoint(endLL);
  }

  function buildRadarSweepSectorPoints(startTheta, endTheta){
    var centerPt = getRadarSweepCenterPoint();
    var pts = [centerPt];
    var sweep = endTheta - startTheta;
    if (sweep <= 0) sweep += Math.PI * 2;
    var steps = Math.max(24, Math.ceil(sweep / (Math.PI / 72)));
    for (var i = 0; i <= steps; i++){
      var t = startTheta + (sweep * i / steps);
      pts.push(getRadarSweepEndpointPoint(t));
    }
    return pts;
  }

  function getRadarSweepDrawState(){
    resizeRadarSweepCanvas();
    var nw = map.latLngToLayerPoint(RADAR_BOUNDS.getNorthWest());
    var se = map.latLngToLayerPoint(RADAR_BOUNDS.getSouthEast());
    var x = nw.x, y = nw.y, w = se.x - nw.x, h = se.y - nw.y;
    var c = getRadarSweepCenterPoint();
    var maxRange = getRadarSweepRangePx();
    return { x:x, y:y, w:w, h:h, c:c, maxRange:maxRange };
  }

  function renderRadarSweepCurrentState(){
    if (!radarSweepCanvas || !radarSweepCtx || !radarSweepImage) return;
    resizeRadarSweepCanvas();
    radarSweepCtx.clearRect(0,0,radarSweepCanvas.width,radarSweepCanvas.height);
    if (radarSweepBeamCtx && radarSweepBeamCanvas) radarSweepBeamCtx.clearRect(0,0,radarSweepBeamCanvas.width,radarSweepBeamCanvas.height);

    var ds = getRadarSweepDrawState();
    if (!(ds.w > 0 && ds.h > 0)) return;

    if (radarSweepCompleted){
      radarSweepCtx.drawImage(radarSweepImage, ds.x, ds.y, ds.w, ds.h);
      return;
    }

    var theta = radarSweepAngle;
    var sectorPts = buildRadarSweepSectorPoints(radarSweepStartAngle, theta);
    radarSweepCtx.save();
    radarSweepCtx.beginPath();
    radarSweepCtx.moveTo(sectorPts[0].x, sectorPts[0].y);
    for (var i = 1; i < sectorPts.length; i++){
      radarSweepCtx.lineTo(sectorPts[i].x, sectorPts[i].y);
    }
    radarSweepCtx.closePath();
    radarSweepCtx.clip();
    radarSweepCtx.drawImage(radarSweepImage, ds.x, ds.y, ds.w, ds.h);
    radarSweepCtx.restore();

    if (radarSweepBeamCtx){
      var endPt = getRadarSweepEndpointPoint(theta);
      radarSweepBeamCtx.save();
      radarSweepBeamCtx.beginPath();
      radarSweepBeamCtx.moveTo(ds.c.x, ds.c.y);
      radarSweepBeamCtx.lineTo(endPt.x, endPt.y);
      radarSweepBeamCtx.lineWidth = Math.max(1, radarSweepBeamPx);
      radarSweepBeamCtx.strokeStyle = "rgba(255, 215, 0, 0.95)";
      radarSweepBeamCtx.shadowColor = "rgba(255, 215, 0, 0.65)";
      radarSweepBeamCtx.shadowBlur = 4;
      radarSweepBeamCtx.stroke();
      radarSweepBeamCtx.restore();
    }
  }

  function resetRadarSweepState(){
    radarSweepLastTs = 0;
    radarSweepStartAngle = -Math.PI / 2;
    radarSweepSwept = 0;
    radarSweepCompleted = false;
    radarSweepAngle = radarSweepStartAngle;
  }

  function startRadarSweep(){
    if (!radarSweepEnabled || !radarSweepImage || !radarSweepCtx || !obsRadarEnabled) return;
    ensureRadarSweepCanvas();
    radarSweepCanvas.style.display = 'block';
    if (radarSweepBeamCanvas) radarSweepBeamCanvas.style.display = 'block';
    stopRadarSweep();
    resetRadarSweepState();
    renderRadarSweepCurrentState();

    function frame(ts){
      if (!radarSweepEnabled || !radarSweepImage || !obsRadarEnabled || !radarSweepCtx) return;
      if (!radarSweepLastTs) radarSweepLastTs = ts;
      var dt = Math.min(0.05, (ts - radarSweepLastTs) / 1000);
      radarSweepLastTs = ts;

      var angVel = (Math.max(1, radarSweepRPM) * 2 * Math.PI / 60);
      var dTheta = angVel * dt;
      radarSweepSwept = Math.min(Math.PI * 2, radarSweepSwept + dTheta);
      radarSweepAngle = radarSweepStartAngle + radarSweepSwept;
      radarSweepCompleted = radarSweepSwept >= Math.PI * 2;
      renderRadarSweepCurrentState();

      if (radarSweepCompleted){
        stopRadarSweep();
        return;
      }

      radarSweepAnim = requestAnimationFrame(frame);
    }

    radarSweepAnim = requestAnimationFrame(frame);
  }

  function setStatus(s){ /* hidden */ }
  window.setStatus = setStatus;

  function positionClockBubble(){
    try{
      var bubble = document.getElementById("clockBubble");
      if (!bubble) return;
      bubble.style.left = "50%";
      bubble.style.right = "auto";
      bubble.style.top = "auto";
      bubble.style.bottom = "14px";
      bubble.style.transform = "translateX(-50%)";
    }catch(e){}
  }

function updateHrrrTempRadius(){
  return;
}

function formatCentralLabel(d){
  try{
    var optsDate = { month: "short", day: "numeric" };
    var optsTime = { hour: "numeric", minute: "2-digit", hour12: true };
    var dateStr = d.toLocaleDateString("en-US", Object.assign({ timeZone: "America/Chicago" }, optsDate));
    var timeStr = d.toLocaleTimeString("en-US", Object.assign({ timeZone: "America/Chicago" }, optsTime));
    timeStr = timeStr.replace(":00", "").replace(" ", "");
    return (dateStr + " " + timeStr).toUpperCase();
  }catch(e){
    return d.toISOString();
  }
}

function nearestHrrrFrameIndexForTime(d){
    if (!hrrrFrames || !hrrrFrames.length) return 0;
    var t = d && d.getTime ? d.getTime() : NaN;
    if (!isFinite(t)) return 0;
    var bestIdx = 0, bestDiff = Infinity;
    for (var i=0;i<hrrrFrames.length;i++){
      var ms = hrrrFrames[i] && hrrrFrames[i].timeMs;
      if (!isFinite(ms)) continue;
      var diff = Math.abs(ms - t);
      if (diff < bestDiff){ bestDiff = diff; bestIdx = i; }
    }
    return bestIdx;
  }

  function setCurrentHrrrFrameIndex(idx){
    if (!hrrrFrames || !hrrrFrames.length) return;
    currentHrrrFrameIndex = Math.max(0, Math.min(hrrrFrames.length - 1, idx|0));
    var f = hrrrFrames[currentHrrrFrameIndex];
    var rawUtc = f ? (f.time || f.utc || f.valid || null) : null;
    if (rawUtc) curZ = new Date(rawUtc);
  }

  function getActiveScrubberMode(){
    if (hrrrTempEnabled && hrrrFrames && hrrrFrames.length) return 'hrrr';
    if (obsRadarEnabled && useManifestFrameScrubber && RADAR_MANIFEST && Array.isArray(RADAR_MANIFEST.frames) && RADAR_MANIFEST.frames.length) return 'radar';
    return 'lesson';
  }

  function syncScrubberToActiveProduct(){
    try{
      var scrub = document.getElementById("cbScrubber");
      if (!scrub) return;
      var mode = getActiveScrubberMode();
      scrub.min = "0";
      scrub.step = "1";
      if (mode === 'hrrr'){
        scrub.max = String(Math.max(0, hrrrFrames.length - 1));
        scrub.value = String(Math.max(0, Math.min(hrrrFrames.length - 1, currentHrrrFrameIndex|0)));
      } else if (mode === 'radar'){
        scrub.max = String(Math.max(0, RADAR_MANIFEST.frames.length - 1));
        scrub.value = String(currentRadarFrameIndex);
      } else {
        var idx = Math.round((curZ.getTime() - startZ.getTime()) / (STEP_MS));
        if (idx < 0) idx = 0;
        var max = Math.round((endZ.getTime() - startZ.getTime()) / (STEP_MS));
        scrub.max = String(max);
        scrub.value = String(idx);
      }
    }catch(e){}
  }

  function setTimeLabel(){
    var label = formatCentralLabel(curZ);
    var btl = document.getElementById("bannerTimeLabel");
    if (btl) btl.textContent = label;

    var cbt = document.getElementById("clockBubbleTime");
    if (cbt) cbt.textContent = label;

    syncScrubberToActiveProduct();
    positionClockBubble();
  }


  function getMetarUrl(){
    try{
      if (!CFG || !CFG.metars) return null;
      var f = CFG.metars.file || CFG.metars.url || null;
      if (!f && CFG.metars.enabled) f = 'metars/metars.json';
      if (!f) return null;
      return _isAbsUrl(f) ? f : _joinUrl(DATA_BASE, f);
    }catch(e){
      return null;
    }
  }

  function metarTempColorF(tmpf){
    var t = Number(tmpf);
    if (!isFinite(t)) return '#f4e8a3';
    if (t <= 20) return '#b39ddb';
    if (t <= 32) return '#90caf9';
    if (t <= 45) return '#80deea';
    if (t <= 60) return '#a5d6a7';
    if (t <= 70) return '#dce775';
    if (t <= 80) return '#ffd54f';
    if (t <= 90) return '#ffb74d';
    return '#ef5350';
  }

  function metarOutlineColor(tmpf){
    var t = Number(tmpf);
    if (!isFinite(t)) return '#243447';
    if (t <= 32) return '#1d4f91';
    if (t <= 60) return '#2e5d34';
    if (t <= 80) return '#8a5a00';
    return '#8b1e1e';
  }

  function metarPopupHtml(r){
    var tempChip = '<span style="display:inline-block;padding:4px 8px;border-radius:999px;background:' + metarTempColorF(r.tmpf) + ';color:#122033;font:900 12px/1 \"Lato\",Arial,sans-serif;border:1px solid rgba(0,0,0,.18)">Temp ' + ((r.tmpf ?? '—')) + '°F</span>';
    var dewChip  = '<span style="display:inline-block;padding:4px 8px;border-radius:999px;background:#d9edf7;color:#122033;font:900 12px/1 \"Lato\",Arial,sans-serif;border:1px solid rgba(0,0,0,.12)">Dew ' + ((r.dwpf ?? '—')) + '°F</span>';
    var parts = [];
    parts.push('<div class="hrrr-popup-title">' + (r.id || 'METAR') + '</div>');
    parts.push('<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 8px 0">' + tempChip + dewChip + '</div>');
    parts.push('<div class="hrrr-popup-row"><span>Valid</span><span class="hrrr-popup-value">' + (r.valid || '—') + '</span></div>');
    var windTxt = '—';
    if (r.drct != null || r.sknt != null){
      windTxt = (r.drct != null ? String(r.drct) + '° ' : '') + (r.sknt != null ? String(r.sknt) + ' kt' : '');
      if (r.gust != null) windTxt += ' G' + String(r.gust);
    }
    parts.push('<div class="hrrr-popup-row"><span>Wind</span><span class="hrrr-popup-value">' + windTxt + '</span></div>');
    parts.push('<div class="hrrr-popup-row"><span>Visibility</span><span class="hrrr-popup-value">' + (r.vsby != null ? r.vsby + ' mi' : '—') + '</span></div>');
    parts.push('<div class="hrrr-popup-row"><span>Altimeter</span><span class="hrrr-popup-value">' + (r.alti != null ? r.alti : '—') + '</span></div>');
    if (r.wxcodes) parts.push('<div class="hrrr-popup-row"><span>Weather</span><span class="hrrr-popup-value">' + r.wxcodes + '</span></div>');
    return '<div class="hrrr-popup">' + parts.join('') + '</div>';
  }

  async function loadMetars(){
    if (metarLoadPromise) return metarLoadPromise;
    var url = getMetarUrl();
    if (!url) throw new Error('No METAR file configured in lesson.json');
    setStatus('Loading METARs…');
    metarLoadPromise = fetch(url, { cache:'no-store' }).then(function(r){
      if (!r.ok) throw new Error('METAR HTTP ' + r.status + ' :: ' + url);
      return r.json();
    }).then(function(rows){
      metarData = Array.isArray(rows) ? rows : [];
      setStatus('METARs loaded: ' + metarData.length + ' stations');
      return metarData;
    }).catch(function(err){
      metarLoadPromise = null;
      setStatus('METAR load failed');
      throw err;
    });
    return metarLoadPromise;
  }

  function metarMinSepForZoom(z){
    if (z <= 5) return 42;
    if (z <= 6) return 32;
    if (z <= 7) return 24;
    if (z <= 8) return 18;
    return 12;
  }

  function buildMetarLayer(){
    var rows = (Array.isArray(metarData) ? metarData : []).filter(function(r){
      return r && isFinite(Number(r.lat)) && isFinite(Number(r.lon));
    });
    var group = L.layerGroup();
    var z = map.getZoom ? map.getZoom() : 6;
    var bounds = map.getBounds ? map.getBounds().pad(0.22) : null;
    var minSep = metarMinSepForZoom(z);
    var placed = [];

    rows.forEach(function(r){
      var lat = Number(r.lat), lon = Number(r.lon);
      if (bounds && !bounds.contains([lat, lon])) return;
      var pt = map.latLngToContainerPoint([lat, lon]);
      for (var i = 0; i < placed.length; i++){
        var dx = pt.x - placed[i].x;
        var dy = pt.y - placed[i].y;
        if ((dx*dx + dy*dy) < (minSep * minSep)) return;
      }
      placed.push(pt);

      var fill = metarTempColorF(r.tmpf);
      var stroke = metarOutlineColor(r.tmpf);
      var tempText = (r.tmpf == null || r.tmpf === '') ? '—' : String(Math.round(Number(r.tmpf)));
      var cls = 'metar-temp-dot' + ((r.tmpf == null || r.tmpf === '') ? ' is-missing' : '');
      var html = '<div class="' + cls + '" style="background:' + fill + ';border-color:' + stroke + ';">' + tempText + '</div>';
      var marker = L.marker([lat, lon], {
        icon: L.divIcon({
          className: 'metar-temp-wrap',
          html: html,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18]
        }),
        pane: 'markerPane',
        keyboard: false
      });
      marker.bindPopup(metarPopupHtml(r), { maxWidth: 280 });
      group.addLayer(marker);
    });

    setStatus('METARs shown: ' + placed.length + '/' + rows.length + ' (zoom ' + z + ')');
    return group;
  }

  function refreshMetarLayer(){
    if (!metarVisible) return;
    if (metarLayer && map.hasLayer(metarLayer)) map.removeLayer(metarLayer);
    metarLayer = buildMetarLayer();
    if (metarLayer) metarLayer.addTo(map);
  }

  async function setMetarsEnabled(on){
    var want = !!on;
    if (want){
      try{
        metarVisible = true;
        window.metarVisible = metarVisible;
        if (!metarLayer){
          if (!metarData.length) await loadMetars();
          metarLayer = buildMetarLayer();
        }
        refreshMetarLayer();
        requestAnimationFrame(function(){ if (metarVisible) refreshMetarLayer(); });
        setStatus('METARs on');
      }catch(err){
        metarVisible = false;
        window.metarVisible = metarVisible;
        setStatus('METARs failed to load');
        console.error(err);
      }
    } else {
      if (metarLayer && map.hasLayer(metarLayer)) map.removeLayer(metarLayer);
      metarVisible = false;
      window.metarVisible = metarVisible;
      setStatus('METARs off');
    }
    try{ updateProductLabel(); }catch(e){}
    try{ setTimeLabel(); }catch(e){}
  }

  async function toggleMetars(){
    await setMetarsEnabled(!metarVisible);
  }

  map.on('zoomend moveend', function(){
    if (metarVisible) refreshMetarLayer();
  });
  window.toggleMetars = toggleMetars;
  window.setMetarsEnabled = setMetarsEnabled;

  var spcDay1Layer = null;
  var spcDay1Enabled = false;

  function getSpcDay1Url(){
    try {
      if (CFG && Array.isArray(CFG.overlays)) {
        for (var i=0;i<CFG.overlays.length;i++){
          var o = CFG.overlays[i] || {};
          var nm = String(o.name || '').toLowerCase();
          if (nm.indexOf('day 1') !== -1 || nm.indexOf('spc') !== -1){
            var u = o.url || o.file;
            if (u) return _isAbsUrl(u) ? u : _joinUrl(DATA_BASE, u);
          }
        }
      }
    } catch(e){}
    return _joinUrl(DATA_BASE, 'overlays/Day1.json');
  }

  function normalizeSpcCategory(props){
    if (!props) return 'TSTM';
    var raw = props.CATEGORICAL || props.category || props.CAT || props.LABEL || props.label || props.risk || props.RISK || '';
    raw = String(raw).trim().toUpperCase();
    if (raw.includes('HIGH')) return 'HIGH';
    if (raw.includes('MDT') || raw.includes('MODERATE')) return 'MDT';
    if (raw.includes('ENH') || raw.includes('ENHANCED')) return 'ENH';
    if (raw.includes('SLGT') || raw.includes('SLIGHT')) return 'SLGT';
    if (raw.includes('MRGL') || raw.includes('MARGINAL')) return 'MRGL';
    if (raw.includes('TSTM') || raw.includes('GENERAL')) return 'TSTM';
    var dn = Number(props.DN ?? props.dn ?? props.VALUE ?? props.value ?? props.level ?? props.LEVEL);
    if (dn === 6) return 'HIGH';
    if (dn === 5) return 'MDT';
    if (dn === 4) return 'ENH';
    if (dn === 3) return 'SLGT';
    if (dn === 2) return 'MRGL';
    if (dn === 1) return 'TSTM';
    return 'TSTM';
  }

  function spcStyle(feature){
    var c = {
      TSTM:{fill:'#C1E9C1',stroke:'#55AA55'},
      MRGL:{fill:'#55BB55',stroke:'#005500'},
      SLGT:{fill:'#FFF566',stroke:'#DDAA00'},
      ENH:{fill:'#FFA366',stroke:'#CC6600'},
      MDT:{fill:'#FF6666',stroke:'#CC0000'},
      HIGH:{fill:'#FF66FF',stroke:'#CC00CC'}
    }[normalizeSpcCategory(feature && feature.properties)] || {fill:'#C1E9C1',stroke:'#55AA55'};
    return { color:c.stroke, weight:2, opacity:0.95, fillColor:c.fill, fillOpacity:0.28 };
  }

  async function ensureSpcDay1Layer(){
    if (spcDay1Layer) return spcDay1Layer;
    var url = getSpcDay1Url();
    var res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
    if (!res.ok) throw new Error('SPC Day 1 HTTP ' + res.status + ': ' + url);
    var gj = await res.json();
    spcDay1Layer = L.geoJSON(gj, { style:spcStyle });
    return spcDay1Layer;
  }

  async function setSpcDay1Enabled(on){
    spcDay1Enabled = !!on;
    window.spcDay1Enabled = spcDay1Enabled;
    if (spcDay1Enabled){
      try{
        var lyr = await ensureSpcDay1Layer();
        if (!map.hasLayer(lyr)) lyr.addTo(map);
        if (lyr.bringToFront) lyr.bringToFront();
        setStatus('SPC Day 1 on');
      } catch(err){
        spcDay1Enabled = false;
        window.spcDay1Enabled = false;
        setStatus('SPC Day 1 failed');
        console.error(err);
      }
    } else {
      if (spcDay1Layer && map.hasLayer(spcDay1Layer)) map.removeLayer(spcDay1Layer);
      setStatus('SPC Day 1 off');
    }
    try{ updateProductLabel(); }catch(e){}
    try{ setTimeLabel(); }catch(e){}
  }
  window.setSpcDay1Enabled = setSpcDay1Enabled;

  async function setRadarEnabled(on){
    obsRadarEnabled = !!on;
    window.obsRadarEnabled = obsRadarEnabled;
    if (!obsRadarEnabled){
      hideRadarSweepCanvas();
      if (obsRadarOverlay && map.hasLayer(obsRadarOverlay)) map.removeLayer(obsRadarOverlay);
      try{ setTimeLabel(); }catch(e){}
      setStatus('Radar off');
    } else {
      radarSweepEnabled = false;
      syncSweepButton();
      updateRadar();
      try{ setTimeLabel(); }catch(e){}
      setStatus('Radar on');
    }
    try{ updateProductLabel(); }catch(e){}
    try{ setTimeLabel(); }catch(e){}
  }
  window.setRadarEnabled = setRadarEnabled;

  var hrrrManifest = null;
  var hrrrFrames = [];
  var currentHrrrFrameIndex = 0;
  var hrrrBounds = null;
  var hrrrLoadPromise = null;
  var hrrrLoadToken = 0;
  var hrrrTempEnabled = false;
  var hrrrTempLayer = null;
  var hrrrTempGeo = null;
  var hrrrPoints = [];
  window.hrrrTempLayer = hrrrTempLayer;
  window.hrrrTempEnabled = hrrrTempEnabled;
  window.hrrrTempGeo = hrrrTempGeo;
  window.hrrrPoints = hrrrPoints;
  window.__HRRR_FRAMES__ = hrrrFrames;

  function _normLon(lon){ lon = Number(lon); if (!isFinite(lon)) return lon; return lon > 180 ? lon - 360 : lon; }
  function getHrrrManifestUrl(){
    try{
      if (CFG && CFG.hrrr){
        var u = CFG.hrrr.manifest || CFG.hrrr.url || CFG.hrrr.file;
        if (u) return _isAbsUrl(u) ? u : _joinUrl(DATA_BASE, u);
      }
    }catch(e){}
    return _joinUrl(DATA_BASE, 'hrrr/manifest.json');
  }
  function parseHrrrBounds(raw){
    if (!raw) return null;
    var b = raw.bounds || raw.bbox || raw.leaflet_bounds || raw;
    var south = Number(b.south ?? b.min_latitude ?? b.minLat ?? (Array.isArray(b) ? b[0]?.[0] : NaN));
    var north = Number(b.north ?? b.max_latitude ?? b.maxLat ?? (Array.isArray(b) ? b[1]?.[0] : NaN));
    var west  = _normLon(b.west ?? b.min_longitude ?? b.minLon ?? (Array.isArray(b) ? b[0]?.[1] : NaN));
    var east  = _normLon(b.east ?? b.max_longitude ?? b.maxLon ?? (Array.isArray(b) ? b[1]?.[1] : NaN));
    if (![south,north,west,east].every(isFinite)) return null;
    return [[south, west],[north, east]];
  }
  function parseHrrrFrames(raw){
    var frames = [];
    var src = (raw && (raw.frames || raw.images || raw.files)) || [];
    if (!Array.isArray(src)) return frames;
    src.forEach(function(f, i){
      if (typeof f === 'string') f = { file:f };
      if (!f) return;
      var file = f.file || f.url || f.png || f.image || f.name;
      if (!file) return;
      var tRaw = f.time || f.valid || f.utc || f.datetime || f.ts || null;
      var t = tRaw ? new Date(tRaw) : null;
      var timeMs = (t && !isNaN(t)) ? t.getTime() : NaN;
      frames.push({ file:file, label:f.label || f.name || ('F' + String(i).padStart(2,'0')), time:tRaw || null, timeMs:timeMs });
    });
    return frames;
  }
  async function loadHrrrManifest(){
    if (hrrrLoadPromise) return hrrrLoadPromise;
    var url = getHrrrManifestUrl();
    setStatus('Loading HRRR manifest…');
    hrrrLoadPromise = fetch(url, { cache:'no-store' }).then(function(r){
      if (!r.ok) throw new Error('HRRR manifest HTTP ' + r.status + ': ' + url);
      return r.json();
    }).then(function(raw){
      hrrrManifest = raw || {};
      hrrrBounds = parseHrrrBounds(raw);
      hrrrFrames = parseHrrrFrames(raw);
      currentHrrrFrameIndex = 0;
      window.__HRRR_FRAMES__ = hrrrFrames;
      if (!hrrrBounds) throw new Error('HRRR manifest missing bounds');
      if (!hrrrFrames.length) throw new Error('HRRR manifest has no frames');
      setStatus('HRRR loaded: ' + hrrrFrames.length + ' frames');
      return raw;
    }).catch(function(err){
      hrrrLoadPromise = null;
      setStatus('HRRR manifest failed');
      throw err;
    });
    return hrrrLoadPromise;
  }
  function currentHrrrFrame(){
    if (!hrrrFrames.length) return null;
    if (hrrrTempEnabled){
      return hrrrFrames[Math.max(0, Math.min(hrrrFrames.length - 1, currentHrrrFrameIndex|0))] || null;
    }
    var valid = hrrrFrames.filter(function(f){ return isFinite(f.timeMs); });
    if (valid.length){
      var best = valid[0], bestDiff = Math.abs(valid[0].timeMs - curZ.getTime());
      for (var i=1;i<valid.length;i++){
        var d = Math.abs(valid[i].timeMs - curZ.getTime());
        if (d < bestDiff){ best = valid[i]; bestDiff = d; }
      }
      return best;
    }
    if (hrrrFrames.length === 1) return hrrrFrames[0];
    var frac = (curZ.getTime() - startZ.getTime()) / Math.max(1, (endZ.getTime() - startZ.getTime()));
    var idx = Math.max(0, Math.min(hrrrFrames.length - 1, Math.round(frac * (hrrrFrames.length - 1))));
    return hrrrFrames[idx];
  }
  function hrrrFrameUrl(frame){
    if (!frame) return null;
    return _isAbsUrl(frame.file) ? frame.file : _joinUrl(_joinUrl(DATA_BASE, 'hrrr/'), frame.file);
  }
  function updateHrrrOverlay(){
    if (!hrrrTempEnabled){
      if (hrrrTempLayer && map.hasLayer(hrrrTempLayer)) map.removeLayer(hrrrTempLayer);
      return;
    }
    var frame = currentHrrrFrame();
    if (!frame || !hrrrBounds) return;
    var url = hrrrFrameUrl(frame);
    if (!url) return;
    var token = ++hrrrLoadToken;
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      if (token !== hrrrLoadToken) return;
      if (hrrrTempLayer && map.hasLayer(hrrrTempLayer)) map.removeLayer(hrrrTempLayer);
      var op = productOpacity.temp || 0.70;
      hrrrTempLayer = L.imageOverlay(url, hrrrBounds, { opacity: op, interactive:false });
      window.hrrrTempLayer = hrrrTempLayer;
      hrrrTempLayer.addTo(map);
      applyActiveOpacity();
      setStatus('HRRR Temp: ' + (frame.label || url));
      try{ updateProductLabel(); }catch(e){}
    };
    img.onerror = function(){
      if (token !== hrrrLoadToken) return;
      setStatus('HRRR missing: ' + url);
    };
    img.src = url;
  }
  async function setHrrrTempEnabled(on){
    hrrrTempEnabled = !!on;
    window.hrrrTempEnabled = hrrrTempEnabled;
    if (!hrrrTempEnabled){
      if (hrrrTempLayer && map.hasLayer(hrrrTempLayer)) map.removeLayer(hrrrTempLayer);
      setStatus('HRRR Temp off');
      try{ updateProductLabel(); }catch(e){}
      try{ setTimeLabel(); }catch(e){}
      return;
    }
    try{
      await loadHrrrManifest();
      currentHrrrFrameIndex = nearestHrrrFrameIndexForTime(curZ);
      setCurrentHrrrFrameIndex(currentHrrrFrameIndex);
      updateHrrrOverlay();
      setStatus('HRRR Temp on');
    }catch(err){
      hrrrTempEnabled = false;
      window.hrrrTempEnabled = false;
      console.error(err);
      setStatus('HRRR Temp failed');
    }
    try{ updateProductLabel(); }catch(e){}
    try{ setTimeLabel(); }catch(e){}
  }
  window.setHrrrTempEnabled = setHrrrTempEnabled;

  function updateProductLabel(){
  var pl = document.getElementById("productLabel");
  if (!pl) return;

  // IMPORTANT: never concatenate labels (it will crowd the middle).
  // Choose ONE label based on what is currently visible/active.
  var candidates = [
    { on: (typeof era5Apr10Enabled !== "undefined" && (era5Apr10Enabled || era5Apr11Enabled)), label: "GLOBAL TEMP" },
    { on: (typeof gfsSnowEnabled !== "undefined" && gfsSnowEnabled), label: "SNOW" },
    { on: (typeof goesEnabled !== "undefined" && goesEnabled), label: "SATELLITE" },
    { on: (typeof spcDay1Enabled !== "undefined" && spcDay1Enabled), label: "SPC DAY 1" },
    { on: (typeof metarVisible !== "undefined" && metarVisible && !(typeof obsRadarEnabled !== "undefined" && obsRadarEnabled)), label: "METARS" },
    { on: (typeof ptypeEnabled  !== "undefined" && ptypeEnabled),  label: "P-TYPE" },
    { on: (typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer)), label: "TEMP" },
    { on: (typeof obsRadarEnabled !== "undefined" && obsRadarEnabled), label: "RADAR" }
  ];

  var label = "MAP";
  for (var i=0;i<candidates.length;i++){
    if (candidates[i].on){ label = candidates[i].label; break; }
  }
  pl.textContent = label;
}
  function updateLegend(){
    var el = document.getElementById("mapLegend");
    if (!el) return;
    var bar = el.querySelector(".leg-mini-bar");
    var title = "";

    var key = getActiveProductKey();
    if (key === "radar"){
      title = "Radar reflectivity";
      if (bar) bar.style.background = "linear-gradient(90deg, #2b83ba, #4ecdc4, #a8e6a3, #ffd166, #ef476f)";
      el.style.display = "";
    } else if (key === "snow"){
      title = "Snow (forecast)";
      if (bar) bar.style.background = "linear-gradient(90deg, #ffffff, #d7ecff, #9ac8ff, #4f7cff)";
      el.style.display = "";
    } else if (key === "goes"){
      title = "GOES Satellite";
      el.style.display = "none";
    } else if (key === "global"){
      title = "Global 2m Temperature (°F) — ERA5";
      if (bar) bar.style.background = "linear-gradient(90deg, #2d004b 0%, #542788 12%, #2166ac 26%, #67a9cf 40%, #d1e5f0 52%, #fff7bc 62%, #fec44f 72%, #f16913 84%, #d73027 100%)";
      el.style.display = "";
    } else { // temp
      title = "2m Temperature (°F)";
      // WeatherBell-ish continuous temp ramp (cold blues -> greens -> yellows -> oranges -> reds -> purples)
      if (bar) bar.style.background = "linear-gradient(90deg, #0b2e83 0%, #1f66d3 15%, #6fb7ff 28%, #1f8a3a 42%, #7fe36d 52%, #ffe14a 63%, #ff9a1f 73%, #e31a1c 82%, #a4007c 92%, #ff66ff 100%)";
      el.style.display = "";
    }

    el.title = title;
  }


  var radarLoadToken = 0;
  function updateRadar(){
    if (!obsRadarEnabled){
      hideRadarSweepCanvas();
      if (obsRadarOverlay){ try{ map.removeLayer(obsRadarOverlay); }catch(e){} obsRadarOverlay = null; }
      return;
    }
    var url = radarUrlFor(curZ);
    var myToken = ++radarLoadToken;

    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function(){
      if (myToken !== radarLoadToken) return;
      radarSweepImage = img;
      radarSweepImageUrl = url;
      var op = 0.70; var rs = document.getElementById("radarOpacity"); if (rs){ op = Math.max(0.2, Math.min(1, parseInt(rs.value||"70",10)/100)); }

      if (radarSweepEnabled){
        if (obsRadarOverlay){ try{ map.removeLayer(obsRadarOverlay); }catch(e){} obsRadarOverlay = null; }
        ensureRadarSweepCanvas();
        radarSweepCanvas.style.opacity = String(op);
        startRadarSweep();
        updateSweepUi();
        setStatus("Radar sweep: " + url);
      } else {
        hideRadarSweepCanvas();
        updateSweepUi();
        if (obsRadarOverlay){ try{ map.removeLayer(obsRadarOverlay); }catch(e){} }
        obsRadarOverlay = L.imageOverlay(url, RADAR_BOUNDS, { opacity: op, interactive:false });
        obsRadarOverlay.addTo(map);
        applyActiveOpacity();
        setStatus("Radar: " + url);
      }
    };
    img.onerror = function(){
      if (myToken !== radarLoadToken) return;
      hideRadarSweepCanvas();
      setStatus("Radar missing: " + url + " (check manifest/frames path)");
    };
    img.src = url;
  }

  
  function updateGfsSnow(){
    if (!gfsSnowEnabled) return;

    var url = gfsSnowUrlFor(curZ);

    // Preload to avoid flashing broken images
    var img = new Image();
    img.onload = function(){
      if (gfsSnowOverlay){ map.removeLayer(gfsSnowOverlay); }
      // Use same bounds as the rest of the CONUS layers for consistent alignment
      gfsSnowOverlay = L.imageOverlay(url, RADAR_BOUNDS, { opacity: 0.75, interactive: false });
      gfsSnowOverlay.addTo(map);
      setStatus("GFS Snow: " + url);
    };
    img.onerror = function(){
      setStatus("GFS Snow missing: " + url + " (check /gfs_snow/)");
    };
    img.src = url;
  }


function alertsUrlFor(d){
  // Optional: provide a URL to a GeoJSON feed of warnings. Return null to disable.
  return null;
}

function updateAlerts(){
    
    var url = alertsUrlFor(curZ);
    if (!url) { alertsLayer.clearLayers(); return; }
    fetch(url).then(function(r){
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function(gj){
      alertsLayer.clearLayers();
      alertsLayer.addData(gj);
      alertsLayer.addTo(map);
      setStatus("Alerts: " + url);
    }).catch(function(err){
      alertsLayer.clearLayers();
      setStatus("Alerts missing: " + url);
    });
  }

  function updateAll(){
    setTimeLabel();
    // Keep jet particles in sync with the master banner clock
    if (typeof syncJetParticlesToClock === "function") syncJetParticlesToClock();
    updateRadar();
    if (typeof updateGfsSnow === "function") updateGfsSnow();
    if (typeof updateEra5Global === "function") updateEra5Global();
    updateHrrrOverlay();
    updateAlerts();
    if (typeof metarVisible !== "undefined" && metarVisible && metarLayer && !map.hasLayer(metarLayer)) metarLayer.addTo(map);
    updateProductLabel();
    if (typeof window.updateBoundaryMode === "function") window.updateBoundaryMode();
  }

  // ---------- Time controls ----------
  function clampTime(){
    if (curZ < startZ) curZ = new Date(startZ.getTime());
    if (curZ > endZ) curZ = new Date(endZ.getTime());
  }

  function stepActiveScrubber(delta){
    var mode = getActiveScrubberMode();
    if (mode === 'radar'){
      if (stepRadarFrame(delta)) return true;
    } else if (mode === 'hrrr'){
      var idx = nearestHrrrFrameIndexForTime(curZ);
      setCurrentHrrrFrameIndex(idx + delta);
      updateAll();
      return true;
    }
    return false;
  }

  var _back = document.getElementById('cbBackBtn') || document.getElementById('bBackBtn');
  if (_back) _back.title = "Back " + STEP_LABEL;
  if (_back) _back.onclick = function(){
    if (stepActiveScrubber(-1)) return;
    curZ = new Date(curZ.getTime() - STEP_MS);
    clampTime(); updateAll();
  };
  var _fwd = document.getElementById('cbFwdBtn') || document.getElementById('bFwdBtn');
  if (_fwd) _fwd.title = "Forward " + STEP_LABEL;
  if (_fwd) _fwd.onclick = function(){
    if (stepActiveScrubber(1)) return;
    curZ = new Date(curZ.getTime() + STEP_MS);
    clampTime(); updateAll();
  };

  // Time scrubber (drag to jump through time)
  var _scrub = document.getElementById("cbScrubber");
  if (_scrub){
    _scrub.oninput = function(){
      var v = parseInt(_scrub.value, 10);
      if (!isFinite(v)) return;
      var mode = getActiveScrubberMode();
      if (mode === 'radar'){
        setCurrentRadarFrameIndex(v);
        setTimeLabel();
        updateRadar();
        updateProductLabel();
        return;
      }
      if (mode === 'hrrr'){
        setCurrentHrrrFrameIndex(v);
        setTimeLabel();
        updateHrrrOverlay();
        updateProductLabel();
        return;
      }
      curZ = new Date(startZ.getTime() + v*STEP_MS);
      clampTime(); updateAll();
    };
  }
  var _sweepBtn = document.getElementById("sweepToggleBtn");
  function syncSweepButton(){
    window.radarSweepEnabled = radarSweepEnabled;
    if (_sweepBtn) _sweepBtn.textContent = radarSweepEnabled ? "SWEEP ON" : "SWEEP OFF";
  }
  if (_sweepBtn){
    _sweepBtn.onclick = function(){
      radarSweepEnabled = !radarSweepEnabled;
      syncSweepButton();
      updateRadar();
    };
    syncSweepButton();
  }

  map.on('zoom move resize', function(){
    resizeRadarSweepCanvas();
    if (radarSweepEnabled && radarSweepImage){
      if (radarSweepCanvas) radarSweepCanvas.style.display = 'block';
      if (radarSweepBeamCanvas) radarSweepBeamCanvas.style.display = 'block';
      renderRadarSweepCurrentState();
    }
  });



  const zIn = document.getElementById("zoomInBtn");
  const zOut = document.getElementById("zoomOutBtn");
  if (zIn) zIn.onclick = () => map.zoomIn();
  if (zOut) zOut.onclick = () => map.zoomOut();


  // Initial
  setTimeLabel();
  // Add overlays based on default checkboxes
  // Alerts starts OFF; radar starts ON.
  updateAll();



})();


/* ---- extracted inline script 8 ---- */
(function(){
  // ---------- Glossary Data (starter pack) ----------
  var GLOSSARY = [
    {
      term: "Dew Point",
      category: "Moisture",
      definition: "The temperature air must cool to become saturated with water vapor.",
      brian: "It’s the best quick clue for how ‘humid’ the air really is.",
      why: ["Higher dew point = stickier air", "Helps predict fog, clouds, and storm fuel"]
    },
    {
      term: "Humidity",
      category: "Moisture",
      definition: "A measure of how much water vapor is in the air.",
      brian: "Humidity tells you how much invisible water is mixed into the air around you.",
      why: ["Affects comfort", "Impacts cloud and precipitation formation"]
    },
    {
      term: "Relative Humidity",
      category: "Moisture",
      definition: "The percentage of water vapor in the air compared to the maximum it could hold at that temperature.",
      brian: "It’s temperature-dependent — warm air can ‘hold’ more moisture than cold air.",
      why: ["Explains why RH can rise at night as temps fall", "Useful for fog and cloud timing"]
    },
    {
      term: "Jet Stream",
      category: "Wind",
      definition: "A narrow band of strong winds in the upper levels of the atmosphere.",
      brian: "Think of it like a fast river of air that helps steer storms.",
      why: ["Guides storm track", "Stronger jet can support stronger storms"]
    },
    {
      term: "Trough",
      category: "Wind",
      definition: "An elongated area of lower pressure aloft, often associated with rising air.",
      brian: "A dip in the flow that often helps storms grow.",
      why: ["Often increases lift", "Frequently tied to storm development"]
    },
    {
      term: "Ridge",
      category: "Wind",
      definition: "An elongated area of higher pressure aloft, often associated with sinking air.",
      brian: "A bump in the flow that often favors calmer, drier weather.",
      why: ["Can suppress storm growth", "Often linked with warmer temps"]
    }
  ];

  // ---------- Elements ----------
  var btn = document.getElementById("stormScienceGuideBtn");
  var panel = document.getElementById("stormScienceGuide");
  var closeBtn = document.getElementById("ssgCloseBtn");
  var tabScene = document.getElementById("ssgTabScene");
  var tabAll = document.getElementById("ssgTabAll");
  var search = document.getElementById("ssgSearch");
  var body = document.getElementById("ssgBody");

  if (!btn || !panel || !body) return;

  // ---------- State ----------
  var mode = "scene"; // "scene" or "all"
  var q = "";

  function openPanel(){
    document.body.classList.add("ssg-open");
    try{ if (typeof map !== "undefined") setTimeout(function(){ map.invalidateSize(); }, 220); }catch(e){}
    render();
  }
  function closePanel(){
    document.body.classList.remove("ssg-open");
    try{ if (typeof map !== "undefined") setTimeout(function(){ map.invalidateSize(); }, 220); }catch(e){}
  }
  function togglePanel(){
    if (document.body.classList.contains("ssg-open")) closePanel();
    else openPanel();
  }

  btn.addEventListener("click", togglePanel);
  if (closeBtn) closeBtn.addEventListener("click", closePanel);

  // Tabs
  function setMode(m){
    mode = m;
    tabScene.classList.toggle("active", mode === "scene");
    tabAll.classList.toggle("active", mode === "all");
    render();
  }
  tabScene.addEventListener("click", function(){ setMode("scene"); });
  tabAll.addEventListener("click", function(){ setMode("all"); });

  // Search
  search.addEventListener("input", function(){
    q = (search.value || "").trim().toLowerCase();
    render();
  });

  // Hook into your story: if you later add a "terms" field to the sheet rows,
  // and you store it in storyItems[storyIndex].terms, this will auto work.
  function getSceneTerms(){
    try{
      if (typeof storyItems !== "undefined" && typeof storyIndex !== "undefined"){
        var item = storyItems[storyIndex];
        if (item && item.terms){
          return String(item.terms).split(",").map(function(s){ return s.trim().toLowerCase(); }).filter(Boolean);
        }
      }
    }catch(e){}
    return [];
  }

  function matchesSearch(entry){
    if (!q) return true;
    var blob = (entry.term + " " + entry.category + " " + entry.definition + " " + entry.brian).toLowerCase();
    return blob.indexOf(q) !== -1;
  }

  function renderTerm(entry){
    var whyHtml = (entry.why || []).map(function(x){ return "<li>" + escapeHtml(x) + "</li>"; }).join("");
    return (
      "<div class='ssg-term'>" +
        "<h4>" + escapeHtml(entry.term) + "</h4>" +
        "<div class='ssg-def'><b>Definition:</b> " + escapeHtml(entry.definition) + "</div>" +
        "<div class='ssg-brian'><b>In Brian’s words:</b> " + escapeHtml(entry.brian) + "</div>" +
        (whyHtml ? ("<ul class='ssg-why'><b>Why it matters:</b>" + whyHtml + "</ul>") : "") +
        "<div class='ssg-pill'>" + escapeHtml(entry.category || "Term") + "</div>" +
      "</div>"
    );
  }

  function render(){
    var html = "";

    if (mode === "scene"){
      var scene = getSceneTerms();

      html += "<p class='tiny' style='margin:8px 0 0 0; opacity:.85;'>Terms tied to this station.</p>";

      if (!scene.length){
        html += "<div class='ssg-term'><h4>Coming soon</h4>" +
                "<div class='ssg-def'>We haven’t tagged terms for this station yet.</div>" +
                "<div class='ssg-brian'><b>Easy upgrade:</b> add a <span class='mono'>terms</span> column in your story sheet like: <span class='mono'>dew point, jet stream</span></div>" +
                "</div>";
      } else {
        var found = 0;
        GLOSSARY.forEach(function(e){
          var key = e.term.toLowerCase();
          var ok = scene.some(function(t){ return key.indexOf(t) !== -1 || t.indexOf(key) !== -1; });
          if (ok && matchesSearch(e)){ html += renderTerm(e); found++; }
        });
        if (!found){
          html += "<div class='ssg-term'><h4>No matches</h4><div class='ssg-def'>Try a different search or switch to <b>All Terms</b>.</div></div>";
        }
      }

    } else {
      var any = 0;
      GLOSSARY.forEach(function(e){
        if (matchesSearch(e)){ html += renderTerm(e); any++; }
      });
      if (!any){
        html += "<div class='ssg-term'><h4>No matches</h4><div class='ssg-def'>Try searching “dew point” or “jet stream”.</div></div>";
      }
    }

    body.innerHTML = html;
  }

  function escapeHtml(s){
    return String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }



})();


/* ---- extracted inline script 9 ---- */
// ===== Lesson boundary overlays (states + counties from lesson.json) =====
(function(){
  function initBoundaries(){
    var map = window.map;
    var CFG = window.CFG || {};
    var DATA_BASE = window.DATA_BASE || "./";
    var _isAbsUrl = window._isAbsUrl || function(u){
      return /^https?:\/\//i.test(String(u || "")) ||
             String(u || "").startsWith("data:") ||
             String(u || "").startsWith("blob:");
    };
    var _joinUrl = window._joinUrl || function(base, rel){
      if (!rel) return String(base || "");
      if (_isAbsUrl(rel)) return String(rel);
      var b = String(base || "");
      var r = String(rel).replace(/^\.\//, "").replace(/^\//, "");
      if (!b) return r;
      return (b.endsWith("/") ? b : (b + "/")) + r;
    };
    var setStatus = window.setStatus || function(){};

    if (!map || typeof map.getPane !== 'function' || typeof map.hasLayer !== 'function') return false;

    try{
      if (!map.getPane("boundariesPane")) map.createPane("boundariesPane");
      map.getPane("boundariesPane").style.zIndex = 525;
      map.getPane("boundariesPane").style.pointerEvents = "none";
    } catch(e){
      console.warn("Could not create boundaries pane:", e);
      return false;
    }

    var boundaryRenderer = L.svg({ pane: "boundariesPane" });
    try { boundaryRenderer.addTo(map); } catch(e) { console.warn('Boundary renderer add failed:', e); }

    window.statesEnabled = !!window.statesEnabled;
    window.countiesEnabled = !!window.countiesEnabled;

    var statesLayer = null;
    var countiesLayer = null;
    var statesLoadPromise = null;
    var countiesLoadPromise = null;

    function boundaryUrl(kind){
      try{
        var rel = CFG && CFG.boundaries && CFG.boundaries[kind];
        if (!rel) return null;
        return _isAbsUrl(rel) ? rel : _joinUrl(DATA_BASE, rel);
      } catch(e){
        return null;
      }
    }

    function boundaryStyle(kind){
      if (kind === "counties"){
        return { color: "#5f6b7a", weight: 0.8, opacity: 0.45, fill: false, fillOpacity: 0, interactive: false };
      }
      return { color: "#1f2937", weight: 1.8, opacity: 0.8, fill: false, fillOpacity: 0, interactive: false };
    }

    function buildBoundaryLayer(kind, gj){
      return L.geoJSON(gj, {
        pane: "boundariesPane",
        renderer: boundaryRenderer,
        interactive: false,
        bubblingMouseEvents: false,
        style: function(){ return boundaryStyle(kind); }
      });
    }

    function ensureBoundaryLayer(kind){
      if (kind === "states" && statesLayer) return Promise.resolve(statesLayer);
      if (kind === "counties" && countiesLayer) return Promise.resolve(countiesLayer);

      var existing = (kind === "states") ? statesLoadPromise : countiesLoadPromise;
      if (existing) return existing;

      var url = boundaryUrl(kind);
      if (!url) return Promise.reject(new Error("No boundary file configured for " + kind));

      var prom = fetch(url, { cache: "no-store" })
        .then(function(r){
          if (!r.ok) throw new Error(kind + " boundaries HTTP " + r.status + " :: " + url);
          return r.json();
        })
        .then(function(gj){
          var layer = buildBoundaryLayer(kind, gj);
          if (kind === "states") statesLayer = layer;
          else countiesLayer = layer;
          refreshBoundaryVisibility();
          return layer;
        })
        .catch(function(err){
          if (kind === "states") statesLoadPromise = null;
          else countiesLoadPromise = null;
          console.error("Boundary load failed:", kind, err);
          throw err;
        });

      if (kind === "states") statesLoadPromise = prom;
      else countiesLoadPromise = prom;
      return prom;
    }

    function safeHasLayer(layer){
      return !!layer && map && typeof map.hasLayer === 'function' && map.hasLayer(layer);
    }
    function safeAdd(layer){
      if (!layer) return;
      if (!safeHasLayer(layer)) {
        try { layer.addTo(map); } catch(err){ console.error("Boundary add failed:", err); }
      }
    }
    function safeRemove(layer){
      if (!layer) return;
      if (safeHasLayer(layer)) {
        try { map.removeLayer(layer); } catch(err){ console.error("Boundary remove failed:", err); }
      }
    }

    function refreshBoundaryVisibility(){
      var z = 0;
      try { z = map.getZoom(); } catch(e){}

      if (statesLayer){
        if (window.statesEnabled) {
          safeAdd(statesLayer);
          try { statesLayer.bringToFront(); } catch(e){}
        } else {
          safeRemove(statesLayer);
        }
      }

      var showCounties = !!window.countiesEnabled && z >= 7;
      if (countiesLayer){
        if (showCounties) {
          safeAdd(countiesLayer);
          try { countiesLayer.bringToFront(); } catch(e){}
        } else {
          safeRemove(countiesLayer);
        }
      }
    }

    async function updateBoundaryMode(){
      try{
        var radar = !!window.obsRadarEnabled;
        var metars = !!window.metarVisible;
        var hrrr = !!window.hrrrTempEnabled;
        var spc = !!window.spcDay1Enabled;
        var z = 0;
        try { z = map.getZoom(); } catch(e){}

        var wantStates = radar || metars || hrrr || spc;
        var wantCounties = radar && z >= 7;

        if (wantStates && !statesLayer) await ensureBoundaryLayer("states");
        if (wantCounties && !countiesLayer) await ensureBoundaryLayer("counties");

        window.statesEnabled = wantStates;
        window.countiesEnabled = wantCounties;
        refreshBoundaryVisibility();
      } catch(err){
        console.error("Boundary mode update failed:", err);
      }
    }
    window.updateBoundaryMode = updateBoundaryMode;

    window.setStatesEnabled = async function(on){
      window.statesEnabled = !!on;
      try{
        if (window.statesEnabled){
          await ensureBoundaryLayer("states");
          setStatus("States on");
        } else {
          setStatus("States off");
        }
        refreshBoundaryVisibility();
      } catch(err){
        console.error(err);
        setStatus("States failed");
      }
    };

    window.setCountiesEnabled = async function(on){
      window.countiesEnabled = !!on;
      try{
        if (window.countiesEnabled){
          await ensureBoundaryLayer("counties");
          refreshBoundaryVisibility();
          if (map.getZoom() < 7) setStatus("Counties on (zoom to 7+ to view)");
          else setStatus("Counties on");
        } else {
          setStatus("Counties off");
          refreshBoundaryVisibility();
        }
      } catch(err){
        console.error(err);
        setStatus("Counties failed");
      }
    };

    map.on("zoomend", updateBoundaryMode);
    map.on("moveend", refreshBoundaryVisibility);

    setTimeout(function(){ updateBoundaryMode(); }, 0);

    console.log("✅ Boundary overlay system initialized");
    return true;
  }

  function waitForBoundaryInit(){
    if (!initBoundaries()) setTimeout(waitForBoundaryInit, 200);
  }
  waitForBoundaryInit();
})();


/* ---- extracted inline script 10 ---- */
(function(){
  var dock = document.getElementById('investigationDock');
  var body = document.getElementById('investigationBody');
  if (!dock || !body) return;

  var tabs = Array.prototype.slice.call(dock.querySelectorAll('.inv-tab'));
  var panes = Array.prototype.slice.call(dock.querySelectorAll('.inv-pane'));
  var chips = Array.prototype.slice.call(dock.querySelectorAll('.inv-chip[data-action]'));

  function showPane(name){
    tabs.forEach(function(btn){ btn.classList.toggle('active', btn.getAttribute('data-tab') === name); });
    panes.forEach(function(p){ p.classList.toggle('active', p.getAttribute('data-pane') === name); });
  }
  function expandDock(){ body.classList.remove('collapsed'); }
  function collapseDock(){ body.classList.add('collapsed'); }

  tabs.forEach(function(btn){
    btn.addEventListener('click', function(ev){
      ev.preventDefault();
      showPane(btn.getAttribute('data-tab'));
      expandDock();
    });
  });

  function refreshDockStates(){
    var termsOpen = document.body.classList.contains('ssg-open');
    dock.querySelectorAll('[data-action="terms"]').forEach(function(el){ el.classList.toggle('active', termsOpen); });
    dock.querySelectorAll('[data-action="spc"]').forEach(function(el){ el.classList.toggle('active', !!window.spcDay1Enabled); });
    dock.querySelectorAll('[data-action="sweep"]').forEach(function(el){ el.classList.toggle('active', !!window.radarSweepEnabled); });
    dock.querySelectorAll('[data-action="metars"]').forEach(function(el){ el.classList.toggle('active', !!window.metarVisible); });
    dock.querySelectorAll('[data-action="hrrr-temp"]').forEach(function(el){ el.classList.toggle('active', !!window.hrrrTempEnabled); });
    dock.querySelectorAll('[data-action="radar"]').forEach(function(el){ el.classList.toggle('active', !!window.obsRadarEnabled); });
    dock.querySelectorAll('[data-action="states"]').forEach(function(el){ el.classList.toggle('active', !!window.statesEnabled); });
    dock.querySelectorAll('[data-action="counties"]').forEach(function(el){ el.classList.toggle('active', !!window.countiesEnabled); });
  }

  function clickIf(id){ var el = document.getElementById(id); if (el) el.click(); }

  async function activateAction(action){
    if (action === 'terms'){
      clickIf('stormScienceGuideBtn');
      return;
    }
    if (action === 'lesson'){
      clickIf('openLessonBtn');
      return;
    }
    if (action === 'sweep'){
      if (!window.obsRadarEnabled && typeof window.setRadarEnabled === 'function') await window.setRadarEnabled(true);
      clickIf('sweepToggleBtn');
      return;
    }
    if (action === 'radar'){
      if (typeof window.setMetarsEnabled === 'function') await window.setMetarsEnabled(false);
      if (typeof window.setSpcDay1Enabled === 'function') await window.setSpcDay1Enabled(false);
      if (typeof window.setHrrrTempEnabled === 'function') await window.setHrrrTempEnabled(false);
      if (typeof radarSweepEnabled !== 'undefined') { radarSweepEnabled = false; try{ syncSweepButton(); }catch(e){} }
      if (typeof window.setRadarEnabled === 'function') await window.setRadarEnabled(true);
      return;
    }
    if (action === 'metars'){
      if (typeof window.setRadarEnabled === 'function') await window.setRadarEnabled(false);
      if (typeof window.setSpcDay1Enabled === 'function') await window.setSpcDay1Enabled(false);
      if (typeof window.setHrrrTempEnabled === 'function') await window.setHrrrTempEnabled(false);
      if (typeof window.setMetarsEnabled === 'function') await window.setMetarsEnabled(!window.metarVisible);
      return;
    }
    if (action === 'spc'){
      if (typeof window.setRadarEnabled === 'function') await window.setRadarEnabled(false);
      if (typeof window.setMetarsEnabled === 'function') await window.setMetarsEnabled(false);
      if (typeof window.setHrrrTempEnabled === 'function') await window.setHrrrTempEnabled(false);
      if (typeof window.setSpcDay1Enabled === 'function') await window.setSpcDay1Enabled(!window.spcDay1Enabled);
      return;
    }
    if (action === 'hrrr-temp'){
      if (typeof window.setRadarEnabled === 'function') await window.setRadarEnabled(false);
      if (typeof window.setMetarsEnabled === 'function') await window.setMetarsEnabled(false);
      if (typeof window.setSpcDay1Enabled === 'function') await window.setSpcDay1Enabled(false);
      if (typeof radarSweepEnabled !== 'undefined') { radarSweepEnabled = false; try{ syncSweepButton(); }catch(e){} }
      if (typeof window.setHrrrTempEnabled === 'function') await window.setHrrrTempEnabled(!window.hrrrTempEnabled);
      return;
    }
    if (action === 'states'){
      if (typeof window.setStatesEnabled === 'function') await window.setStatesEnabled(!window.statesEnabled);
      return;
    }
    if (action === 'counties'){
      if (typeof window.setCountiesEnabled === 'function') await window.setCountiesEnabled(!window.countiesEnabled);
      return;
    }
  }

  chips.forEach(function(chip){
    chip.addEventListener('click', async function(ev){
      ev.preventDefault();
      try { await activateAction(chip.getAttribute('data-action')); }
      catch(err){ console.error(err); }
      refreshDockStates();
      collapseDock();
    });
  });

  var obs = new MutationObserver(refreshDockStates);
  try{ obs.observe(document.body, { attributes:true, attributeFilter:['class'] }); }catch(e){}
  refreshDockStates();
})();


/* ---- extracted inline script 11 ---- */
(function(){
  function whenReady(fn){
    if (window.map && typeof window.map.getPane === 'function' &&
        typeof window.setStatesEnabled === 'function' &&
        typeof window.setCountiesEnabled === 'function') return fn();
    setTimeout(function(){ whenReady(fn); }, 200);
  }

  whenReady(function(){
    var leafletMap = window.map;

    try{
      document.querySelectorAll('[data-action="states"], [data-action="counties"]').forEach(function(el){
        el.style.display = 'none';
      });
    }catch(e){}

    function wantsStates(){
      return !!(window.obsRadarEnabled || window.metarVisible || window.hrrrTempEnabled || window.spcDay1Enabled);
    }
    function wantsCounties(){
      return !!window.obsRadarEnabled;
    }

    async function refreshAutoBoundaries(){
      try{
        var wantStates = wantsStates();
        var wantCounties = wantsCounties();
        if (typeof window.setStatesEnabled === 'function') await window.setStatesEnabled(wantStates);
        if (typeof window.setCountiesEnabled === 'function') await window.setCountiesEnabled(wantCounties);
      } catch(err){
        console.error('Auto-boundary refresh failed:', err);
      }
    }

    window.refreshAutoBoundaries = refreshAutoBoundaries;

    function wrapAsync(name){
      if (typeof window[name] !== 'function') return;
      var original = window[name];
      if (original.__autoBoundaryWrapped) return;
      var wrapped = async function(){
        var out = await original.apply(this, arguments);
        await refreshAutoBoundaries();
        return out;
      };
      wrapped.__autoBoundaryWrapped = true;
      window[name] = wrapped;
    }

    wrapAsync('setRadarEnabled');
    wrapAsync('setMetarsEnabled');
    wrapAsync('setHrrrTempEnabled');
    wrapAsync('setSpcDay1Enabled');

    leafletMap.on('zoomend', refreshAutoBoundaries);

    setTimeout(refreshAutoBoundaries, 400);
    console.log('✅ Auto-boundary mode enabled');
  });
})();
