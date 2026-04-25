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

  const lessonId = (_qs("lesson") || ((window.WDL_SIM_CONFIG && window.WDL_SIM_CONFIG.lessonId) || "")).trim();

  if (!lessonId) {
    console.log("ℹ️ No ?lesson=... provided; using engine defaults.");
  } else {
    try {
      // Prefer the shared loader if present (js/lessonLoader.js)
      if (window.lessonLoader && typeof window.lessonLoader.loadLessonConfig === "function") {
        CFG = await window.lessonLoader.loadLessonConfig(lessonId);
      } else {
        // Fallback: fetch directly
        const DATA_PACK_BASE = (_qs('data') || ((window.WDL_SIM_CONFIG && window.WDL_SIM_CONFIG.dataPackBase) || 'https://thekarstens.github.io/wdl-data-derecho-2022/'));
        const base = DATA_PACK_BASE.endsWith('/') ? DATA_PACK_BASE : (DATA_PACK_BASE + '/');
        const url = `${base}lessons/${encodeURIComponent(lessonId)}/lesson.json?v=${Date.now()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Lesson config HTTP ${res.status}: ${url}`);
        CFG = await res.json();
        if (!CFG.dataBase){
          const base = ( _qs('data') || ((window.WDL_SIM_CONFIG && window.WDL_SIM_CONFIG.dataPackBase) || 'https://thekarstens.github.io/wdl-data-derecho-2022/') );
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
  var DATA_PACK_BASE = (_qs("data") || ((window.WDL_SIM_CONFIG && window.WDL_SIM_CONFIG.dataPackBase) || "https://thekarstens.github.io/wdl-data-derecho-2022/"));
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

  // Master simulator clock window. For this simulator build, free scrub should span the
  // core event window rather than the entire manifest length unless lesson time bounds
  // were explicitly configured.
  var MASTER_WINDOW_HOURS = Number(
    (CFG && CFG.simulator && CFG.simulator.masterWindowHours) ||
    (CFG && CFG.time && CFG.time.masterWindowHours) ||
    (CFG && CFG.time && CFG.time.windowHours) ||
    4
  );
  if (!isFinite(MASTER_WINDOW_HOURS) || MASTER_WINDOW_HOURS <= 0) MASTER_WINDOW_HOURS = 4;
  var MASTER_WINDOW_MS = MASTER_WINDOW_HOURS * 60 * 60 * 1000;

  var startZ = TIME_CFG.startZ ? new Date(TIME_CFG.startZ) : new Date(Date.UTC(2018, 3, 10, 0, 0, 0));
  var endZ   = TIME_CFG.endZ   ? new Date(TIME_CFG.endZ)   : new Date(Date.UTC(2018, 3, 15, 12, 0, 0, 0));
  if (window.WDL_SIM_CONFIG && window.WDL_SIM_CONFIG.startZ) startZ = new Date(window.WDL_SIM_CONFIG.startZ);
  if (window.WDL_SIM_CONFIG && window.WDL_SIM_CONFIG.endZ) endZ = new Date(window.WDL_SIM_CONFIG.endZ);
  var curZ   = new Date(startZ.getTime());
  window.__WDL_SINGLE_CLOCK__ = true;

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
  var RADAR_STEP_LIMIT = null;

  function getRadarFramePool(){
    if (!RADAR_MANIFEST || !Array.isArray(RADAR_MANIFEST.frames)) return [];
    var frames = RADAR_MANIFEST.frames;
    if (!RADAR_STEP_LIMIT || !isFinite(RADAR_STEP_LIMIT.start) || !isFinite(RADAR_STEP_LIMIT.end)) return frames;
    var filtered = frames.filter(function(f){
      var rawT = f && (f.utc || f.t || f.time || null);
      var t = rawT ? Date.parse(rawT) : NaN;
      return isFinite(t) && t >= RADAR_STEP_LIMIT.start && t <= RADAR_STEP_LIMIT.end;
    });
    return filtered.length ? filtered : frames;
  }

  function setRadarStepLimit(limit){
    RADAR_STEP_LIMIT = limit && isFinite(limit.start) && isFinite(limit.end) ? limit : null;
  }

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

      if (RADAR_MANIFEST && Array.isArray(RADAR_MANIFEST.frames) && RADAR_MANIFEST.frames.length){
        useManifestFrameScrubber = true;
        currentRadarFrameIndex = 0;
        var firstUtc = RADAR_MANIFEST.frames[0].utc || RADAR_MANIFEST.frames[0].t || RADAR_MANIFEST.frames[0].time || null;
        var lastFrame = RADAR_MANIFEST.frames[RADAR_MANIFEST.frames.length - 1] || null;
        var lastUtc = lastFrame ? (lastFrame.utc || lastFrame.t || lastFrame.time || null) : null;

        if (!(TIME_CFG && TIME_CFG.startZ) && firstUtc) {
          startZ = new Date(firstUtc);
        } else if (!(TIME_CFG && TIME_CFG.startZ) && RADAR_MANIFEST.start_utc) {
          startZ = new Date(RADAR_MANIFEST.start_utc);
        }

        if (!(TIME_CFG && TIME_CFG.endZ)) {
          var manifestEnd = lastUtc ? new Date(lastUtc) : (RADAR_MANIFEST.end_utc ? new Date(RADAR_MANIFEST.end_utc) : null);
          var defaultEnd = new Date(startZ.getTime() + MASTER_WINDOW_MS);
          endZ = (manifestEnd && manifestEnd.getTime() < defaultEnd.getTime()) ? manifestEnd : defaultEnd;
        }

        if (firstUtc) curZ = new Date(firstUtc);
      } else if (RADAR_MANIFEST && RADAR_MANIFEST.start_utc && RADAR_MANIFEST.end_utc){
        if (!(TIME_CFG && TIME_CFG.startZ)) startZ = new Date(RADAR_MANIFEST.start_utc);
        if (!(TIME_CFG && TIME_CFG.endZ)) {
          var bareDefaultEnd = new Date(startZ.getTime() + MASTER_WINDOW_MS);
          var bareManifestEnd = new Date(RADAR_MANIFEST.end_utc);
          endZ = bareManifestEnd.getTime() < bareDefaultEnd.getTime() ? bareManifestEnd : bareDefaultEnd;
        }
      }
    }catch(e){
      console.warn('⚠️ Radar manifest load failed:', e);
      RADAR_MANIFEST = null;
    }
  }

  function findNearestRadarFrame(d){
    var pool = getRadarFramePool();
    if (!pool.length) return null;
    var target = d.getTime();
    var best = null;
    var bestDelta = Infinity;
    for (var i=0;i<pool.length;i++){
      var f = pool[i];
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
    var pool = getRadarFramePool();
    if (!pool.length) return null;
    idx = Math.max(0, Math.min(pool.length - 1, idx|0));
    return pool[idx] || null;
  }

  function getManifestFrameUtc(f){
    return f ? (f.utc || f.t || f.time || null) : null;
  }

  function setCurrentRadarFrameIndex(idx){
    var pool = getRadarFramePool();
    if (!pool.length) return;
    currentRadarFrameIndex = Math.max(0, Math.min(pool.length - 1, idx|0));
  }

  function stepRadarFrame(delta){
    var pool = getRadarFramePool();
    if (useManifestFrameScrubber && pool.length){
      setCurrentRadarFrameIndex(currentRadarFrameIndex + delta);
      updateAll();
      return true;
    }
    return false;
  }

  function radarUrlFor(d){
    var mf = findNearestRadarFrame(d);
    if (mf){
      var pool = getRadarFramePool();
      if (pool && pool.length){
        var idx = pool.indexOf(mf);
        if (idx >= 0) currentRadarFrameIndex = idx;
      }
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

// ---------- Zoom badge + label transition settings ----------
  var BUBBLE_LABEL_MAX_ZOOM = 9;
  var BASE_LABELS_MIN_ZOOM = 10;
  var zoomBadgeControl = null;

  function ensureZoomBadge(){
    if (zoomBadgeControl) return zoomBadgeControl;

    zoomBadgeControl = L.control({ position: "topright" });
    zoomBadgeControl.onAdd = function(){
      var div = L.DomUtil.create("div", "zoom-badge-control");
      div.style.background = "rgba(8,16,28,0.92)";
      div.style.color = "#ffffff";
      div.style.padding = "8px 12px";
      div.style.borderRadius = "12px";
      div.style.border = "1px solid rgba(255,255,255,0.24)";
      div.style.boxShadow = "0 4px 14px rgba(0,0,0,0.35)";
      div.style.font = "700 13px/1.2 Lato, Arial, sans-serif";
      div.style.letterSpacing = ".2px";
      div.style.pointerEvents = "none";
      div.style.marginTop = "56px";
      div.style.marginRight = "8px";
      div.innerHTML = "Zoom: --";
      return div;
    };

    zoomBadgeControl.addTo(map);
    return zoomBadgeControl;
  }

  function updateZoomBadge(){
    ensureZoomBadge();
    if (!zoomBadgeControl || !zoomBadgeControl.getContainer) return;
    var el = zoomBadgeControl.getContainer();
    if (!el) return;

    var z = map.getZoom();
    var band = (z <= 4) ? "National"
             : (z <= 5) ? "Regional"
             : (z <= 7) ? "Regional+"
             : (z <= 9) ? "Local"
             : "Basemap";

    el.innerHTML = 'Zoom: ' + z + ' <span style="opacity:.72;font-weight:600">(' + band + ')</span>';
  }
window.CFG = CFG;
window.DATA_BASE = DATA_BASE;
window.MASTER_WINDOW_HOURS = MASTER_WINDOW_HOURS;
window._isAbsUrl = _isAbsUrl;
window._joinUrl = _joinUrl;
window.setStatus = setStatus;

// Engine safety defaults for optional layers/helpers
var gfsSnowEnabled = false;
var gfsSnowOverlay = null;

// ---------- 500 mb Jet / velocity layer ----------
var jet500Enabled = false;
var jetManifest = null;
var jetManifestUrl = "";
var jetManifestFolder = "";
var jetFrames = [];
var jetBounds = null;
var jetCurrentFrameIndex = 0;
var jetVelocityLayer = null;
var currentJetVelocityData = null;
var jetCurrentUrl = null;
var jetLoadPromise = null;
var JET_DEFAULT_MANIFEST = 'jet/jet_manifest.json';
window.jet500Enabled = jet500Enabled;
window.jetVelocityLayer = jetVelocityLayer;

function getJetManifestUrl(){
  try{
    // Prefer lesson-specific surface wind config first
    var sw = (CFG && CFG.surfaceWinds) ? CFG.surfaceWinds : {};
    var su = sw.manifest || sw.manifestFile || sw.url || sw.file || '';
    if (su) return _isAbsUrl(su) ? su : _joinUrl(DATA_BASE, su);

    // Fall back to legacy jet config
    var j = (CFG && (CFG.jet || CFG.upperAir || CFG.upperair)) ? (CFG.jet || CFG.upperAir || CFG.upperair) : {};
    var u = j.manifest || j.manifestFile || j.url || j.file || '';
    if (u) return _isAbsUrl(u) ? u : _joinUrl(DATA_BASE, u);
  }catch(e){}
  return _joinUrl(DATA_BASE, JET_DEFAULT_MANIFEST);
}

function clearJetVelocityLayer(){
  var layer = jetVelocityLayer;

  // Clear globals first so delayed velocity callbacks do not keep targeting
  // a layer that the card transition is trying to remove.
  jetVelocityLayer = null;
  currentJetVelocityData = null;
  jetCurrentUrl = null;
  window.jetVelocityLayer = null;

  if (!layer) return;

  try{ if (layer._windy && typeof layer._windy.stop === 'function') layer._windy.stop(); }catch(e){}
  try{ if (layer._clearWind && typeof layer._clearWind === 'function') layer._clearWind(); }catch(e){}

  // Leaflet-velocity can leave move/resize handlers alive briefly during a
  // story-card swap. Unhook the common handlers before removing the layer.
  try{ if (map && map.off && layer._onLayerDidMove) map.off('moveend', layer._onLayerDidMove, layer); }catch(e){}
  try{ if (map && map.off && layer._onLayerDidZoom) map.off('zoomstart', layer._onLayerDidZoom, layer); }catch(e){}
  try{ if (map && map.off && layer._resize) map.off('resize', layer._resize, layer); }catch(e){}

  try{ if (map && map.hasLayer && map.hasLayer(layer)) map.removeLayer(layer); }catch(e){}
  try{ if (layer._canvas && layer._canvas.parentNode) layer._canvas.parentNode.removeChild(layer._canvas); }catch(e){}
}

function parseJetManifestFrames(raw){
  var src = (raw && raw.frames) || [];
  if (!Array.isArray(src)) return [];
  return src.map(function(f, i){
    if (typeof f === 'string') f = { filename:f };
    if (!f) return null;
    var file = f.filename || f.file || f.url || f.name || null;
    if (!file) return null;
    var tRaw = f.refTime || f.time || f.valid || f.utc || f.datetime || null;
    var t = tRaw ? new Date(tRaw) : null;
    return {
      file:file,
      time:tRaw || null,
      timeMs:(t && !isNaN(t)) ? t.getTime() : NaN,
      label:f.label || file,
      index:i
    };
  }).filter(Boolean);
}

async function loadJetManifestIfNeeded(){
  if (jetManifest) return jetManifest;
  if (jetLoadPromise) return jetLoadPromise;
  jetManifestUrl = getJetManifestUrl();
  jetManifestFolder = jetManifestUrl.split('/').slice(0,-1).join('/') + '/';
  setStatus('Loading 500 mb winds…');
  jetLoadPromise = fetch(jetManifestUrl + (jetManifestUrl.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' })
    .then(function(r){
      if (!r.ok) throw new Error('Jet manifest HTTP ' + r.status + ': ' + jetManifestUrl);
      return r.json();
    })
    .then(function(raw){
      jetManifest = raw || {};
      jetFrames = parseJetManifestFrames(raw);
      var b = raw && (raw.bounds || (raw.grid && raw.grid.bounds));
      if (Array.isArray(b) && b.length === 2 && Array.isArray(b[0]) && Array.isArray(b[1])) jetBounds = b;
      if (!jetFrames.length) throw new Error('Jet manifest has no frames');
      return jetManifest;
    })
    .catch(function(err){
      jetLoadPromise = null;
      jetManifest = null;
      jetFrames = [];
      throw err;
    });
  return jetLoadPromise;
}

function getNearestJetFrame(d){
  if (!jetFrames.length) return null;
  var target = d && d.getTime ? d.getTime() : Date.now();
  var best = jetFrames[0];
  var bestDelta = isFinite(best.timeMs) ? Math.abs(best.timeMs - target) : Infinity;
  for (var i=1;i<jetFrames.length;i++) {
    var f = jetFrames[i];
    var delta = isFinite(f.timeMs) ? Math.abs(f.timeMs - target) : Infinity;
    if (delta < bestDelta) { best = f; bestDelta = delta; }
  }
  jetCurrentFrameIndex = best.index || 0;
  return best;
}

function jetFrameUrl(frame){
  if (!frame || !frame.file) return null;
  return _isAbsUrl(frame.file) ? frame.file : _joinUrl(jetManifestFolder || DATA_BASE, frame.file);
}


function mphFromMetersPerSecond(ms){
  return ms * 2.2369362920544;
}

function getJetWindAtLatLng(latlng){
  if (!latlng || !currentJetVelocityData || !Array.isArray(currentJetVelocityData) || currentJetVelocityData.length < 2) return null;
  var uRec = currentJetVelocityData[0] || null;
  var vRec = currentJetVelocityData[1] || null;
  if (!uRec || !vRec || !uRec.header || !vRec.header || !Array.isArray(uRec.data) || !Array.isArray(vRec.data)) return null;

  var h = uRec.header;
  var nx = Number(h.nx), ny = Number(h.ny);
  var lo1 = Number(h.lo1), la1 = Number(h.la1);
  var dx = Number(h.dx), dy = Number(h.dy);
  if (![nx, ny, lo1, la1, dx, dy].every(isFinite) || !nx || !ny || !dx || !dy) return null;

  var lon = Number(latlng.lng);
  var lat = Number(latlng.lat);
  var col = Math.round((lon - lo1) / dx);
  var row = Math.round((la1 - lat) / dy);
  if (!isFinite(col) || !isFinite(row)) return null;
  if (col < 0 || col >= nx || row < 0 || row >= ny) return null;

  var idx = row * nx + col;
  var u = Number(uRec.data[idx]);
  var v = Number(vRec.data[idx]);
  if (!isFinite(u) || !isFinite(v)) return null;

  var speedMs = Math.sqrt(u*u + v*v);
  return {
    row: row,
    col: col,
    u: u,
    v: v,
    speedMs: speedMs,
    speedMph: mphFromMetersPerSecond(speedMs)
  };
}

async function updateJetParticles(){
  if (!jet500Enabled){
    clearJetVelocityLayer();
    return;
  }
  var requestToken = (window.__jetVelocityRequestToken = (window.__jetVelocityRequestToken || 0) + 1);
  try{
    await loadJetManifestIfNeeded();
    if (!jet500Enabled || requestToken !== window.__jetVelocityRequestToken) return;
    var frame = getNearestJetFrame(curZ);
    if (!frame) return;
    var url = jetFrameUrl(frame);

    // For single-frame demo effects, do not tear down and recreate the same
    // velocity layer over and over. Leaflet-velocity can throw null errors
    // when repeatedly removed/re-added during rapid story updates.
    if (jetVelocityLayer && jetCurrentUrl === url) {
      return;
    }

    var res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
    if (!res.ok) throw new Error('Jet frame HTTP ' + res.status + ': ' + url);
    var data = await res.json();
    if (!jet500Enabled || requestToken !== window.__jetVelocityRequestToken) return;
    clearJetVelocityLayer();
    if (!jet500Enabled || requestToken !== window.__jetVelocityRequestToken) return;
    currentJetVelocityData = data;
    jetCurrentUrl = url;
    var velocityTitle = (CFG && CFG.surfaceWinds && CFG.surfaceWinds.label)
      ? CFG.surfaceWinds.label
      : '500mb Winds';

    jetVelocityLayer = L.velocityLayer({
      data: data,
      displayValues: false,
      displayOptions: {
        velocityType: velocityTitle,
        position: 'bottomleft',
        emptyString: 'No data'
      },
      velocityScale: 0.0045,
      particleAge: 75,
      lineWidth: 2,
      frameRate: 20,
      maxVelocity: 35,
      opacity: 0.72,
      colorScale: [
        '#00ffff',
        '#00ff00',
        '#ffff00',
        '#ff9900',
        '#ff0000'
      ]
    });
    jetVelocityLayer.addTo(map);
    window.jetVelocityLayer = jetVelocityLayer;
    if (jetBounds && Array.isArray(jetBounds) && jetBounds.length === 2){
      try{ /* surface-wind/jet auto-fit disabled to keep story card view locked */ }catch(e){}
    }
    var layerName = (CFG && CFG.surfaceWinds && CFG.surfaceWinds.label)
      ? CFG.surfaceWinds.label
      : '500 mb Winds';
    setStatus(layerName + ': ' + (frame.time || frame.label || url));
  }catch(err){
    console.error(err);
    setStatus('500 mb Winds failed');
  }
}

async function setJet500Enabled(on){
  jet500Enabled = !!on;
  window.jet500Enabled = jet500Enabled;
  if (!jet500Enabled){
    clearJetVelocityLayer();
    var layerName = (CFG && CFG.surfaceWinds && CFG.surfaceWinds.label)
      ? CFG.surfaceWinds.label
      : '500 mb Winds';
    setStatus(layerName + ' off');
  } else {
    await updateJetParticles();
    var layerName = (CFG && CFG.surfaceWinds && CFG.surfaceWinds.label)
      ? CFG.surfaceWinds.label
      : '500 mb Winds';
    setStatus(layerName + ' on');
  }
  try{ updateProductLabel(); }catch(e){}
  try{ updateLegend(); }catch(e){}
  try{ syncOpacitySliderToActive(); }catch(e){}
  try{ if (typeof syncDockUi === 'function') syncDockUi(); }catch(e){}
}
window.setJet500Enabled = setJet500Enabled;

function syncJetParticlesToClock(){
  if (!jet500Enabled) return;
  updateJetParticles();
}

function updateEra5Global(){ /* no-op until ERA5 module is wired */ }
window.gfsSnowEnabled = gfsSnowEnabled;


  
// ---------- Storm Reports (LSR) ----------
var reportsEnabled = false;
var reportsManifest = null;
var reportsFeatures = [];
var reportsLayer = null;
var reportsLoadPromise = null;
var reportsFilter = 'all';
window.reportsEnabled = reportsEnabled;
window.reportsFilter = reportsFilter;
window.reportsLayer = reportsLayer;

function getReportsManifestUrl(){
  return _joinUrl(DATA_BASE, "reports/manifest.json");
}

function normalizeReportType(feature){
  var p = (feature && feature.properties) ? feature.properties : {};
  var raw = String(
    p.type || p.typetext || p.category || p.event || p.report_type || p.phenomena || p.typ || p.rpttype || ""
  ).toLowerCase();
  var remark = String(
    p.remark || p.comments || p.text || p.narrative || p.headline || p.message || ""
  ).toLowerCase();

  var full = (raw + " " + remark).trim();

  if (
    full.indexOf('tornado') !== -1 ||
    raw === 'tor' || raw === 'to'
  ) return 'tornado';

  if (
    full.indexOf('hail') !== -1 ||
    raw === 'hail' || raw === 'ha'
  ) return 'hail';

  if (
    full.indexOf('wind') !== -1 ||
    full.indexOf('gust') !== -1 ||
    full.indexOf('wnd dmg') !== -1 ||
    full.indexOf('wind dmg') !== -1 ||
    full.indexOf('non-tstm wnd') !== -1 ||
    full.indexOf('tstm wnd') !== -1 ||
    full.indexOf('thunderstorm wind') !== -1 ||
    raw === 'wind' || raw === 'w'
  ) return 'wind';

  if (
    full.indexOf('flood') !== -1 ||
    full.indexOf('flash') !== -1
  ) return 'flood';

  return 'other';
}

function getReportTime(feature){
  var p = (feature && feature.properties) ? feature.properties : {};
  var raw = p.valid || p.utc_valid || p.time || p.datetime || p.timestamp || null;
  if (!raw) return NaN;
  var t = Date.parse(raw);
  return isFinite(t) ? t : NaN;
}

function escapeHtml(s){
  return String(s == null ? '' : s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function loadReportsManifest(){
  if (reportsManifest) return reportsManifest;
  if (reportsLoadPromise) return reportsLoadPromise;

  var url = getReportsManifestUrl();
  setStatus('Loading storm reports…');

  reportsLoadPromise = fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' })
    .then(function(r){
      if (!r.ok) throw new Error('Reports manifest HTTP ' + r.status + ': ' + url);
      return r.json();
    })
    .then(async function(manifest){
      reportsManifest = manifest || {};
      var entry = (manifest && Array.isArray(manifest.reports) && manifest.reports.length) ? manifest.reports[0] : null;
      if (!entry || !entry.file) throw new Error('Reports manifest missing reports[0].file');

      var folder = url.split('/').slice(0, -1).join('/') + '/';
      var geoUrl = _isAbsUrl(entry.file) ? entry.file : _joinUrl(folder, entry.file);

      var res = await fetch(geoUrl + (geoUrl.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('Reports GeoJSON HTTP ' + res.status + ': ' + geoUrl);

      var geo = await res.json();
      reportsFeatures = Array.isArray(geo.features) ? geo.features : [];
      setStatus('Storm reports loaded');
      return reportsManifest;
    })
    .catch(function(err){
      console.error('Reports load failed:', err);
      reportsLoadPromise = null;
      reportsManifest = null;
      reportsFeatures = [];
      setStatus('Storm reports failed');
      throw err;
    });

  return reportsLoadPromise;
}

function getFilteredReports(){
  var now = curZ.getTime();
  return reportsFeatures.filter(function(f){
    var t = getReportTime(f);
    if (!isFinite(t) || t > now) return false;
    if (!reportsFilter || reportsFilter === 'all') return true;
    return normalizeReportType(f) === reportsFilter;
  });
}

function reportColor(type){
  if (type === 'tornado') return '#ff2d2d';
  if (type === 'hail') return '#35d07f';
  if (type === 'wind') return '#ffd54a';
  if (type === 'flood') return '#34b3ff';
  return '#ffffff';
}

function reportRadius(type, p){
  var mag = Number(p.magnitude || p.mag || p.size || p.value || NaN);
  if (type === 'tornado') return 7;
  if (type === 'hail') {
    if (isFinite(mag)) return Math.max(5, Math.min(10, 4 + mag * 1.5));
    return 6;
  }
  if (type === 'wind') {
    if (isFinite(mag)) return Math.max(5, Math.min(10, 3 + (mag / 20)));
    return 6;
  }
  if (type === 'flood') return 6;
  return 5;
}

function buildReportIcon(type){
  if (type === 'tornado'){
    return L.divIcon({
      className: 'report-icon report-icon-tornado',
      html: '<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><polygon points="9,1 17,16 1,16" fill="#e53935" stroke="#0b1c2d" stroke-width="1.2"/></svg>',
      iconSize: [18,18],
      iconAnchor: [9,9],
      popupAnchor: [0,-8]
    });
  }
  if (type === 'hail'){
    return L.divIcon({
      className: 'report-icon report-icon-hail',
      html: '<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" fill="#39b54a" stroke="#0b1c2d" stroke-width="1.2"/></svg>',
      iconSize: [18,18],
      iconAnchor: [9,9],
      popupAnchor: [0,-8]
    });
  }
  if (type === 'wind'){
    return L.divIcon({
      className: 'report-icon report-icon-wind',
      html: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="14" height="14" rx="2" ry="2" fill="#1e88e5" stroke="#0b1c2d" stroke-width="1.2"/></svg>',
      iconSize: [20,20],
      iconAnchor: [10,10],
      popupAnchor: [0,-8]
    });
  }
  return null;
}

function pointLayerForReport(feature, latlng){
  var p = feature.properties || {};
  var t = normalizeReportType(feature);
  var icon = buildReportIcon(t);
  if (icon){
    return L.marker(latlng, { icon: icon, keyboard:false });
  }
  return L.circleMarker(latlng, {
    radius: reportRadius(t, p),
    fillColor: reportColor(t),
    color: '#0b1c2d',
    weight: 1.5,
    opacity: 1,
    fillOpacity: 0.92
  });
}

function buildReportPopup(p, type){
  var title = escapeHtml((p.type || p.typetext || p.event || 'Storm Report'));
  var when = escapeHtml(p.valid || p.utc_valid || p.time || p.datetime || '');
  var city = escapeHtml(p.city || p.town || p.location || '');
  var state = escapeHtml(p.state || '');
  var source = escapeHtml(p.source || p.office || '');
  var mag = escapeHtml(p.magnitude || p.mag || p.size || '');
  var remark = escapeHtml(p.remark || p.comments || p.text || p.narrative || '');

  var parts = [
    "<div style='font:900 14px/1 Arial,sans-serif;opacity:.9'>" + title + "</div>"
  ];
  if (when) parts.push("<div style='font:800 12px/1.2 Arial,sans-serif;margin-top:4px'><b>Time:</b> " + when + "</div>");
  if (city || state) parts.push("<div style='font:800 12px/1.2 Arial,sans-serif;margin-top:3px'><b>Location:</b> " + [city, state].filter(Boolean).join(', ') + "</div>");
  if (mag) parts.push("<div style='font:800 12px/1.2 Arial,sans-serif;margin-top:3px'><b>Magnitude:</b> " + mag + "</div>");
  if (source) parts.push("<div style='font:800 12px/1.2 Arial,sans-serif;margin-top:3px'><b>Source:</b> " + source + "</div>");
  if (remark) parts.push("<div style='font:800 12px/1.3 Arial,sans-serif;margin-top:6px'>" + remark + "</div>");
  return parts.join('');
}

function refreshReportsButtons(){
  try{
    document.querySelectorAll('[data-action="reports-toggle"]').forEach(function(el){
      el.classList.toggle('active', !!reportsEnabled);
    });
    document.querySelectorAll('[data-report-filter]').forEach(function(el){
      var matches = !!reportsEnabled && (el.getAttribute('data-report-filter') === reportsFilter);
      el.classList.toggle('active', matches);
    });
  }catch(e){}
}

function clearReportsLayer(){
  try{
    if (reportsLayer && map && map.hasLayer && map.hasLayer(reportsLayer)) map.removeLayer(reportsLayer);
  }catch(e){}
  reportsLayer = null;
  window.reportsLayer = null;
}

function updateReportsLayer(){
  if (!reportsEnabled){
    clearReportsLayer();
    refreshReportsButtons();
    return;
  }

  var filtered = getFilteredReports();
  clearReportsLayer();

  reportsLayer = L.geoJSON(filtered, {
    pointToLayer: function(feature, latlng){
      return pointLayerForReport(feature, latlng);
    },
    onEachFeature: function(feature, layer){
      var p = feature.properties || {};
      layer.bindPopup(buildReportPopup(p, normalizeReportType(feature)), { className: 'hrrr-popup' });
    }
  });

  reportsLayer.addTo(map);
  window.reportsLayer = reportsLayer;
  refreshReportsButtons();
}

async function setReportsEnabled(on){
  reportsEnabled = !!on;
  window.reportsEnabled = reportsEnabled;

  if (reportsEnabled){
    await loadReportsManifest();
    updateReportsLayer();
    setStatus('Storm reports on');
  } else {
    clearReportsLayer();
    refreshReportsButtons();
    setStatus('Storm reports off');
  }

  try{ updateProductLabel(); }catch(e){}
  try{ if (typeof syncDockUi === 'function') syncDockUi(); }catch(e){}
}

async function toggleReports(){
  await setReportsEnabled(!reportsEnabled);
}

async function setReportsFilter(filter){
  reportsFilter = String(filter || 'all').toLowerCase();
  window.reportsFilter = reportsFilter;
  if (!reportsEnabled){
    await setReportsEnabled(true);
  } else {
    updateReportsLayer();
    try{ if (typeof syncDockUi === 'function') syncDockUi(); }catch(e){}
  }
}

window.setReportsEnabled = setReportsEnabled;
window.toggleReports = toggleReports;
window.setReportsFilter = setReportsFilter;

// ---------- Story UI polish + media scene ----------
var mediaManifest = null;
var mediaLayer = null;
var mediaLoadPromise = null;
var mediaMarkersById = Object.create(null);
window.mediaLayer = mediaLayer;

function ensureStoryBodyScroll(){
  try{
    if (storyBodyEl){
      storyBodyEl.style.maxHeight = '52vh';
      storyBodyEl.style.overflowY = 'auto';
      storyBodyEl.style.paddingRight = '4px';
    }
  }catch(e){}
}

function ensureStoryLightbox(){
  var existing = document.getElementById('wdlStoryLightbox');
  if (existing) return existing;
  var wrap = document.createElement('div');
  wrap.id = 'wdlStoryLightbox';
  wrap.style.position = 'fixed';
  wrap.style.inset = '0';
  wrap.style.zIndex = '100500';
  wrap.style.background = 'rgba(5,10,18,0.88)';
  wrap.style.display = 'none';
  wrap.style.alignItems = 'center';
  wrap.style.justifyContent = 'center';
  wrap.style.padding = '28px';
  wrap.innerHTML =
    '<div id="wdlStoryLightboxInner" style="position:relative;max-width:92vw;max-height:92vh;width:auto;height:auto;">' +
      '<button id="wdlStoryLightboxClose" type="button" style="position:absolute;top:-10px;right:-10px;width:38px;height:38px;border-radius:999px;border:1px solid rgba(255,255,255,.24);background:rgba(18,28,46,.92);color:#fff;font:900 18px/1 Arial,sans-serif;cursor:pointer">×</button>' +
      '<img id="wdlStoryLightboxImg" alt="Expanded story image" style="display:block;max-width:92vw;max-height:86vh;width:auto;height:auto;border-radius:16px;box-shadow:0 10px 32px rgba(0,0,0,.45)">' +
      '<div id="wdlStoryLightboxCaption" style="margin-top:10px;color:#fff;font:800 13px/1.35 Arial,sans-serif;text-align:center"></div>' +
    '</div>';
  document.body.appendChild(wrap);
  wrap.addEventListener('click', function(ev){
    if (ev.target === wrap) closeStoryLightbox();
  });
  document.getElementById('wdlStoryLightboxClose').addEventListener('click', closeStoryLightbox);
  document.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape') closeStoryLightbox();
  });
  return wrap;
}

function openStoryLightbox(src, caption){
  var wrap = ensureStoryLightbox();
  var img = document.getElementById('wdlStoryLightboxImg');
  var cap = document.getElementById('wdlStoryLightboxCaption');
  if (img) img.src = src || '';
  if (cap) cap.innerHTML = caption || '';
  wrap.style.display = 'flex';
}

function closeStoryLightbox(){
  var wrap = document.getElementById('wdlStoryLightbox');
  if (wrap) wrap.style.display = 'none';
}

function getMediaManifestUrl(){
  return _joinUrl(DATA_BASE, 'media/media_manifest.json');
}

function parseLooseManifest(raw){
  try{
    var obj = JSON.parse(raw);
    return Array.isArray(obj) ? obj : [obj];
  }catch(e){}
  var parts = [];
  var depth = 0, start = -1;
  for (var i=0;i<raw.length;i++){
    var ch = raw.charAt(i);
    if (ch === '{'){
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}'){
      depth--;
      if (depth === 0 && start >= 0){
        var chunk = raw.slice(start, i+1);
        try{ parts.push(JSON.parse(chunk)); }catch(err){}
        start = -1;
      }
    }
  }
  return parts;
}

function normalizeMediaItem(d, idx){
  if (!d || typeof d !== 'object') return null;
  var lat = Number(d.lat), lon = Number(d.lon);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  var tRaw = d.time || d.utc || d.valid || null;
  var tMs = tRaw ? Date.parse(tRaw) : NaN;
  var file = d.file || d.url || '';
  return {
    id: String(d.id || ('media_' + idx)),
    type: String(d.type || 'image').toLowerCase(),
    title: String(d.title || 'Media'),
    file: file,
    url: _isAbsUrl(file) ? file : _joinUrl(DATA_BASE, file),
    lat: lat,
    lon: lon,
    town: String(d.town || ''),
    state: String(d.state || ''),
    credit: String(d.credit || ''),
    caption: String(d.caption || ''),
    time: tRaw || '',
    timeMs: isFinite(tMs) ? tMs : NaN,
    location_note: String(d.location_note || '')
  };
}

async function loadMediaManifest(){
  if (mediaManifest) return mediaManifest;
  if (mediaLoadPromise) return mediaLoadPromise;
  var url = getMediaManifestUrl();
  setStatus('Loading eyewitness media…');
  mediaLoadPromise = fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' })
    .then(function(r){
      if (!r.ok) throw new Error('Media manifest HTTP ' + r.status + ': ' + url);
      return r.text();
    })
    .then(function(raw){
      var arr = parseLooseManifest(raw || '');
      mediaManifest = arr.map(normalizeMediaItem).filter(Boolean);
      setStatus('Eyewitness media loaded');
      return mediaManifest;
    })
    .catch(function(err){
      console.error('Media load failed:', err);
      mediaLoadPromise = null;
      mediaManifest = [];
      setStatus('Eyewitness media failed');
      return mediaManifest;
    });
  return mediaLoadPromise;
}

function clearMediaLayer(){
  try{
    if (mediaLayer && map && map.hasLayer && map.hasLayer(mediaLayer)) map.removeLayer(mediaLayer);
  }catch(e){}
  mediaLayer = null;
  mediaMarkersById = Object.create(null);
  window.mediaLayer = null;
}

function getMediaMarkerIcon(type){
  var isVideo = String(type || '').toLowerCase() === 'video';
  var html = isVideo
    ? '<div style="width:18px;height:18px;border-radius:999px;background:#e53935;border:2px solid #0b1c2d;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.25)"><div style="position:absolute;left:6px;top:3px;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid white"></div></div>'
    : '<div style="width:18px;height:18px;border-radius:4px;background:#42a5f5;border:2px solid #0b1c2d;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>';
  return L.divIcon({
    className: 'wdl-media-marker',
    html: html,
    iconSize: [18,18],
    iconAnchor: [9,9],
    popupAnchor: [0,-8]
  });
}

function buildMediaPopup(d){
  var parts = [];
  parts.push("<div style='font:900 14px/1.15 Arial,sans-serif'>" + escapeHtml(d.title || 'Media') + "</div>");
  if (d.credit) parts.push("<div style='font:700 11px/1.25 Arial,sans-serif;opacity:.78;margin-top:4px'>Credit: " + escapeHtml(d.credit) + "</div>");
  if (d.type === 'image'){
    parts.push("<div style='margin-top:8px'><img src='" + escapeHtml(d.url) + "' alt='' style='display:block;width:220px;max-width:100%;height:auto;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.18);cursor:zoom-in' onclick='openStoryLightbox(" + JSON.stringify(d.url) + "," + JSON.stringify((d.title || '') + (d.credit ? ("<br><span style=\"opacity:.8\">Credit: " + d.credit.replace(/"/g,'&quot;') + "</span>") : "")) + ")'></div>");
  } else if (d.type === 'video'){
    parts.push("<div style='margin-top:8px'><video controls preload='metadata' style='display:block;width:240px;max-width:100%;height:auto;border-radius:10px;background:#000'><source src='" + escapeHtml(d.url) + "'></video></div>");
  }
  if (d.caption) parts.push("<div style='font:700 12px/1.3 Arial,sans-serif;margin-top:8px'>" + escapeHtml(d.caption) + "</div>");
  var loc = [d.town, d.state].filter(Boolean).join(', ');
  if (loc) parts.push("<div style='font:700 11px/1.25 Arial,sans-serif;margin-top:6px;opacity:.82'><b>Location:</b> " + escapeHtml(loc) + "</div>");
  if (d.time) parts.push("<div style='font:700 11px/1.25 Arial,sans-serif;margin-top:4px;opacity:.82'><b>Time:</b> " + escapeHtml(d.time) + "</div>");
  return parts.join('');
}

function getActiveStorySceneConfig(){
  try{
    return (Array.isArray(storyItems) && storyItems.length) ? ((storyItems[storyIndex] && storyItems[storyIndex].scene) || storyItems[storyIndex] || {}) : {};
  }catch(e){
    return {};
  }
}

function getFilteredMediaForScene(scene){
  scene = scene || {};
  if (!Array.isArray(mediaManifest)) return [];
  var ids = Array.isArray(scene.mediaIds) ? scene.mediaIds.map(String) : null;
  var town = scene.mediaTown ? String(scene.mediaTown).toLowerCase() : '';
  var start = scene.mediaStart ? Date.parse(scene.mediaStart) : NaN;
  var end = scene.mediaEnd ? Date.parse(scene.mediaEnd) : NaN;
  var current = isFinite(Date.parse((storyItems[storyIndex] && storyItems[storyIndex].utc) || '')) ? Date.parse(storyItems[storyIndex].utc) : curZ.getTime();
  return mediaManifest.filter(function(d){
    if (ids && ids.length && ids.indexOf(String(d.id)) === -1) return false;
    if (town && String(d.town || '').toLowerCase() !== town) return false;
    if (isFinite(start) && (!isFinite(d.timeMs) || d.timeMs < start)) return false;
    if (isFinite(end) && (!isFinite(d.timeMs) || d.timeMs > end)) return false;
    if (!ids && !town && !isFinite(start) && !isFinite(end) && isFinite(d.timeMs) && d.timeMs > current) return false;
    return true;
  });
}

async function setMediaEnabled(on){
  if (!on){
    clearMediaLayer();
    return;
  }
  await loadMediaManifest();
  var scene = getActiveStorySceneConfig();
  var items = getFilteredMediaForScene(scene);
  clearMediaLayer();
  mediaLayer = L.layerGroup();
  items.forEach(function(d){
    var marker = L.marker([d.lat, d.lon], { icon:getMediaMarkerIcon(d.type), keyboard:false });
    marker.bindPopup(buildMediaPopup(d), { className:'hrrr-popup', maxWidth: 300 });
    mediaLayer.addLayer(marker);
    mediaMarkersById[d.id] = marker;
  });
  if (items.length) mediaLayer.addTo(map);
  window.mediaLayer = mediaLayer;
  setStatus(items.length ? ('Eyewitness media: ' + items.length) : 'Eyewitness media: none for this step');
}
window.setMediaEnabled = setMediaEnabled;

document.addEventListener('click', function(ev){
  var t = ev.target;
  if (!t) return;
  if (t.matches && t.matches('img[data-story-expand="1"]')){
    var caption = t.getAttribute('data-story-caption') || '';
    openStoryLightbox(t.getAttribute('src') || '', caption);
  }
});


  // ---------- Lightning ----------
  var lightningEnabled = false;
  var lightningManifest = null;
  var lightningEvents = [];
  var lightningFreshLayer = null;
  var lightningRecentLayer = null;
  var lightningLoadPromise = null;
  var lightningCounterControl = null;
  var lightningMarqueeControl = null;
  var lightningMarqueeDom = null;
  var lightningStylesInjected = false;
  var lightningFreshWindowMs = 12 * 60 * 1000;
  var lightningRecentWindowMs = 18 * 60 * 1000;
  var lightningCounterWindowMs = 12 * 60 * 1000;
  var lightningJumpWindowMs = 10 * 60 * 1000;
  var lightningSoundEnabled = false;
  var lightningLastSoundAt = 0;
  var lightningAudioContext = null;
  var lightningLastRenderedStamp = '';
  var lightningLastFreshIds = Object.create(null);
  var lightningBeepQueue = 0;
  var lightningBeepTimer = null;
  var lightningFreshMarkerIndex = Object.create(null);
  var lightningRecentMarkerIndex = Object.create(null);
  var lightningHistoryLayer = null;
  var lightningHistoryVisible = false;
  var lightningHistoryMarkerIndex = Object.create(null);
  window.lightningEnabled = lightningEnabled;
  window.lightningSoundEnabled = lightningSoundEnabled;

  function getLightningManifestUrl(){
    try{
      var l = (CFG && CFG.layers && CFG.layers.lightning) ? CFG.layers.lightning : ((CFG && CFG.lightning) ? CFG.lightning : {});
      var u = l.manifest || l.manifestFile || l.url || '';
      if (u) return _isAbsUrl(u) ? u : _joinUrl(DATA_BASE, u);
    }catch(e){}
    return _joinUrl(DATA_BASE, 'lightning/manifest.json');
  }

  function injectLightningStyles(){
    if (lightningStylesInjected) return;
    if (document.getElementById('wdl-lightning-styles')){ lightningStylesInjected = true; return; }
    var style = document.createElement('style');
    style.id = 'wdl-lightning-styles';
    style.textContent = `
      .wdl-lightning-icon{ background:transparent; border:0; }
      .wdl-lightning-icon .wdl-lightning-bolt{
        position:relative; width:24px; height:24px; pointer-events:none;
        transform: translate(-3px,-3px) scale(var(--bolt-scale,1));
        background-image: var(--bolt-url);
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        filter:
          drop-shadow(0 0 0.45px rgba(20,20,20,.78))
          drop-shadow(0 0 1.0px rgba(24,24,24,.52))
          drop-shadow(0 0 4px rgba(255,232,122,.28));
        animation: wdlLightningBlink var(--flash-ms,2800ms) steps(1,end) infinite;
      }
      .wdl-lightning-icon .wdl-lightning-bolt.is-newest{
        width:34px; height:34px;
        transform: translate(-7px,-7px) scale(calc(var(--bolt-scale,1) * 1.18));
        filter:
          drop-shadow(0 0 0.6px rgba(18,18,18,.82))
          drop-shadow(0 0 1.3px rgba(24,24,24,.60))
          drop-shadow(0 0 7px rgba(255,238,130,.42));
      }
      .wdl-lightning-recent{
        box-shadow: none;
      }
      .lightning-marquee{
        position:fixed !important; top:184px; right:18px; left:auto !important; bottom:auto !important; z-index:100140; display:block;
        pointer-events:auto !important;
        min-width:280px; padding:12px 16px 11px;
        border-radius:16px;
        background:linear-gradient(180deg, rgba(10,18,38,.96), rgba(16,28,56,.92));
        border:1px solid rgba(255,236,122,.34);
        box-shadow:0 0 10px rgba(255,225,100,.14), inset 0 0 14px rgba(255,255,255,.04);
        color:#f8fbff;
        font:800 14px/1.2 Lato, Arial, sans-serif;
        letter-spacing:.02em;
        cursor:grab; user-select:none; touch-action:none;
      }
      .lightning-marquee.is-dragging{ cursor:grabbing; }
      .lightning-marquee .lm-title{
        font:900 18px/1 Lato, Arial, sans-serif;
        color:#fff3a6;
        text-transform:uppercase;
        margin-bottom:8px;
      }
      .lightning-marquee .lm-value{
        font:900 34px/1 Lato, Arial, sans-serif;
        color:#fff;
        text-shadow:0 0 8px rgba(255,240,120,.20);
        margin-bottom:5px;
      }
      .lightning-marquee .lm-sub{
        font:800 12px/1.2 Lato, Arial, sans-serif;
        color:#9cefff;
      }
      .lightning-marquee .lm-btnrow{ display:flex; gap:8px; margin-top:10px; }
      .lightning-marquee .lm-btn{
        appearance:none; border:1px solid rgba(156,239,255,.28); border-radius:999px;
        background:linear-gradient(180deg, rgba(10,34,58,.92), rgba(10,24,44,.92)); color:#dff9ff;
        padding:6px 10px; font:900 11px/1 Lato, Arial, sans-serif; text-transform:uppercase; letter-spacing:.05em;
        box-shadow:0 0 8px rgba(90,209,255,.10); cursor:pointer;
      }
      .lightning-marquee .lm-btn.is-active{
        border-color: rgba(255,236,122,.50); color:#fff4b0;
        box-shadow:0 0 10px rgba(255,225,100,.18);
      }
      .lightning-counter{
        position:fixed !important; top:236px; right:18px; left:auto !important; bottom:auto !important; z-index:100139; display:block;
        pointer-events:auto !important;
        background: linear-gradient(180deg, rgba(3,13,32,.96), rgba(10,22,48,.92));
        color:#f7fbff; padding:14px 16px; border-radius:16px; min-width:248px;
        border:1px solid rgba(118,224,255,.35);
        box-shadow: 0 0 12px rgba(90,209,255,.20), inset 0 0 18px rgba(255,255,255,.05);
        font: 800 15px/1.25 Lato, Arial, sans-serif;
        letter-spacing:.02em; cursor:grab; user-select:none;
      }
      .lightning-counter .lc-title{font:900 20px/1 Lato, Arial, sans-serif; margin-bottom:8px; color:#fff68d; text-transform:uppercase;}
      .lightning-counter .lc-row{display:flex; justify-content:space-between; gap:12px; margin-top:5px; font-size:16px;}
      .lightning-counter .lc-row strong{color:#8cf7ff;}
      .lightning-counter .lc-jump{margin-top:8px; font:900 12px/1.1 Lato, Arial, sans-serif; color:#8cf7ff; text-shadow:0 0 8px rgba(140,247,255,.45);}
      @keyframes wdlLightningBlink{
        0%{opacity:1; transform:translate(-1px,-1px) scale(calc(var(--bolt-scale,1) * 1.0));}
        14%{opacity:1; transform:translate(-1px,-1px) scale(calc(var(--bolt-scale,1) * 1.04));}
        72%{opacity:1;}
        82%{opacity:0;}
        100%{opacity:0;}
      }
    `;
    document.head.appendChild(style);
    lightningStylesInjected = true;
  }

  function normalizeLightningRecord(d, idx){
    if (!d) return null;
    var utc = d.utc || d.time || d.valid || d.datetime || null;
    var t = utc ? Date.parse(utc) : NaN;
    var lat = Number(d.lat != null ? d.lat : (Array.isArray(d.coordinates) ? d.coordinates[1] : NaN));
    var lon = Number(d.lon != null ? d.lon : (Array.isArray(d.coordinates) ? d.coordinates[0] : NaN));
    if (!isFinite(t) || !isFinite(lat) || !isFinite(lon)) return null;
    var energy = Number(d.energy);
    var area = Number(d.area);
    var peakCurrent = Number(d.peakCurrent != null ? d.peakCurrent : (d.peak_current != null ? d.peak_current : NaN));
    return {
      id: String(d.id || ('ltg_' + idx)),
      utc: new Date(t).toISOString(),
      timeMs: t,
      lat: lat,
      lon: lon,
      energy: isFinite(energy) ? energy : null,
      area: isFinite(area) ? area : null,
      polarity: d.polarity || d.sign || null,
      peakCurrent: isFinite(peakCurrent) ? peakCurrent : null,
      source: d.source || 'GOES-16 GLM',
      kind: d.kind || d.type || 'total_lightning'
    };
  }

  function lightningEnergyRange(){
    var min = Infinity, max = -Infinity;
    lightningEvents.forEach(function(d){
      if (d && typeof d.energy === 'number' && Number.isFinite(d.energy)){
        if (d.energy < min) min = d.energy;
        if (d.energy > max) max = d.energy;
      }
    });
    if (!isFinite(min) || !isFinite(max) || max <= min){
      min = 0; max = 1;
    }
    return { min:min, max:max };
  }

  function lightningStrengthFor(d){
    if (!d) return 0.6;
    if (typeof d.peakCurrent === 'number' && Number.isFinite(d.peakCurrent)){
      return Math.max(0.35, Math.min(1.55, Math.abs(d.peakCurrent) / 40));
    }
    if (!window.__lightningEnergyRange__) window.__lightningEnergyRange__ = lightningEnergyRange();
    if (typeof d.energy === 'number' && Number.isFinite(d.energy)){
      var r = window.__lightningEnergyRange__;
      if (r.max <= r.min) return 0.8;
      var n = (d.energy - r.min) / (r.max - r.min);
      return Math.max(0.4, Math.min(1.5, 0.45 + n * 1.1));
    }
    return 0.75;
  }

  function buildLightningPopup(d){
    function fmt(v){ return (v == null || v === '') ? '' : String(v); }
    function finiteNum(v){
      return (typeof v === 'number' && Number.isFinite(v)) ? v : null;
    }
    var lat = finiteNum(d && d.lat);
    var lon = finiteNum(d && d.lon);
    var energy = finiteNum(d && d.energy);
    var area = finiteNum(d && d.area);
    var peakCurrent = finiteNum(d && d.peakCurrent);
    var when = (d && Number.isFinite(d.timeMs)) ? formatCentralLabel(new Date(d.timeMs)) : (d && d.utc ? d.utc : 'Unknown');

    var lines = [];
    lines.push("<div style='font:900 14px/1 Lato,Arial,sans-serif;opacity:.98'>⚡ Lightning Flash</div>");
    lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:6px'><b>Time:</b> " + escapeHtml(when) + "</div>");
    lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Type:</b> " + escapeHtml(String((d && d.kind) || 'total_lightning').replaceAll('_',' ')) + "</div>");
    if (lat != null && lon != null) {
      lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Coordinates:</b> " + lat.toFixed(3) + ", " + lon.toFixed(3) + "</div>");
    }
    if (energy != null) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Energy:</b> " + escapeHtml(energy.toExponential(2)) + "</div>");
    if (area != null) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Area:</b> " + escapeHtml(area.toFixed(1)) + "</div>");
    if (fmt(d && d.polarity)) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Polarity:</b> " + escapeHtml(fmt(d.polarity)) + "</div>");
    if (peakCurrent != null) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Peak Current:</b> " + escapeHtml(peakCurrent.toFixed(1)) + " kA</div>");
    if (fmt(d && d.source)) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Source:</b> " + escapeHtml(fmt(d.source)) + "</div>");
    return lines.join('');
  }

  function createLightningIcon(d){
    var strength = lightningStrengthFor(d);
    var flashMs = Math.max(2200, Math.min(4200, Number((lightningManifest && lightningManifest.style && lightningManifest.style.flashMs) || 3000)));
    var boltUrl = "url('" + _joinUrl(DATA_BASE, 'lightning/lightning_final_flipped.svg') + "')";
    var newest = (d && d.__isNewest) ? ' is-newest' : '';
    var scale = d && d.__isNewest ? (1.10 + strength * 0.13) : (0.90 + strength * 0.09);
    return L.divIcon({
      className: 'wdl-lightning-icon',
      html: '<div class="wdl-lightning-bolt' + newest + '" style="--bolt-url:' + boltUrl + ';--bolt-scale:' + scale.toFixed(2) + ';--flash-ms:' + flashMs + 'ms"></div>',
      iconSize: d && d.__isNewest ? [34,34] : [22,22],
      iconAnchor: d && d.__isNewest ? [17,17] : [11,11],
      popupAnchor: [0,-10]
    });
  }

  function getLightningRecentStyle(d){
    var strength = lightningStrengthFor(d);
    var op = Math.max(0.14, Math.min(0.78, (productOpacity.lightning || 0.9) * (0.28 + strength * 0.22)));
    return {
      radius: Math.max(1.4, Math.min(5.2, 2.1 + strength * 1.8)),
      color: '#ffe87a',
      fillColor: '#ffd83a',
      weight: 0.6,
      opacity: Math.max(0.16, op * 0.72),
      fillOpacity: Math.max(0.10, op * 0.55),
      className: 'wdl-lightning-recent'
    };
  }

  function getLightningHistoryStyle(d, nowMs){
    var age = Math.max(0, nowMs - d.timeMs);
    var t = Math.max(0, Math.min(1, age / Math.max(lightningRecentWindowMs, 1)));
    var hue = 52 + (1 - t) * 230;
    var sat = 95 - t * 18;
    var light = 62 - t * 18;
    var fill = 'hsl(' + hue.toFixed(0) + ',' + sat.toFixed(0) + '%,' + light.toFixed(0) + '%)';
    return {
      radius: 2.1,
      color: 'rgba(20,20,20,.42)',
      fillColor: fill,
      weight: 0.45,
      opacity: 0.38,
      fillOpacity: 0.34
    };
  }

  function clearLightningLayers(){
    try{ if (lightningFreshLayer && map.hasLayer(lightningFreshLayer)) map.removeLayer(lightningFreshLayer); }catch(e){}
    try{ if (lightningRecentLayer && map.hasLayer(lightningRecentLayer)) map.removeLayer(lightningRecentLayer); }catch(e){}
    try{ if (lightningHistoryLayer && map.hasLayer(lightningHistoryLayer)) map.removeLayer(lightningHistoryLayer); }catch(e){}
    lightningFreshLayer = null;
    lightningRecentLayer = null;
    lightningHistoryLayer = null;
    lightningFreshMarkerIndex = Object.create(null);
    lightningRecentMarkerIndex = Object.create(null);
    lightningHistoryMarkerIndex = Object.create(null);
  }

  var lightningCounterDrag = { active:false, startX:0, startY:0, left:0, top:0 };
  var lightningMarqueeDrag = { active:false, startX:0, startY:0, left:0, top:0 };
  var lightningLastUpdateMs = 0;
  var lightningLastHudSig = '';

  function ensureLightningCounter(){
    return null;
  }


  function ensureLightningMarquee(){
    if (lightningMarqueeDom && lightningMarqueeDom.parentNode) return;
    var host = document.body;
    var div = document.getElementById('wdlLightningMarqueeHud');
    if (!div){
      div = document.createElement('div');
      div.id = 'wdlLightningMarqueeHud';
      div.className = 'lightning-marquee';
      div.innerHTML = '';
      div.dataset.moved = '';
      host.appendChild(div);
    }
    lightningMarqueeDom = div;
    div.addEventListener('mousedown', beginLightningMarqueeDrag);
    div.addEventListener('touchstart', beginLightningMarqueeDrag, {passive:false});
    document.addEventListener('mousemove', moveLightningMarqueeDrag);
    document.addEventListener('touchmove', moveLightningMarqueeDrag, {passive:false});
    document.addEventListener('mouseup', endLightningMarqueeDrag);
    document.addEventListener('touchend', endLightningMarqueeDrag);
  }

  function beginLightningMarqueeDrag(ev){
    ensureLightningMarquee();
    var div = lightningMarqueeDom;
    if (!div) return;
    var e = ev && (ev.touches ? ev.touches[0] : ev);
    if (!e) return;
    var rect = div.getBoundingClientRect();
    lightningMarqueeDrag.active = true;
    lightningMarqueeDrag.startX = e.clientX;
    lightningMarqueeDrag.startY = e.clientY;
    lightningMarqueeDrag.left = rect.left;
    lightningMarqueeDrag.top = rect.top;
    div.classList.add('is-dragging');
    try{ if (map && map.dragging) map.dragging.disable(); }catch(_){}
    try{ if (ev.stopPropagation) ev.stopPropagation(); }catch(_){}
    try{ if (ev.preventDefault) ev.preventDefault(); }catch(_){}
  }

  function moveLightningMarqueeDrag(ev){
    if (!lightningMarqueeDrag.active) return;
    var div = lightningMarqueeDom;
    if (!div) return;
    var e = ev && (ev.touches ? ev.touches[0] : ev);
    if (!e) return;
    var dx = e.clientX - lightningMarqueeDrag.startX;
    var dy = e.clientY - lightningMarqueeDrag.startY;
    var maxLeft = Math.max(8, window.innerWidth - div.offsetWidth - 8);
    var maxTop = Math.max(90, window.innerHeight - div.offsetHeight - 8);
    div.style.left = Math.max(8, Math.min(maxLeft, lightningMarqueeDrag.left + dx)) + 'px';
    div.style.top = Math.max(90, Math.min(maxTop, lightningMarqueeDrag.top + dy)) + 'px';
    div.style.right = 'auto';
    div.style.bottom = 'auto';
    div.dataset.moved = '1';
    try{ if (ev.stopPropagation) ev.stopPropagation(); }catch(_){}
    try{ if (ev.preventDefault) ev.preventDefault(); }catch(_){}
  }

  function endLightningMarqueeDrag(){
    lightningMarqueeDrag.active = false;
    try{ if (lightningMarqueeDom) lightningMarqueeDom.classList.remove('is-dragging'); }catch(_){}
    try{ if (map && map.dragging) map.dragging.enable(); }catch(_){}
  }

  function beginLightningCounterDrag(ev){
    return;
  }

  function moveLightningCounterDrag(ev){
    return;
  }

  function endLightningCounterDrag(){
    return;
  }

  function lightningHudAllowed(){
    try{
      return !(window && window.innerWidth <= 640);
    }catch(e){
      return true;
    }
  }

  function enforceLightningHudVisibility(){
    try{
      if (!lightningMarqueeDom) return;
      lightningMarqueeDom.style.display = lightningHudAllowed() ? '' : 'none';
    }catch(e){}
  }

  function hideLightningCounter(){
    try{
      ensureLightningMarquee();
      var m = lightningMarqueeDom;
      if (m) m.style.display = 'none';
    }catch(e){}
  }

  function showLightningHud(){
    try{
      ensureLightningMarquee();
      var m = lightningMarqueeDom;
      if (!m) return;
      if (!lightningHudAllowed()){
        m.style.display = 'none';
        return;
      }
      m.style.display = '';
    }catch(e){}
  }

  function renderLightningCounter(nowCount, recentCount, last5Count, totalCount, jumpInfo){
    return;
  }


  function renderLightningMarquee(totalCount, nowCount){
    ensureLightningMarquee();
    var div = lightningMarqueeDom;
    if (!div) return;
    if (!lightningHudAllowed()){
      div.style.display = 'none';
      return;
    }
    div.style.display = '';
    if (!div.dataset.moved){
      div.style.top = '182px';
      div.style.right = '18px';
      if (!lightningHudAllowed()) div.style.display = 'none';
      div.style.left = 'auto';
      div.style.bottom = 'auto';
    }
    var btnClass = lightningHistoryVisible ? 'lm-btn is-active' : 'lm-btn';
    var html =
      '<div class="lm-title">Total Lightning Strikes</div>' +
      '<div class="lm-value">' + totalCount + '</div>' +
      '<div class="lm-sub">At current simulator time • active flashes now: ' + nowCount + '</div>' +
      '<div class="lm-btnrow"><button type="button" id="lightningHistoryToggleBtn" class="' + btnClass + '">' + (lightningHistoryVisible ? 'Hide Full Strike History' : 'Show Full Strike History') + '</button></div>';
    if (div.innerHTML !== html) {
      div.innerHTML = html;
      var btn = document.getElementById('lightningHistoryToggleBtn');
      if (btn){
        btn.addEventListener('mousedown', function(ev){ try{ ev.stopPropagation(); }catch(e){} });
        btn.addEventListener('click', function(ev){
          try{ ev.stopPropagation(); ev.preventDefault(); }catch(e){}
          setLightningHistoryVisible(!lightningHistoryVisible);
        });
      }
    }
  }

  function evaluateLightningJump(nowMs){
    var curStart = nowMs - lightningJumpWindowMs;
    var prevStart = nowMs - lightningJumpWindowMs * 2;
    var recent = 0, prior = 0;
    for (var i=0;i<lightningEvents.length;i++){
      var t = lightningEvents[i].timeMs;
      if (t > nowMs) break;
      if (t > curStart) recent++;
      else if (t > prevStart) prior++;
    }
    var delta = recent - prior;
    var active = recent >= 8 && delta >= 5 && recent >= (prior * 1.5);
    return { active: active, recent: recent, prior: prior, delta: delta };
  }


  function queueLightningBeeps(count){
    return;
  }

  function playLightningSound(count){
    return;
    if (!lightningSoundEnabled || !count) return;
    var now = Date.now();
    if (now - lightningLastSoundAt < 550) return;
    lightningLastSoundAt = now;
    try{
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!lightningAudioContext) lightningAudioContext = new Ctx();
      var ctx = lightningAudioContext;
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'triangle';
      var base = Math.min(880, 420 + Math.min(count, 8) * 35);
      osc.frequency.setValueAtTime(base, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
    }catch(e){}
  }

  function setLightningOpacity(op){
    productOpacity.lightning = Math.max(0.15, Math.min(1, Number(op) || 0.9));
    if (!lightningEnabled) return;
    Object.keys(lightningFreshMarkerIndex).forEach(function(k){
      var m = lightningFreshMarkerIndex[k];
      try{ if (m && m.getElement) { var el = m.getElement(); if (el) el.style.opacity = String(productOpacity.lightning); } }catch(e){}
    });
    Object.keys(lightningRecentMarkerIndex).forEach(function(k){
      var m = lightningRecentMarkerIndex[k];
      try{ if (m && m.setStyle) m.setStyle({ opacity: Math.max(0.25, productOpacity.lightning * 0.7), fillOpacity: Math.max(0.12, productOpacity.lightning * 0.45) }); }catch(e){}
    });
  }
  window.setLightningOpacity = setLightningOpacity;

  function upsertLightningFresh(fresh){
    var seen = Object.create(null);
    if (!lightningFreshLayer){ lightningFreshLayer = L.layerGroup().addTo(map); }
    var maxAnimated = 130;
    fresh.forEach(function(d, idx){
      if (idx >= maxAnimated) return;
      seen[d.id] = true;
      var marker = lightningFreshMarkerIndex[d.id];
      if (!marker){
        marker = L.marker([d.lat, d.lon], { icon:createLightningIcon(d), keyboard:false, interactive:true });
        marker.bindPopup(buildLightningPopup(d), { className:'hrrr-popup' });
        marker.__iconSig = String(!!d.__isNewest);
        lightningFreshMarkerIndex[d.id] = marker;
        lightningFreshLayer.addLayer(marker);
      } else {
        marker.setLatLng([d.lat, d.lon]);
        var sig = String(!!d.__isNewest);
        if (marker.__iconSig !== sig){
          marker.setIcon(createLightningIcon(d));
          marker.__iconSig = sig;
        }
      }
      try{ var el = marker.getElement && marker.getElement(); if (el) el.style.opacity = String(productOpacity.lightning || 0.9); }catch(e){}
    });
    Object.keys(lightningFreshMarkerIndex).forEach(function(id){
      if (seen[id]) return;
      var marker = lightningFreshMarkerIndex[id];
      try{ if (lightningFreshLayer && marker) lightningFreshLayer.removeLayer(marker); }catch(e){}
      delete lightningFreshMarkerIndex[id];
    });
  }

  function upsertLightningRecent(recent){
    var seen = Object.create(null);
    if (!lightningRecentLayer){ lightningRecentLayer = L.layerGroup().addTo(map); }
    recent.forEach(function(d){
      seen[d.id] = true;
      var marker = lightningRecentMarkerIndex[d.id];
      var style = getLightningRecentStyle(d);
      if (!marker){
        marker = L.circleMarker([d.lat, d.lon], style);
        marker.bindPopup(buildLightningPopup(d), { className:'hrrr-popup' });
        lightningRecentMarkerIndex[d.id] = marker;
        lightningRecentLayer.addLayer(marker);
      } else {
        marker.setLatLng([d.lat, d.lon]);
        marker.setStyle(style);
      }
    });
    Object.keys(lightningRecentMarkerIndex).forEach(function(id){
      if (seen[id]) return;
      var marker = lightningRecentMarkerIndex[id];
      try{ if (lightningRecentLayer && marker) lightningRecentLayer.removeLayer(marker); }catch(e){}
      delete lightningRecentMarkerIndex[id];
    });
  }


  function upsertLightningHistory(nowMs){
    if (!lightningHistoryVisible){
      try{ if (lightningHistoryLayer && map.hasLayer(lightningHistoryLayer)) map.removeLayer(lightningHistoryLayer); }catch(e){}
      lightningHistoryLayer = null;
      lightningHistoryMarkerIndex = Object.create(null);
      return;
    }
    if (!lightningHistoryLayer){ lightningHistoryLayer = L.layerGroup().addTo(map); }
    var seen = Object.create(null);
    var maxHistory = 1000;
    var start = Math.max(0, total - maxHistory);
    for (var i = start; i < total; i++){
      var d = lightningEvents[i];
      if (!d || d.timeMs > nowMs) continue;
      seen[d.id] = true;
      var marker = lightningHistoryMarkerIndex[d.id];
      var style = getLightningHistoryStyle(d, nowMs);
      if (!marker){
        marker = L.circleMarker([d.lat, d.lon], style);
        marker.bindPopup(buildLightningPopup(d), { className:'hrrr-popup' });
        lightningHistoryMarkerIndex[d.id] = marker;
        lightningHistoryLayer.addLayer(marker);
      } else {
        marker.setLatLng([d.lat, d.lon]);
        marker.setStyle(style);
      }
    }
    Object.keys(lightningHistoryMarkerIndex).forEach(function(id){
      if (seen[id]) return;
      var marker = lightningHistoryMarkerIndex[id];
      try{ if (lightningHistoryLayer && marker) lightningHistoryLayer.removeLayer(marker); }catch(e){}
      delete lightningHistoryMarkerIndex[id];
    });
  }

  function setLightningHistoryVisible(on){
    lightningHistoryVisible = !!on;
    window.lightningHistoryVisible = lightningHistoryVisible;
    lightningLastHudSig = '';
    try{ updateLightning(); }catch(e){}
  }
  window.setLightningHistoryVisible = setLightningHistoryVisible;

  async function loadLightningManifest(){
    if (lightningManifest) return lightningManifest;
    if (lightningLoadPromise) return lightningLoadPromise;
    var url = getLightningManifestUrl();
    setStatus('Loading lightning…');
    lightningLoadPromise = fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' })
      .then(function(r){
        if (!r.ok) throw new Error('Lightning manifest HTTP ' + r.status + ': ' + url);
        return r.json();
      })
      .then(async function(manifest){
        lightningManifest = manifest || {};
        var style = lightningManifest.style || {};
        lightningFreshWindowMs = Math.max(2 * 60 * 1000, Math.min(18 * 60 * 1000, Number(style.flashWindowMs || style.freshWindowMs || 12 * 60 * 1000)));
        lightningRecentWindowMs = Math.max(6 * 60 * 1000, Math.min(30 * 60 * 1000, Number(style.recentMinutes || 22) * 60 * 1000));
        lightningCounterWindowMs = Math.max(8 * 60 * 1000, Math.min(24 * 60 * 1000, Number(style.counterWindowMinutes || 12) * 60 * 1000));
        var files = Array.isArray(lightningManifest.files) ? lightningManifest.files : [];
        if (!files.length || !files[0].file) throw new Error('Lightning manifest missing files[0].file');
        var folder = url.split('/').slice(0,-1).join('/') + '/';
        var dataUrl = _isAbsUrl(files[0].file) ? files[0].file : _joinUrl(folder, files[0].file);
        var res = await fetch(dataUrl + (dataUrl.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
        if (!res.ok) throw new Error('Lightning data HTTP ' + res.status + ': ' + dataUrl);
        var raw = await res.json();
        var arr = Array.isArray(raw) ? raw : (Array.isArray(raw.features) ? raw.features.map(function(f){
          var p = f.properties || {};
          if (f.geometry && f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates)){
            p.lon = f.geometry.coordinates[0];
            p.lat = f.geometry.coordinates[1];
          }
          return p;
        }) : []);
        lightningEvents = arr.map(normalizeLightningRecord).filter(Boolean).sort(function(a,b){ return a.timeMs - b.timeMs; });
        window.__lightningEnergyRange__ = lightningEnergyRange();
        setStatus('Lightning loaded');
        return lightningManifest;
      })
      .catch(function(err){
        console.error('Lightning load failed:', err);
        lightningLoadPromise = null;
        lightningManifest = null;
        lightningEvents = [];
        setStatus('Lightning failed');
        throw err;
      });
    return lightningLoadPromise;
  }

  function updateLightning(){
    if (!lightningEnabled){
      clearLightningLayers();
      hideLightningCounter();
      lightningLastFreshIds = Object.create(null);
      lightningHistoryVisible = false;
      lightningLastHudSig = '';
      if (lightningBeepTimer){ clearInterval(lightningBeepTimer); lightningBeepTimer = null; }
      lightningBeepQueue = 0;
      return;
    }
    if (!lightningEvents.length) return;
    injectLightningStyles();
    var nowMs = curZ.getTime();
    if (lightningLastUpdateMs && Math.abs(nowMs - lightningLastUpdateMs) < 900) return;
    lightningLastUpdateMs = nowMs;
    var fresh = [];
    var recent = [];
    var last5 = 0;
    var total = 0;
    for (var i=0;i<lightningEvents.length;i++){
      var d = lightningEvents[i];
      if (d.timeMs > nowMs) break;
      total++;
      var age = nowMs - d.timeMs;
      if (age <= lightningCounterWindowMs) last5++;
      if (age <= lightningFreshWindowMs) fresh.push(d);
      else if (age <= lightningRecentWindowMs) recent.push(d);
    }
    var currentIds = Object.create(null);
    var newCount = 0;
    var newestId = '';
    fresh.forEach(function(d){
      currentIds[d.id] = true;
      if (!lightningLastFreshIds[d.id]){
        newCount++;
        newestId = d.id;
      }
    });
    lightningLastFreshIds = currentIds;
    fresh.forEach(function(d){ d.__isNewest = (d.id === newestId); });
    var stamp = String(nowMs) + '|' + fresh.map(function(d){ return d.id; }).join(',') + '|' + recent.length + '|' + (lightningHistoryVisible ? 'history1' : 'history0');
    var isNewFrame = stamp !== lightningLastRenderedStamp;
    if (!isNewFrame) return;
    lightningLastRenderedStamp = stamp;
    upsertLightningFresh(fresh);
    upsertLightningRecent(recent);
    upsertLightningHistory(nowMs);
    setLightningOpacity(productOpacity.lightning || 0.9);
    showLightningHud();
    var hudSig = total + '|' + fresh.length;
    if (hudSig !== lightningLastHudSig){
      lightningLastHudSig = hudSig;
      renderLightningMarquee(total, fresh.length);
    }
    if (newCount) queueLightningBeeps(Math.min(newCount, 3));
  }

  async function setLightningEnabled(on){
    lightningEnabled = !!on;
    window.lightningEnabled = lightningEnabled;
    if (lightningEnabled){
      injectLightningStyles();
      await loadLightningManifest();
      showLightningHud();
      updateLightning();
      setStatus('Lightning on');
    } else {
      clearLightningLayers();
      hideLightningCounter();
      setStatus('Lightning off');
    }
    try{ updateProductLabel(); }catch(e){}
    try{ updateLegend(); }catch(e){}
    try{ syncOpacitySliderToActive(); }catch(e){}
    try{ if (typeof syncDockUi === 'function') syncDockUi(); }catch(e){}
  }

  function setLightningSoundEnabled(on){
    lightningSoundEnabled = !!on;
    window.lightningSoundEnabled = lightningSoundEnabled;
    try{ if (typeof syncDockUi === 'function') syncDockUi(); }catch(e){}
  }

  window.setLightningEnabled = setLightningEnabled;
  window.setLightningSoundEnabled = setLightningSoundEnabled;
  window.updateLightning = updateLightning;
  window.showLightningHud = showLightningHud;


  // ---------- GOES / Satellite ----------
  var goesEnabled = false;
  var goesOverlay = null;
  var goesManifest = null;
  var goesFrames = [];
  var goesBounds = null;
  var currentGoesFrameIndex = 0;
  var goesLoadPromise = null;
  var goesLoadToken = 0;
  var goesDisplayedUrl = '';
  var goesPendingUrl = '';
  var goesAnimTimer = null;
  var goesFitMode = false;
  var GOES_STORAGE_KEY = "wdl_goes_bounds";
  var GOES_DEFAULT_BOUNDS = null;
  var GOES_BOUNDS = null;
  window.goesEnabled = goesEnabled;
  window.goesOverlay = goesOverlay;

  function getSatelliteManifestUrl(){
    try{
      if (CFG && CFG.satellite){
        var u = CFG.satellite.manifest || CFG.satellite.url || CFG.satellite.file;
        if (u) return _isAbsUrl(u) ? u : _joinUrl(DATA_BASE, u);
      }
    }catch(e){}
    return _joinUrl(DATA_BASE, 'satellite/truecolor/manifest.json');
  }
  function parseGenericBounds(raw){
    if (!raw) return null;
    var b = raw.bounds || raw.bbox || raw.leaflet_bounds || raw;
    if (Array.isArray(b) && b.length === 2 && Array.isArray(b[0]) && Array.isArray(b[1])) return b;
    var south = Number(b.south ?? b.min_latitude ?? b.minLat ?? NaN);
    var north = Number(b.north ?? b.max_latitude ?? b.maxLat ?? NaN);
    var west  = _normLon(b.west ?? b.min_longitude ?? b.minLon ?? NaN);
    var east  = _normLon(b.east ?? b.max_longitude ?? b.maxLon ?? NaN);
    if ([south,north,west,east].every(isFinite)) return [[south, west],[north, east]];
    return null;
  }
  function parseGenericFrames(raw){
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
      frames.push({ file:file, label:f.label || f.name || ('SAT ' + String(i).padStart(2,'0')), time:tRaw || null, timeMs:timeMs, points:f.points || f.pointFile || f.pointsFile || null });
    });
    return frames;
  }
  function loadBoundsFromStorage(){
    try{
      var raw = localStorage.getItem(GOES_STORAGE_KEY);
      if (!raw) return null;
      var b = JSON.parse(raw);
      if (Array.isArray(b) && b.length === 2) return b;
    }catch(e){}
    return null;
  }
  function saveBoundsToStorage(bounds){
    try{ if (bounds) localStorage.setItem(GOES_STORAGE_KEY, JSON.stringify(bounds)); }catch(e){}
  }
  function setGoesBounds(bounds){
    if (!bounds) return;
    GOES_BOUNDS = bounds;
  }
  function currentGoesFrame(){
    if (!goesFrames.length) return null;
    var valid = goesFrames.filter(function(f){ return isFinite(f.timeMs); });
    if (valid.length){
      var best = valid[0], bestDiff = Math.abs(valid[0].timeMs - curZ.getTime());
      for (var i=1;i<valid.length;i++){
        var d = Math.abs(valid[i].timeMs - curZ.getTime());
        if (d < bestDiff){ best = valid[i]; bestDiff = d; }
      }
      currentGoesFrameIndex = Math.max(0, goesFrames.indexOf(best));
      return best;
    }
    return goesFrames[Math.max(0, Math.min(goesFrames.length - 1, currentGoesFrameIndex|0))] || null;
  }
  function goesFrameUrl(frame){
    if (!frame) return null;
    var manifestUrl = getSatelliteManifestUrl();
    var folder = manifestUrl.split('/').slice(0,-1).join('/') + '/';
    return _isAbsUrl(frame.file) ? frame.file : _joinUrl(folder, frame.file);
  }
  async function loadGoesManifest(){
    if (goesLoadPromise) return goesLoadPromise;
    var url = getSatelliteManifestUrl();
    setStatus('Loading satellite…');
    goesLoadPromise = fetch(url, { cache:'no-store' }).then(function(r){
      if (!r.ok) throw new Error('Satellite manifest HTTP ' + r.status + ': ' + url);
      return r.json();
    }).then(function(raw){
      goesManifest = raw || {};
      goesFrames = parseGenericFrames(raw);
      goesBounds = parseGenericBounds(raw) || goesBounds || RADAR_BOUNDS;
      GOES_DEFAULT_BOUNDS = goesBounds;
      GOES_BOUNDS = loadBoundsFromStorage() || goesBounds;
      if (!goesFrames.length) throw new Error('Satellite manifest has no frames');
      setStatus('Satellite loaded: ' + goesFrames.length + ' frames');
      return raw;
    }).catch(function(err){
      goesLoadPromise = null;
      setStatus('Satellite failed');
      throw err;
    });
    return goesLoadPromise;
  }
  function stopGoesAnim(){
    if (goesAnimTimer){ clearInterval(goesAnimTimer); goesAnimTimer = null; }
  }
  function playGoesAnim(ms){
    stopGoesAnim();
    ms = Math.max(120, Number(ms) || 400);
    goesAnimTimer = setInterval(function(){
      if (!goesEnabled || !goesFrames.length) return;
      currentGoesFrameIndex = (currentGoesFrameIndex + 1) % goesFrames.length;
      updateGoes(true);
    }, ms);
  }
  function enableGoesFitMode(on){ goesFitMode = !!on; }
  function updateGoes(fromAnim){
    if (!goesEnabled){
      if (goesOverlay && map && map.hasLayer(goesOverlay)) map.removeLayer(goesOverlay);
      goesPendingUrl = '';
      return;
    }
    var kickoff = goesManifest ? Promise.resolve(goesManifest) : loadGoesManifest();
    kickoff.then(function(){
      var frame = fromAnim ? (goesFrames[Math.max(0, Math.min(goesFrames.length - 1, currentGoesFrameIndex|0))] || null) : currentGoesFrame();
      if (!frame) return;
      var url = goesFrameUrl(frame);
      var bounds = GOES_BOUNDS || goesBounds || RADAR_BOUNDS;
      if (!url) return;
      if (url === goesDisplayedUrl || url === goesPendingUrl) return;
      goesPendingUrl = url;
      var token = ++goesLoadToken;
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function(){
        if (token !== goesLoadToken) return;
        goesPendingUrl = '';
        goesDisplayedUrl = url;
        if (goesOverlay && map.hasLayer(goesOverlay)) map.removeLayer(goesOverlay);
        goesOverlay = L.imageOverlay(url, bounds, { opacity: productOpacity.goes || 0.70, interactive:false });
        window.goesOverlay = goesOverlay;
        goesOverlay.addTo(map);
        applyActiveOpacity();
        setStatus('Satellite: ' + (frame.label || frame.time || url));
        try{ updateProductLabel(); }catch(e){}
      };
      img.onerror = function(){
        if (token === goesLoadToken){
          goesPendingUrl = '';
          setStatus(goesDisplayedUrl ? 'Satellite holding last frame' : ('Satellite missing: ' + url));
        }
      };
      img.src = url;
    }).catch(function(err){ console.error(err); setStatus('Satellite failed'); });
  }
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
  var toolTrackBtn   = document.getElementById("toolTrack");
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
      document.body.classList.remove("track-active");
      setToolActive(toolTrackBtn, false);
      clearStormTrackGraphics();
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


  // ----- Storm tracker -----
  var trackLayerGroup = L.layerGroup().addTo(map);
  var trackStartLatLng = null;
  var trackCurrentLatLng = null;
  var trackArrowLine = null;
  var trackArrowHead = null;
  var trackDotLayer = null;
  var trackDragging = false;
  var stormTrackSpeedMarker = null;

  var stormTrackSpeedBox = document.getElementById("stormTrackSpeedBox");
  var stormTrackSpeedValue = document.getElementById("stormTrackSpeedValue");
  var stormTrackArrivalBox = document.getElementById("stormTrackArrivalBox");
  var stormTrackArrivalBody = document.getElementById("stormTrackArrivalBody");
  var stormTrackCloseBtn = document.getElementById("stormTrackCloseBtn");

  function ensureStormTrackUi(){
    try{
      if (!document.getElementById("stormTrackUiStyles")){
        var css = document.createElement("style");
        css.id = "stormTrackUiStyles";
        css.textContent =
          '#stormTrackSpeedBox{position:absolute;z-index:100070;pointer-events:none;display:none;}' +
          '#stormTrackSpeedBox.open{display:block;}' +
          '#stormTrackSpeedValue{display:inline-block;padding:10px 16px;border-radius:14px;background:linear-gradient(180deg,#08182c,#040d18);border:2px solid rgba(255,255,255,.16);color:#ffffff;font:900 18px/1.05 "Lato",Arial,sans-serif;letter-spacing:.4px;box-shadow:0 12px 24px rgba(0,0,0,.34);text-shadow:0 1px 2px rgba(0,0,0,.38);white-space:nowrap;text-transform:uppercase;min-width:110px;text-align:center;}' +
          '#stormTrackArrivalBox{position:absolute;left:18px;bottom:58px;z-index:100071;width:290px;max-height:360px;display:none;border-radius:20px;background:linear-gradient(180deg,rgba(11,28,45,.97),rgba(6,18,30,.98));border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 34px rgba(0,0,0,.34);overflow:hidden;}' +
          '#stormTrackArrivalBox.open{display:block;}' +
          '#stormTrackArrivalHead{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);cursor:move;user-select:none;}' +
          '#stormTrackArrivalTitle{color:#fff;font:900 16px/1 "Lato",Arial,sans-serif;text-transform:uppercase;letter-spacing:.7px;}' +
          '#stormTrackCloseBtn{border:none;background:#133357;color:#fff;border-radius:12px;padding:8px 10px;cursor:pointer;font:900 14px/1 "Lato",Arial,sans-serif;}' +
          '#stormTrackArrivalBody{padding:10px 12px 12px;overflow:auto;max-height:290px;}' +' .storm-speed-marker{background:transparent;border:none;}' +' .storm-speed-box{transform:translate(-50%,-50%);padding:8px 12px 10px;border-radius:14px;background:linear-gradient(180deg,rgba(6,18,32,.96),rgba(3,10,20,.98));border:2px solid rgba(255,255,255,.18);box-shadow:0 10px 22px rgba(0,0,0,.34);color:#fff;min-width:108px;text-align:center;pointer-events:none;}' +' .storm-speed-label{font:800 10px/1 \\"Lato\\",Arial,sans-serif;letter-spacing:1px;opacity:.82;margin-bottom:4px;text-transform:uppercase;}' +' .storm-speed-value{font:900 26px/1 \\"Lato\\",Arial,sans-serif;letter-spacing:.2px;text-shadow:0 1px 2px rgba(0,0,0,.38);}' +' .storm-speed-value small{font:900 15px/1 \\"Lato\\",Arial,sans-serif;opacity:.96;}' +
          '.sta-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 8px;border-radius:12px;margin-bottom:6px;background:rgba(255,255,255,.04);}' +
          '.sta-city{color:#fff;font:900 16px/1.05 "Lato",Arial,sans-serif;letter-spacing:.2px;}' +
          '.sta-time{color:#8fe7ff;font:900 16px/1.05 "Lato",Arial,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.3);}';
        document.head.appendChild(css);
      }

      if (!stormTrackSpeedBox){
        stormTrackSpeedBox = document.createElement("div");
        stormTrackSpeedBox.id = "stormTrackSpeedBox";
        stormTrackSpeedValue = document.createElement("div");
        stormTrackSpeedValue.id = "stormTrackSpeedValue";
        stormTrackSpeedValue.textContent = "46 mph";
        stormTrackSpeedBox.appendChild(stormTrackSpeedValue);
        document.body.appendChild(stormTrackSpeedBox);
      } else if (!stormTrackSpeedValue){
        stormTrackSpeedValue = document.createElement("div");
        stormTrackSpeedValue.id = "stormTrackSpeedValue";
        stormTrackSpeedValue.textContent = "46 mph";
        stormTrackSpeedBox.appendChild(stormTrackSpeedValue);
      }

      if (!stormTrackArrivalBox){
        stormTrackArrivalBox = document.createElement("div");
        stormTrackArrivalBox.id = "stormTrackArrivalBox";
        stormTrackArrivalBox.innerHTML =
          '<div id="stormTrackArrivalHead">' +
            '<div id="stormTrackArrivalTitle">Storm Arrival Times</div>' +
            '<button id="stormTrackCloseBtn" type="button">Close</button>' +
          '</div>' +
          '<div id="stormTrackArrivalBody"></div>';
        document.body.appendChild(stormTrackArrivalBox);
        stormTrackArrivalBody = stormTrackArrivalBox.querySelector("#stormTrackArrivalBody");
        stormTrackCloseBtn = stormTrackArrivalBox.querySelector("#stormTrackCloseBtn");
      } else {
        if (!stormTrackArrivalBody) stormTrackArrivalBody = stormTrackArrivalBox.querySelector("#stormTrackArrivalBody");
        if (!stormTrackCloseBtn) stormTrackCloseBtn = stormTrackArrivalBox.querySelector("#stormTrackCloseBtn");
      }
    }catch(e){
      console.warn("storm track ui creation failed", e);
    }
  }

  ensureStormTrackUi();

  var stormTrackArrivalDrag = { active:false, startX:0, startY:0, left:0, top:0 };

  function beginStormTrackArrivalDrag(ev){
    if (!stormTrackArrivalBox) return;
    var e = ev && (ev.touches ? ev.touches[0] : ev);
    if (!e) return;
    stormTrackArrivalDrag.active = true;
    stormTrackArrivalDrag.startX = e.clientX;
    stormTrackArrivalDrag.startY = e.clientY;
    var rect = stormTrackArrivalBox.getBoundingClientRect();
    stormTrackArrivalDrag.left = rect.left;
    stormTrackArrivalDrag.top = rect.top;
    try{ if (ev.preventDefault) ev.preventDefault(); }catch(_){}
  }

  function moveStormTrackArrivalDrag(ev){
    if (!stormTrackArrivalDrag.active || !stormTrackArrivalBox) return;
    var e = ev && (ev.touches ? ev.touches[0] : ev);
    if (!e) return;
    var dx = e.clientX - stormTrackArrivalDrag.startX;
    var dy = e.clientY - stormTrackArrivalDrag.startY;
    stormTrackArrivalBox.style.left = Math.max(8, stormTrackArrivalDrag.left + dx) + "px";
    stormTrackArrivalBox.style.top = Math.max(90, stormTrackArrivalDrag.top + dy) + "px";
    stormTrackArrivalBox.style.bottom = "auto";
    stormTrackArrivalBox.dataset.moved = "1";
    try{ if (ev.preventDefault) ev.preventDefault(); }catch(_){}
  }

  function endStormTrackArrivalDrag(){
    stormTrackArrivalDrag.active = false;
  }

  function allTrackCities(){
    var out = [];
    function add(list){
      if (!Array.isArray(list)) return;
      for (var i=0; i<list.length; i++) out.push(list[i]);
    }
    add(typeof CITIES_TIER1 !== "undefined" ? CITIES_TIER1 : []);
    add(typeof CITIES_TIER2 !== "undefined" ? CITIES_TIER2 : []);
    add(typeof CITIES_TIER3 !== "undefined" ? CITIES_TIER3 : []);
    add(typeof NATIONAL_CITIES !== "undefined" ? NATIONAL_CITIES : []);
    return out;
  }

  function formatDisplayEta(baseDate, minutes){
    var base = new Date(baseDate.getTime() + Math.round(minutes) * 60000);
    try{
      return base.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Chicago"
      });
    }catch(e){
      var hh = base.getHours();
      var mm = String(base.getMinutes()).padStart(2, "0");
      var ap = hh >= 12 ? "PM" : "AM";
      var h12 = hh % 12; if (h12 === 0) h12 = 12;
      return h12 + ":" + mm + " " + ap;
    }
  }

  function getTrackArrowStats(startLL, endLL){
    if (!startLL || !endLL) return null;
    var meters = map.distance(startLL, endLL);
    var miles = meters / 1609.344;
    if (!isFinite(miles) || miles <= 0.01) return null;
    return {
      arrowMiles: miles,
      stormMph: miles,           // Option A: arrow represents one hour of motion
      arrowMinutes: 60
    };
  }

  function getTrackFanHits(startLL, endLL){
    var p1 = map.latLngToLayerPoint(startLL);
    var p2 = map.latLngToLayerPoint(endLL);
    var dx = p2.x - p1.x, dy = p2.y - p1.y;
    var len2 = dx*dx + dy*dy;
    if (!len2) return [];

    var cities = allTrackCities();
    var hits = [];
    for (var i=0; i<cities.length; i++){
      var c = cities[i];
      var ll = L.latLng(c[1], c[2]);
      var pc = map.latLngToLayerPoint(ll);
      var vx = pc.x - p1.x, vy = pc.y - p1.y;
      var t = (vx*dx + vy*dy) / len2;
      if (t <= 0 || t > 1.05) continue;
      var projx = p1.x + dx * t, projy = p1.y + dy * t;
      var cross = Math.sqrt(Math.pow(pc.x - projx, 2) + Math.pow(pc.y - projy, 2));
      if (cross > 26) continue;
      hits.push({
        name: c[0],
        lat: c[1],
        lon: c[2],
        t: t
      });
    }

    hits.sort(function(a,b){ return a.t - b.t; });
    var seen = {};
    return hits.filter(function(h){
      if (seen[h.name]) return false;
      seen[h.name] = true;
      return true;
    });
  }


  function clearStormTrackGraphics(){
    try{ trackLayerGroup.clearLayers(); }catch(e){}
    trackArrowLine = null;
    trackArrowHead = null;
    trackDotLayer = null;
    trackStartLatLng = null;
    trackCurrentLatLng = null;
    trackDragging = false;
    try{ if (stormTrackSpeedMarker && map && map.hasLayer(stormTrackSpeedMarker)) map.removeLayer(stormTrackSpeedMarker); }catch(e){}
    stormTrackSpeedMarker = null;
    if (stormTrackSpeedBox) stormTrackSpeedBox.classList.remove("open");
    if (stormTrackArrivalBox) stormTrackArrivalBox.classList.remove("open");
    if (stormTrackArrivalBody) stormTrackArrivalBody.innerHTML = "";
  }

  function setTrackMode(on){
    if (on){
      document.body.classList.add("track-active");
      document.body.classList.remove("measure-active");
      document.body.classList.remove("probe-active");
      document.body.classList.remove("draw-active");
      setToolActive(toolTrackBtn, true);
      setToolActive(toolMeasureBtn, false);
      setToolActive(toolProbeBtn, false);
      setToolActive(toolDrawBtn, false);
      try{ map.dragging.disable(); }catch(e){}
      try{ map.boxZoom.disable(); }catch(e){}
      try{ map.doubleClickZoom.disable(); }catch(e){}
    } else {
      document.body.classList.remove("track-active");
      setToolActive(toolTrackBtn, false);
      try{ map.dragging.enable(); }catch(e){}
      try{ map.boxZoom.enable(); }catch(e){}
      try{ map.doubleClickZoom.enable(); }catch(e){}
      clearStormTrackGraphics();
    }
  }

  function formatEtaLabel(minutes){
    var base = new Date(curZ.getTime() + Math.round(minutes) * 60000);
    var hh = base.getHours();
    var mm = String(base.getMinutes()).padStart(2, "0");
    var ap = hh >= 12 ? "PM" : "AM";
    var h12 = hh % 12; if (h12 === 0) h12 = 12;
    return h12 + ":" + mm + " " + ap;
  }


  function getTrackPolygonCentroid(startLL, endLL){
    if (!startLL || !endLL) return null;
    var p1 = map.latLngToLayerPoint(startLL);
    var p2 = map.latLngToLayerPoint(endLL);
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    var len = Math.sqrt(dx*dx + dy*dy) || 1;
    var ux = dx / len;
    var uy = dy / len;
    var angle = 12 * Math.PI / 180;
    function rotate(vx, vy, ang){
      return {
        x: vx * Math.cos(ang) - vy * Math.sin(ang),
        y: vx * Math.sin(ang) + vy * Math.cos(ang)
      };
    }
    var leftVec = rotate(ux, uy, angle);
    var rightVec = rotate(ux, uy, -angle);
    var leftPt = {x: p1.x + leftVec.x * len, y: p1.y + leftVec.y * len};
    var rightPt = {x: p1.x + rightVec.x * len, y: p1.y + rightVec.y * len};
    return {
      x: (p1.x + leftPt.x + rightPt.x) / 3,
      y: (p1.y + leftPt.y + rightPt.y) / 3
    };
  }


  function getTrackSpeedLatLng(startLL, endLL){
    if (!startLL || !endLL) return null;
    var frac = 0.62; // forward along track, more meteorologist-style
    return L.latLng(
      startLL.lat + (endLL.lat - startLL.lat) * frac,
      startLL.lng + (endLL.lng - startLL.lng) * frac
    );
  }

  function placeStormTrackSpeedBubble(startLL, endLL, mph){
    var ll = getTrackSpeedLatLng(startLL, endLL);
    if (!ll || !isFinite(mph)) return;
    var html = '<div class="storm-speed-box"><div class="storm-speed-label">STORM SPEED</div><div class="storm-speed-value">' +
      Math.max(1, Math.round(mph)) + ' <small>mph</small></div></div>';

    if (!stormTrackSpeedMarker){
      stormTrackSpeedMarker = L.marker(ll, {
        interactive: false,
        zIndexOffset: 1000,
        icon: L.divIcon({
          className: 'storm-speed-marker',
          html: html,
          iconSize: null
        })
      }).addTo(map);
    } else {
      stormTrackSpeedMarker.setLatLng(ll);
      stormTrackSpeedMarker.setIcon(L.divIcon({
        className: 'storm-speed-marker',
        html: html,
        iconSize: null
      }));
      try { if (!map.hasLayer(stormTrackSpeedMarker)) stormTrackSpeedMarker.addTo(map); } catch(e) {}
    }

    if (stormTrackSpeedBox) { stormTrackSpeedBox.classList.remove('open'); stormTrackSpeedBox.style.display = 'none'; }
  }

  function drawTrackPreview(startLL, endLL){
  if (!startLL || !endLL) return;

  var stats = getTrackArrowStats(startLL, endLL);
  var mph = stats ? stats.stormMph : 0;

  placeStormTrackSpeedBubble(startLL, endLL, mph)

  try{ trackLayerGroup.clearLayers(); }catch(e){}

  // Convert to screen space
  var p1 = map.latLngToLayerPoint(startLL);
  var p2 = map.latLngToLayerPoint(endLL);

  var dx = p2.x - p1.x;
  var dy = p2.y - p1.y;
  var len = Math.sqrt(dx*dx + dy*dy) || 1;

  var ux = dx / len;
  var uy = dy / len;

  // Fan angle (degrees → radians)
  var angle = 12 * Math.PI / 180; // ~24° total spread

  function rotate(vx, vy, ang){
    return {
      x: vx * Math.cos(ang) - vy * Math.sin(ang),
      y: vx * Math.sin(ang) + vy * Math.cos(ang)
    };
  }

  var leftVec = rotate(ux, uy, angle);
  var rightVec = rotate(ux, uy, -angle);

  var lengthPx = len;

  var leftPt = L.point(p1.x + leftVec.x * lengthPx, p1.y + leftVec.y * lengthPx);
  var rightPt = L.point(p1.x + rightVec.x * lengthPx, p1.y + rightVec.y * lengthPx);

  L.polygon([
    startLL,
    map.layerPointToLatLng(leftPt),
    map.layerPointToLatLng(rightPt)
  ], {
    color: "#ffffff",
    weight: 2,
    opacity: 0.95,
    fillColor: "#000000",
    fillOpacity: 0.35
  }).addTo(trackLayerGroup);

  // Center line
  L.polyline([startLL, endLL], {
    color: "#ffffff",
    weight: 2,
    opacity: 0.85
  }).addTo(trackLayerGroup);

  // Origin marker
  L.circleMarker(startLL, {
    radius: 6,
    color: "#ffffff",
    weight: 2,
    fillColor: "#ffffff",
    fillOpacity: 1
  }).addTo(trackLayerGroup);

  // TV-style city labels inside fan
  var hits = getTrackFanHits(startLL, endLL).slice(0, 10);
  hits.forEach(function(h){
    var ll = L.latLng(h.lat, h.lon);
    L.circleMarker(ll, {
      radius: 3,
      color: "#ffffff",
      weight: 1.5,
      fillColor: "#fdd835",
      fillOpacity: 1
    }).addTo(trackLayerGroup);


  });
}

  function buildStormArrivalTable(startLL, endLL){
    if (!stormTrackArrivalBody) return;

    var stats = getTrackArrowStats(startLL, endLL);
    if (!stats || !isFinite(stats.stormMph) || stats.stormMph <= 0){
      stormTrackArrivalBody.innerHTML = '<div class="sta-row"><div class="sta-city">Draw a longer storm track</div><div class="sta-time">—</div></div>';
      if (stormTrackArrivalBox) {
      if (!stormTrackArrivalBox.dataset.moved) {
        stormTrackArrivalBox.style.left = "1120px";
        stormTrackArrivalBox.style.top = "300px";
        stormTrackArrivalBox.style.bottom = "auto";
      }
      stormTrackArrivalBox.classList.add("open");
    }
      return;
    }

    var hits = getTrackFanHits(startLL, endLL).map(function(h){
      var etaMinutes = (h.t * stats.arrowMiles / stats.stormMph) * 60;
      return {
        name: h.name,
        mins: Math.max(0, etaMinutes)
      };
    }).slice(0, 14);

    if (!hits.length){
      stormTrackArrivalBody.innerHTML = '<div class="sta-row"><div class="sta-city">No nearby cities on this track</div><div class="sta-time">—</div></div>';
    } else {
      stormTrackArrivalBody.innerHTML = hits.map(function(h){
        return '<div class="sta-row"><div class="sta-city">' + h.name + '</div><div class="sta-time">' + formatDisplayEta(curZ, h.mins) + '</div></div>';
      }).join('');
    }
    if (stormTrackArrivalBox) {
      if (!stormTrackArrivalBox.dataset.moved) {
        stormTrackArrivalBox.style.left = "1120px";
        stormTrackArrivalBox.style.top = "300px";
        stormTrackArrivalBox.style.bottom = "auto";
      }
      stormTrackArrivalBox.classList.add("open");
    }
  }

  function startTrackDrag(e){
    if (!document.body.classList.contains("track-active")) return;
    try{ if (map && map.dragging) map.dragging.disable(); }catch(_){}
    if (!e || !e.latlng) return;
    if (e.originalEvent && e.originalEvent.preventDefault) e.originalEvent.preventDefault();
    if (e.originalEvent && e.originalEvent.stopPropagation) e.originalEvent.stopPropagation();
    trackDragging = true;
    trackStartLatLng = e.latlng;
    trackCurrentLatLng = e.latlng;
    drawTrackPreview(trackStartLatLng, trackCurrentLatLng);
  }

  function moveTrackDrag(e){
    if (!document.body.classList.contains("track-active")) return;
    if (!trackDragging || !trackStartLatLng || !e || !e.latlng) return;
    trackCurrentLatLng = e.latlng;
    drawTrackPreview(trackStartLatLng, trackCurrentLatLng);
  }

  function endTrackDrag(e){
    if (!document.body.classList.contains("track-active")) return;
    try{ if (map && map.dragging) map.dragging.enable(); }catch(_){}
    if (!trackDragging) return;
    trackDragging = false;
    if (e && e.latlng) trackCurrentLatLng = e.latlng;
    if (!trackStartLatLng || !trackCurrentLatLng) return;
    drawTrackPreview(trackStartLatLng, trackCurrentLatLng);
    buildStormArrivalTable(trackStartLatLng, trackCurrentLatLng);
    document.body.classList.remove("track-active");
    if (toolTrackBtn) setToolActive(toolTrackBtn, false);
  }

  if (stormTrackCloseBtn) stormTrackCloseBtn.onclick = function(){
    if (stormTrackArrivalBox) stormTrackArrivalBox.classList.remove("open");
  };
  try{
    var stormTrackArrivalHead = stormTrackArrivalBox ? stormTrackArrivalBox.querySelector("#stormTrackArrivalHead") : null;
    if (stormTrackArrivalHead){
      stormTrackArrivalHead.addEventListener("mousedown", beginStormTrackArrivalDrag);
      stormTrackArrivalHead.addEventListener("touchstart", beginStormTrackArrivalDrag, {passive:false});
      document.addEventListener("mousemove", moveStormTrackArrivalDrag);
      document.addEventListener("touchmove", moveStormTrackArrivalDrag, {passive:false});
      document.addEventListener("mouseup", endStormTrackArrivalDrag);
      document.addEventListener("touchend", endStormTrackArrivalDrag);
    }
  }catch(e){ console.warn("storm arrival drag listeners failed", e); }

  window.clearStormTrackGraphics = clearStormTrackGraphics;
  window.clearStormTrack = clearStormTrackGraphics;
  window.setTrackMode = function(on){
    try{
      document.body.classList.toggle("track-active", !!on);
      if (on){
        document.body.classList.remove("measure-active");
        document.body.classList.remove("probe-active");
        document.body.classList.remove("draw-active");
      }
      if (toolTrackBtn) setToolActive(toolTrackBtn, !!on);
    }catch(e){}
  };
  window.toggleStormTrackMode = function(){
    var on = !document.body.classList.contains("track-active");
    window.setTrackMode(on);
  };


  // ----- Probe mode (HRRR temp only for now) -----
  function setProbeMode(on){
    if (on){
      document.body.classList.add("probe-active");
      document.body.classList.remove("measure-active");
      document.body.classList.remove("draw-active");
      document.body.classList.remove("track-active");
      setToolActive(toolTrackBtn, false);
      clearStormTrackGraphics();
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
    document.body.classList.remove("track-active");
    setToolActive(toolTrackBtn, false);
    clearStormTrackGraphics();
    setToolActive(toolDrawBtn, true);
    setToolActive(toolEraseBtn, true);
    setToolActive(toolMeasureBtn, false);
    setToolActive(toolProbeBtn, false);

    drawing = false;
    currentLine = null;

    try{ map.dragging.disable(); }catch(e){}
    try{ map.boxZoom.disable(); }catch(e){}
    try{ map.doubleClickZoom.disable(); }catch(e){}
    try{ map.scrollWheelZoom.disable(); }catch(e){}
    try{ map.keyboard.disable(); }catch(e){}
    try{ map.touchZoom.disable(); }catch(e){}
    try{ if (map.tap && map.tap.disable) map.tap.disable(); }catch(e){}
  } else {
    document.body.classList.remove("draw-active");
    setToolActive(toolDrawBtn, false);
    setToolActive(toolEraseBtn, false);
    drawing = false;
    currentLine = null;

    try{ map.dragging.enable(); }catch(e){}
    try{ map.boxZoom.enable(); }catch(e){}
    try{ map.doubleClickZoom.enable(); }catch(e){}
    try{ map.scrollWheelZoom.enable(); }catch(e){}
    try{ map.keyboard.enable(); }catch(e){}
    try{ map.touchZoom.enable(); }catch(e){}
    try{ if (map.tap && map.tap.enable) map.tap.enable(); }catch(e){}
  }
}

  function startDraw(e){
  if (!document.body.classList.contains("draw-active")) return;
  if (!e || !e.latlng) return;

  if (e.originalEvent) {
    if (e.originalEvent.preventDefault) e.originalEvent.preventDefault();
    if (e.originalEvent.stopPropagation) e.originalEvent.stopPropagation();
  }

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
    if (e.originalEvent) {
      if (e.originalEvent.preventDefault) e.originalEvent.preventDefault();
      if (e.originalEvent.stopPropagation) e.originalEvent.stopPropagation();
    }
    currentLine.addLatLng(e.latlng);
  }

  function endDraw(e){
    if (!drawing) return;
    if (e && e.originalEvent) {
      if (e.originalEvent.preventDefault) e.originalEvent.preventDefault();
      if (e.originalEvent.stopPropagation) e.originalEvent.stopPropagation();
    }
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
  map.on("mousedown", startTrackDrag);
  map.on("mousemove", moveTrackDrag);
  map.on("mouseup", endTrackDrag);

  // ----- Probe click handler (HRRR temp nearest point) -----
  function handleProbeClick(e){
    if (!e || !e.latlng) return;

    // Prefer active HRRR/model temperature points first on mixed-product cards.
    try{
      if (typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer) && Array.isArray(hrrrPoints) && hrrrPoints.length){
        var best = null;
        var bestD = Infinity;
        for (var i=0; i<hrrrPoints.length; i++){
          var p = hrrrPoints[i];
          if (!p || typeof p.lat !== "number" || typeof p.lon !== "number") continue;
          var d = map.distance(e.latlng, L.latLng(p.lat, p.lon));
          if (d < bestD){ bestD = d; best = p; }
        }
        if (best){
          var probeTitle = (window.hrrrProductMode === 'winds') ? 'Max Surface Wind Gust' : ((window.hrrrProductMode === 'cape') ? 'Surface-Based CAPE' : 'Temperature');
          var probeUnit = best.unit || ((window.hrrrProductMode === 'winds') ? 'mph' : ((window.hrrrProductMode === 'cape') ? ' J/kg' : '°F'));
          var probeValue = (typeof best.value === "number") ? best.value : ((window.hrrrProductMode === 'winds') ? best.mph : ((window.hrrrProductMode === 'cape') ? best.cape : best.tF));
          var probeText = (probeValue == null || !isFinite(probeValue)) ? "—" : (Math.round(probeValue) + probeUnit);
          var content =
            "<div style='font:900 14px/1 Arial,sans-serif;opacity:.9'>" + probeTitle + "</div>" +
            "<div style='font:900 30px/1.05 Arial,sans-serif'>" + probeText + "</div>";
          L.popup({ closeButton:true, className:"hrrr-popup" })
            .setLatLng([best.lat, best.lon])
            .setContent(content)
            .openOn(map);
          return;
        }
      }
    }catch(_){}

    if (jet500Enabled && currentJetVelocityData){
      var jetProbe = getJetWindAtLatLng(e.latlng);
      if (jetProbe){
        var jetContent =
          "<div style='font:900 14px/1 Arial,sans-serif;opacity:.9'>500 mb Winds</div>" +
          "<div style='font:900 30px/1.05 Arial,sans-serif'>" + Math.round(jetProbe.speedMph) + " mph</div>" +
          "<div style='font:900 14px/1.05 Arial,sans-serif;opacity:.9'>u=" + jetProbe.u.toFixed(1) + ", v=" + jetProbe.v.toFixed(1) + " m/s</div>";

        L.popup({ closeButton:true, className:"hrrr-popup" })
          .setLatLng(e.latlng)
          .setContent(jetContent)
          .openOn(map);
        return;
      }
    }

    if (radarVelocityEnabled && radarVelocityLayer){
      var velProbe = getRadarVelocityProbeAtLatLng(e.latlng);
      if (velProbe){
        var velVal = velProbe.value;
        var dirText = velVal > 0 ? 'Away from radar' : (velVal < 0 ? 'Toward radar' : 'Neutral');
        var velContent =
          "<div style='font:900 14px/1 Arial,sans-serif;opacity:.9'>KFSD Radial Velocity</div>" +
          "<div style='font:900 30px/1.05 Arial,sans-serif'>" + (velVal>0?'+':'') + Math.round(velVal) + " mph</div>" +
          "<div style='font:900 14px/1.05 Arial,sans-serif;opacity:.9'>" + dirText + "</div>";
        L.popup({ closeButton:true, className:"hrrr-popup" })
          .setLatLng([velProbe.lat, velProbe.lon])
          .setContent(velContent)
          .openOn(map);
        return;
      }
    }

    L.popup({ closeButton:true, className:"hrrr-popup" })
      .setLatLng(e.latlng)
      .setContent("<div style='font:900 16px/1.1 Arial,sans-serif'>Probe</div><div style='font:900 16px/1.1 Arial,sans-serif'>Turn on <b>Future Temperatures</b>, <b>Future Wind Gusts</b>, <b>CAPE</b>, or <b>500 mb Winds</b>.</div>")
      .openOn(map);
  }

if (toolMeasureBtn) toolMeasureBtn.onclick = function(){
    var on = !document.body.classList.contains("measure-active");
    setMeasureMode(on);
    if (on) setDrawMode(false);
  };

  if (toolProbeBtn) toolProbeBtn.onclick = function(){
    try{
      var canProbeHrrr = !!(map && typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer));
      var canProbeJet = !!(jet500Enabled && currentJetVelocityData);
      var canProbeVelocity = !!(radarVelocityEnabled && radarVelocityLayer && radarVelocityPoints);

      if (!(canProbeHrrr || canProbeJet || canProbeVelocity)){
        L.popup({ closeButton:true, className:"hrrr-popup" })
          .setLatLng(map.getCenter())
          .setContent("<div style='font:900 16px/1.1 Arial,sans-serif'>Probe</div><div style='font:900 18px/1.1 Arial,sans-serif'>Turn on <b>Future Temperatures</b>, <b>Future Wind Gusts</b>, <b>500 mb Winds</b>, or <b>Radar Velocity</b> to probe.</div>")
          .openOn(map);
        setProbeMode(false);
        return;
      }
    }catch(e){}
    var on = !document.body.classList.contains("probe-active");
    setProbeMode(on);
    if (on) setDrawMode(false);
  };

  if (toolTrackBtn) toolTrackBtn.onclick = function(){
    var on = !document.body.classList.contains("track-active");
    if (on){
      setMeasureMode(false);
      setProbeMode(false);
      setDrawMode(false);
      setTrackMode(true);
    } else {
      setTrackMode(false);
    }
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
    setMeasureMode(false); setProbeMode(false); setDrawMode(false); setTrackMode(false);
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

    var statesPath = (CFG && CFG.boundaries && CFG.boundaries.states) ? _joinUrl(DATA_BASE, CFG.boundaries.states) : "gz_2010_us_040_00_5m.json";
    fetch(statesPath + (statesPath.indexOf('?') >= 0 ? '&' : '?') + "v=" + Date.now())
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

  // ---------- Roads overlay (GeoJSON) ----------
  var roadsEnabled = false;
  var roadsLayer = null;
  var roadsLoadPromise = null;
  var ROADS_GEOJSON_CANDIDATES = [];

  // ---------- Story fronts/custom GeoJSON overlay ----------
  var storyOverlayLayer = null;
  var frontsDecorGroup = null;

  function clearFrontDecorators(){
    if (frontsDecorGroup){
      try { map.removeLayer(frontsDecorGroup); } catch(e){}
      frontsDecorGroup = null;
    }
  }

  function buildFrontDecorators(_retry){
    _retry = _retry || 0;
    if (!L || typeof L.polylineDecorator !== "function") {
      if (_retry < 15) {
        if (_retry === 0) console.warn("leaflet-polylinedecorator not ready yet; retrying…");
        setTimeout(function(){ buildFrontDecorators(_retry + 1); }, 200);
        return;
      }
      console.warn("leaflet-polylinedecorator did not load: front symbols disabled.");
      return;
    }
    if (typeof L === "undefined" || !L.polylineDecorator || !storyOverlayLayer) return;

    clearFrontDecorators();

    var coldLines = [];
    var warmLines = [];

    storyOverlayLayer.eachLayer(function(layer){
      if (!layer || !layer.feature || !layer.feature.properties) return;
      if (!(layer instanceof L.Polyline) || (layer instanceof L.Polygon)) return;
      var p = layer.feature.properties;
      var fr = String(p.front || p.FRONT || p.kind || p.type || "").toLowerCase();
      if (fr.indexOf("cold") !== -1) coldLines.push(layer);
      if (fr.indexOf("warm") !== -1) warmLines.push(layer);
    });

    var patterns = [];

    if (coldLines.length){
      var coldIcon = L.divIcon({
        className: "",
        html: '<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><polygon points="8,1 15,15 1,15" fill="#1e88e5"/></svg>',
        iconSize: [16,16],
        iconAnchor: [8,16]
      });

      patterns.push(L.polylineDecorator(coldLines, {
        patterns: [{
          offset: 8,
          repeat: 34,
          symbol: L.Symbol.marker({
            rotate: true,
            angleCorrection: -90,
            markerOptions: { icon: coldIcon }
          })
        }]
      }));
    }

    if (warmLines.length){
      var warmIcon = L.divIcon({
        className: "",
        html: '<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M1 15 A7 7 0 0 1 15 15 Z" fill="#e53935"/></svg>',
        iconSize: [16,16],
        iconAnchor: [8,16]
      });

      patterns.push(L.polylineDecorator(warmLines, {
        patterns: [{
          offset: 8,
          repeat: 34,
          symbol: L.Symbol.marker({
            rotate: true,
            angleCorrection: -90,
            markerOptions: { icon: warmIcon }
          })
        }]
      }));
    }

    if (!patterns.length) return;
    frontsDecorGroup = L.layerGroup(patterns);
    if (storyOverlayLayer){ frontsDecorGroup.addTo(map); }
  }


  var storyOverlayLoadToken = 0;
  var storyOverlaySourceUrl = '';

  function getActiveStorySceneConfig(){
    try{
      var item = (Array.isArray(storyItems) && storyItems.length) ? (storyItems[storyIndex] || null) : null;
      return (item && item.scene && typeof item.scene === 'object') ? item.scene : (item || {});
    }catch(e){
      return {};
    }
  }

  function getStoryOverlayUrl(){
    var scene = getActiveStorySceneConfig();
    var rel = scene.overlayUrl || scene.geojson || scene.url || scene.dataUrl || '';
    if (!rel) return '';
    return _isAbsUrl(rel) ? rel : _joinUrl(DATA_BASE, rel);
  }

  window.storyOverlayLayer = storyOverlayLayer;
  function clearStoryOverlay(){
    try{
      if (storyOverlayLayer && map && map.hasLayer && map.hasLayer(storyOverlayLayer)) map.removeLayer(storyOverlayLayer);
    }catch(e){}
    storyOverlayLayer = null;
    storyOverlaySourceUrl = '';
  }

  function storyFrontStyle(feature){
    var p = (feature && feature.properties) ? feature.properties : {};
    var ftype = String(p.front || p.FRONT || p.kind || p.type || "").toLowerCase();

    var color = "#111";
    if (ftype.indexOf("cold") !== -1) color = "#1e88e5";
    else if (ftype.indexOf("warm") !== -1) color = "#e53935";
    else if (ftype.indexOf("occluded") !== -1) color = "#8e24aa";
    else if (ftype.indexOf("stationary") !== -1) color = "#43a047";
    else if (ftype.indexOf("dryline") !== -1) color = "#d08a21";

    var w = parseFloat(p.width);
    if (!isFinite(w)) w = 3;

    return { pane:"lines", color: color, weight: w, opacity: 0.95 };
  }

  function makeHLIcon(letter){
    var isH = String(letter).toUpperCase() === "H";
    var fg = isH ? "#1e88e5" : "#e53935";

    var svg = '<svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="26" cy="26" r="22" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.30)" stroke-width="2"/>' +
      '<text x="26" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="' + fg + '">' + (isH ? 'H' : 'L') + '</text>' +
      '</svg>';

    return L.divIcon({
      className: "",
      html: svg,
      iconSize: [52, 52],
      iconAnchor: [26, 26]
    });
  }

  function storyFrontsPointToLayer(feature, latlng){
    var p = (feature && feature.properties) ? feature.properties : {};
    var sym = String(p.symbol || p.SYMBOL || p.pressure || p.PRESSURE || "").toUpperCase();
    var letter = "H";
    if (sym.indexOf("LOW") !== -1 || sym === "L") letter = "L";
    if (sym.indexOf("HIGH") !== -1 || sym === "H") letter = "H";
    return L.marker(latlng, { icon: makeHLIcon(letter), pane: "lines" });
  }

  function storyFrontsOnEach(feature, layer){
    var p = (feature && feature.properties) ? feature.properties : {};
    var txt = "";
    if (feature.geometry && feature.geometry.type === "Point"){
      var sym = (p.symbol || p.pressure || "").toString();
      var val = (p.value || p.press || p.pressure_mb || p.pressure_hpa || "").toString();
      txt = (sym ? sym : "Pressure") + (val ? (" " + val) : "");
    } else {
      var fr = (p.front || p.type || "").toString();
      txt = fr ? (fr.charAt(0).toUpperCase() + fr.slice(1) + " front") : "Front";
    }
    if (txt && layer && layer.bindTooltip){
      layer.bindTooltip(txt, { direction:"top", opacity:0.9, sticky:true });
    }
  }

  async function setStoryOverlayEnabled(on){
    if (!on){
      clearFrontDecorators();
      clearStoryOverlay();
      return;
    }
    var url = getStoryOverlayUrl();
    if (!url){
      clearFrontDecorators();
      clearStoryOverlay();
      return;
    }
    if (storyOverlayLayer && storyOverlaySourceUrl === url){
      if (!map.hasLayer(storyOverlayLayer)) storyOverlayLayer.addTo(map);
      if (storyOverlayLayer && !frontsDecorGroup) buildFrontDecorators();
      if (frontsDecorGroup && !map.hasLayer(frontsDecorGroup)) frontsDecorGroup.addTo(map);
      return;
    }
    var myToken = ++storyOverlayLoadToken;
    try{
      var res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
      if (!res.ok) throw new Error('Story overlay HTTP ' + res.status + ': ' + url);
      var gj = await res.json();
      if (myToken !== storyOverlayLoadToken) return;
      clearStoryOverlay();
      storyOverlayLayer = L.geoJSON(gj, {
        pane: 'lines',
        style: storyFrontStyle,
        pointToLayer: storyFrontsPointToLayer,
        onEachFeature: storyFrontsOnEach
      }).addTo(map);
      storyOverlaySourceUrl = url;
      window.storyOverlayLayer = storyOverlayLayer;
      buildFrontDecorators();
      setStatus('Surface fronts: ' + url.split('/').pop());
    }catch(err){
      console.error('Story overlay failed:', err);
      if (myToken === storyOverlayLoadToken) clearStoryOverlay();
    }
  }
  window.setStoryOverlayEnabled = setStoryOverlayEnabled;
  try{
    var roadsCfg = (CFG && CFG.roads) ? CFG.roads : {};
    var configuredRoads = roadsCfg.geojson || roadsCfg.file || roadsCfg.url || '';
    if (configuredRoads) ROADS_GEOJSON_CANDIDATES.push(configuredRoads);
  }catch(e){}
  ["roads.geojson","export.geojson","export(1).geojson","data/roads/roads.geojson","data/roads/export.geojson","data/roads/export(1).geojson"].forEach(function(p){
    if (ROADS_GEOJSON_CANDIDATES.indexOf(p) === -1) ROADS_GEOJSON_CANDIDATES.push(p);
  });

  (function ensureRoadShieldStyles(){
    if (document.getElementById('roadShieldStyles')) return;
    var css = ''
      + '.road-shield-wrap{background:transparent !important;border:none !important;box-shadow:none !important;}'
      + '.road-shield-svg{display:block;filter:drop-shadow(0 2px 8px rgba(0,0,0,.40));}';
    var st = document.createElement('style');
    st.id = 'roadShieldStyles';
    st.textContent = css;
    document.head.appendChild(st);
  })();

  function areRoadsActuallyOn(){
    return !!(roadsLayer && map && map.hasLayer && map.hasLayer(roadsLayer));
  }

  function roadLineStyle(feature){
    var hw = String(feature && feature.properties && feature.properties.highway || '').toLowerCase();
    if (hw === 'motorway'){
      return { pane:'lines', color:'#a34d14', weight:4, opacity:0.88, lineCap:'round', lineJoin:'round' };
    }
    return { pane:'lines', color:'#d8a326', weight:2.5, opacity:0.82, lineCap:'round', lineJoin:'round' };
  }

  function roadsFilter(feature){
    var p = feature && feature.properties ? feature.properties : {};
    var hw = String(p.highway || '').toLowerCase();
    var ref = String(p.ref || '').trim();
    return !!ref && ['motorway','trunk','primary'].indexOf(hw) >= 0;
  }

  function updateRoadsToggleButton(){
    roadsEnabled = areRoadsActuallyOn();
    window.roadsEnabled = roadsEnabled;
    var btn = document.getElementById('roadsToggleBtn');
    if (!btn) return;
    btn.textContent = roadsEnabled ? 'Roads ON' : 'Roads OFF';
    btn.classList.toggle('is-active', !!roadsEnabled);
    btn.setAttribute('aria-pressed', roadsEnabled ? 'true' : 'false');
  }

  async function loadRoadsGeoJsonOnce(){
    if (roadsLayer) return roadsLayer;
    if (roadsLoadPromise) return roadsLoadPromise;
    roadsLoadPromise = (async function(){
      var lastErr = null;
      for (var i=0; i<ROADS_GEOJSON_CANDIDATES.length; i++){
        var rawPath = ROADS_GEOJSON_CANDIDATES[i];
        if (!rawPath) continue;
        var urls = [];
        if (_isAbsUrl(rawPath)) {
          urls.push(rawPath);
        } else {
          urls.push(String(rawPath));
          urls.push(_joinUrl(DATA_BASE, rawPath));
        }
        for (var j=0; j<urls.length; j++){
          var url = urls[j];
          try{
            var res = await fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
            var geo = await res.json();
            roadsLayer = L.geoJSON(geo, { filter: roadsFilter, style: roadLineStyle, pane:'lines' });
            window.roadsLayer = roadsLayer;
            console.log('✅ Roads GeoJSON loaded:', url);
            return roadsLayer;
          }catch(err){
            lastErr = err;
          }
        }
      }
      roadsLoadPromise = null;
      throw (lastErr || new Error('Roads GeoJSON not found'));
    })();
    return roadsLoadPromise;
  }

  async function setRoadsEnabled(on){
    var wantOn = !!on;
    try{
      var layer = await loadRoadsGeoJsonOnce();
      if (wantOn){
        if (layer && !map.hasLayer(layer)) layer.addTo(map);
      } else {
        if (layer && map.hasLayer(layer)) map.removeLayer(layer);
      }
    }catch(err){
      console.error('Roads overlay failed:', err);
    }
    roadsEnabled = areRoadsActuallyOn();
    window.roadsEnabled = roadsEnabled;
    updateRoadsToggleButton();
    updateRoadLabelsVisibility();
    try{ if (typeof syncDockUi === 'function') syncDockUi(); }catch(e){}
    return roadsEnabled;
  }
  window.setRoadsEnabled = setRoadsEnabled;
  window.toggleRoads = async function(){ return setRoadsEnabled(!areRoadsActuallyOn()); };
  window.roadsEnabled = roadsEnabled;


  // ---------- Sparse interstate labels (viewport-aware) ----------
  var roadsLabelLayer = L.layerGroup().addTo(map);

  function normalizeRoadRef(ref){
    ref = String(ref || '').trim().replace(/\s+/g, ' ');
    ref = ref.replace(/^I\s+(\d+)$/i, 'I-$1');
    ref = ref.replace(/^US\s+(\d+)$/i, 'US-$1');
    ref = ref.replace(/^(SD|MN|IA)\s+(\d+)$/i, function(_, st, num){ return st.toUpperCase() + '-' + num; });
    ref = ref.replace(/^NE\s+(\d+)$/i, 'NE-$1');
    ref = ref.replace(/^([A-Z]{1,2})-(\d+)$/i, function(_, p, n){ return p.toUpperCase() + '-' + n; });
    return ref;
  }

  function classifyRoadShield(ref, hw){
    ref = normalizeRoadRef(ref);
    var upper = String(ref || '').toUpperCase();
    if (/^I-(29|90|229)$/.test(upper)) return 'interstate';
    if (/^US-\d+/.test(upper)) return 'us';
    if (/^(SD|MN|IA|NE)-\d+/.test(upper)) return 'state';
    return 'other';
  }

  function roadNumberOnly(ref){
    var m = String(ref || '').toUpperCase().match(/(\d+[A-Z]?)/);
    return m ? m[1] : String(ref || '');
  }

  function distanceMeters(a, b){
    try{ return map.distance(a, b); }catch(e){ return Infinity; }
  }

  function clearRoadLabels(){
    try{ roadsLabelLayer.clearLayers(); }catch(e){}
  }

  function getLayerRepresentativeLatLng(layer){
    if (!layer) return null;
    try{
      if (typeof layer.getCenter === 'function'){
        var center = layer.getCenter();
        if (center && isFinite(center.lat) && isFinite(center.lng)) return center;
      }
    }catch(e){}
    try{
      if (typeof layer.getBounds === 'function'){
        var b = layer.getBounds();
        if (b && typeof b.getCenter === 'function'){
          var c = b.getCenter();
          if (c && isFinite(c.lat) && isFinite(c.lng)) return c;
        }
      }
    }catch(e){}
    try{
      if (typeof layer.getLatLngs === 'function'){
        var latlngs = layer.getLatLngs();
        while (Array.isArray(latlngs) && latlngs.length && Array.isArray(latlngs[0])) latlngs = latlngs[0];
        if (Array.isArray(latlngs) && latlngs.length){
          var mid = latlngs[Math.floor(latlngs.length / 2)];
          if (mid && isFinite(mid.lat) && isFinite(mid.lng)) return mid;
        }
      }
    }catch(e){}
    return null;
  }


  function escapeRoadLabelHtml(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shieldHtmlForRoad(ref, hw){
    ref = normalizeRoadRef(ref);
    var kind = classifyRoadShield(ref, hw);
    var num = escapeRoadLabelHtml(roadNumberOnly(ref));
    var upper = String(ref || '').toUpperCase();
    var state = (upper.match(/^(SD|MN|IA|NE)-/) || [null, ''])[1];

    if (kind === 'interstate'){
      return ''
        + '<svg class="road-shield-svg" width="42" height="36" viewBox="0 0 42 36" aria-hidden="true">'
        +   '<path d="M7.5 2.5c4.7 0 8.5-1.4 13.5-1.4s8.8 1.4 13.5 1.4l3.5 5.2v9.3c0 9.7-8.8 14-17 16.2-8.2-2.2-17-6.5-17-16.2V7.7l3.5-5.2z" fill="#ffffff"/>'
        +   '<path d="M8.7 4.3c4.1 0 7.7-1.2 12.3-1.2s8.2 1.2 12.3 1.2l2.7 4.1v7H6V8.4l2.7-4.1z" fill="#c62828"/>'
        +   '<path d="M6 15.4h30v1.6c0 8.7-7.8 12.6-15 14.7C13.8 29.6 6 25.7 6 17v-1.6z" fill="#0d47a1"/>'
        +   '<path d="M7.5 2.5c4.7 0 8.5-1.4 13.5-1.4s8.8 1.4 13.5 1.4l3.5 5.2v9.3c0 9.7-8.8 14-17 16.2-8.2-2.2-17-6.5-17-16.2V7.7l3.5-5.2z" fill="none" stroke="#222222" stroke-width=".55"/>'
        +   '<text x="21" y="11.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="4.5" font-weight="700" fill="#ffffff">INTERSTATE</text>'
        +   '<text x="21" y="24.2" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#ffffff">' + num + '</text>'
        + '</svg>';
    }

    if (kind === 'us'){
      return ''
        + '<svg class="road-shield-svg" width="40" height="36" viewBox="0 0 40 36" aria-hidden="true">'
        +   '<path d="M12 2.5h16.2l5.2 5v8.7c0 9.5-7.6 12.9-14.2 14.8-6.6-1.9-14.2-5.3-14.2-14.8V7.5l5.2-5z" fill="#fbfbfb" stroke="#111111" stroke-width="2"/>'
        +   '<path d="M12.6 4.2h14.8l4 3.9v7.8c0 8-6.5 10.9-12.4 12.6-5.9-1.7-12.4-4.6-12.4-12.6V8.1l4-3.9z" fill="none" stroke="#d9d9d9" stroke-width="0.8"/>'
        +   '<text x="19.5" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="12.5" font-weight="700" fill="#111111">' + num + '</text>'
        + '</svg>';
    }

    if (kind === 'state'){
      if (state == 'MN'){
        return ''
          + '<svg class="road-shield-svg" width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">'
          +   '<rect x="2.5" y="2.5" width="33" height="33" rx="2.5" fill="#c8a96a" stroke="#f3e3ba" stroke-width="1.2"/>'
          +   '<rect x="5.5" y="12.5" width="27" height="20" rx="1.2" fill="#1565c0"/>'
          +   '<path d="M7.5 5.8l3.6 0 0 3.2 2.4-1.3-.2 2.5 2.3.8-2.4.8-.1 1.5-2-1.2-3.6 0z" fill="#1565c0"/>'
          +   '<text x="22.5" y="9.6" text-anchor="middle" font-family="Arial, sans-serif" font-size="4.4" font-weight="700" fill="#1565c0">MINNESOTA</text>'
          +   '<text x="19" y="27.2" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#ffffff">' + num + '</text>'
          + '</svg>';
      }
      if (state == 'IA'){
        return ''
          + '<svg class="road-shield-svg" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">'
          +   '<circle cx="18" cy="18" r="14.2" fill="#f3f3f3" stroke="#7a7a7a" stroke-width="1.2"/>'
          +   '<circle cx="18" cy="5.8" r="1" fill="#8c8c8c"/>'
          +   '<circle cx="18" cy="30.2" r="1" fill="#8c8c8c"/>'
          +   '<text x="18" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#222222">' + num + '</text>'
          + '</svg>';
      }
      if (state == 'SD'){
        return ''
          + '<svg class="road-shield-svg" width="42" height="38" viewBox="0 0 42 38" aria-hidden="true">'
          +   '<defs><linearGradient id="sdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#138a63"/><stop offset="100%" stop-color="#0b6f4a"/></linearGradient></defs>'
          +   '<rect x="2.5" y="2.5" width="37" height="33" rx="2.5" fill="url(#sdg)" stroke="#0a6b47" stroke-width="1.2"/>'
          +   '<path d="M7 6.5h25.4l2.2 3-1 1.1 1 1.1-.8 2 .8 1.2-1.1 1.2 1 1.6-.8 1 1.1 1.3-.9 1.3 1 1.2-.8 5.2H6.8l.2-21.2z" fill="#fbfbfb"/>'
          +   '<path d="M32.4 6.5l2.2 3-1 1.1 1 1.1-.8 2 .8 1.2-1.1 1.2 1 1.6-.8 1 1.1 1.3-.9 1.3 1 1.2-.8 5.2-3.3 0 .7-2.2-.7-1.1.7-1.2-.8-1.2.8-1.3-.9-1.1.9-1.2-.7-1.2.7-1.4-.9-1.1.9-1.2-.7-1.1.7-1.2z" fill="#fbfbfb"/>'
          +   '<path d="M7.8 7.5h24.1l1.6 2.1-.7.8.7.8-.6 1.4.6.9-.8.8.7 1.1-.6.7.8.9-.7.9.7.8-.6 4H7.6z" fill="none" stroke="#d7d7d7" stroke-width="0.7"/>'
          +   '<text x="19.2" y="24" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#111111">' + num + '</text>'
          + '</svg>';
      }
      if (state == 'NE'){
        return ''
          + '<svg class="road-shield-svg" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">'
          +   '<rect x="3" y="3" width="30" height="30" rx="2.5" fill="#ffffff" stroke="#111111" stroke-width="2"/>'
          +   '<text x="18" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="12.5" font-weight="700" fill="#111111">' + num + '</text>'
          + '</svg>';
      }
    }

    return '';
  }


  function chooseRoadLabelLatLng(ref, layer){
    var ll = getLayerRepresentativeLatLng(layer);
    if (!layer || typeof layer.getLatLngs !== 'function') return ll;

    var latlngs = layer.getLatLngs();
    while (Array.isArray(latlngs) && latlngs.length && Array.isArray(latlngs[0])) {
      latlngs = latlngs[0];
    }
    if (!Array.isArray(latlngs) || !latlngs.length) return ll;

    ref = normalizeRoadRef(ref);

    // Pick a different point along the actual road geometry instead of
    // freehand-offsetting the shield away from the line.
    if (ref === 'SD-11') {
      var idx11 = Math.max(0, Math.floor(latlngs.length * 0.70));
      return latlngs[idx11] || ll;
    }
    if (ref === 'SD-115') {
      var idx115 = Math.max(0, Math.floor(latlngs.length * 0.35));
      return latlngs[idx115] || ll;
    }
    return ll;
  }

  function rebuildRoadLabels(){
    clearRoadLabels();
    if (!roadsLayer || !areRoadsActuallyOn() || map.getZoom() < 6) return;

    var bounds = null;
    try{ bounds = map.getBounds().pad(0.18); }catch(e){}
    if (!bounds) return;

    var perRef = Object.create(null);
    var foundAny = false;

    roadsLayer.eachLayer(function(layer){
      var feature = layer && layer.feature ? layer.feature : null;
      var p = feature && feature.properties ? feature.properties : {};
      var hw = String(p.highway || '').toLowerCase();
      if (['motorway','trunk','primary'].indexOf(hw) < 0) return;

      var ref = normalizeRoadRef(p.ref || '');
      if (!ref) return;
      var kind = classifyRoadShield(ref, hw);
      if (kind === 'other') return;

      var ll = chooseRoadLabelLatLng(ref, layer);
      if (!ll || !bounds.contains(ll)) return;

      if (!perRef[ref]) perRef[ref] = [];
      var existing = perRef[ref];

      var kindHere = classifyRoadShield(ref, hw);
      var isInterstate = (kindHere === 'interstate');
      if (!isInterstate && map.getZoom() < 9) return;
      var minSpacing = isInterstate
        ? ((map.getZoom() >= 9) ? 32000 : 52000)
        : ((map.getZoom() >= 10) ? 48000 : 70000);
      var maxPerRef = isInterstate
        ? ((map.getZoom() >= 9) ? 2 : 1)
        : 1;

      if (existing.length >= maxPerRef) return;
      for (var i=0;i<existing.length;i++){
        if (distanceMeters(existing[i], ll) < minSpacing) return;
      }

      existing.push(ll);
      foundAny = true;

      var kind = classifyRoadShield(ref, hw);
      var html = shieldHtmlForRoad(ref, hw);
      if (!html) return;
      var size = (kind === 'interstate') ? [42, 36] : ((kind === 'us') ? [38, 34] : [38, 38]);
      var icon = L.divIcon({
        className: 'road-shield-wrap',
        html: html,
        iconSize: size,
        iconAnchor: [Math.round(size[0]/2), Math.round(size[1]/2)]
      });

      L.marker(ll, { icon: icon, interactive: false, keyboard: false, zIndexOffset: 500 }).addTo(roadsLabelLayer);
    });
  }

  function updateRoadLabelsVisibility(){
    var shouldShow = !!areRoadsActuallyOn() && map.getZoom() >= 6;
    if (!shouldShow){
      clearRoadLabels();
      return;
    }
    rebuildRoadLabels();
  }

  map.on('zoomend', updateRoadLabelsVisibility);
  map.on('moveend', updateRoadLabelsVisibility);
  try{
    var roadsBtn = document.getElementById('roadsToggleBtn');
    if (roadsBtn && !roadsBtn.__wdlBound){
      roadsBtn.__wdlBound = true;
      roadsBtn.addEventListener('click', async function(ev){
        try{ ev.preventDefault(); }catch(e){}
        try{ ev.stopPropagation(); }catch(e){}
        await window.toggleRoads();
      });
    }
    updateRoadsToggleButton();
    updateRoadLabelsVisibility();
  }catch(e){}
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
  ["Norfolk", 42.0327, -97.4170],
  ["Brookings", 44.3114, -96.7984],
  ["Huron", 44.3633, -98.2143],
  ["Aberdeen", 45.4647, -98.4865],
  ["Watertown", 44.8994, -97.1151],
  ["Pierre", 44.3683, -100.3509],

  // Zoom 8 targets
  ["Parkston", 43.3943, -97.9873],
  ["Beresford", 43.0805, -96.7737],
  ["Lake Andes", 43.1564, -98.5409],
  ["Chamberlain", 43.8108, -99.3307],
  ["Gregory", 43.2264, -99.4304],
  ["Redfield", 44.8772, -98.5181],
  ["Rock Rapids", 43.4311, -96.1759],
  ["Sibley", 43.4033, -95.7595],
  ["Sioux Center", 43.0797, -96.1753],
  ["Cherokee", 42.7494, -95.5517],
  ["Spencer", 43.1414, -95.1444],
  ["Windom", 43.8675, -95.1169]
];

var CITIES_TIER4 = [
  // South Dakota bridge/full local set
  ["Canton", 43.3008, -96.5923],
  ["Tea", 43.4469, -96.8359],
  ["Hartford", 43.6236, -96.9423],
  ["Parker", 43.3975, -97.1364],
  ["Viborg", 43.1708, -97.0814],
  ["Freeman", 43.3547, -97.4353],
  ["Olivet", 43.2403, -97.6759],
  ["Tyndall", 42.9944, -97.8629],
  ["Wakonda", 43.0097, -97.1045],
  ["Alcester", 43.0214, -96.6309],
  ["Dell Rapids", 43.8261, -96.7128],
  ["Garretson", 43.7144, -96.5020],
  ["Flandreau", 44.0494, -96.6003],
  ["Howard", 44.0108, -97.5262],
  ["Woonsocket", 44.0536, -98.2754],
  ["Plankinton", 43.7147, -98.4851],
  ["Platte", 43.3861, -98.8448],
  ["Springfield", 42.8497, -97.8970],
  ["Winner", 43.3767, -99.8596],
  ["De Smet", 44.3850, -97.5506],
  ["Clear Lake", 44.7561, -96.6820],
  ["Castlewood", 44.7227, -97.0331],
  ["Clark", 44.8777, -97.7337],

  // Minnesota
  ["Slayton", 43.9877, -95.7561],

  // Northwest Iowa
  ["Inwood", 43.3061, -96.4317],
  ["Rock Valley", 43.2055, -96.2953],
  ["Sheldon", 43.1847, -95.8564],
  ["Okoboji", 43.3644, -95.1481],
  ["Storm Lake", 42.6411, -95.2097],
  ["Le Mars", 42.7942, -96.1656],

  // Nebraska
  ["Hartington", 42.6225, -97.2645],
  ["Bloomfield", 42.5961, -97.6470],
  ["O'Neill", 42.4572, -98.6470]
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
  if (z >= 5){
    var minPx1 = (z === 5) ? 70 : 55;
    addDeclutteredCityLabels(cityLabelLayer, CITIES_TIER1, minPx1);
  }

  if (z >= 6){
    var minPx2 = (z === 6) ? 50 : 40;
    (function(){
      var b = map.getBounds();
      var placed = [];
      cityLabelLayer.eachLayer(function(layer){
        if (layer.getLatLng){
          placed.push(map.latLngToContainerPoint(layer.getLatLng()));
        }
      });
      for (var i = 0; i < CITIES_TIER2.length; i++){
        var c = CITIES_TIER2[i];
        var ll = L.latLng(c[1], c[2]);
        if (!b.contains(ll)) continue;
        var pt = map.latLngToContainerPoint(ll);
        var ok = true;
        for (var j = 0; j < placed.length; j++){
          var dx = pt.x - placed[j].x;
          var dy = pt.y - placed[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < minPx2){ ok = false; break; }
        }
        if (!ok) continue;
        placed.push(pt);
        cityLabelLayer.addLayer(makeCityLabel(c[0], c[1], c[2]));
      }
    })();
  }

  // Zoom 8 targets
  if (z >= 8){
    var minPx3 = (z === 8) ? 34 : 28;
    (function(){
      var b = map.getBounds();
      var placed = [];
      cityLabelLayer.eachLayer(function(layer){
        if (layer.getLatLng){
          placed.push(map.latLngToContainerPoint(layer.getLatLng()));
        }
      });
      for (var i = 0; i < CITIES_TIER3.length; i++){
        var c = CITIES_TIER3[i];
        var ll = L.latLng(c[1], c[2]);
        if (!b.contains(ll)) continue;
        var pt = map.latLngToContainerPoint(ll);
        var ok = true;
        for (var j = 0; j < placed.length; j++){
          var dx = pt.x - placed[j].x;
          var dy = pt.y - placed[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < minPx3){ ok = false; break; }
        }
        if (!ok) continue;
        placed.push(pt);
        cityLabelLayer.addLayer(makeCityLabel(c[0], c[1], c[2]));
      }
    })();
  }

  // Zoom 9 bridge toward your fuller zoom 10 layer
  if (z >= 9){
    var minPx4 = (z === 9) ? 24 : 18;
    (function(){
      var b = map.getBounds();
      var placed = [];
      cityLabelLayer.eachLayer(function(layer){
        if (layer.getLatLng){
          placed.push(map.latLngToContainerPoint(layer.getLatLng()));
        }
      });
      for (var i = 0; i < CITIES_TIER4.length; i++){
        var c = CITIES_TIER4[i];
        var ll = L.latLng(c[1], c[2]);
        if (!b.contains(ll)) continue;
        var pt = map.latLngToContainerPoint(ll);
        var ok = true;
        for (var j = 0; j < placed.length; j++){
          var dx = pt.x - placed[j].x;
          var dy = pt.y - placed[j].y;
          if (Math.sqrt(dx * dx + dy * dy) < minPx4){ ok = false; break; }
        }
        if (!ok) continue;
        placed.push(pt);
        cityLabelLayer.addLayer(makeCityLabel(c[0], c[1], c[2]));
      }
    })();
  }
}

// Optional labels (kept on top to help students)
var labels = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
  { attribution: "", subdomains:"abcd", maxZoom: 19, pane: "overlayPane" }
);

// Update labels as you zoom/pan
map.on("zoomend", function(){
  updateCityLabels();
  updateBaseLabels();
  updateZoomBadge();
});

map.on("moveend", function(){
  updateCityLabels();
  updateBaseLabels();
  updateZoomBadge();
});

// Initial draw
updateCityLabels();
updateBaseLabels();
updateZoomBadge();

  function updateBaseLabels(){
    var z = map.getZoom();
    if (z >= BASE_LABELS_MIN_ZOOM){
      if (!map.hasLayer(labels)) labels.addTo(map);
    } else {
      if (map.hasLayer(labels)) map.removeLayer(labels);
    }
  }
  map.on("zoomend", updateBaseLabels);
  map.on("zoomend", updateZoomBadge);
  map.on("moveend", updateBaseLabels);
  map.on("moveend", updateZoomBadge);
  updateBaseLabels();
  updateZoomBadge();


  // ---------- Story (Google Sheet / CSV) ----------
  var STORY_CFG = (CFG && CFG.storyboard) ? CFG.storyboard : {};
  var STORYBOARD_OVERRIDE = (_qs("story") || ((window.WDL_SIM_CONFIG && window.WDL_SIM_CONFIG.storyboardUrl) || "")).trim();
  function normalizeStoryboardPath(u){
    var s = String(u || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    if (s.indexOf("/") === -1) return "storyboard/" + s;
    return s.replace(/^\.\//, "");
  }
  var STORYBOARD_JSON = normalizeStoryboardPath(
    (STORY_CFG.type === "json") ? (STORY_CFG.url || STORY_CFG.json || STORY_CFG.file || "storyboard/storyboard.json") : ""
  );
  var STORYBOARD_CSV = normalizeStoryboardPath(
    (STORY_CFG.type === "json")
      ? ""
      : (
          STORYBOARD_OVERRIDE ||
          ((CFG && CFG.storyboardCSV) ? CFG.storyboardCSV :
            (STORY_CFG.type === "csv"
              ? (STORY_CFG.url || STORY_CFG.csv || STORY_CFG.file || "storyboard/storyboard.csv")
              : ""
            )
          )
        )
  );
  var SHEET_ID = STORY_CFG.sheetId || STORY_CFG.googleSheetId || "17Hzg7R2fSHJGbOKAKMqG4QAqA1GlSJwFM-SQwPhQObY";
  var SHEET_TAB = STORY_CFG.sheetTab || STORY_CFG.tab || "April Blizzard Story";
  var storyItems = [];
  var storyMarkers = [];
  var storyIndex = 0;
  var focusRing = null;
  window.__WDL_STORY_TIME_SYNC_ENABLED__ = (window.__WDL_STORY_TIME_SYNC_ENABLED__ === true);
  window.__WDL_STORYBOARD_JSON__ = STORYBOARD_JSON;
  window.__WDL_STORYBOARD_CSV__ = STORYBOARD_CSV;

  var storyPanel = document.getElementById("storyPanel");
  var storyTitleEl = document.getElementById("storyTitle");
  var storyBodyEl  = document.getElementById("storyBody");
  var storyStepEl  = document.getElementById("storyStep");
  var storyStationChipEl = document.getElementById("storyStationChip");
  var storyShellKickerEl = document.getElementById("storyShellKicker");

  function getStoryNumericLabel(item, idx){
    var n = idx + 1;
    if (item && item.order != null && isFinite(Number(item.order))) n = Math.max(1, Math.round(Number(item.order)));
    return String(n);
  }

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

  function resolveStoryAsset(url){
    var u = safeLink(url);
    if (!u) return "";
    if (/^https?:\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:")) return u;
    return _joinUrl(DATA_BASE, u);
  }


  async function applyStoryScene(item){
    if (!item) return;

    try {
      if (item.utc) {
        var nextTime = new Date(item.utc);
        if (!isNaN(nextTime)) curZ = nextTime;
      }
      try { window.curZ = new Date(curZ.getTime()); } catch(e) {}
    } catch(e) {}

    function _norm(v){ return String(v || '').trim().toLowerCase(); }
    function _has(list, names){
      names = Array.isArray(names) ? names : [names];
      for (var i = 0; i < names.length; i++){
        if (list.indexOf(_norm(names[i])) !== -1) return true;
      }
      return false;
    }

    var layers = Array.isArray(item.layers) ? item.layers.map(_norm) : [];
    var productName = _norm(item.product);
    var interactionCfg = (item && item.interaction && typeof item.interaction === 'object') ? item.interaction : {};
    var uiCfg = (item && item.ui && typeof item.ui === 'object') ? item.ui : {};

    var wantsSpc = _has(layers, ['spc_outlook','spc_day1','day1_outlook','watch','pds_watch','spc_watch']) ||
      productName.indexOf('spc') !== -1 || productName.indexOf('outlook') !== -1 || productName.indexOf('watch') !== -1;

    var wantsRadarVelocity = _has(layers, ['radar_velocity','velocity','kfsd_velocity','radar_vel']) ||
      productName.indexOf('velocity') !== -1;

    var wantsRadar = _has(layers, ['radar','radar_reflectivity','obs_radar','reflectivity','live_doppler']) ||
      ((productName.indexOf('radar') !== -1 || productName.indexOf('doppler') !== -1) && !wantsRadarVelocity);

    var wantsLiveDoppler = _has(layers, ['live_doppler','doppler']) ||
      (productName.indexOf('doppler') !== -1 && !wantsRadarVelocity);

    var wantsWarnings = _has(layers, ['warnings','alerts']) ||
      productName.indexOf('warning') !== -1 || productName.indexOf('alert') !== -1;

    var wantsReports = _has(layers, ['reports','storm_reports','lsr']) ||
      productName.indexOf('report') !== -1 || productName.indexOf('lsr') !== -1;

    var wantsLightning = _has(layers, ['lightning']) ||
      productName.indexOf('lightning') !== -1;

    var wantsSatellite = _has(layers, ['satellite','goes','truecolor']) ||
      productName.indexOf('satellite') !== -1 || productName.indexOf('goes') !== -1;

    var wantsMetars = _has(layers, ['metars','surface','metar_dewpoint','metar_wind','metar_temp','metar_pressure']) ||
      productName.indexOf('metar') !== -1 || productName.indexOf('surface') !== -1;

    var wantsHrrrTemp = _has(layers, ['hrrr_temp','future_temp','model_temp']) ||
      productName === 'hrrr_temp' || productName === 'future_temp';

    var wantsHrrrRadar = _has(layers, ['hrrr_radar','future_radar']) ||
      productName === 'hrrr_radar' || productName === 'future_radar';

    var wantsHrrrWinds = _has(layers, ['hrrr_winds','future_winds','windgust','future_wind_gusts']) ||
      productName === 'hrrr_winds' || productName === 'future_winds';

    var wantsHrrrCape = _has(layers, ['hrrr_cape','cape']) ||
      productName === 'hrrr_cape' || productName === 'cape';

    var wantsJet = _has(layers, ['jet','jet500','500mb','500mb_winds','surface_winds','surface_wind','surface_particles']) ||
      productName.indexOf('jet') !== -1 || productName.indexOf('500mb') !== -1 || productName.indexOf('surface_wind') !== -1;

    var wantsFronts = _has(layers, ['fronts','surface_fronts','surface_map']) ||
      productName.indexOf('front') !== -1;

    try {
      if (typeof window.setSpcDay1Enabled === 'function') await window.setSpcDay1Enabled(wantsSpc);
    } catch (e) { console.warn('SPC step apply failed', e); }

    try {
      if (typeof window.setObsRadarEnabled === 'function') await window.setObsRadarEnabled(wantsRadar);
    } catch (e) { console.warn('Observed radar step apply failed', e); }

    try {
      if (typeof window.setRadarEnabled === 'function') await window.setRadarEnabled(wantsRadar && !wantsRadarVelocity);
    } catch (e) { console.warn('Radar step apply failed', e); }

    try {
      if (typeof window.setRadarVelocityEnabled === 'function') await window.setRadarVelocityEnabled(!!wantsRadarVelocity);
    } catch (e) { console.warn('Radar velocity step apply failed', e); }

    try {
      if (typeof window.setWarningsEnabled === 'function') window.setWarningsEnabled(wantsWarnings);
    } catch (e) { console.warn('Warnings step apply failed', e); }

    try {
      if (typeof window.setReportsEnabled === 'function') await window.setReportsEnabled(wantsReports);
    } catch (e) { console.warn('Reports step apply failed', e); }

    var wantsMedia = _has(layers, ['media','photos','videos']) || productName.indexOf('media') !== -1 || productName.indexOf('photo') !== -1 || productName.indexOf('video') !== -1;
    try {
      if (typeof window.setMediaEnabled === 'function') await window.setMediaEnabled(wantsMedia);
    } catch (e) { console.warn('Media step apply failed', e); }

    try {
      if (typeof window.setLightningEnabled === 'function') await window.setLightningEnabled(wantsLightning);
    } catch (e) { console.warn('Lightning step apply failed', e); }

    try {
      if (typeof window.setSatelliteEnabled === 'function') await window.setSatelliteEnabled(wantsSatellite);
    } catch (e) { console.warn('Satellite step apply failed', e); }

    try {
      if (typeof window.setStoryOverlayEnabled === 'function') {
        await window.setStoryOverlayEnabled(!!wantsFronts);
        if (!wantsFronts) { try{ window.setStoryOverlayEnabled(false); }catch(e){} }
      }
    } catch (e) { console.warn('Story overlay step apply failed', e); }

    try {
      if (typeof window.setMetarUseMasterScrubber === 'function') { try { window.setMetarUseMasterScrubber(!!wantsMetars); } catch(e) {} }
      if (typeof window.setMetarDisplayMode === 'function') {
        if (_has(layers, ['metar_dewpoint'])) window.setMetarDisplayMode('dewpoint');
        else if (_has(layers, ['metar_wind'])) window.setMetarDisplayMode('wind');
        else if (_has(layers, ['metar_pressure'])) window.setMetarDisplayMode('pressure');
        else window.setMetarDisplayMode('temp');
      }
      if (typeof window.setMetarsEnabled === 'function') await window.setMetarsEnabled(wantsMetars);
    } catch (e) { console.warn('METAR step apply failed', e); }

    try {
      var wantsAnyHrrr = !!(wantsHrrrTemp || wantsHrrrRadar || wantsHrrrWinds || wantsHrrrCape);
      if (wantsAnyHrrr) {
        if (wantsHrrrRadar && typeof window.setHrrrRadarEnabled === 'function') {
          await window.setHrrrRadarEnabled(true);
        } else if (wantsHrrrWinds && typeof window.setHrrrWindsEnabled === 'function') {
          await window.setHrrrWindsEnabled(true);
        } else if (wantsHrrrCape && typeof window.setHrrrCapeEnabled === 'function') {
          await window.setHrrrCapeEnabled(true);
        } else if (wantsHrrrTemp && typeof window.setHrrrTempEnabled === 'function') {
          await window.setHrrrTempEnabled(true);
        }
      } else {
        if (typeof window.setHrrrTempEnabled === 'function') await window.setHrrrTempEnabled(false);
      }
    } catch (e) { console.warn('HRRR step apply failed', e); }

    try {
      if (typeof window.setJet500Enabled === 'function') await window.setJet500Enabled(wantsJet);
    } catch (e) { console.warn('Jet step apply failed', e); }

    try {
      var shouldSweep = wantsLiveDoppler || !!((interactionCfg && interactionCfg.showDoppler) || (uiCfg && uiCfg.showDoppler));
      if (typeof radarSweepEnabled !== 'undefined') {
        radarSweepEnabled = !!shouldSweep && !!wantsRadar;
        try { syncSweepButton(); } catch(e) {}
        if (wantsRadar) {
          try { updateRadar(); } catch(e) {}
        } else {
          try { hideRadarSweepCanvas(); } catch(e) {}
        }
      }
    } catch(e) {}

    try {
      if (!(window.__WDL_SIMPLE_MODE__ || window.__WDL_SIMULATOR_LOCAL_STORY__ || window.__WDL_STORY_TIME_SYNC_ENABLED__ === false)) {
        window.dispatchEvent(new CustomEvent('wdl:storychange', {
          detail: {
            index: storyIndex,
            count: storyItems.length,
            item: item,
            utc: item.utc || null,
            allowPlay: (interactionCfg.allowPlay != null) ? !!interactionCfg.allowPlay : !!item.allowPlay,
            pause: (interactionCfg.pause != null) ? !!interactionCfg.pause : !!item.pause,
            highlightProduct: (item.ui && item.ui.highlightProduct) || item.title || '',
            showLegend: !!(item.ui && item.ui.showLegend),
            showClock: (interactionCfg.showClock != null) ? !!interactionCfg.showClock : ((uiCfg.showClock != null) ? !!uiCfg.showClock : false),
            showTools: (interactionCfg.showTools != null) ? !!interactionCfg.showTools : ((uiCfg.showTools != null) ? !!uiCfg.showTools : null),
            startInExplore: (interactionCfg.startInExplore != null) ? !!interactionCfg.startInExplore : ((uiCfg.startInExplore != null) ? !!uiCfg.startInExplore : null),
            showScrubber: (interactionCfg.showScrubber != null) ? !!interactionCfg.showScrubber : ((uiCfg.showScrubber != null) ? !!uiCfg.showScrubber : wantsRadar),
            showDoppler: (interactionCfg.showDoppler != null) ? !!interactionCfg.showDoppler : ((uiCfg.showDoppler != null) ? !!uiCfg.showDoppler : wantsRadar),
            stepTheme: item.stepTheme || "blue",
            stepLabel: getStoryNumericLabel(item, storyIndex),
            stepKicker: item.stepKicker || item.label || item.title || "Simulator Flow",
            simulatorEvent: (item.raw && item.raw.event && typeof item.raw.event === 'object') ? item.raw.event : null
          }
        }));
        try{
          if (window.WDL_SIM_CONFIG && typeof window.WDL_SIM_CONFIG.onStorySceneApplied === 'function'){
            window.WDL_SIM_CONFIG.onStorySceneApplied({ item: item, index: storyIndex, count: storyItems.length, utc: item.utc || null });
          }
        }catch(simEventErr){ console.warn('Simulator story hook failed', simEventErr); }
      }
    } catch(e) {}

    try {
      if (typeof updateProductLabel === 'function') updateProductLabel();
      if (typeof updateLegend === 'function') updateLegend();
      if (typeof setTimeLabel === 'function') setTimeLabel();
      if (typeof updateAll === 'function') updateAll();
      if (typeof syncDockUi === 'function') syncDockUi();
    } catch(e) {}
  }


  function renderStory(i, panTo){
    if (!storyItems.length) return;
    if (window.__WDL_FREE_SCRUB__ === true) window.__WDL_STORY_TIME_SYNC_ENABLED__ = false;
    if (i < 0) i = 0;
    if (i >= storyItems.length) i = storyItems.length - 1;
    storyIndex = i;

    var item = storyItems[storyIndex];
    storyTitleEl.textContent = item.title || "Storm Story";
    if (storyStationChipEl) storyStationChipEl.textContent = getStoryNumericLabel(item, storyIndex);
    if (storyShellKickerEl) storyShellKickerEl.textContent = item.stepKicker || item.label || item.title || "Simulator Flow";
    if (storyPanel) {
      storyPanel.classList.remove("story-theme-blue","story-theme-cyan","story-theme-orange","story-theme-red","story-theme-purple");
      storyPanel.classList.add("story-theme-" + (item.stepTheme || "blue"));
    }

    var html = "";
    if (item.text) {
      // Convert newlines to paragraphs
      var parts = String(item.text).split(/\n+/).filter(Boolean);
      parts.forEach(function(p){ html += "<p>" + escapeHtml(p) + "</p>"; });
    } else {
      html += "<p class='tiny'>No text for this station yet.</p>";
    }

    var img = resolveStoryAsset(item.image);
    var vid = resolveStoryAsset(item.video);

    if (img) {
      html += "<div class='story-media' style='margin:12px 0 10px 0;padding:8px;border-radius:14px;background:rgba(8,18,32,.06);overflow:hidden;'>" +
              "<img src='" + img + "' alt='Story image' data-story-expand='1' data-story-caption='" + escapeHtml((item.title || 'Story image') + (item.imageCredit ? ("<br>Credit: " + item.imageCredit) : "")) + "' style='display:block;width:100%;max-width:100%;height:auto;max-height:190px;object-fit:contain;border-radius:10px;margin:0 auto;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:zoom-in;'>";
      if (item.imageCredit) {
        html += "<div class='story-credit' style='margin-top:6px;font:700 11px/1.3 Arial,sans-serif;opacity:.78'>Credit: " + escapeHtml(item.imageCredit) + "</div>";
      }
      html += "<div style='margin-top:6px;font:700 11px/1.2 Arial,sans-serif;opacity:.72'>Click image to enlarge</div>";
      html += "</div>";
    }
    if (vid) {
      // Prefer embed links (youtube embed, vimeo embed, etc.)
      html += "<div class='story-media'><iframe src='" + vid + "' allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' allowfullscreen></iframe></div>";
    }

    storyBodyEl.innerHTML = html;
    storyStepEl.textContent = "Step " + (storyIndex + 1) + " of " + storyItems.length;

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

    applyStoryScene(item);

    if (panTo && item.lat != null && item.lon != null) {
      if (item.zoom != null && isFinite(item.zoom)) {
        map.setView([item.lat, item.lon], item.zoom, { animate:true });
      } else {
        map.panTo([item.lat, item.lon], { animate:true });
      }
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

  function normalizeStoryRow(r){
    var scene = (r && r.scene && typeof r.scene === "object") ? r.scene : {};
    var interaction = (r && r.interaction && typeof r.interaction === "object") ? r.interaction : {};
    var lat = parseFloat((r.lat != null ? r.lat : scene.lat));
    var lon = parseFloat((r.lon != null ? r.lon : scene.lon));
    var orderRaw = (r.order != null && r.order !== "") ? r.order : (r.step != null ? r.step : r.id);
    var text = r.text || "";
    if (!text && Array.isArray(r.narrative)) text = r.narrative.join("\n\n");
    if (!text && typeof r.narrative === "string") text = r.narrative;
    if (Array.isArray(r.question) && r.question.length){
      text += (text ? "\n\n" : "") + r.question.map(function(q){ return "• " + q; }).join("\n");
    } else if (typeof r.question === "string" && r.question.trim()){
      text += (text ? "\n\n" : "") + r.question;
    }
    var layers = [];
    if (Array.isArray(scene.layers)) layers = scene.layers.slice();
    else if (typeof scene.layers === "string" && scene.layers.trim()) layers = [scene.layers.trim()];
    else if (r.layer) layers = [r.layer];
    else if (scene.product) layers = [scene.product];

    return {
      id: r.id || r.step || "",
      title: r.title || r.label || "",
      text: text || "",
      lat: isFinite(lat) ? lat : null,
      lon: isFinite(lon) ? lon : null,
      image: r.image || (r.media && r.media.image) || "",
      imageCredit: r.imageCredit || (r.media && (r.media.credit || r.media.imageCredit)) || "",
      video: r.video || (r.media && r.media.video) || "",
      terms: r.terms || "",
      layer: r.layer || scene.product || "",
      layers: layers,
      product: scene.product || r.product || "",
      detailsFile: r.detailsFile || scene.detailsFile || (r.media && r.media.detailsFile) || "",
      zoom: (r.zoom != null && r.zoom !== "") ? Number(r.zoom) : ((scene.zoom != null && scene.zoom !== "") ? Number(scene.zoom) : null),
      order: parseFloat(orderRaw),
      raw: r,
      narrative: r.narrative || "",
      question: r.question || "",
      levels: (r && r.levels && typeof r.levels === "object") ? r.levels : null,
      media: (r && r.media && typeof r.media === "object") ? r.media : {},
      map: (r && r.map && typeof r.map === "object") ? r.map : null,
      scene: scene,
      pause: !!interaction.pause,
      allowPlay: interaction.allowPlay !== false,
      allowExplore: interaction.allowExplore !== false,
      ui: (r && r.ui && typeof r.ui === "object") ? r.ui : {},
      interaction: interaction,
      stepTheme: (r.ui && r.ui.stepTheme) || ((scene.product || "").toLowerCase().indexOf("doppler") !== -1 ? "cyan" : ((scene.product || "").toLowerCase().indexOf("spc") !== -1 ? "blue" : (Array.isArray(scene.layers) && scene.layers.indexOf("radar") !== -1 ? "cyan" : "orange"))),
      stepLabel: "",
      stepKicker: (r.ui && r.ui.stepKicker) || "",
      utc: r.utc || scene.utc || ""
    };
  }

  function applyStoryRows(rows, emptyMsg){
    storyItems = (rows || [])
      .map(normalizeStoryRow)
      .filter(function(x){ return x.title || x.text || (x.lat!=null && x.lon!=null); })
      .sort(function(a,b){
        var ao = isFinite(a.order) ? a.order : 9999;
        var bo = isFinite(b.order) ? b.order : 9999;
        return ao - bo;
      });

    if (!storyItems.length) {
      storyBodyEl.innerHTML = "<p class='tiny'>" + emptyMsg + "</p>";
      return;
    }

    buildStoryMarkers();
    setStatus("Story: loaded " + storyItems.length + " stations");
  }

  function parseStoryboardCSV(csvText){
    var text = String(csvText || "").replace(/^\uFEFF/, "").trim();
    if (!text) return [];

    function splitCsvLine(line){
      var out = [];
      var cur = "";
      var inQuotes = false;
      for (var i = 0; i < line.length; i++){
        var ch = line[i];
        if (ch === '"'){
          if (inQuotes && line[i + 1] === '"'){
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes){
          out.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      out.push(cur.trim());
      return out.map(function(v){
        return v.replace(/^"(.*)"$/, "$1").trim();
      });
    }

    var lines = text.split(/\r?\n/).filter(function(line){
      return String(line || "").trim().length > 0;
    });
    if (lines.length < 2) return [];

    var headers = splitCsvLine(lines[0]).map(function(h){ return h.trim(); });

    return lines.slice(1).map(function(line){
      var values = splitCsvLine(line);
      var row = {};
      headers.forEach(function(header, i){
        row[header] = (values[i] || "").trim();
      });
      return row;
    });
  }

  function loadJSONStoryboard(){
    var jsonUrl = _joinUrl(DATA_BASE, STORYBOARD_JSON);
    return fetch(jsonUrl, { cache: "no-store" }).then(function(r){
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function(data){
      var rows = [];
      if (Array.isArray(data)) rows = data;
      else if (data && Array.isArray(data.steps)) rows = data.steps;
      else if (data && typeof data === "object") rows = [data];
      applyStoryRows(rows, "No rows found in your storyboard JSON.");
    }).catch(function(err){
      storyBodyEl.innerHTML = "<p class='tiny'>Could not load storyboard JSON at '" + escapeHtml(jsonUrl) + "'.</p>";
      setStatus("Story JSON load failed");
      console.warn(err);
    });
  }

  function loadGoogleStoryboard(){
    var url = "https://opensheet.elk.sh/" + SHEET_ID + "/" + encodeURIComponent(SHEET_TAB);
    return fetch(url).then(function(r){
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function(rows){
      applyStoryRows(rows, "No rows found in your Google Sheet tab '" + SHEET_TAB + "'.");
    }).catch(function(err){
      storyBodyEl.innerHTML = "<p class='tiny'>Could not load story from Google Sheet. Check that the sheet is published, and the tab name is '" + SHEET_TAB + "'.</p>";
      setStatus("Story load failed");
      console.warn(err);
    });
  }

  function loadCSVStoryboard(){
    var csvUrl = _joinUrl(DATA_BASE, STORYBOARD_CSV);
    return fetch(csvUrl, { cache: "no-store" }).then(function(r){
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function(text){
      var rows = parseStoryboardCSV(text);
      applyStoryRows(rows, "No rows found in your storyboard CSV.");
    }).catch(function(err){
      storyBodyEl.innerHTML = "<p class='tiny'>Could not load storyboard CSV at '" + escapeHtml(csvUrl) + "'.</p>";
      setStatus("Story CSV load failed");
      console.warn(err);
    });
  }

  function loadStory(){
    if (STORYBOARD_JSON) {
      console.log("📖 Loading JSON storyboard:", STORYBOARD_JSON);
      return loadJSONStoryboard();
    }
    if (STORYBOARD_CSV) {
      console.log("📖 Loading CSV storyboard:", STORYBOARD_CSV);
      if (STORYBOARD_OVERRIDE) {
        console.log("🧭 Story override from URL:", STORYBOARD_OVERRIDE);
      }
      return loadCSVStoryboard();
    }
    console.log("📖 Loading Google Sheet storyboard:", SHEET_ID, SHEET_TAB);
    return loadGoogleStoryboard();
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
window.openGuide = openGuide;
window.collapseGuide = collapseGuide;
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
document.body.classList.remove("explore-mode");
document.body.classList.remove("guide-collapsed");
// Opacity slider (applies to the currently visible product)
var radarOpacity = document.getElementById("radarOpacity");

// Remember per-layer opacity so kids can flip products without losing their setting
var productOpacity = { radar: 0.70, radarVelocity: 0.70, snow: 0.70, temp: 0.70, hrrrTemp: 0.70, hrrrRadar: 0.70, hrrrWinds: 0.70, hrrrCape: 0.70, global: 0.70, goes: 0.70, metars: 1.00, jet: 0.75, lightning: 0.90 };

function getActiveProductKey(){
  // Priority: global > snow > jet > future hrrr > radar
  if (typeof era5Apr10Enabled !== "undefined" && (era5Apr10Enabled || era5Apr11Enabled)) return "global";
  if (typeof gfsSnowEnabled !== "undefined" && gfsSnowEnabled) return "snow";
  if (typeof jet500Enabled !== "undefined" && jet500Enabled) return "jet";
  if (typeof radarVelocityEnabled !== "undefined" && radarVelocityEnabled && typeof radarVelocityLayer !== "undefined" && radarVelocityLayer && map.hasLayer(radarVelocityLayer)) return "radarVelocity";
  if (typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer)) return (window.hrrrProductMode === 'radar') ? "hrrrRadar" : ((window.hrrrProductMode === 'winds') ? "hrrrWinds" : ((window.hrrrProductMode === 'cape') ? "hrrrCape" : "hrrrTemp"));
  if (typeof goesEnabled !== "undefined" && goesEnabled) return "goes";
  if (typeof lightningEnabled !== "undefined" && lightningEnabled) return "lightning";
  if (typeof metarVisible !== "undefined" && metarVisible && !(typeof obsRadarEnabled !== "undefined" && obsRadarEnabled)) return "metars";
  return "radar";
}

function setTempOpacity(op){
  if (typeof hrrrTempLayer !== 'undefined' && hrrrTempLayer && hrrrTempLayer.setOpacity) {
    hrrrTempLayer.setOpacity(op);
    return;
  }
  if (typeof hrrrTempGeo === 'undefined' || !hrrrTempGeo) return;
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
  } else if (key === "temp" || key === "hrrrTemp" || key === "hrrrRadar" || key === "hrrrCape"){
    setTempOpacity(op);
  } else if (key === "radarVelocity"){
    if (typeof radarVelocityLayer !== 'undefined' && radarVelocityLayer && radarVelocityLayer.setOpacity) radarVelocityLayer.setOpacity(op);
  } else if (key === "global"){
    ensureEra5Overlays();
    if (era5Apr10Overlay) era5Apr10Overlay.setOpacity(op);
    if (era5Apr11Overlay) era5Apr11Overlay.setOpacity(op);
  } else if (key === "goes"){
    if (goesOverlay && goesEnabled) goesOverlay.setOpacity(op);
  } else if (key === "jet"){
    if (jetVelocityLayer && jetVelocityLayer.setOpacity) jetVelocityLayer.setOpacity(op);
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
  bindSweepControls();
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
      var popupTitle = (window.hrrrProductMode === 'winds') ? 'Max Surface Wind Gust' : ((window.hrrrProductMode === 'cape') ? 'Surface-Based CAPE' : 'Temperature');
      var popupUnit = best.unit || ((window.hrrrProductMode === 'winds') ? 'mph' : ((window.hrrrProductMode === 'cape') ? ' J/kg' : '°F'));
      var popupValue = (typeof best.value === 'number') ? best.value : ((window.hrrrProductMode === 'winds') ? best.mph : ((window.hrrrProductMode === 'cape') ? best.cape : best.tF));
      var popupText = (popupValue == null || !isFinite(popupValue)) ? "—" : (Math.round(popupValue) + popupUnit);
      L.popup({
        className: "hrrr-popup",
        closeButton: true,
        autoPan: true,
        offset: [0, -10]
      })
      .setLatLng([best.lat, best.lon])
      .setContent("<div style='font:900 14px/1 Arial,sans-serif;opacity:.9'>" + popupTitle + "</div><div style='font:900 30px/1.05 Arial,sans-serif'>" + popupText + "</div>")
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
  var alertsLayer = L.geoJSON(null, {
  pane: "lines",
  style: function(feature){
    var p = (feature && feature.properties) ? feature.properties : {};
    var evt = String(p.event || p.type || "").toUpperCase();
    var isTornado = evt.includes("TORNADO");

    return {
      color: isTornado ? "#ff2a2a" : "#ffd400",
      weight: 3,
      opacity: 0.95,
      fill: false,
      fillOpacity: 0
    };
  },
  onEachFeature: function(feature, layer){
    var p = feature.properties || {};
    var evtName = String(p.event || p.type || 'Warning');
    var area = String(p.areaDesc || p.area || p.counties || '').trim();
    var firstArea = area ? area.split(';').slice(0,3).join(', ') : '';
    var untilRaw = p.ends || p.end || p.expire || p.expires || '';
    var untilText = '';
    try{
      if (untilRaw){
        var ud = new Date(untilRaw);
        if (!isNaN(ud)) untilText = ud.toLocaleTimeString('en-US',{hour:'numeric', minute:'2-digit', hour12:true, timeZone:'America/Chicago'});
      }
    }catch(e){}
    var summaryHeadline = firstArea || evtName;
    var summaryBody = '<div class="wdl-warning-summary">'
      + '<div class="ww-kicker">' + (String(evtName).toUpperCase()) + '</div>'
      + '<div class="ww-title">' + summaryHeadline + '</div>'
      + (untilText ? '<div class="ww-meta">Until ' + untilText + ' CDT</div>' : '')
      + '<button type="button" class="ww-more-details" data-warning-id="' + String(p.id || p.ETN || p.etn || layer._leaflet_id) + '">Click Here for more details</button>'
      + '</div>';
    layer.bindPopup(summaryBody, {
      maxWidth: 460,
      minWidth: 380,
      autoPan: true,
      keepInView: true,
      className: "warning-popup-shell"
    });
    layer.__warningDetailHtml = p.popupHtml || p.bulletinText || p.text || "<b>Warning</b>";
    layer.__warningSummaryTitle = summaryHeadline;
  }
});


var warningCoreBbox = { minLon:-100.2, maxLon:-94.0, minLat:42.5, maxLat:46.7 };
function warningFeatureInCoreArea(feature){
  try{
    var g = feature && feature.geometry;
    if (!g) return true;
    var pts = [];
    (function walk(c){
      if (!c) return;
      if (typeof c[0] === 'number') pts.push(c);
      else c.forEach(walk);
    })(g.coordinates);
    if (!pts.length) return true;
    var lon = 0, lat = 0;
    pts.forEach(function(p){ lon += Number(p[0] || 0); lat += Number(p[1] || 0); });
    lon /= pts.length; lat /= pts.length;
    return lon >= warningCoreBbox.minLon && lon <= warningCoreBbox.maxLon && lat >= warningCoreBbox.minLat && lat <= warningCoreBbox.maxLat;
  }catch(e){ return true; }
}

var alertsGeoJson = null;
var alertsLoadPromise = null;
var alertsBlinkOn = true;
var alertsBlinkTimer = null;
var warningsEnabled = false;
window.warningsEnabled = warningsEnabled;
if (!document.getElementById('wdl-warning-popup-styles')){
  var wps = document.createElement('style');
  wps.id = 'wdl-warning-popup-styles';
  wps.textContent = `
    .warning-popup-shell .leaflet-popup-content-wrapper{background:linear-gradient(180deg,#0d2038,#0a1829); color:#fff; border:1px solid rgba(255,255,255,.16); border-radius:18px; box-shadow:0 18px 38px rgba(0,0,0,.34);}
    .warning-popup-shell .leaflet-popup-tip{background:#0a1829;}
    .wdl-warning-summary{padding:6px 2px 2px; min-width:320px;}
    .wdl-warning-summary .ww-kicker{font:900 11px/1 Lato,Arial,sans-serif; letter-spacing:1px; color:#ffd66e; text-transform:uppercase;}
    .wdl-warning-summary .ww-title{margin-top:8px; font:900 22px/1.15 Lato,Arial,sans-serif; text-transform:uppercase;}
    .wdl-warning-summary .ww-meta{margin-top:10px; font:800 14px/1.2 Lato,Arial,sans-serif; color:#ffe9b0;}
    .wdl-warning-summary .ww-more-details{margin-top:14px; width:100%; border:1px solid rgba(255,255,255,.18); border-radius:14px; padding:12px 14px; background:linear-gradient(180deg,#1576ff,#0f56b5); color:#fff; font:900 14px/1 Lato,Arial,sans-serif; cursor:pointer; box-shadow:0 10px 18px rgba(0,0,0,.24);}
    .wdl-warning-modal{position:fixed; inset:0; z-index:100260; display:none; align-items:center; justify-content:center; background:rgba(2,8,16,.72); backdrop-filter:blur(4px);}
    .wdl-warning-modal.visible{display:flex;}
    .wdl-warning-modal-card{width:min(960px, calc(100vw - 60px)); max-height:calc(100vh - 70px); background:linear-gradient(180deg,#09192c,#0d2340); border:1px solid rgba(255,255,255,.16); border-radius:22px; color:#fff; box-shadow:0 22px 44px rgba(0,0,0,.4); overflow:hidden;}
    .wdl-warning-modal.fullscreen .wdl-warning-modal-card{width:calc(100vw - 24px); max-height:calc(100vh - 24px);}
    .wdl-warning-modal-head{display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid rgba(255,255,255,.08);}
    .wdl-warning-modal-title{font:900 24px/1.1 Lato,Arial,sans-serif; text-transform:uppercase;}
    .wdl-warning-modal-actions{display:flex; gap:10px;}
    .wdl-warning-modal-btn{border:1px solid rgba(255,255,255,.16); border-radius:12px; padding:10px 12px; background:#12345e; color:#fff; font:900 13px/1 Lato,Arial,sans-serif; cursor:pointer;}
    .wdl-warning-modal-body{padding:18px; overflow:auto; max-height:calc(100vh - 170px); font:800 14px/1.35 Arial,sans-serif;}
  `;
  document.head.appendChild(wps);
}
var warningDetailModal = null;
function ensureWarningDetailModal(){
  if (warningDetailModal) return warningDetailModal;
  var wrap = document.createElement('div');
  wrap.className = 'wdl-warning-modal';
  wrap.innerHTML = '<div class="wdl-warning-modal-card"><div class="wdl-warning-modal-head"><div class="wdl-warning-modal-title">Warning Details</div><div class="wdl-warning-modal-actions"><button type="button" class="wdl-warning-modal-btn" data-act="full">Full Screen</button><button type="button" class="wdl-warning-modal-btn" data-act="close">Close</button></div></div><div class="wdl-warning-modal-body"></div></div>';
  document.body.appendChild(wrap);
  wrap.addEventListener('click', function(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-act]') : null;
    var act = btn && btn.getAttribute ? btn.getAttribute('data-act') : null;
    if (ev.target === wrap || act === 'close') {
      ev.preventDefault();
      ev.stopPropagation();
      wrap.classList.remove('visible');
      wrap.classList.remove('fullscreen');
      return;
    }
    if (act === 'full') {
      ev.preventDefault();
      ev.stopPropagation();
      wrap.classList.toggle('fullscreen');
      return;
    }
  }, true);
  warningDetailModal = wrap;
  return wrap;
}
function openWarningDetailModal(title, html){
  var wrap = ensureWarningDetailModal();
  wrap.querySelector('.wdl-warning-modal-title').textContent = title || 'Warning Details';
  wrap.querySelector('.wdl-warning-modal-body').innerHTML = html || '<b>Warning</b>';
  wrap.classList.add('visible');
}
document.addEventListener('click', function(ev){
  var btn = ev.target && ev.target.closest ? ev.target.closest('.ww-more-details') : null;
  if (!btn) return;
  var popupEl = btn.closest('.leaflet-popup');
  if (!popupEl) return;
  var layerId = btn.getAttribute('data-warning-id');
  var targetLayer = null;
  try{
    alertsLayer.eachLayer(function(lyr){
      var p = (lyr.feature && lyr.feature.properties) || {};
      var id = String(p.id || p.ETN || p.etn || lyr._leaflet_id);
      if (id === String(layerId)) targetLayer = lyr;
    });
  }catch(e){}
  if (targetLayer){
    openWarningDetailModal(targetLayer.__warningSummaryTitle || 'Warning Details', targetLayer.__warningDetailHtml || '<b>Warning</b>');
  }
});
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
  if (btn){
    btn.textContent = radarSweepEnabled ? 'LIVE Doppler ON' : 'LIVE Doppler OFF';
    btn.classList.toggle('active', !!radarSweepEnabled);
  }
  var panel = document.getElementById('radarSweepControls');
  if (panel) panel.classList.toggle('open', !!radarSweepEnabled);
}

  if (typeof radarSweepRPM === "undefined") var radarSweepRPM = 2;
  if (typeof radarSweepBeamPx === "undefined") var radarSweepBeamPx = 1;
  if (typeof radarSweepRangeMiles === "undefined") var radarSweepRangeMiles = 186;

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
  }

  var scrubberIsDragging = false;
  var scrubberRafPending = false;
  var scrubberPendingPct = null;

  function getActiveScrubberMode(){
    if (window.__WDL_SINGLE_CLOCK__ === true) return 'lesson';
    if (window.__WDL_FREE_SCRUB__ === true) return 'lesson';
    var liveHrrrFrames = (hrrrFrames && hrrrFrames.length) ? hrrrFrames : ((window.__HRRR_FRAMES__ && window.__HRRR_FRAMES__.length) ? window.__HRRR_FRAMES__ : []);
    if ((hrrrTempEnabled || window.hrrrTempEnabled === true || window.hrrrProductMode === 'winds' || window.hrrrProductMode === 'cape' || window.hrrrProductMode === 'radar') && liveHrrrFrames.length) return 'hrrr';
    if (typeof metarVisible !== 'undefined' &&
        metarVisible &&
        typeof window.metarUseMasterScrubber !== 'undefined' &&
        window.metarUseMasterScrubber &&
        window.metarsModule &&
        typeof window.metarsModule.getTimeline === 'function' &&
        (window.metarsModule.getTimeline() || []).length) return 'metars';
    var radarPool = getRadarFramePool();
    if (obsRadarEnabled && useManifestFrameScrubber && radarPool.length) return 'radar';
    return 'lesson';
  }

  function syncScrubberToActiveProduct(){
    try{
      var scrub = document.getElementById("cbScrubber");
      if (!scrub) return;
      if (scrubberIsDragging) return;
      if (window.__WDL_HTML_SCRUBBING__ === true) return;
      scrub.min = "0";
      if (window.__WDL_FREE_SCRUB__ === true || window.__WDL_SINGLE_CLOCK__ === true){
        scrub.max = "1000";
        scrub.step = "1";
        var lessonPct = ((curZ.getTime() - startZ.getTime()) / Math.max(1, (endZ.getTime() - startZ.getTime()))) * 1000;
        scrub.value = String(Math.max(0, Math.min(1000, lessonPct)));
        return;
      }

      scrub.step = "1";
      var idx = Math.round((curZ.getTime() - startZ.getTime()) / (STEP_MS));
      if (idx < 0) idx = 0;
      var max = Math.round((endZ.getTime() - startZ.getTime()) / (STEP_MS));
      scrub.max = String(max);
      scrub.value = String(idx);
    }catch(e){}
  }

  window.getActiveScrubberMode = getActiveScrubberMode;
  window.stepRadarFrame = stepRadarFrame;
  window.syncScrubberToActiveProduct = syncScrubberToActiveProduct;
  window.setCurrentRadarFrameIndex = setCurrentRadarFrameIndex;
  window.getRadarFramePool = getRadarFramePool;
  window.setRadarStepLimit = setRadarStepLimit;

  function getActiveScrubberState(){
    var max = Math.round((endZ.getTime() - startZ.getTime()) / (STEP_MS || 1));
    var idx = Math.round((curZ.getTime() - startZ.getTime()) / (STEP_MS || 1));
    if (idx < 0) idx = 0;
    if (idx > max) idx = max;
    return { mode: 'lesson', min: 0, max: Math.max(0, max), value: idx };
  }

  function setActiveScrubberPercent(percent){
    var pct = Number(percent);
    if (!isFinite(pct)) return false;
    pct = Math.max(0, Math.min(100, pct));
    curZ = new Date(startZ.getTime() + ((endZ.getTime() - startZ.getTime()) * (pct / 100)));
    clampTime();
    updateAll();
    return true;
  }

  window.getActiveScrubberState = getActiveScrubberState;
  window.setActiveScrubberPercent = setActiveScrubberPercent;

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

  
// ---------- METARs (module hookup) ----------
var metarsModule = null;

if (window.createMetarsModule) {
  metarsModule = window.createMetarsModule({
    map: map,
    CFG: CFG,
    DATA_BASE: DATA_BASE,
    _isAbsUrl: _isAbsUrl,
    _joinUrl: _joinUrl,
    setStatus: setStatus,
    updateProductLabel: updateProductLabel,
    setTimeLabel: (typeof setTimeLabel === 'function' ? setTimeLabel : function(){})
  });

  try {
    metarsModule.installMapEvents();
  } catch (e) {
    console.warn('METAR module map events install failed', e);
  }

  window.metarsModule = metarsModule;
  window.toggleMetars = function(){ return metarsModule.toggleMetars(); };
  window.setMetarsEnabled = function(on){ return metarsModule.setMetarsEnabled(on); };
  window.setMetarUseMasterScrubber = function(on){ return metarsModule.setMetarUseMasterScrubber(on); };
  window.setMetarDisplayMode = function(mode){ return metarsModule.setMetarDisplayMode(mode); };
  window.loadMetarsAtIndex = function(idx){ return metarsModule.loadMetarsAtIndex(idx); };
} else {
  console.warn('METAR module not found: window.createMetarsModule is missing');
}
  var spcDay1Layer = null;
  var spcDay1Enabled = false;
  var spcDay1LoadToken = 0;

  function isLikelySpcPathLayer(layer){
    try{
      if (!layer || !layer.options) return false;
      if (layer.__wdlProduct === 'spc_day1' || layer.__wdlSpcDay1) return true;
      var o = layer.options || {};
      var fill = String(o.fillColor || '').toUpperCase();
      var stroke = String(o.color || '').toUpperCase();
      var spcFills = ['#C1E9C1','#66A366','#FFE066','#FFA366','#E06666','#E066FF'];
      var spcStrokes = ['#55BB55','#005500','#DDAA00','#FF6600','#CC0000','#CC00CC'];
      var hasSpcColor = spcFills.indexOf(fill) >= 0 || spcStrokes.indexOf(stroke) >= 0;
      var hasFill = (o.fill === true || o.fillOpacity != null);
      return !!(hasSpcColor && hasFill);
    }catch(e){ return false; }
  }

  function cleanupSpcDay1Orphans(){
    try{
      if (!map || !map._layers) return;
      Object.keys(map._layers).forEach(function(id){
        var layer = map._layers[id];
        if (!isLikelySpcPathLayer(layer)) return;
        try{ map.removeLayer(layer); }catch(e){}
      });
    }catch(e){}
  }
  window.cleanupSpcDay1Orphans = cleanupSpcDay1Orphans;

  function getSpcDay1Url(){
    var storyUrl = getStorySpcGeoJsonUrl();
    if (storyUrl && activeStoryWantsSpcOverride()) return storyUrl;
    try {
      if (CFG && Array.isArray(CFG.overlays)) {
        for (var i=0;i<CFG.overlays.length;i++){
          var o = CFG.overlays[i] || {};
          var nm = String(o.name || '').toLowerCase();
          if (nm.indexOf('day 1') !== -1 || nm.indexOf('spc') !== -1 || nm.indexOf('outlook') !== -1 || nm.indexOf('watch') !== -1){
            var u = o.url || o.file || o.geojson;
            if (u) return _isAbsUrl(u) ? u : _joinUrl(DATA_BASE, u);
          }
        }
      }
      if (CFG && CFG.layers && CFG.layers.spcDay1){
        var s = CFG.layers.spcDay1;
        var su = s.url || s.file || s.geojson || s.path;
        if (su) return _isAbsUrl(su) ? su : _joinUrl(DATA_BASE, su);
      }
    } catch(e){}
    return _joinUrl(DATA_BASE, 'spc/Day1.json');
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
    if (isWatchFeature(feature && feature.properties)) return watchStyle(feature && feature.properties);
    var c = {
      TSTM:{fill:'#C1E9C1',stroke:'#55BB55'},
      MRGL:{fill:'#66A366',stroke:'#005500'},
      SLGT:{fill:'#FFE066',stroke:'#DDAA00'},
      ENH:{fill:'#FFA366',stroke:'#FF6600'},
      MDT:{fill:'#E06666',stroke:'#CC0000'},
      HIGH:{fill:'#E066FF',stroke:'#CC00CC'}
    }[normalizeSpcCategory(feature && feature.properties)] || {fill:'#C1E9C1',stroke:'#55BB55'};
    return { color:c.stroke, weight:2, opacity:0.98, fillColor:c.fill, fillOpacity:0.42 };
  }

  function buildSpcPopupHtml(props){
    props = props || {};
    if (isWatchFeature(props)){
      var watchNum = props.NUM || props.watch_num || props.WATCHNUM || '';
      var watchTitle = (props.IS_PDS || props.is_pds || props.PDS) ? ('PDS Watch ' + watchNum) : ('Watch ' + watchNum);
      return "<div class='spc-mini-popup'>" +
        "<div class='spc-mini-title'>" + escapeHtml(watchTitle) + "</div>" +
        "<div class='spc-mini-sub'>Click for full watch text</div>" +
        "<button type='button' class='spc-details-btn' style='margin-top:8px;border:0;border-radius:999px;padding:7px 12px;font:900 12px/1 Arial,sans-serif;background:#173a63;color:#fff;cursor:pointer'>Details</button>" +
      "</div>";
    }
    var cat = normalizeSpcCategory(props);
    var labelMap = {
      TSTM:'General Thunderstorms',
      MRGL:'Marginal Risk',
      SLGT:'Slight Risk',
      ENH:'Enhanced Risk',
      MDT:'Moderate Risk',
      HIGH:'High Risk'
    };
    return "<div class='spc-mini-popup'>" +
      "<div class='spc-mini-title'>" + (labelMap[cat] || (props.LABEL2 || props.LABEL || 'SPC Outlook')) + "</div>" +
      "<div class='spc-mini-sub'>Forecast area selected</div>" +
      "<button type='button' class='spc-details-btn' style='margin-top:8px;border:0;border-radius:999px;padding:7px 12px;font:900 12px/1 Arial,sans-serif;background:#173a63;color:#fff;cursor:pointer'>Details</button>" +
    "</div>";
  }


  function getActiveStoryItem(){
    try{
      return (Array.isArray(storyItems) && storyItems.length) ? (storyItems[storyIndex] || null) : null;
    }catch(e){
      return null;
    }
  }

  function getActiveStorySceneConfig(){
    var item = getActiveStoryItem();
    if (!item || typeof item !== 'object') return {};
    var scene = (item.scene && typeof item.scene === 'object') ? item.scene : item;
    return scene || {};
  }

  function activeStoryWantsSpcOverride(){
    var scene = getActiveStorySceneConfig();
    var product = String(scene.product || '').toLowerCase();
    var layers = Array.isArray(scene.layers) ? scene.layers.map(function(v){ return String(v || '').toLowerCase(); }) : [];
    function has(name){ return layers.indexOf(String(name).toLowerCase()) !== -1; }
    return has('spc') || has('spc_day1') || has('spc_outlook') || has('day1_outlook') ||
           has('watch') || has('pds_watch') || has('spc_watch') ||
           product.indexOf('spc') !== -1 || product.indexOf('outlook') !== -1 ||
           product.indexOf('watch') !== -1;
  }

  function getStorySpcGeoJsonUrl(){
    var scene = getActiveStorySceneConfig();
    var rel = scene.overlayUrl || scene.geojson || scene.url || scene.dataUrl || scene.layerUrl || '';
    if (!rel) return '';
    return _isAbsUrl(rel) ? rel : _joinUrl(DATA_BASE, rel);
  }

  function getStoryWatchNumber(){
    var scene = getActiveStorySceneConfig();
    var n = Number(scene.watchNumber || scene.watch || scene.num || scene.number);
    return isFinite(n) ? n : null;
  }

  function featureMatchesActiveStory(feature){
    var scene = getActiveStorySceneConfig();
    var watchNum = getStoryWatchNumber();
    if (!watchNum) return true;
    var p = (feature && feature.properties) ? feature.properties : {};
    var num = Number(p.NUM || p.num || p.watch_num || p.watchNumber || p.WATCHNUM);
    if (!isFinite(num)) return false;
    return num === watchNum;
  }

  function parseSpcPlainText(rawText, url, product, props){
    var text = String(rawText || '').replace(/\r/g, '').trim();
    var lines = text.split('\n');
    var out = { __url:url || '', official_text:text };

    function firstMatch(re){
      var m = text.match(re);
      return m ? m[1].trim() : '';
    }

    var title = lines[0] ? lines[0].trim() : '';
    var watchLine = text.match(/Watch Number\s+(\d+)/i);
    var issuedLine = text.match(/\n\s*([^\n]*\d{1,2}:\d{2}\s*[AP]M\s*[A-Z]{2,4}\s*\w*\s*\w*\s*\w*\s*\d{1,2}\s*\d{4})/i);

    if (/Particularly Dangerous Situation/i.test(text) || /Watch Number/i.test(text)) {
      var watchNum = watchLine ? watchLine[1] : '';
      out.title = watchNum ? ('Watch ' + watchNum + ' — PDS Severe Thunderstorm Watch') : 'PDS Severe Thunderstorm Watch';
      out.category = /Particularly Dangerous Situation/i.test(text) ? 'PDS Watch' : 'Severe Thunderstorm Watch';
      out.summary = firstMatch(/SUMMARY\.\.\.([\s\S]*?)(?:\n\s*The severe thunderstorm watch area|\n\s*PRECAUTIONARY|$)/i) || 'Particularly Dangerous Situation watch details.';
      out.issued = issuedLine ? issuedLine[1] : '';
      var hazards = [];
      var hm = text.match(/Primary threats include\.\.\.([\s\S]*?)(?:\n\s*SUMMARY\.\.\.|$)/i);
      if (hm){
        for (var line of hm[1].split('\n')){
          line = line.replace(/^\s*\*\s*/,'').trim();
          if (line) hazards.push(line.replace(/\s+/g,' '));
        }
      }
      out.hazards = hazards;
      return out;
    }

    out.title = /MODERATE RISK/i.test(text) ? 'Moderate Risk' : (title || 'SPC Day 1 Outlook');
    out.category = /HIGH RISK/i.test(text) ? 'High Risk'
      : /MODERATE RISK/i.test(text) ? 'Moderate Risk'
      : /ENHANCED RISK/i.test(text) ? 'Enhanced Risk'
      : /SLIGHT RISK/i.test(text) ? 'Slight Risk'
      : /MARGINAL RISK/i.test(text) ? 'Marginal Risk'
      : 'SPC Outlook';
    out.summary = firstMatch(/\.\.\.SUMMARY\.\.\.([\s\S]*?)(?:\n\s*\.\.\.|\n\s*\.\.[A-Z]|$)/i) || '';
    out.issued = issuedLine ? issuedLine[1] : '';
    var hazards = [];
    if (out.summary){
      hazards = out.summary.split(',').map(function(s){ return s.trim(); }).filter(Boolean).slice(0,4);
    }
    out.hazards = hazards;
    return out;
  }

  function isWatchFeature(props){
    props = props || {};
    return !!(props.NUM || props.watch_num || props.WATCHNUM || props.IS_PDS || props.TYPE === 'SVR' || props.TYPE === 'TOR');
  }

  function watchStyle(props){
    var p = props || {};
    var isPds = !!(p.IS_PDS || p.is_pds || p.PDS);
    return {
      color: isPds ? '#8b0000' : '#b22222',
      weight: isPds ? 4 : 3,
      opacity: 0.98,
      fillColor: isPds ? '#ffb347' : '#ffd59a',
      fillOpacity: isPds ? 0.18 : 0.10,
      dashArray: isPds ? '8 6' : '6 5'
    };
  }

  function getSpcTextUrlForProduct(product, detailsFile){
    if (detailsFile) return _isAbsUrl(detailsFile) ? detailsFile : _joinUrl(DATA_BASE, detailsFile);
    var scene = getActiveStorySceneConfig();
    var storyDetails = scene.detailsFile || scene.textUrl || scene.textFile || '';
    if (storyDetails) return _isAbsUrl(storyDetails) ? storyDetails : _joinUrl(DATA_BASE, storyDetails);
    var p = String(product || scene.product || '').toLowerCase();
    if (p === 'spc_day1_12z') return _joinUrl(DATA_BASE, 'spc/day1_12z_text.json');
    if (p === 'spc_day1_1630') return _joinUrl(DATA_BASE, 'spc/day1_1630_text.json');
    return _joinUrl(DATA_BASE, 'spc/day1_12z_text.json');
  }

  async function fetchSpcTextPayload(product, detailsFile){
    var tries = [];
    var preferred = getSpcTextUrlForProduct(product, detailsFile);
    if (preferred) tries.push(preferred);
    var fallback12z = _joinUrl(DATA_BASE, 'spc/day1_12z_text.json');
    if (tries.indexOf(fallback12z) === -1) tries.push(fallback12z);

    var lastErr = null;
    for (var i = 0; i < tries.length; i++){
      try{
        var url = tries[i];
        var res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
        if (!res.ok) throw new Error('SPC text HTTP ' + res.status + ': ' + url);
        var raw = await res.text();
        var data;
        try{
          data = JSON.parse(raw);
        }catch(parseErr){
          data = parseSpcPlainText(raw, url, product, null);
        }
        if (typeof data === 'string') data = parseSpcPlainText(data, url, product, null);
        data.__url = url;
        return data;
      }catch(err){
        lastErr = err;
      }
    }
    var fallbackText = `Day 1 Convective Outlook  
   NWS Storm Prediction Center Norman OK
   0753 AM CDT Thu May 12 2022

   Valid 121300Z - 131200Z

   ...THERE IS A MODERATE RISK OF SEVERE THUNDERSTORMS OVER PORTIONS OF
   EASTERN SOUTH DAKOTA...PARTS OF WESTERN MINNESOTA AND SOUTHEASTERN
   NORTH DAKOTA...

   ...SUMMARY...
   Severe thunderstorm gusts (some near 75 mph), large hail and a few
   tornadoes are expected today over parts of the eastern Dakotas,
   eastern Nebraska, western Iowa, and central/southern Minnesota.

   ...Synopsis...
   The mid/upper-level pattern will feature mean troughing over the
   western CONUS, a lengthy but weakening ridge from west-central MX
   across the Arklatex to southern ON, and a broad/retrograding
   Atlantic cyclone, forecast to move westward and ashore over much of
   the southeastern Atlantic Coast overnight.  Within the southwest-
   flow field preceding the western larger-scale trough, an intense
   shortwave trough is apparent in moisture-channel imagery from near
   the ID/WY border across eastern UT.  This perturbation, with a
   negative tilt and embedded low apparent near the southwest corner of
   WY -- is expected to eject northeastward through the period,
   reaching southeastern MT, western SD and the NE Panhandle by 00Z. 
   By 12Z tomorrow, a well-defined 500-mb low should be apparent near
   the ND/SK/MB border confluence, with trough southeastward over
   southeastern SD.

   The 11Z surface analysis depicted a surface low over southwestern
   NE, with cold front across northern CO, and warm front over
   southeastern SD, extreme southern MN, and southern WI.  The low
   should move northeastward to a frontal triple point over
   northeastern SD by 00Z, with an occluded low developing farther
   northwest and near the mid/upper cyclone center over northwestern
   SD/southwestern ND.  By then, the warm front -- likely reinforced by
   outflow from earlier/morning convection to its north -- should
   extend from the triple point across southeastern ND, north-central
   MN, northern WI and the western U.P. of MI.  The cold front should
   extend across eastern SD (likely behind a line of convection),
   south-central NE, western KS, and southeastern CO.  A dryline will
   intersect the front over west-central KS, extending
   south-southwestward over the eastern TX Panhandle, the Permian Basin
   and the Big Bend region with isolated strong-severe convection
   possible late this afternoon.  By 12Z, the triple-point low should
   lose definition, as the western low deepens and becomes nearly
   stacked with its midlevel counterpart.  The cold front should extend
   across northern, central and southwestern MN, northwestern IA,
   southeastern NE, central KS, northwestern OK, the southern TX
   Panhandle, and southeastern NM.

   ...North-central Plains/Upper Midwest...
   Scattered to numerous thunderstorms are expected to develop in an
   arc near the surface low and cold front by mid/late afternoon, from
   eastern SD across central/eastern NE and into at least northern KS.
   A brief interval, early in the convective cycle, may support
   discrete to semi-discrete supercells before the convection becomes
   quasi-linear, and that accounts for potential for significant-severe
   hail in western parts of the outlook area.  However, the most common
   severe type should evolve quickly to thunderstorm gusts -- some of
   which may be significant (65+ kt) strength, especially from parts of
   eastern SD and southeastern ND into western MN.

   The addition of the significant-wind area technically triggers a
   "moderate" categorical level, though the overall scenario hasn't
   changed in a major way from that discussed in the previous outlook.
   A few tornadoes also are possible -- especially near the surface
   warm front, where large buoyancy, backed near-surface winds and
   enlarged hodographs/SRH will yield the most favorable parameter
   space.  The main uncertainty regarding the density and intensity of
   the tornado threat involves convective mode, which may be largely to
   entirely quasi-linear by the time activity encounters the largest
   combination of low-level buoyancy/shear with surface-based inflow
   parcels.

   The warm sector is forecast to destabilize throughout the day, with
   a combination of at least weak large-scale ascent (increasing
   northward), diurnal heating and related lift from below, and
   ultimately frontal convergence, eliminating a basal EML inversion
   and supporting convection initiation.  Activity is expected to
   intensify quickly as it impinges on a narrow but very favorable
   prefrontal corridor where 60s to near 70 F surface dewpoints
   contribute to MLCAPE in the 3500-4500 J/kg range in and near the
   "moderate" area, decreasing gradually with southward extent as more
   low-level moisture is mixed out.  Low-level and deep shear will be
   greatest near the triple point and warm front, with 300-500 J/kg
   effective SRH and 45-55-kt effective-shear magnitudes, also
   decreasing southward toward KS.  A substantial component of
   mid/upper winds parallel to the axis of convective forcing indicates
   potential for fairly fast merging of early discrete and sporadically
   supercellular convection, forming a QLCS.  Surges of wind from
   resulting LEWP/bowing segments will pose the greatest overall severe
   hazard, with line-embedded mesovortices and perhaps a few associated
   tornadoes also possible.  With the warm sector's not being very
   broad, the convective event should diminish late this evening into
   early overnight hours as it outruns the most favorable instability.

   ...Central/southern MS and vicinity...
   Widely scattered thunderstorms should develop this afternoon into
   early evening, in a moist, well-heated and weakly capped
   environment, along and west of a nearly north-south low-level
   baroclinic zone separating the lower-theta-e air related to the
   cyclone from the ambient Gulf warm sector.  Activity should move
   generally southwestward, offering isolated severe downbursts.

   As the mid/upper low moves toward the Atlantic Coast, and associated
   cyclonic flow spreads across more of the Southeast, a channel of
   enhanced northeast flow aloft (40-50 kt at 500 mb, 75-85 kt at 250
   mb) will shift slowly westward across GA/AL.  While the outlook area
   will be off the western rim of the strongest flow aloft, increasing
   winds are expected to support seasonally fast southwestward movement
   of multicellular clusters forming on the boundary and in the nearby
   warm sector.  MLCAPE of 1500-2000 J/kg (locally higher) should
   develop atop a well-mixed boundary layer supporting downdraft-
   acceleration potential and strong/isolated severe gusts.

   ..Edwards/Gleason.. 05/12/2022

   CLICK TO GET WUUS01 PTSDY1 PRODUCT

   NOTE: THE NEXT DAY 1 OUTLOOK IS SCHEDULED BY 1630Z`;
    try{ return parseSpcPlainText(fallbackText, 'fallback://spc/day1_12z_text.txt', product, null); }catch(_e){}
    throw lastErr || new Error('SPC text unavailable');
  }


  async function openSpcInfoPanel(props){
    try{
      var existing = document.getElementById('spcInfoPanel');
      if (!existing){
        existing = document.createElement('div');
        existing.id = 'spcInfoPanel';
        existing.style.position = 'absolute';
        existing.style.left = '17%';
        existing.style.top = '118px';
        existing.style.zIndex = '100004';
        existing.style.width = '66%';
        existing.style.maxWidth = '1120px';
        existing.style.maxHeight = '72vh';
        existing.style.overflow = 'auto';
        existing.style.background = 'rgba(255,255,255,0.97)';
        existing.style.border = '1px solid rgba(0,0,0,0.18)';
        existing.style.borderRadius = '16px';
        existing.style.boxShadow = '0 10px 28px rgba(0,0,0,.18)';
        existing.style.padding = '12px';
        existing.style.cursor = 'move';
        document.body.appendChild(existing);

        var drag = { on:false, x:0, y:0, l:18, t:132 };
        existing.addEventListener('mousedown', function(ev){
          if (ev.target && ev.target.closest && ev.target.closest('.spc-panel-close')) return;
          if (ev.target && ev.target.closest && ev.target.closest('.spc-panel-scroll')) return;
          drag.on = true; drag.x = ev.clientX; drag.y = ev.clientY;
          drag.l = parseInt(existing.style.left || '18', 10);
          drag.t = parseInt(existing.style.top || '132', 10);
          ev.preventDefault();
        });
        window.addEventListener('mousemove', function(ev){
          if (!drag.on) return;
          existing.style.left = (drag.l + ev.clientX - drag.x) + 'px';
          existing.style.top = (drag.t + ev.clientY - drag.y) + 'px';
        });
        window.addEventListener('mouseup', function(){ drag.on = false; });
      }

      var activeStory = getActiveStoryItem() || {};
      var sceneCfg = getActiveStorySceneConfig() || {};
      var product = sceneCfg.product || activeStory.product || '';
      var detailsFile = sceneCfg.detailsFile || activeStory.detailsFile || '';
      var isWatch = isWatchFeature(props);
      var cat = normalizeSpcCategory(props);
      var labelMap = {
        TSTM:'General Thunderstorms',
        MRGL:'Marginal Risk',
        SLGT:'Slight Risk',
        ENH:'Enhanced Risk',
        MDT:'Moderate Risk',
        HIGH:'High Risk'
      };
      var riskTheme = {
        TSTM:{bg:'linear-gradient(135deg,#49a85d 0%,#2f7f42 100%)', accent:'#dff5df', chip:'rgba(255,255,255,.16)'},
        MRGL:{bg:'linear-gradient(135deg,#2d7a36 0%,#1f5a26 100%)', accent:'#d9f1dc', chip:'rgba(255,255,255,.16)'},
        SLGT:{bg:'linear-gradient(135deg,#c79b14 0%,#9d7300 100%)', accent:'#fff3c5', chip:'rgba(255,255,255,.18)'},
        ENH:{bg:'linear-gradient(135deg,#d66b1f 0%,#a84700 100%)', accent:'#ffe0cb', chip:'rgba(255,255,255,.18)'},
        MDT:{bg:'linear-gradient(135deg,#a81f24 0%,#6f0f12 100%)', accent:'#ffd7d9', chip:'rgba(255,255,255,.20)'},
        HIGH:{bg:'linear-gradient(135deg,#8e2acb 0%,#5d1493 100%)', accent:'#f0d8ff', chip:'rgba(255,255,255,.20)'}
      }[cat] || {bg:'linear-gradient(135deg,#173a63 0%,#0f2744 100%)', accent:'#d9e9ff', chip:'rgba(255,255,255,.18)'};

      existing.innerHTML =
        "<div style='margin:-12px -12px 0 -12px;padding:14px 16px 12px 16px;background:" + riskTheme.bg + ";color:#fff;border-radius:16px 16px 0 0;box-shadow:inset 0 -1px 0 rgba(255,255,255,.12)'>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;align-items:flex-start'>" +
            "<div>" +
              "<div style='font:900 11px/1 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.88'>" + (isWatch ? 'SPC Watch Details' : 'SPC Outlook Details') + "</div>" +
              "<div style='font:900 22px/1.02 Lato,Arial,sans-serif;margin-top:6px;text-shadow:0 1px 2px rgba(0,0,0,.25)'>" + escapeHtml(labelMap[cat] || 'SPC Day 1 Outlook') + "</div>" +
              "<div style='display:inline-block;margin-top:8px;padding:4px 9px;border-radius:999px;background:" + riskTheme.chip + ";font:900 11px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase'>Loading details…</div>" +
            "</div>" +
            "<button class='spc-panel-close' style='border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;border-radius:10px;padding:4px 8px;font-weight:900;cursor:pointer'>X</button>" +
          "</div>" +
        "</div>" +
        "<div style='margin-top:12px;font:800 13px/1.35 Arial,sans-serif'>Fetching SPC text…</div>";

      var closeBtn0 = existing.querySelector('.spc-panel-close');
      if (closeBtn0) closeBtn0.onclick = function(){ existing.style.display = 'none'; };
      existing.style.display = 'block';

      var payload = null;
      try{
        payload = await fetchSpcTextPayload(product, detailsFile);
      }catch(err){
        payload = null;
      }

      var summary = payload && payload.summary ? String(payload.summary) : "This highlighted area shows where forecasters expected the most concerning severe weather threat.";
      var hazards = payload && Array.isArray(payload.hazards) ? payload.hazards : [];
      var officialText = payload && payload.official_text ? String(payload.official_text) : "";
      var title = payload && payload.title ? String(payload.title) : (isWatch ? ('Watch ' + (props.NUM || props.watch_num || '') ) : "SPC Day 1 Outlook");
      var issued = payload && payload.issued ? String(payload.issued) : "";
      var category = payload && payload.category ? String(payload.category) : (labelMap[cat] || "");
      var sourceLabel = payload && payload.__url ? payload.__url.split('/').slice(-1)[0] : "";
      var riskTheme = {
        TSTM:{bg:'linear-gradient(135deg,#49a85d 0%,#2f7f42 100%)', accent:'#dff5df', chip:'rgba(255,255,255,.16)', body:'#f4fbf4', line:'rgba(33,93,43,.20)'},
        MRGL:{bg:'linear-gradient(135deg,#2d7a36 0%,#1f5a26 100%)', accent:'#d9f1dc', chip:'rgba(255,255,255,.16)', body:'#f4fbf4', line:'rgba(33,93,43,.20)'},
        SLGT:{bg:'linear-gradient(135deg,#c79b14 0%,#9d7300 100%)', accent:'#fff3c5', chip:'rgba(255,255,255,.18)', body:'#fffaf0', line:'rgba(157,115,0,.22)'},
        ENH:{bg:'linear-gradient(135deg,#d66b1f 0%,#a84700 100%)', accent:'#ffe0cb', chip:'rgba(255,255,255,.18)', body:'#fff6f0', line:'rgba(168,71,0,.22)'},
        MDT:{bg:'linear-gradient(135deg,#a81f24 0%,#6f0f12 100%)', accent:'#ffd7d9', chip:'rgba(255,255,255,.20)', body:'#fff4f4', line:'rgba(111,15,18,.22)'},
        HIGH:{bg:'linear-gradient(135deg,#8e2acb 0%,#5d1493 100%)', accent:'#f0d8ff', chip:'rgba(255,255,255,.20)', body:'#fbf5ff', line:'rgba(93,20,147,.22)'}
      }[cat] || {bg:'linear-gradient(135deg,#173a63 0%,#0f2744 100%)', accent:'#d9e9ff', chip:'rgba(255,255,255,.18)', body:'#f7fafe', line:'rgba(15,39,68,.18)'};

      var html = "<div style='margin:-12px -12px 0 -12px;padding:14px 16px 12px 16px;background:" + riskTheme.bg + ";color:#fff;border-radius:16px 16px 0 0;box-shadow:inset 0 -1px 0 rgba(255,255,255,.12)'>" +
          "<div style='display:flex;justify-content:space-between;gap:12px;align-items:flex-start'>" +
            "<div>" +
              "<div style='font:900 11px/1 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.88'>" + (isWatch ? 'SPC Watch Details' : 'SPC Outlook Details') + "</div>" +
              "<div style='font:900 22px/1.02 Lato,Arial,sans-serif;margin-top:6px;text-shadow:0 1px 2px rgba(0,0,0,.25)'>" + escapeHtml(title) + "</div>" +
              "<div style='display:inline-block;margin-top:8px;padding:4px 9px;border-radius:999px;background:" + riskTheme.chip + ";font:900 11px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase'>" + escapeHtml(category || (labelMap[cat] || 'SPC Outlook')) + "</div>" +
            "</div>" +
            "<button class='spc-panel-close' style='border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);color:#fff;border-radius:10px;padding:4px 8px;font-weight:900;cursor:pointer'>X</button>" +
          "</div>" +
        "</div>";

      if (issued){
        html += "<div style='margin-top:10px;font:800 11px/1.35 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;opacity:.68'>Issued " + escapeHtml(issued) + "</div>";
      }

      html += "<div style='margin-top:10px;padding:12px 13px;background:" + riskTheme.body + ";border:1px solid " + riskTheme.line + ";border-radius:14px;font:800 13px/1.48 Arial,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.04)'>" + escapeHtml(summary) + "</div>";

      if (hazards.length){
        html += "<div style='margin-top:12px;font:900 12px/1.2 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:.72'>Main threats</div>";
        html += "<div style='display:flex;flex-wrap:wrap;gap:8px;margin-top:8px'>";
        for (var i = 0; i < hazards.length; i++){
          html += "<div style='padding:6px 10px;border-radius:999px;background:" + riskTheme.body + ";border:1px solid " + riskTheme.line + ";font:800 12px/1.25 Arial,sans-serif'>" + escapeHtml(String(hazards[i])) + "</div>";
        }
        html += "</div>";
      }

      if (officialText){
        html += "<div style='margin-top:14px;font:900 12px/1.2 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:.72'>Official outlook text</div>";
        html += "<div class='spc-panel-scroll' style='margin-top:8px;white-space:pre-wrap;font:700 12px/1.48 \"Courier New\",monospace;background:#faf7f2;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:10px 12px;cursor:text;max-height:28vh;overflow:auto'>" + escapeHtml(officialText) + "</div>";
      } else {
        html += "<div style='margin-top:12px;font:800 13px/1.4 Arial,sans-serif'>Official text file not found yet for this step.</div>";
      }

      if (sourceLabel){
        html += "<div style='margin-top:8px;font:700 11px/1.3 Arial,sans-serif;opacity:.62'>Source: " + escapeHtml(sourceLabel) + "</div>";
      }

      existing.innerHTML = html;
      var closeBtn = existing.querySelector('.spc-panel-close');
      if (closeBtn) closeBtn.onclick = function(){ existing.style.display = 'none'; };
      existing.style.display = 'block';
    }catch(e){}
  }


  async function ensureSpcDay1Layer(token){
    var url = getSpcDay1Url();
    if (spcDay1Layer && spcDay1Layer.__sourceUrl === url) return spcDay1Layer;
    if (spcDay1Layer){
      try{ if (map && map.hasLayer && map.hasLayer(spcDay1Layer)) map.removeLayer(spcDay1Layer); }catch(e){}
      spcDay1Layer = null;
    }
    cleanupSpcDay1Orphans();
    var res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
    if (!res.ok) throw new Error('SPC Day 1 HTTP ' + res.status + ': ' + url);
    if (token !== spcDay1LoadToken || !spcDay1Enabled) return null;
    var gj = await res.json();
    if (token !== spcDay1LoadToken || !spcDay1Enabled) return null;
    if (gj && Array.isArray(gj.features)) {
      gj = {
        type: gj.type || 'FeatureCollection',
        features: gj.features.filter(featureMatchesActiveStory)
      };
    }
    var made = L.geoJSON(gj, {
      style:spcStyle,
      onEachFeature:function(feature, layer){
        try{ layer.__wdlProduct = 'spc_day1'; layer.__wdlSpcDay1 = true; }catch(e){}
        layer.on('click', function(ev){
          try{
            var ll = ev && ev.latlng ? ev.latlng : layer.getBounds().getCenter();
            var popup = L.popup({ closeButton:true, className:'hrrr-popup' })
              .setLatLng(ll)
              .setContent(buildSpcPopupHtml(feature && feature.properties))
              .openOn(map);
            setTimeout(function(){
              var node = document.querySelector('.spc-mini-popup');
              if (node) node.style.cursor = 'default';
              var btn = document.querySelector('.spc-details-btn');
              if (btn) {
                btn.onclick = function(evt){
                  if (evt && evt.preventDefault) evt.preventDefault();
                  if (evt && evt.stopPropagation) evt.stopPropagation();
                  openSpcInfoPanel(feature && feature.properties);
                };
              }
            }, 0);
          }catch(e){}
        });
      }
    });
    made.__sourceUrl = url;
    made.__wdlProduct = 'spc_day1';
    made.__wdlSpcDay1 = true;
    try{ made.eachLayer(function(child){ child.__wdlProduct = 'spc_day1'; child.__wdlSpcDay1 = true; }); }catch(e){}
    if (token !== spcDay1LoadToken || !spcDay1Enabled){
      try{ made.remove(); }catch(e){}
      return null;
    }
    spcDay1Layer = made;
    return spcDay1Layer;
  }

  async function setSpcDay1Enabled(on){
    var token = ++spcDay1LoadToken;
    spcDay1Enabled = !!on;
    window.spcDay1Enabled = spcDay1Enabled;
    if (spcDay1Enabled){
      try{
        var lyr = await ensureSpcDay1Layer(token);
        if (token !== spcDay1LoadToken || !spcDay1Enabled || !lyr) return;
        if (!map.hasLayer(lyr)) lyr.addTo(map);
        if (lyr.bringToFront) lyr.bringToFront();
        setStatus('SPC Day 1 on');
      } catch(err){
        if (token === spcDay1LoadToken){
          spcDay1Enabled = false;
          window.spcDay1Enabled = false;
          cleanupSpcDay1Orphans();
          setStatus('SPC Day 1 failed');
        }
        console.error(err);
      }
    } else {
      if (spcDay1Layer && map.hasLayer(spcDay1Layer)) map.removeLayer(spcDay1Layer);
      spcDay1Layer = null;
      cleanupSpcDay1Orphans();
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

  var radarVelocityEnabled = false;
  var radarVelocityManifest = null;
  var radarVelocityManifestUrl = '';
  var radarVelocityManifestBaseUrl = '';
  var radarVelocityFrames = [];
  var radarVelocityBounds = null;
  var radarVelocityLayer = null;
  var radarVelocityPoints = null;
  var radarVelocityLoadPromise = null;
  var radarVelocityPointsPromise = null;
  var radarVelocityPointsFileLoaded = '';
  var radarVelocityPointsTargetUrl = '';
  var radarVelocityPointsLoadToken = 0;
  var radarVelocityFixedBounds = null;
  var currentRadarVelocityFrame = null;
  window.radarVelocityEnabled = radarVelocityEnabled;
  window.radarVelocityLayer = radarVelocityLayer;
  window.radarVelocityPoints = radarVelocityPoints;

  function getRadarVelocityManifestPath(){
    try{
      var r = (CFG && CFG.radarVelocity) ? CFG.radarVelocity : ((CFG && CFG.radar && CFG.radar.velocity) ? CFG.radar.velocity : {});
      var u = r.manifest || r.manifestFile || r.url || r.file || '';
      if (u) return u;
    }catch(e){}
    return 'radar/kfsd-velocity/manifest.json';
  }
  function getRadarVelocityManifestUrl(){
  try{
    var rv = (CFG && CFG.layers && CFG.layers.radarVelocity) ? CFG.layers.radarVelocity : ((CFG && CFG.radarVelocity) ? CFG.radarVelocity : {});
    var u = rv.manifest || rv.manifestFile || rv.url || '';
    if (u) return _isAbsUrl(u) ? u : _joinUrl(DATA_BASE, u);
  }catch(e){}
  return _joinUrl(DATA_BASE, 'radar/kfsd-velocity/manifest.json');
  }
  function parseRadarVelocityBounds(raw){
    if (!raw) return null;
    var b = raw.bounds || raw.bbox || raw.leaflet_bounds || raw;
    if (Array.isArray(b) && b.length === 2 && Array.isArray(b[0]) && Array.isArray(b[1])) return b;
    var south = Number(b.south ?? b.min_latitude ?? b.minLat ?? NaN);
    var north = Number(b.north ?? b.max_latitude ?? b.maxLat ?? NaN);
    var west  = _normLon(b.west ?? b.min_longitude ?? b.minLon ?? NaN);
    var east  = _normLon(b.east ?? b.max_longitude ?? b.maxLon ?? NaN);
    if ([south,north,west,east].every(isFinite)) return [[south, west],[north, east]];
    return null;
  }
  function inferRadarVelocityBoundsFromPoints(raw){
    if (!raw) return null;

    // Flat arrays: { lat:[], lon:[], mph:[], shape:[...] }
    if (Array.isArray(raw.lat) && Array.isArray(raw.lon) && raw.lat.length && raw.lon.length){
      var minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
      for (var i=0; i<raw.lat.length && i<raw.lon.length; i++){
        var la = Number(raw.lat[i]), lo = Number(raw.lon[i]);
        if (!isFinite(la) || !isFinite(lo)) continue;
        if (la < minLat) minLat = la;
        if (la > maxLat) maxLat = la;
        if (lo < minLon) minLon = lo;
        if (lo > maxLon) maxLon = lo;
      }
      if ([minLat,maxLat,minLon,maxLon].every(isFinite)) return [[minLat, minLon],[maxLat, maxLon]];
    }

    // 2-D arrays
    if (Array.isArray(raw.latitude) && Array.isArray(raw.longitude) && raw.latitude.length && raw.longitude.length){
      var minLat2 = Infinity, maxLat2 = -Infinity, minLon2 = Infinity, maxLon2 = -Infinity;
      for (var r=0; r<raw.latitude.length && r<raw.longitude.length; r++){
        var latRow = raw.latitude[r], lonRow = raw.longitude[r];
        if (!Array.isArray(latRow) || !Array.isArray(lonRow)) continue;
        var n = Math.min(latRow.length, lonRow.length);
        for (var c=0; c<n; c++){
          var la2 = Number(latRow[c]), lo2 = Number(lonRow[c]);
          if (!isFinite(la2) || !isFinite(lo2)) continue;
          if (la2 < minLat2) minLat2 = la2;
          if (la2 > maxLat2) maxLat2 = la2;
          if (lo2 < minLon2) minLon2 = lo2;
          if (lo2 > maxLon2) maxLon2 = lo2;
        }
      }
      if ([minLat2,maxLat2,minLon2,maxLon2].every(isFinite)) return [[minLat2, minLon2],[maxLat2, maxLon2]];
    }

    return null;
  }

  function parseRadarVelocityFrames(raw){
    var frames = [];
    if (raw && raw.image){
      var t0 = raw.time || raw.utc || raw.scan_time_utc || null;
      frames.push({
        file: raw.image,
        points: raw.pointsFile || raw.pointFile || raw.points || null,
        time: t0,
        timeMs: t0 ? Date.parse(t0) : NaN,
        label: raw.label || 'Velocity Test',
        bounds: parseRadarVelocityBounds(raw)
      });
      return frames;
    }
    var src = (raw && (raw.frames || raw.images || raw.files)) || [];
    if (!Array.isArray(src)) return frames;
    src.forEach(function(f, i){
      if (typeof f === 'string') f = { file:f };
      if (!f) return;
      var file = f.file || f.url || f.png || f.image || f.name;
      if (!file) return;
      var t = f.time || f.utc || f.scan_time_utc || null;
      frames.push({
        file: file,
        points: f.pointsFile || f.pointFile || f.points || raw.pointsFile || raw.pointFile || raw.points || null,
        time: t,
        timeMs: t ? Date.parse(t) : NaN,
        label: f.label || ('Velocity ' + (i+1)),
        bounds: parseRadarVelocityBounds(f) || parseRadarVelocityBounds(raw)
      });
    });
    return frames;
  }

  function getNearestRadarVelocityFrame(d){
    if (!Array.isArray(radarVelocityFrames) || !radarVelocityFrames.length) return null;
    var target = d && d.getTime ? d.getTime() : Date.now();
    var best = radarVelocityFrames[0];
    var bestDelta = isFinite(best.timeMs) ? Math.abs(best.timeMs - target) : Infinity;
    for (var i=1;i<radarVelocityFrames.length;i++){
      var f = radarVelocityFrames[i];
      var delta = isFinite(f.timeMs) ? Math.abs(f.timeMs - target) : Infinity;
      if (delta < bestDelta){
        best = f;
        bestDelta = delta;
      }
    }
    return best;
  }
  async function loadRadarVelocityManifestIfNeeded(){
    if (radarVelocityManifest) return radarVelocityManifest;
    if (radarVelocityLoadPromise) return radarVelocityLoadPromise;
    radarVelocityManifestUrl = getRadarVelocityManifestUrl();
    radarVelocityManifestBaseUrl = radarVelocityManifestUrl.split('/').slice(0,-1).join('/') + '/';
    setStatus('Loading velocity test…');
    radarVelocityLoadPromise = fetch(radarVelocityManifestUrl + (radarVelocityManifestUrl.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' })
      .then(function(r){
        if (!r.ok) throw new Error('Velocity manifest HTTP ' + r.status + ': ' + radarVelocityManifestUrl);
        return r.json();
      })
      .then(function(raw){
        radarVelocityManifest = raw || {};
        radarVelocityFrames = parseRadarVelocityFrames(radarVelocityManifest);
        currentRadarVelocityFrame = radarVelocityFrames[0] || null;
        radarVelocityBounds = (currentRadarVelocityFrame && currentRadarVelocityFrame.bounds) || parseRadarVelocityBounds(radarVelocityManifest);
        window.__RADAR_VELOCITY_MANIFEST__ = radarVelocityManifest;
        window.__RADAR_VELOCITY_FRAMES__ = radarVelocityFrames;
        window.__RADAR_VELOCITY_MANIFEST_URL__ = radarVelocityManifestUrl;
        return radarVelocityManifest;
      })
      .catch(function(err){
        console.error('Velocity manifest load failed:', err);
        radarVelocityLoadPromise = null;
        radarVelocityManifest = null;
        radarVelocityFrames = [];
        currentRadarVelocityFrame = null;
        radarVelocityBounds = null;
        setStatus('Velocity test failed');
        throw err;
      });
    return radarVelocityLoadPromise;
  }
  async function loadRadarVelocityPointsIfNeeded(){
    if (!currentRadarVelocityFrame || !currentRadarVelocityFrame.points) return null;

    var pointsUrl = _isAbsUrl(currentRadarVelocityFrame.points)
      ? currentRadarVelocityFrame.points
      : _joinUrl(radarVelocityManifestBaseUrl, currentRadarVelocityFrame.points);

    radarVelocityPointsTargetUrl = pointsUrl;

    if (radarVelocityPoints && radarVelocityPointsFileLoaded === pointsUrl) return radarVelocityPoints;
    if (radarVelocityPointsPromise && radarVelocityPointsFileLoaded === pointsUrl) return radarVelocityPointsPromise;

    var myToken = ++radarVelocityPointsLoadToken;
    radarVelocityPointsPromise = fetch(pointsUrl + (pointsUrl.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' })
      .then(function(r){
        if (!r.ok) throw new Error('Velocity points HTTP ' + r.status + ': ' + pointsUrl);
        return r.json();
      })
      .then(function(raw){
        if (myToken !== radarVelocityPointsLoadToken) return radarVelocityPoints;
        if (radarVelocityPointsTargetUrl !== pointsUrl) return radarVelocityPoints;

        radarVelocityPoints = raw || null;
        radarVelocityPointsFileLoaded = pointsUrl;
        window.radarVelocityPoints = radarVelocityPoints;
        window.__radarVelocityPointsFileLoaded = radarVelocityPointsFileLoaded;

        var inferred = inferRadarVelocityBoundsFromPoints(radarVelocityPoints);
        if (inferred && !radarVelocityFixedBounds){
          radarVelocityFixedBounds = inferred;
          radarVelocityBounds = radarVelocityFixedBounds;
          window.radarVelocityBounds = radarVelocityBounds;
          if (radarVelocityLayer && radarVelocityLayer.setBounds){
            try{ radarVelocityLayer.setBounds(radarVelocityBounds); }catch(e){}
          }
        }

        return radarVelocityPoints;
      })
      .catch(function(err){
        if (myToken === radarVelocityPointsLoadToken){
          radarVelocityPointsPromise = null;
          radarVelocityPoints = null;
          radarVelocityPointsFileLoaded = '';
          window.radarVelocityPoints = null;
          window.__radarVelocityPointsFileLoaded = '';
        }
        console.error('Velocity points load failed:', err);
        throw err;
      });
    return radarVelocityPointsPromise;
  }
  function clearRadarVelocityLayer(){
    try{ if (radarVelocityLayer && map && map.hasLayer(radarVelocityLayer)) map.removeLayer(radarVelocityLayer); }catch(e){}
    radarVelocityLayer = null;
    window.radarVelocityLayer = null;
  }
  function disableRadarVelocityState(){
    radarVelocityEnabled = false;
    window.radarVelocityEnabled = false;
    clearRadarVelocityLayer();
  }
  async function updateRadarVelocity(){
    await loadRadarVelocityManifestIfNeeded();
    var nearest = getNearestRadarVelocityFrame(curZ);
    if (nearest) currentRadarVelocityFrame = nearest;
    if (!currentRadarVelocityFrame || !currentRadarVelocityFrame.file) throw new Error('Velocity manifest missing frame image');

    // clear points cache when frame changes
    var nextPoints = currentRadarVelocityFrame.points || null;
    if (window.__lastRadarVelocityPointsFile__ !== nextPoints){
      radarVelocityPoints = null;
      radarVelocityPointsPromise = null;
      radarVelocityPointsFileLoaded = '';
      radarVelocityPointsTargetUrl = '';
      radarVelocityPointsLoadToken++;
      window.radarVelocityPoints = null;
      window.__radarVelocityPointsFileLoaded = '';
      window.__lastRadarVelocityPointsFile__ = nextPoints;
    }

    if (!radarVelocityFixedBounds){
      radarVelocityBounds = (currentRadarVelocityFrame && currentRadarVelocityFrame.bounds) || radarVelocityBounds;
    } else {
      radarVelocityBounds = radarVelocityFixedBounds;
    }

    if (currentRadarVelocityFrame.points) {
      try{ await loadRadarVelocityPointsIfNeeded(); }catch(e){ console.warn('Velocity points not loaded:', e); }
    }

    if (!radarVelocityBounds) throw new Error('Velocity manifest missing bounds');
    var imgUrl = _isAbsUrl(currentRadarVelocityFrame.file) ? currentRadarVelocityFrame.file : _joinUrl(radarVelocityManifestBaseUrl, currentRadarVelocityFrame.file);
    clearRadarVelocityLayer();
    radarVelocityLayer = L.imageOverlay(imgUrl, radarVelocityBounds, { opacity: productOpacity.radarVelocity || 0.70, interactive:false });
    radarVelocityLayer.addTo(map);
    window.radarVelocityLayer = radarVelocityLayer;
    setStatus('Velocity: ' + (currentRadarVelocityFrame.label || currentRadarVelocityFrame.time || 'frame'));
  }
  async function setRadarVelocityEnabled(on){
    radarVelocityEnabled = !!on;
    window.radarVelocityEnabled = radarVelocityEnabled;
    if (!radarVelocityEnabled){
      clearRadarVelocityLayer();
      setStatus('Velocity test off');
      try{ updateProductLabel(); }catch(e){}
      try{ if (typeof syncDockUi === 'function') syncDockUi(); }catch(e){}
      return;
    }
    try{
      if (typeof window.setRadarEnabled === 'function' && window.obsRadarEnabled) await window.setRadarEnabled(false);
    }catch(e){}
    try{
      await updateRadarVelocity();
    }catch(err){
      console.error(err);
      radarVelocityEnabled = false;
      window.radarVelocityEnabled = false;
      clearRadarVelocityLayer();
      setStatus('Velocity test failed');
    }
    try{ updateProductLabel(); }catch(e){}
    try{ if (typeof syncDockUi === 'function') syncDockUi(); }catch(e){}
  }
  window.setRadarVelocityEnabled = setRadarVelocityEnabled;

  function getRadarVelocityProbeAtLatLng(latlng){
    var raw = radarVelocityPoints;
    if (!raw || !latlng) return null;

    var b = radarVelocityBounds || parseRadarVelocityBounds(raw) || (currentRadarVelocityFrame && currentRadarVelocityFrame.bounds);
    if (!b) return null;
    var latMin = Math.min(b[0][0], b[1][0]), latMax = Math.max(b[0][0], b[1][0]);
    var lonMin = Math.min(b[0][1], b[1][1]), lonMax = Math.max(b[0][1], b[1][1]);
    if (latlng.lat < latMin || latlng.lat > latMax || latlng.lng < lonMin || latlng.lng > lonMax) return null;

    // Format A: 2-D arrays
    var lats = raw.latitude, lons = raw.longitude, vals = raw.values_mph || raw.values || raw.velocity_mph || raw.velocity || null;
    if (Array.isArray(lats) && Array.isArray(lons) && Array.isArray(vals) && lats.length && lons.length && vals.length && Array.isArray(lats[0])) {
      var rows = Math.min(lats.length, lons.length, vals.length);
      var cols = Array.isArray(lats[0]) ? lats[0].length : 0;
      if (!rows || !cols) return null;
      var best = null;
      var bestD = Infinity;
      for (var r=0; r<rows; r++){
        var latRow = lats[r], lonRow = lons[r], valRow = vals[r];
        if (!Array.isArray(latRow) || !Array.isArray(lonRow) || !Array.isArray(valRow)) continue;
        var n = Math.min(latRow.length, lonRow.length, valRow.length, cols);
        for (var c=0; c<n; c++){
          var v = valRow[c], la = latRow[c], lo = lonRow[c];
          if (v == null || !isFinite(v) || !isFinite(la) || !isFinite(lo)) continue;
          var dLat = la - latlng.lat, dLon = lo - latlng.lng;
          var d2 = dLat*dLat + dLon*dLon;
          if (d2 < bestD){
            bestD = d2;
            best = { value:Number(v), lat:Number(la), lon:Number(lo), row:r, col:c };
          }
        }
      }
      return best;
    }

    // Format B: flat arrays with shape, like { mph:[], lat:[], lon:[], shape:[rows, cols] }
    var flatVals = raw.mph || raw.values_mph || raw.values || raw.velocity_mph || raw.velocity || null;
    var flatLats = raw.lat || raw.latitude || null;
    var flatLons = raw.lon || raw.longitude || null;
    var shape = raw.shape || null;

    if (Array.isArray(flatVals) && Array.isArray(flatLats) && Array.isArray(flatLons) &&
        flatVals.length && flatLats.length === flatVals.length && flatLons.length === flatVals.length) {
      var total = Math.min(flatVals.length, flatLats.length, flatLons.length);
      var bestFlat = null;
      var bestFlatD = Infinity;
      for (var i=0; i<total; i++){
        var v2 = flatVals[i], la2 = flatLats[i], lo2 = flatLons[i];
        if (v2 == null || !isFinite(v2) || !isFinite(la2) || !isFinite(lo2)) continue;
        var dLat2 = la2 - latlng.lat, dLon2 = lo2 - latlng.lng;
        var d22 = dLat2*dLat2 + dLon2*dLon2;
        if (d22 < bestFlatD){
          bestFlatD = d22;
          var cols2 = (Array.isArray(shape) && shape.length > 1 && isFinite(shape[1])) ? Number(shape[1]) : 0;
          bestFlat = {
            value:Number(v2),
            lat:Number(la2),
            lon:Number(lo2),
            index:i,
            row:(cols2 ? Math.floor(i / cols2) : null),
            col:(cols2 ? (i % cols2) : null)
          };
        }
      }
      return bestFlat;
    }

    return null;
  }

  var hrrrManifest = null;
  var hrrrFrames = [];
  var currentHrrrFrameIndex = 0;
  var hrrrBounds = null;
  var hrrrLoadPromise = null;
  var hrrrLoadToken = 0;
  var hrrrDisplayedUrl = '';
  var hrrrPendingUrl = '';
  var hrrrTempEnabled = false;
  var hrrrTempLayer = null;
  var hrrrTempGeo = null;
  var hrrrPoints = [];
  var hrrrManifestUrl = null;
  var hrrrManifestBaseUrl = null;
  window.hrrrTempLayer = hrrrTempLayer;
  window.hrrrTempEnabled = hrrrTempEnabled;
  window.hrrrTempGeo = hrrrTempGeo;
  window.hrrrPoints = hrrrPoints;
  window.__HRRR_FRAMES__ = hrrrFrames;
  
  window.setHrrrFrame = function(index){
    try{
      index = Number(index);
      if (!isFinite(index)) return false;
      index = Math.max(0, index|0);
      if (typeof setCurrentHrrrFrameIndex === 'function'){
        setCurrentHrrrFrameIndex(index);
      } else {
        currentHrrrFrameIndex = index;
        window.currentHrrrFrameIndex = currentHrrrFrameIndex;
        try{ updateAll(); }catch(e){}
      }
      try{
        var fallback = ['2022-05-12T21:00:00Z','2022-05-12T22:00:00Z','2022-05-12T23:00:00Z','2022-05-13T00:00:00Z'];
        if (hrrrFrames && hrrrFrames[index] && hrrrFrames[index].time) { window.__WDL_HRRR_LABEL_TIME__ = new Date(hrrrFrames[index].time); curZ = new Date(hrrrFrames[index].time); }
        else window.__WDL_HRRR_LABEL_TIME__ = new Date(fallback[Math.max(0, Math.min(3, index))]);
      }catch(e){}
      return true;
    }catch(e){
      console.warn('setHrrrFrame failed', e);
      return false;
    }
  };

var hrrrProductMode = 'temp';
  window.hrrrProductMode = hrrrProductMode;

  function _normLon(lon){ lon = Number(lon); if (!isFinite(lon)) return lon; return lon > 180 ? lon - 360 : lon; }
  function getConfiguredHrrrManifestPath(product){
    product = String(product || hrrrProductMode || 'temp').toLowerCase();
    try{
      var cfg = (CFG && CFG.hrrr) ? CFG.hrrr : {};
      var fromProducts = cfg.products && cfg.products[product] ? (cfg.products[product].manifest || cfg.products[product].url || cfg.products[product].file) : '';
      if (fromProducts) return fromProducts;

      if (product === 'temp') {
        if (cfg.tempManifest) return cfg.tempManifest;
        if (cfg.temperatureManifest) return cfg.temperatureManifest;
      }
      if (product === 'radar') {
        if (cfg.radarManifest) return cfg.radarManifest;
        if (cfg.reflectivityManifest) return cfg.reflectivityManifest;
      }
      if (product === 'winds') {
        if (cfg.windsManifest) return cfg.windsManifest;
        if (cfg.windManifest) return cfg.windManifest;
        if (cfg.windGustManifest) return cfg.windGustManifest;
      }
      if (product === 'cape') {
        if (cfg.capeManifest) return cfg.capeManifest;
        if (cfg.products && cfg.products.cape) return (cfg.products.cape.manifest || cfg.products.cape.url || cfg.products.cape.file || '');
      }

      var generic = cfg.manifest || cfg.url || cfg.file || '';
      if (generic) {
        var s = String(generic).toLowerCase();
        if (product === 'radar' && s.indexOf('/radar/') !== -1) return generic;
        if (product === 'winds' && s.indexOf('/winds/') !== -1) return generic;
        if (product === 'cape' && s.indexOf('/cape/') !== -1) return generic;
        if (product === 'temp' && s.indexOf('/radar/') === -1 && s.indexOf('/winds/') === -1 && s.indexOf('/cape/') === -1) return generic;
      }
    }catch(e){}
    return product === 'radar' ? 'hrrr/radar/manifest.json' : (product === 'winds' ? 'hrrr/winds/manifest.json' : (product === 'cape' ? 'hrrr/cape/manifest.json' : 'hrrr/temp/manifest.json'));
  }

  function resetHrrrManifestState(){
    hrrrLoadPromise = null;
    hrrrManifest = null;
    hrrrManifestUrl = '';
    hrrrManifestBaseUrl = '';
    hrrrBounds = null;
    hrrrFrames = [];
    hrrrPoints = [];
    currentHrrrFrameIndex = 0;
    window.__HRRR_FRAMES__ = hrrrFrames;
    window.__HRRR_MANIFEST_URL__ = hrrrManifestUrl;
    window.__HRRR_MANIFEST_BASE_URL__ = hrrrManifestBaseUrl;
    window.hrrrPoints = hrrrPoints;
  }
  function _baseUrl(url){
    url = String(url || '');
    return url.split('/').slice(0, -1).join('/') + '/';
  }
  function getHrrrManifestUrl(product){
    var u = getConfiguredHrrrManifestPath(product || hrrrProductMode || 'temp');
    return _isAbsUrl(u) ? u : _joinUrl(DATA_BASE, u);
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
      frames.push({ file:file, label:f.label || f.name || ('F' + String(i).padStart(2,'0')), time:tRaw || null, timeMs:timeMs, points:f.points || f.pointFile || f.pointsFile || raw.points || raw.pointFile || raw.pointsFile || null });
    });
    return frames;
  }
  async function loadHrrrManifest(){
    if (hrrrLoadPromise) return hrrrLoadPromise;
    var url = getHrrrManifestUrl();
    hrrrManifestUrl = url;
    hrrrManifestBaseUrl = _baseUrl(url);
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
      window.__HRRR_MANIFEST_URL__ = hrrrManifestUrl;
      window.__HRRR_MANIFEST_BASE_URL__ = hrrrManifestBaseUrl;
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
    if (_isAbsUrl(frame.file)) return frame.file;
    var base = hrrrManifestBaseUrl || _joinUrl(DATA_BASE, 'hrrr/temp/');
    return _joinUrl(base, frame.file);
  }
  function hrrrPointsUrl(frame){
  if (!frame) return null;

  var candidate =
    frame.points ||
    frame.pointFile ||
    frame.pointsFile ||
    null;

  if (!candidate && frame.file) {
    candidate = String(frame.file).replace(/\.[^.]+$/, '.json');
  }

  if (!candidate) return null;
  if (_isAbsUrl(candidate)) return candidate;
  var base = hrrrManifestBaseUrl || _joinUrl(DATA_BASE, 'hrrr/temp/');
  return _joinUrl(base, candidate);
}
function parseHrrrPointsPayload(raw){
  var pts = [];

  function firstFinite(list){
    for (var i = 0; i < list.length; i++){
      var n = Number(list[i]);
      if (isFinite(n)) return n;
    }
    return NaN;
  }

  function pickValue(obj){
    if (!obj) return NaN;
    if (window.hrrrProductMode === 'winds') {
      return firstFinite([
        obj.mph,
        obj.gustMph,
        obj.windGustMph,
        obj.maxWindGustMph,
        obj.max_surface_wind_gust_mph,
        obj.max_surface_wind_gust,
        obj.sfcWindGust,
        obj.wind_gust,
        obj.gust,
        obj.value
      ]);
    }
    if (window.hrrrProductMode === 'cape') {
      return firstFinite([
        obj.cape,
        obj.CAPE,
        obj.sbcape,
        obj.sbCAPE,
        obj.mlcape,
        obj.mlCAPE,
        obj.surface_based_cape,
        obj.surfaceBasedCape,
        obj.most_unstable_cape,
        obj.value
      ]);
    }
    return firstFinite([
      obj.tF,
      obj.tempF,
      obj.value,
      obj.temp,
      obj.temperature,
      obj["2_meter_temperature"]
    ]);
  }

  function pushPoint(lat, lon, val){
    var la = Number(lat);
    var lo = _normLon(Number(lon));
    var v = Number(val);
    if (!isFinite(la) || !isFinite(lo) || !isFinite(v)) return;
    if (window.hrrrProductMode === 'winds') pts.push({ lat:la, lon:lo, mph:v, value:v, unit:'mph' });
    else if (window.hrrrProductMode === 'cape') pts.push({ lat:la, lon:lo, cape:v, value:v, unit:' J/kg' });
    else pts.push({ lat:la, lon:lo, tF:v, value:v, unit:'°F' });
  }

  if (!raw) return pts;

  var arr = Array.isArray(raw)
    ? raw
    : (Array.isArray(raw.points) ? raw.points
      : (raw.features || null));

  if (Array.isArray(arr)) {
    arr.forEach(function(p){
      if (!p) return;
      if (p.type === 'Feature' && p.geometry && Array.isArray(p.geometry.coordinates)) {
        var pr = p.properties || {};
        pushPoint(p.geometry.coordinates[1], p.geometry.coordinates[0], pickValue(pr));
      } else {
        pushPoint(
          (p.lat != null ? p.lat : p.latitude),
          (p.lon != null ? p.lon : (p.lng != null ? p.lng : p.longitude)),
          pickValue(p)
        );
      }
    });
    return pts;
  }

  var lat = (raw.lat != null ? raw.lat : raw.latitude);
  var lon = (raw.lon != null ? raw.lon : (raw.longitude != null ? raw.longitude : raw.lng));
  var val = pickValue(raw);

  if (Array.isArray(lat) && Array.isArray(lon) && Array.isArray(val)) {
    for (var i = 0; i < lat.length; i++){
      if (Array.isArray(lat[i]) && Array.isArray(lon[i]) && Array.isArray(val[i])) {
        for (var j = 0; j < lat[i].length; j++){
          pushPoint(lat[i][j], lon[i][j], val[i][j]);
        }
      } else {
        pushPoint(lat[i], lon[i], val[i]);
      }
    }
  } else {
    pushPoint(lat, lon, val);
  }

  return pts;
}
  async function loadHrrrPointsForFrame(frame){
    var url = hrrrPointsUrl(frame);
    if (!url) { hrrrPoints = []; window.hrrrPoints = hrrrPoints; return []; }
    try{
      var raw = await fetch(url, { cache:'no-store' }).then(function(r){ if(!r.ok) throw new Error('HRRR points HTTP ' + r.status); return r.json(); });
      hrrrPoints = parseHrrrPointsPayload(raw);
      window.hrrrPoints = hrrrPoints;
      return hrrrPoints;
    }catch(err){
      console.warn('HRRR points unavailable:', url, err);
      hrrrPoints = []; window.hrrrPoints = hrrrPoints;
      return [];
    }
  }
  function updateHrrrOverlay(){
    if (!hrrrTempEnabled){
      if (hrrrTempLayer && map.hasLayer(hrrrTempLayer)) map.removeLayer(hrrrTempLayer);
      hrrrPendingUrl = '';
      return;
    }
    var frame = currentHrrrFrame();
    if (!frame || !hrrrBounds) return;
    var url = hrrrFrameUrl(frame);
    if (!url) return;
    if (url === hrrrDisplayedUrl || url === hrrrPendingUrl) return;
    hrrrPendingUrl = url;
    var token = ++hrrrLoadToken;
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
      if (token !== hrrrLoadToken) return;
      hrrrPendingUrl = '';
      hrrrDisplayedUrl = url;
      if (hrrrTempLayer && map.hasLayer(hrrrTempLayer)) map.removeLayer(hrrrTempLayer);
      var activeKey = (hrrrProductMode === 'radar') ? 'hrrrRadar' : ((hrrrProductMode === 'winds') ? 'hrrrWinds' : ((hrrrProductMode === 'cape') ? 'hrrrCape' : 'hrrrTemp'));
      var op = productOpacity[activeKey] || 0.70;
      hrrrTempLayer = L.imageOverlay(url, hrrrBounds, { opacity: op, interactive:false });
      window.hrrrTempLayer = hrrrTempLayer;
      hrrrTempLayer.addTo(map);
      applyActiveOpacity();
      loadHrrrPointsForFrame(frame).then(function(pts){
        var name = (hrrrProductMode === 'radar') ? 'Future Radar' : ((hrrrProductMode === 'winds') ? 'Future Wind Gusts' : ((hrrrProductMode === 'cape') ? 'CAPE' : 'Future Temperatures'));
        if (Array.isArray(pts) && pts.length) setStatus(name + ': ' + (frame.label || url) + ' · probe ready');
        else setStatus(name + ': ' + (frame.label || url));
      });
      try{ updateProductLabel(); }catch(e){}
    };
    img.onerror = function(){
      if (token !== hrrrLoadToken) return;
      hrrrPendingUrl = '';
      var name = (hrrrProductMode === 'radar') ? 'Future Radar' : ((hrrrProductMode === 'winds') ? 'Future Wind Gusts' : ((hrrrProductMode === 'cape') ? 'CAPE' : 'Future Temperatures'));
      setStatus(hrrrDisplayedUrl ? (name + ' holding last frame') : (name + ' missing: ' + url));
    };
    img.src = url;
  }
  async function setHrrrProductEnabled(product, on){
    product = String(product || 'temp').toLowerCase();
    var turningOn = !!on;
    if (turningOn){
      hrrrProductMode = (product === 'radar') ? 'radar' : ((product === 'winds') ? 'winds' : ((product === 'cape') ? 'cape' : 'temp'));
      window.hrrrProductMode = hrrrProductMode;
      resetHrrrManifestState();
    }
    hrrrTempEnabled = turningOn;
    window.hrrrTempEnabled = hrrrTempEnabled;
    if (!hrrrTempEnabled){
      if (hrrrTempLayer && map.hasLayer(hrrrTempLayer)) map.removeLayer(hrrrTempLayer);
      setStatus((hrrrProductMode === 'radar') ? 'Future Radar off' : ((hrrrProductMode === 'winds') ? 'Future Wind Gusts off' : ((hrrrProductMode === 'cape') ? 'CAPE off' : 'Future Temperatures off')));
      try{ updateProductLabel(); }catch(e){}
      try{ setTimeLabel(); }catch(e){}
      try{ syncDockUi(); }catch(e){}
      return;
    }
    try{
      await loadHrrrManifest();
      currentHrrrFrameIndex = nearestHrrrFrameIndexForTime(curZ);
      setCurrentHrrrFrameIndex(currentHrrrFrameIndex);
      try{ syncScrubberToActiveProduct(); }catch(e){}
      updateHrrrOverlay();
      setStatus((hrrrProductMode === 'radar') ? 'Future Radar on' : ((hrrrProductMode === 'winds') ? 'Future Wind Gusts on' : ((hrrrProductMode === 'cape') ? 'CAPE on' : 'Future Temperatures on')));
    }catch(err){
      hrrrTempEnabled = false;
      window.hrrrTempEnabled = false;
      console.error(err);
      setStatus((hrrrProductMode === 'radar') ? 'Future Radar failed' : ((hrrrProductMode === 'winds') ? 'Future Wind Gusts failed' : ((hrrrProductMode === 'cape') ? 'CAPE failed' : 'Future Temperatures failed')));
    }
    try{ updateProductLabel(); }catch(e){}
    try{ setTimeLabel(); }catch(e){}
    try{ syncDockUi(); }catch(e){}
  }
  async function setHrrrTempEnabled(on){
    return setHrrrProductEnabled('temp', on);
  }
  async function setHrrrRadarEnabled(on){
    return setHrrrProductEnabled('radar', on);
  }
  async function setHrrrWindsEnabled(on){
    return setHrrrProductEnabled('winds', on);
  }
  async function setHrrrCapeEnabled(on){
    return setHrrrProductEnabled('cape', on);
  }
  window.setHrrrProductEnabled = setHrrrProductEnabled;
  window.setHrrrTempEnabled = setHrrrTempEnabled;
  window.setHrrrRadarEnabled = setHrrrRadarEnabled;
  window.setHrrrWindsEnabled = setHrrrWindsEnabled;
  window.setHrrrCapeEnabled = setHrrrCapeEnabled;

  async function setSatelliteEnabled(on){
    goesEnabled = !!on;
    window.goesEnabled = goesEnabled;
    try{
      var gc = document.getElementById('goesControls');
      if (gc) gc.style.display = on ? '' : 'none';
      if (!on){
        stopGoesAnim();
        if (typeof goesOverlay !== 'undefined' && goesOverlay && map && map.hasLayer && map.hasLayer(goesOverlay)) {
          try{ map.removeLayer(goesOverlay); }catch(e){}
        }
      } else {
        if (typeof updateGoes === 'function') { try{ updateGoes(); }catch(e){ console.error(e); } }
      }
    }catch(err){ console.error(err); }
    try{ updateProductLabel(); }catch(e){}
    try{ updateLegend(); }catch(e){}
    try{ syncDockUi(); }catch(e){}
  }
  window.setSatelliteEnabled = setSatelliteEnabled;

  function updateProductLabel(){
  var pl = document.getElementById("productLabel");
  if (!pl) return;

  var candidates = [
    { on: (typeof era5Apr10Enabled !== "undefined" && (era5Apr10Enabled || era5Apr11Enabled)), label: "GLOBAL TEMP" },
    { on: (typeof gfsSnowEnabled !== "undefined" && gfsSnowEnabled), label: "SNOW" },
    { 
      on: (typeof jet500Enabled !== "undefined" && jet500Enabled),
      label: ((CFG && CFG.surfaceWinds && CFG.surfaceWinds.label) ? CFG.surfaceWinds.label.toUpperCase() : "500 MB WINDS")
    },
    { on: (typeof goesEnabled !== "undefined" && goesEnabled), label: "SATELLITE" },
    { on: (typeof lightningEnabled !== "undefined" && lightningEnabled), label: "LIGHTNING" },
    { on: (typeof spcDay1Enabled !== "undefined" && spcDay1Enabled), label: "SPC DAY 1" },
    { on: (typeof warningsEnabled !== "undefined" && warningsEnabled), label: "WARNINGS" },
    { on: (typeof reportsEnabled !== "undefined" && reportsEnabled), label: "REPORTS" },
    { on: (typeof metarVisible !== "undefined" && metarVisible && !(typeof obsRadarEnabled !== "undefined" && obsRadarEnabled)), label: "METARS" },
    { on: (typeof ptypeEnabled !== "undefined" && ptypeEnabled), label: "P-TYPE" },
    { on: (typeof hrrrTempLayer !== "undefined" && hrrrTempLayer && map && map.hasLayer && map.hasLayer(hrrrTempLayer) && window.hrrrProductMode === 'temp'), label: "FUTURE TEMP" },
    { on: (typeof hrrrTempLayer !== "undefined" && hrrrTempLayer && map && map.hasLayer && map.hasLayer(hrrrTempLayer) && window.hrrrProductMode === 'radar'), label: "FUTURE RADAR" },
    { on: (typeof hrrrTempLayer !== "undefined" && hrrrTempLayer && map && map.hasLayer && map.hasLayer(hrrrTempLayer) && window.hrrrProductMode === 'winds'), label: "FUTURE WIND GUSTS" },
    { on: (typeof hrrrTempLayer !== "undefined" && hrrrTempLayer && map && map.hasLayer && map.hasLayer(hrrrTempLayer) && window.hrrrProductMode === 'cape'), label: "CAPE" },
    { on: (typeof radarVelocityEnabled !== "undefined" && radarVelocityEnabled), label: "RADAR VELOCITY" },
    { on: (typeof radarSweepEnabled !== "undefined" && radarSweepEnabled), label: "LIVE DOPPLER" },
    { on: (typeof obsRadarEnabled !== "undefined" && obsRadarEnabled), label: "RADAR" }
  ];

  var label = "MAP";
  for (var i = 0; i < candidates.length; i++){
    if (candidates[i].on){
      label = candidates[i].label;
      break;
    }
  }
  pl.textContent = label;
}
  function updateLegend(){
    var el = document.getElementById("mapLegend");
    if (!el) return;
    var bar = el.querySelector(".leg-mini-bar");
    var title = "";

    var key = getActiveProductKey();
    if (key === "radar" || key === "hrrrRadar"){
      title = (key === "hrrrRadar") ? "Future radar reflectivity" : "Radar reflectivity";
      if (bar) bar.style.background = "linear-gradient(90deg, #2b83ba, #4ecdc4, #a8e6a3, #ffd166, #ef476f)";
      el.style.display = "";
    } else if (key === "radarVelocity"){
      title = "Radar velocity (mph)";
      if (bar) bar.style.background = "linear-gradient(90deg, #1f5fd6, #7fb3ff, #f2f2f2, #ffb0b0, #d71f1f)";
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
    } else if (key === "hrrrCape") {
      title = "Surface-Based CAPE (J/kg)";
      if (bar) bar.style.background = "linear-gradient(90deg, #f7fcf5 0%, #c7e9c0 18%, #74c476 40%, #31a354 60%, #fdcc8a 78%, #fc8d59 90%, #d7301f 100%)";
      el.style.display = "";
      radarVelocityFixedBounds = null;
    } else { // temp / future temp
      title = (key === "hrrrTemp") ? "Future 2m Temperature (°F)" : "2m Temperature (°F)";
      // WeatherBell-ish continuous temp ramp (cold blues -> greens -> yellows -> oranges -> reds -> purples)
      if (bar) bar.style.background = "linear-gradient(90deg, #0b2e83 0%, #1f66d3 15%, #6fb7ff 28%, #1f8a3a 42%, #7fe36d 52%, #ffe14a 63%, #ff9a1f 73%, #e31a1c 82%, #a4007c 92%, #ff66ff 100%)";
      el.style.display = "";
    }

    el.title = title;
  }


  var radarLoadToken = 0;
  var radarDisplayedUrl = '';
  var radarPendingUrl = '';
  function updateRadar(){
    if (!obsRadarEnabled){
      hideRadarSweepCanvas();
      radarPendingUrl = "";
      radarDisplayedUrl = "";
      radarLastGoodImage = null;
      if (obsRadarOverlay){ try{ map.removeLayer(obsRadarOverlay); }catch(e){} obsRadarOverlay = null; }
      return;
    }

    var url = radarUrlFor(curZ);
    if (!url) return;

    var op = 0.70;
    var rs = document.getElementById("radarOpacity");
    if (rs){ op = Math.max(0.2, Math.min(1, parseInt(rs.value||"70",10)/100)); }

    if (!radarSweepEnabled && (url === radarDisplayedUrl || url === radarPendingUrl)) {
      if (obsRadarOverlay && obsRadarEnabled) obsRadarOverlay.setOpacity(op);
      return;
    }
    if (radarSweepEnabled && (url === radarSweepImageUrl || url === radarPendingUrl)) {
      ensureRadarSweepCanvas();
      radarSweepCanvas.style.opacity = String(op);
      return;
    }

    radarPendingUrl = url;
    var myToken = ++radarLoadToken;

    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function(){
      if (myToken !== radarLoadToken) return;
      radarPendingUrl = "";

      radarSweepImage = img;
      radarSweepImageUrl = url;
      radarLastGoodImage = img;

      if (radarSweepEnabled){
        radarDisplayedUrl = url;
        if (obsRadarOverlay){ try{ map.removeLayer(obsRadarOverlay); }catch(e){} obsRadarOverlay = null; }
        ensureRadarSweepCanvas();
        radarSweepCanvas.style.opacity = String(op);
        startRadarSweep();
        updateSweepUi();
        setStatus("Radar sweep: " + url);
      } else {
        hideRadarSweepCanvas();
        updateSweepUi();
        var newOverlay = L.imageOverlay(url, RADAR_BOUNDS, { opacity: op, interactive:false });
        newOverlay.addTo(map);
        if (obsRadarOverlay){ try{ map.removeLayer(obsRadarOverlay); }catch(e){} }
        obsRadarOverlay = newOverlay;
        radarDisplayedUrl = url;
        applyActiveOpacity();
        setStatus("Radar: " + url);
      }

      try{
        var pool = getRadarFramePool();
        if (pool && pool.length > 1){
          var active = findNearestRadarFrame(curZ);
          var idx = pool.indexOf(active);
          if (idx >= 0){
            var next = pool[(idx + 1) % pool.length];
            var nextPng = next && (next.png || next.file || next.filename || next.name || null);
            if (nextPng){
              var nextUrl = _isAbsUrl(nextPng) ? nextPng : _joinUrl(RADAR_MANIFEST_FOLDER || DATA_BASE, nextPng);
              var pre = new Image();
              pre.crossOrigin = "anonymous";
              pre.src = nextUrl;
            }
          }
        }
      }catch(e){}
    };
    img.onerror = function(){
      if (myToken !== radarLoadToken) return;
      radarPendingUrl = "";
      if (radarSweepEnabled && radarLastGoodImage){
        radarSweepImage = radarLastGoodImage;
        ensureRadarSweepCanvas();
        radarSweepCanvas.style.opacity = String(op);
        startRadarSweep();
      }
      setStatus(radarDisplayedUrl ? "Radar held on previous frame" : ("Radar missing: " + url + " (check manifest/frames path)"));
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
  try{
    var a = (CFG && CFG.warnings) ? CFG.warnings : {};
    if (a && a.enabled === false) return null;

    var rel = a.geojson || a.url || a.file || "";
    if (!rel && CFG && CFG.id === "derecho-2022"){
      rel = "alerts/may12_2022_tornado_severe_warnings.geojson";
    }
    if (!rel) return null;

    return _isAbsUrl(rel) ? rel : _joinUrl(DATA_BASE, rel);
  }catch(e){
    return null;
  }
}
function parseAlertTimeValue(v){
  if (!v) return NaN;
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  var s = String(v).trim();
  if (!s) return NaN;
  var t = Date.parse(s);
  if (isFinite(t)) return t;
  return NaN;
}

function getAlertStartMs(p){
  if (!p) return NaN;
  var vals = [
    p.polyBegin, p.issued, p.ISSUE, p.issue, p.start,
    p.start_utc, p.issue_utc, p.effective, p.onset, p.valid_from
  ];
  for (var i=0; i<vals.length; i++){
    var t = parseAlertTimeValue(vals[i]);
    if (isFinite(t)) return t;
  }
  return NaN;
}

function getAlertEndMs(p){
  if (!p) return NaN;
  var vals = [
    p.polyEnd, p.expired, p.EXPIRE, p.expire, p.end,
    p.end_utc, p.expire_utc, p.expires, p.valid_to
  ];
  for (var i=0; i<vals.length; i++){
    var t = parseAlertTimeValue(vals[i]);
    if (isFinite(t)) return t;
  }
  return NaN;
}

function ensureAlertsLoaded(){
  if (alertsGeoJson) return Promise.resolve(alertsGeoJson);
  if (alertsLoadPromise) return alertsLoadPromise;

  var url = alertsUrlFor(curZ);
  if (!url) return Promise.resolve(null);

  alertsLoadPromise = fetch(url, { cache: "no-store" })
    .then(function(r){
      if (!r.ok) throw new Error("HTTP " + r.status + " :: " + url);
      return r.json();
    })
    .then(function(gj){
      alertsGeoJson = gj;
      alertsLayer.clearLayers();
      alertsLayer.addData({ type:'FeatureCollection', features:(gj && gj.features ? gj.features.filter(warningFeatureInCoreArea) : []) });
      return gj;
    })
    .catch(function(err){
      console.warn("Alerts load failed:", err);
      alertsGeoJson = null;
      return null;
    });

  return alertsLoadPromise;
}
function updateAlerts(){
  if (!warningsEnabled){
    try{ if (map.hasLayer(alertsLayer)) map.removeLayer(alertsLayer); }catch(e){}
    return;
  }

  ensureAlertsLoaded().then(function(gj){
    if (!gj || !alertsLayer) return;

    var now = curZ.getTime();
    var anyActive = false;

    alertsLayer.eachLayer(function(layer){
      if (!warningFeatureInCoreArea(layer && layer.feature)) {
        try{ layer.setStyle({ opacity:0, fillOpacity:0 }); }catch(e){}
        if (layer._path) layer._path.style.pointerEvents = 'none';
        return;
      }
      var p = (layer && layer.feature && layer.feature.properties) ? layer.feature.properties : {};
      var start = getAlertStartMs(p);
      var end   = getAlertEndMs(p);
      var active = isFinite(start) && isFinite(end) ? (now >= start && now <= end) : false;

      var evt = String(p.event || p.type || "").toUpperCase();
      var isTornado = evt.includes("TORNADO");

      if (active) anyActive = true;

      try{
        layer.setStyle({
          color: isTornado ? "#ff2a2a" : "#ffd400",
          weight: 3,
          opacity: active ? (alertsBlinkOn ? 1 : 0.2) : 0,
          fill: false,
          fillOpacity: 0
        });
      }catch(e){}

      if (layer._path){
        layer._path.style.pointerEvents = active ? "auto" : "none";
      }
    });

    if (anyActive){
      if (!map.hasLayer(alertsLayer)) alertsLayer.addTo(map);
      try{ alertsLayer.bringToFront(); }catch(e){}
      ensureBlinking();
    } else {
      if (map.hasLayer(alertsLayer)) map.removeLayer(alertsLayer);
    }
  }).catch(function(err){
    console.warn("updateAlerts failed:", err);
  });
}
function refreshAlertsBlink(){
  if (!alertsLayer) return;
  alertsLayer.eachLayer(function(layer){
      if (!warningFeatureInCoreArea(layer && layer.feature)) {
        try{ layer.setStyle({ opacity:0, fillOpacity:0 }); }catch(e){}
        if (layer._path) layer._path.style.pointerEvents = 'none';
        return;
      }
    var p = (layer && layer.feature && layer.feature.properties) ? layer.feature.properties : {};
    var start = getAlertStartMs(p);
    var end   = getAlertEndMs(p);
    var now = curZ.getTime();
    var active = isFinite(start) && isFinite(end) ? (now >= start && now <= end) : false;
    var evt = String(p.event || p.type || "").toUpperCase();
    var isTornado = evt.includes("TORNADO");
    try{
      layer.setStyle({
        color: isTornado ? "#ff2a2a" : "#ffd400",
        opacity: active ? (alertsBlinkOn ? 1 : 0.2) : 0,
        fill: false,
        fillOpacity: 0
      });
    }catch(e){}
    if (layer._path) layer._path.style.pointerEvents = active ? "auto" : "none";
  });
}
function ensureBlinking(){
  if (alertsBlinkTimer) return;

  alertsBlinkTimer = setInterval(function(){
    alertsBlinkOn = !alertsBlinkOn;
    refreshAlertsBlink();
  }, 600);
}
function setWarningsEnabled(on){
  warningsEnabled = !!on;
  window.warningsEnabled = warningsEnabled;
if (!document.getElementById('wdl-warning-popup-styles')){
  var wps = document.createElement('style');
  wps.id = 'wdl-warning-popup-styles';
  wps.textContent = `
    .warning-popup-shell .leaflet-popup-content-wrapper{background:linear-gradient(180deg,#0d2038,#0a1829); color:#fff; border:1px solid rgba(255,255,255,.16); border-radius:18px; box-shadow:0 18px 38px rgba(0,0,0,.34);}
    .warning-popup-shell .leaflet-popup-tip{background:#0a1829;}
    .wdl-warning-summary{padding:6px 2px 2px; min-width:320px;}
    .wdl-warning-summary .ww-kicker{font:900 11px/1 Lato,Arial,sans-serif; letter-spacing:1px; color:#ffd66e; text-transform:uppercase;}
    .wdl-warning-summary .ww-title{margin-top:8px; font:900 22px/1.15 Lato,Arial,sans-serif; text-transform:uppercase;}
    .wdl-warning-summary .ww-meta{margin-top:10px; font:800 14px/1.2 Lato,Arial,sans-serif; color:#ffe9b0;}
    .wdl-warning-summary .ww-more-details{margin-top:14px; width:100%; border:1px solid rgba(255,255,255,.18); border-radius:14px; padding:12px 14px; background:linear-gradient(180deg,#1576ff,#0f56b5); color:#fff; font:900 14px/1 Lato,Arial,sans-serif; cursor:pointer; box-shadow:0 10px 18px rgba(0,0,0,.24);}
    .wdl-warning-modal{position:fixed; inset:0; z-index:100260; display:none; align-items:center; justify-content:center; background:rgba(2,8,16,.72); backdrop-filter:blur(4px);}
    .wdl-warning-modal.visible{display:flex;}
    .wdl-warning-modal-card{width:min(960px, calc(100vw - 60px)); max-height:calc(100vh - 70px); background:linear-gradient(180deg,#09192c,#0d2340); border:1px solid rgba(255,255,255,.16); border-radius:22px; color:#fff; box-shadow:0 22px 44px rgba(0,0,0,.4); overflow:hidden;}
    .wdl-warning-modal.fullscreen .wdl-warning-modal-card{width:calc(100vw - 24px); max-height:calc(100vh - 24px);}
    .wdl-warning-modal-head{display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px 18px; border-bottom:1px solid rgba(255,255,255,.08);}
    .wdl-warning-modal-title{font:900 24px/1.1 Lato,Arial,sans-serif; text-transform:uppercase;}
    .wdl-warning-modal-actions{display:flex; gap:10px;}
    .wdl-warning-modal-btn{border:1px solid rgba(255,255,255,.16); border-radius:12px; padding:10px 12px; background:#12345e; color:#fff; font:900 13px/1 Lato,Arial,sans-serif; cursor:pointer;}
    .wdl-warning-modal-body{padding:18px; overflow:auto; max-height:calc(100vh - 170px); font:800 14px/1.35 Arial,sans-serif;}
  `;
  document.head.appendChild(wps);
}
var warningDetailModal = null;
function ensureWarningDetailModal(){
  if (warningDetailModal) return warningDetailModal;
  var wrap = document.createElement('div');
  wrap.className = 'wdl-warning-modal';
  wrap.innerHTML = '<div class="wdl-warning-modal-card"><div class="wdl-warning-modal-head"><div class="wdl-warning-modal-title">Warning Details</div><div class="wdl-warning-modal-actions"><button type="button" class="wdl-warning-modal-btn" data-act="full">Full Screen</button><button type="button" class="wdl-warning-modal-btn" data-act="close">Close</button></div></div><div class="wdl-warning-modal-body"></div></div>';
  document.body.appendChild(wrap);
  wrap.addEventListener('click', function(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-act]') : null;
    var act = btn && btn.getAttribute ? btn.getAttribute('data-act') : null;
    if (ev.target === wrap || act === 'close') {
      ev.preventDefault();
      ev.stopPropagation();
      wrap.classList.remove('visible');
      wrap.classList.remove('fullscreen');
      return;
    }
    if (act === 'full') {
      ev.preventDefault();
      ev.stopPropagation();
      wrap.classList.toggle('fullscreen');
      return;
    }
  }, true);
  warningDetailModal = wrap;
  return wrap;
}
function openWarningDetailModal(title, html){
  var wrap = ensureWarningDetailModal();
  wrap.querySelector('.wdl-warning-modal-title').textContent = title || 'Warning Details';
  wrap.querySelector('.wdl-warning-modal-body').innerHTML = html || '<b>Warning</b>';
  wrap.classList.add('visible');
}
document.addEventListener('click', function(ev){
  var btn = ev.target && ev.target.closest ? ev.target.closest('.ww-more-details') : null;
  if (!btn) return;
  var popupEl = btn.closest('.leaflet-popup');
  if (!popupEl) return;
  var layerId = btn.getAttribute('data-warning-id');
  var targetLayer = null;
  try{
    alertsLayer.eachLayer(function(lyr){
      var p = (lyr.feature && lyr.feature.properties) || {};
      var id = String(p.id || p.ETN || p.etn || lyr._leaflet_id);
      if (id === String(layerId)) targetLayer = lyr;
    });
  }catch(e){}
  if (targetLayer){
    openWarningDetailModal(targetLayer.__warningSummaryTitle || 'Warning Details', targetLayer.__warningDetailHtml || '<b>Warning</b>');
  }
});
  updateAlerts();
  try{ updateProductLabel(); }catch(e){}
  try{ setTimeLabel(); }catch(e){}
}
window.setWarningsEnabled = setWarningsEnabled;

  function updateAll(){
    setTimeLabel();
    try{ window.curZ = new Date(curZ.getTime()); }catch(e){}
    // Keep jet particles in sync with the master banner clock
    if (typeof syncJetParticlesToClock === "function") syncJetParticlesToClock();
    if (radarVelocityEnabled) {
      try{ updateRadarVelocity(); }catch(e){}
    } else {
      updateRadar();
    }
    if (typeof updateGfsSnow === "function") updateGfsSnow();
    if (typeof updateEra5Global === "function") updateEra5Global();
    if (typeof updateGoes === "function") updateGoes();
    if (typeof updateLightning === "function") updateLightning();
    updateHrrrOverlay();
    updateAlerts();
    updateReportsLayer();
    if (typeof syncMetarsToMasterScrubber === "function") {
      try{ syncMetarsToMasterScrubber(); }catch(e){}
    }
    if (typeof metarVisible !== "undefined" && metarVisible && metarLayer && !map.hasLayer(metarLayer)) metarLayer.addTo(map);
    updateProductLabel();
    try{
      var allowExternalStoryTimeSync = (window.__WDL_SIMPLE_MODE__ !== true) && (window.__WDL_STORY_TIME_SYNC_ENABLED__ === true) && (window.__WDL_FREE_SCRUB__ !== true) && (window.__WDL_HTML_SCRUBBING__ !== true);
      if (allowExternalStoryTimeSync && window.WDL_SIM_CONFIG && typeof window.WDL_SIM_CONFIG.onUpdateAll === 'function'){
        window.WDL_SIM_CONFIG.onUpdateAll({ curZ: new Date(curZ.getTime()) });
      }
    }catch(simUpdateErr){}
  }

  window.updateAll = updateAll;
  window.setFreeScrubMode = function(on){
    window.__WDL_FREE_SCRUB__ = !!on;
    window.__WDL_STORY_TIME_SYNC_ENABLED__ = !window.__WDL_FREE_SCRUB__;
    try{
      if (window.__WDL_FREE_SCRUB__ === true || window.__WDL_SINGLE_CLOCK__ === true){
        var scrub = document.getElementById("cbScrubber");
        if (scrub){
          scrub.min = "0";
          scrub.max = "1000";
          scrub.step = "1";
        }
        if (window.__WDL_SIMPLE_MODE__ === true) return true;
      }
      syncScrubberToActiveProduct();
    }catch(e){}
    return true;
  };
  window.setMasterTime = function(value){
    var d = (value instanceof Date) ? new Date(value.getTime()) : new Date(value);
    if (isNaN(d)) return false;
    curZ = d;
    clampTime();
    updateAll();
    return true;
  };
  window.setStoryTimeSyncEnabled = function(on){
    window.__WDL_STORY_TIME_SYNC_ENABLED__ = !!on;
    return window.__WDL_STORY_TIME_SYNC_ENABLED__;
  };

  // ---------- Time controls ----------
  function clampTime(){
    if (curZ < startZ) curZ = new Date(startZ.getTime());
    if (curZ > endZ) curZ = new Date(endZ.getTime());
  }

  function stepActiveScrubber(delta){
    if (window.__WDL_FREE_SCRUB__ === true || window.__WDL_SINGLE_CLOCK__ === true) return false;
    var mode = getActiveScrubberMode();
    if (mode === 'radar'){
      if (stepRadarFrame(delta)) return true;
    } else if (mode === 'hrrr'){
      var idx = nearestHrrrFrameIndexForTime(curZ);
      setCurrentHrrrFrameIndex(idx + delta);
      updateAll();
      return true;
    } else if (mode === 'metars'){
      try{
        if (window.metarsModule && typeof window.metarsModule.loadMetarsAtIndex === 'function' && typeof window.metarsModule.getCurrentMetarIndex === 'function'){
          var nextIdx = (window.metarsModule.getCurrentMetarIndex()|0) + delta;
          window.metarsModule.loadMetarsAtIndex(nextIdx);
          return true;
        }
      }catch(e){}
    }
    return false;
  }
  window.stepActiveScrubber = stepActiveScrubber;

  var _back = document.getElementById('cbBackBtn') || document.getElementById('bBackBtn');
  if (_back) _back.title = "Back " + STEP_LABEL;
  if (_back) _back.onclick = function(){
    if (stepActiveScrubber(-1)) return;
    window.setMasterTime(new Date(curZ.getTime() - STEP_MS));
  };
  var _fwd = document.getElementById('cbFwdBtn') || document.getElementById('bFwdBtn');
  if (_fwd) _fwd.title = "Forward " + STEP_LABEL;
  if (_fwd) _fwd.onclick = function(){
    if (stepActiveScrubber(1)) return;
    window.setMasterTime(new Date(curZ.getTime() + STEP_MS));
  };

  // Time scrubber (drag to jump through time)
  var _scrub = document.getElementById("cbScrubber");
  if (_scrub){
    var _releaseScrubber = function(){
      scrubberIsDragging = false;
      syncScrubberToActiveProduct();
    };
    _scrub.addEventListener('pointerdown', function(){ scrubberIsDragging = true; });
    _scrub.addEventListener('pointerup', _releaseScrubber);
    _scrub.addEventListener('change', _releaseScrubber);
    _scrub.addEventListener('blur', _releaseScrubber);
    _scrub.oninput = function(){
      if (window.__WDL_HTML_SCRUBBING__ !== true) window.__WDL_HTML_SCRUBBING__ = false;
      var v = parseFloat(_scrub.value);
      if (!isFinite(v)) return;
      var max = Number(_scrub.max);
      var pct = (max > 0) ? (v / max) : 0;
      pct = Math.max(0, Math.min(1, pct));
      scrubberPendingPct = pct;
      if (scrubberRafPending) return;
      scrubberRafPending = true;
      requestAnimationFrame(function(){
        scrubberRafPending = false;
        var usePct = scrubberPendingPct;
        scrubberPendingPct = null;
        if (!isFinite(usePct)) return;
        var targetTime = new Date(startZ.getTime() + ((endZ.getTime() - startZ.getTime()) * usePct));
        try{
          var liveHrrrFrames = (hrrrFrames && hrrrFrames.length) ? hrrrFrames : ((window.__HRRR_FRAMES__ && window.__HRRR_FRAMES__.length) ? window.__HRRR_FRAMES__ : []);
          if ((hrrrTempEnabled || window.hrrrTempEnabled === true || window.hrrrProductMode === 'winds' || window.hrrrProductMode === 'cape' || window.hrrrProductMode === 'radar') && liveHrrrFrames.length){
            setCurrentHrrrFrameIndex(nearestHrrrFrameIndexForTime(targetTime));
          }
        }catch(e){}
        window.setMasterTime(targetTime);
      });
    };
  }
  var _sweepBtn = document.getElementById("sweepToggleBtn");
function syncSweepButton(){
  window.radarSweepEnabled = radarSweepEnabled;
  var btn = document.getElementById("sweepToggleBtn");
  if (btn){
    btn.textContent = radarSweepEnabled ? "LIVE Doppler ON" : "LIVE Doppler OFF";
    btn.classList.toggle("active", !!radarSweepEnabled);
  }
  var storyBtn = document.getElementById("storyDopplerBtn");
  if (storyBtn){
    storyBtn.textContent = radarSweepEnabled ? "LIVE Doppler ON" : "LIVE Doppler OFF";
    storyBtn.classList.toggle('active', !!radarSweepEnabled);
    storyBtn.classList.toggle('pulsing', !radarSweepEnabled);
  }
}
  if (_sweepBtn){
    _sweepBtn.onclick = function(){
      window.toggleSweep();
    };
    syncSweepButton();
  }

  window.setSweepEnabled = function(on){
    var target = !!on;
    radarSweepEnabled = target;
    try{ if (typeof window.setObsRadarEnabled === 'function') window.setObsRadarEnabled(true); }catch(e){}
    syncSweepButton();
    if (!target){
      try{ if (typeof hideRadarSweepCanvas === 'function') hideRadarSweepCanvas(); }catch(e){}
      try{ updateRadar(); }catch(e){}
      return radarSweepEnabled;
    }
    try{ updateRadar(); }catch(e){}
    setTimeout(function(){
      if (!radarSweepEnabled) return;
      try{ updateRadar(); }catch(e){}
      try{ if (typeof renderRadarSweepCurrentState === 'function') renderRadarSweepCurrentState(); }catch(e){}
    }, 120);
    setTimeout(function(){
      if (!radarSweepEnabled) return;
      try{ updateRadar(); }catch(e){}
      try{ if (typeof renderRadarSweepCurrentState === 'function') renderRadarSweepCurrentState(); }catch(e){}
    }, 360);
    return radarSweepEnabled;
  };

  window.toggleSweep = function(){
    return window.setSweepEnabled(!radarSweepEnabled);
  };

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
  ensureAlertsLoaded();
  setTimeLabel();
  try{ window.curZ = new Date(curZ.getTime()); }catch(e){}
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

    map.on("zoomend", refreshBoundaryVisibility);
    map.on("moveend", refreshBoundaryVisibility);

    console.log("✅ Boundary overlay system initialized");
    return true;
  }

  function waitForBoundaryInit(){
    if (!initBoundaries()) setTimeout(waitForBoundaryInit, 200);
  }
  waitForBoundaryInit();
})();


/* ---- extracted inline script 10 ---- */
document.addEventListener('DOMContentLoaded', function(){
  var dock = document.getElementById('investigationDock');
  var body = document.getElementById('investigationBody');
  if (!dock || !body){
    console.debug('Dock not found; skipping investigation dock init');
    return;
  }

  var tabs = Array.prototype.slice.call(dock.querySelectorAll('.inv-tab'));
  var panes = Array.prototype.slice.call(dock.querySelectorAll('.inv-pane'));
  var chips = Array.prototype.slice.call(dock.querySelectorAll('.inv-chip[data-action]'));
  var groupToggles = Array.prototype.slice.call(dock.querySelectorAll('.inv-group-toggle[data-submenu-toggle]'));
  var groups = Array.prototype.slice.call(dock.querySelectorAll('.inv-group'));

  function showPane(name){
    tabs.forEach(function(btn){ btn.classList.toggle('active', btn.getAttribute('data-tab') === name); });
    panes.forEach(function(p){ p.classList.toggle('active', p.getAttribute('data-pane') === name); });
  }

  function expandDock(){ body.classList.remove('collapsed'); }
  function collapseDock(){ body.classList.add('collapsed'); }
  function closeAllGroups(){
    groups.forEach(function(group){ group.classList.remove('open'); });
  }
  function closeGroupsOutsidePane(name){
    groups.forEach(function(group){
      var pane = group.closest('.inv-pane');
      var keep = pane && pane.getAttribute('data-pane') === name;
      if (!keep) group.classList.remove('open');
    });
  }

  tabs.forEach(function(btn){
    btn.addEventListener('click', function(ev){
      ev.preventDefault();
      var tabName = btn.getAttribute('data-tab');
      showPane(tabName);
      closeGroupsOutsidePane(tabName);
      expandDock();
    });
  });

  groupToggles.forEach(function(toggle){
    toggle.addEventListener('click', function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      var group = toggle.closest('.inv-group');
      if (!group) return;
      var pane = group.closest('.inv-pane');
      var paneName = pane ? pane.getAttribute('data-pane') : null;

      groups.forEach(function(other){
        if (other === group) return;
        var otherPane = other.closest('.inv-pane');
        var samePane = (!paneName && !otherPane) || (otherPane && otherPane.getAttribute('data-pane') === paneName);
        if (samePane) other.classList.remove('open');
      });

      group.classList.toggle('open');
      expandDock();
    });
  });

  function refreshDockStates(){
    var termsOpen = document.body.classList.contains('ssg-open');
    dock.querySelectorAll('[data-action="terms"]').forEach(function(el){ el.classList.toggle('active', termsOpen); });
    dock.querySelectorAll('[data-action="spc"]').forEach(function(el){ el.classList.toggle('active', !!window.spcDay1Enabled); });
    dock.querySelectorAll('[data-action="warnings"]').forEach(function(el){ el.classList.toggle('active', !!window.warningsEnabled); });
    dock.querySelectorAll('[data-action="reports-toggle"]').forEach(function(el){ el.classList.toggle('active', !!window.reportsEnabled); });
    dock.querySelectorAll('[data-report-filter]').forEach(function(el){ el.classList.toggle('active', !!window.reportsEnabled && el.getAttribute('data-report-filter') === (window.reportsFilter || 'all')); });
    dock.querySelectorAll('[data-action="sweep"]').forEach(function(el){ el.classList.toggle('active', !!window.radarSweepEnabled); });
    dock.querySelectorAll('[data-action="metars"]').forEach(function(el){ el.classList.toggle('active', !!window.metarVisible); });
    dock.querySelectorAll('[data-action="hrrr-temp"]').forEach(function(el){ el.classList.toggle('active', !!window.hrrrTempEnabled && window.hrrrProductMode === 'temp'); });
    dock.querySelectorAll('[data-action="hrrr-radar"]').forEach(function(el){ el.classList.toggle('active', !!window.hrrrTempEnabled && window.hrrrProductMode === 'radar'); });
    dock.querySelectorAll('[data-action="hrrr-winds"]').forEach(function(el){ el.classList.toggle('active', !!window.hrrrTempEnabled && window.hrrrProductMode === 'winds'); });
    dock.querySelectorAll('[data-action="radar"]').forEach(function(el){ el.classList.toggle('active', !!window.obsRadarEnabled); });
    dock.querySelectorAll('[data-action="radar-velocity-test"]').forEach(function(el){ el.classList.toggle('active', !!window.radarVelocityEnabled); });
    dock.querySelectorAll('[data-action="satellite"]').forEach(function(el){ el.classList.toggle('active', !!window.goesEnabled); });
    dock.querySelectorAll('[data-action="jet-500"]').forEach(function(el){ el.classList.toggle('active', !!window.jet500Enabled); });
    dock.querySelectorAll('[data-action="lightning"]').forEach(function(el){ el.classList.toggle('active', !!window.lightningEnabled); });
    dock.querySelectorAll('[data-action="lightning-sound"]').forEach(function(el){ el.classList.toggle('active', !!window.lightningSoundEnabled); });
    dock.querySelectorAll('[data-action="states"]').forEach(function(el){ el.classList.toggle('active', !!window.statesEnabled); });
    dock.querySelectorAll('[data-action="counties"]').forEach(function(el){ el.classList.toggle('active', !!window.countiesEnabled); });
    dock.querySelectorAll('[data-action="roads"]').forEach(function(el){ el.classList.toggle('active', !!window.roadsEnabled); });
  }

  window.syncDockUi = refreshDockStates;

  function clickIf(id){
    var el = document.getElementById(id);
    if (el) el.click();
  }

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
      if (!window.obsRadarEnabled && typeof window.setRadarEnabled === 'function') {
        await window.setRadarEnabled(true);
      }
      clickIf('sweepToggleBtn');
      return;
    }
    if (action === 'radar'){
      if (typeof window.setRadarEnabled === 'function') {
        if (window.radarVelocityEnabled && typeof window.setRadarVelocityEnabled === 'function') await window.setRadarVelocityEnabled(false);
        await window.setRadarEnabled(!window.obsRadarEnabled);
      }
      return;
    }
    if (action === 'radar-velocity-test'){
      if (typeof window.setRadarVelocityEnabled === 'function') {
        var nextVelOn = !window.radarVelocityEnabled;
        await window.setRadarVelocityEnabled(nextVelOn);
      }
      return;
    }
    if (action === 'satellite'){
      if (typeof window.setSatelliteEnabled === 'function') {
        await window.setSatelliteEnabled(!window.goesEnabled);
      }
      return;
    }
    if (action === 'jet-500'){
      if (typeof window.setJet500Enabled === 'function') {
        await window.setJet500Enabled(!window.jet500Enabled);
      }
      return;
    }
    if (action === 'lightning'){
      if (typeof window.setLightningEnabled === 'function') {
        await window.setLightningEnabled(!window.lightningEnabled);
      }
      return;
    }
    if (action === 'lightning-sound'){
      if (typeof window.setLightningSoundEnabled === 'function') {
        window.setLightningSoundEnabled(!window.lightningSoundEnabled);
      }
      return;
    }
    if (action === 'metars'){
      if (typeof window.setMetarsEnabled === 'function') {
        await window.setMetarsEnabled(!window.metarVisible);
      }
      return;
    }
    if (action === 'spc'){
      if (typeof window.setSpcDay1Enabled === 'function') {
        await window.setSpcDay1Enabled(!window.spcDay1Enabled);
      }
      return;
    }
    if (action === 'warnings'){
      if (typeof window.setWarningsEnabled === 'function') {
        window.setWarningsEnabled(!window.warningsEnabled);
      }
      return;
    }
    if (action === 'reports-toggle'){
      if (typeof window.toggleReports === 'function') {
        await window.toggleReports();
      }
      return;
    }
    if (action === 'hrrr-temp'){
      if (typeof window.setHrrrTempEnabled === 'function') {
        var nextOn = !(window.hrrrTempEnabled && window.hrrrProductMode === 'temp');
        await window.setHrrrTempEnabled(nextOn);
      }
      return;
    }
    if (action === 'hrrr-radar'){
      if (typeof window.setHrrrRadarEnabled === 'function') {
        var nextRadarOn = !(window.hrrrTempEnabled && window.hrrrProductMode === 'radar');
        await window.setHrrrRadarEnabled(nextRadarOn);
      }
      return;
    }
    if (action === 'hrrr-winds'){
      if (typeof window.setHrrrWindsEnabled === 'function') {
        var nextWindsOn = !(window.hrrrTempEnabled && window.hrrrProductMode === 'winds');
        await window.setHrrrWindsEnabled(nextWindsOn);
      }
      return;
    }
    if (action === 'roads'){
      if (typeof window.setRoadsEnabled === 'function') {
        await window.setRoadsEnabled(!window.roadsEnabled);
      }
      return;
    }
    if (action === 'states'){
      if (typeof window.setStatesEnabled === 'function') {
        await window.setStatesEnabled(!window.statesEnabled);
      }
      return;
    }
    if (action === 'counties'){
      if (typeof window.setCountiesEnabled === 'function') {
        await window.setCountiesEnabled(!window.countiesEnabled);
      }
      return;
    }
  }

  chips.forEach(function(chip){
    chip.addEventListener('click', async function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      try {
        await activateAction(chip.getAttribute('data-action'));
      } catch(err) {
        console.error(err);
      }
      closeAllGroups();
      refreshDockStates();
      collapseDock();
    });
  });

  document.addEventListener('click', function(ev){
    if (!dock.contains(ev.target)) closeAllGroups();
  });

  var obs = new MutationObserver(refreshDockStates);
  try{ obs.observe(document.body, { attributes:true, attributeFilter:['class'] }); }catch(e){}
  collapseDock();
  refreshDockStates();
  console.log('Dock wired correctly ✅');
});


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
      return !!(window.obsRadarEnabled || window.metarVisible || window.hrrrTempEnabled || window.spcDay1Enabled || window.lightningEnabled || (window.storyOverlayLayer && map && map.hasLayer && map.hasLayer(window.storyOverlayLayer)));
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
    wrapAsync('setHrrrRadarEnabled');
    wrapAsync('setHrrrWindsEnabled');
    wrapAsync('setSpcDay1Enabled');

    leafletMap.on('zoomend', refreshAutoBoundaries);

    setTimeout(refreshAutoBoundaries, 400);
    console.log('✅ Auto-boundary mode enabled');
  });
})();

window.clearStormTrack = function(){ try{ clearStormTrackGraphics(); }catch(e){} };
window.clearMeasure = function(){ try{ clearMeasureGraphics(); }catch(e){} };
window.clearDrawings = function(){ try{ clearDrawings(); }catch(e){} };
try{ window.toggleSweep = toggleSweep; }catch(e){}
