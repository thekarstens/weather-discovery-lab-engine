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
    var f = getManifestFrameAtIndex(currentRadarFrameIndex);
    var rawUtc = getManifestFrameUtc(f);
    if (rawUtc) curZ = new Date(rawUtc);
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
var jetLoadPromise = null;
var JET_DEFAULT_MANIFEST = 'jet/jet_manifest.json';
window.jet500Enabled = jet500Enabled;
window.jetVelocityLayer = jetVelocityLayer;

function getJetManifestUrl(){
  try{
    var j = (CFG && (CFG.jet || CFG.upperAir || CFG.upperair)) ? (CFG.jet || CFG.upperAir || CFG.upperair) : {};
    var u = j.manifest || j.manifestFile || j.url || j.file || '';
    if (u) return _isAbsUrl(u) ? u : _joinUrl(DATA_BASE, u);
  }catch(e){}
  return _joinUrl(DATA_BASE, JET_DEFAULT_MANIFEST);
}

function clearJetVelocityLayer(){
  try{ if (jetVelocityLayer && map && map.hasLayer && map.hasLayer(jetVelocityLayer)) map.removeLayer(jetVelocityLayer); }catch(e){}
  jetVelocityLayer = null;
  currentJetVelocityData = null;
  window.jetVelocityLayer = null;
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
      var b = raw && raw.bounds;
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
  try{
    await loadJetManifestIfNeeded();
    var frame = getNearestJetFrame(curZ);
    if (!frame) return;
    var url = jetFrameUrl(frame);
    var res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
    if (!res.ok) throw new Error('Jet frame HTTP ' + res.status + ': ' + url);
    var data = await res.json();
    clearJetVelocityLayer();
    currentJetVelocityData = data;
    jetVelocityLayer = L.velocityLayer({
      data: data,
      displayValues: false,
      displayOptions: {
        velocityType: '500mb Winds',
        position: 'bottomleft',
        emptyString: 'No data'
      },
      velocityScale: 0.006,
      particleAge: 90,
      lineWidth: 3,
      frameRate: 20,
      maxVelocity: 80,
      opacity: 0.82,
      colorScale: [
        '#00ffff',
        '#00ff00',
        '#ffff00',
        '#ff9900',
        '#ff0000',
        '#800000'
      ]
    });
    jetVelocityLayer.addTo(map);
    window.jetVelocityLayer = jetVelocityLayer;
    if (jetBounds && Array.isArray(jetBounds) && jetBounds.length === 2){
      try{ map.fitBounds(L.latLngBounds(jetBounds), { padding:[20,20] }); }catch(e){}
    }
    setStatus('500 mb Winds: ' + (frame.time || frame.label || url));
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
    setStatus('500 mb Winds off');
  } else {
    await updateJetParticles();
    setStatus('500 mb Winds on');
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
    p.type || p.typetext || p.category || p.event || p.report_type || p.phenomena || ""
  ).toLowerCase();

  if (raw.indexOf('tornado') !== -1 || raw === 'tor') return 'tornado';
  if (raw.indexOf('hail') !== -1) return 'hail';
  if (
    raw.indexOf('wind') !== -1 ||
    raw.indexOf('tstm') !== -1 ||
    raw.indexOf('thunderstorm') !== -1 ||
    raw.indexOf('severe thunderstorm') !== -1 ||
    raw.indexOf('gust') !== -1
  ) return 'wind';
  if (
    raw.indexOf('flood') !== -1 ||
    raw.indexOf('flash') !== -1
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
      var p = feature.properties || {};
      var t = normalizeReportType(feature);
      return L.circleMarker(latlng, {
        radius: reportRadius(t, p),
        fillColor: reportColor(t),
        color: '#0b1c2d',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.92
      });
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


  // ---------- Lightning ----------
  var lightningEnabled = false;
  var lightningManifest = null;
  var lightningEvents = [];
  var lightningFreshLayer = null;
  var lightningRecentLayer = null;
  var lightningLoadPromise = null;
  var lightningCounterControl = null;
  var lightningStylesInjected = false;
  var lightningFreshWindowMs = 30 * 1000;
  var lightningRecentWindowMs = 2 * 60 * 1000;
  var lightningCounterWindowMs = 5 * 60 * 1000;
  var lightningJumpWindowMs = 5 * 60 * 1000;
  var lightningSoundEnabled = false;
  var lightningLastSoundAt = 0;
  var lightningAudioContext = null;
  var lightningLastRenderedStamp = '';
  var lightningFreshMarkerIndex = Object.create(null);
  var lightningRecentMarkerIndex = Object.create(null);
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
        position:relative; width:20px; height:20px; pointer-events:none;
        transform: translate(-2px,-2px) scale(var(--bolt-scale,1));
        filter: drop-shadow(0 0 calc(4px + 6px * var(--glow,1)) rgba(255,240,120,.95))
                drop-shadow(0 0 calc(8px + 10px * var(--glow,1)) rgba(130,230,255,.75));
        animation: wdlLightningPulse var(--flash-ms,650ms) ease-out forwards;
      }
      .wdl-lightning-icon .wdl-lightning-bolt:before{
        content:'⚡';
        position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
        font: 900 20px/1 Arial,sans-serif; color: var(--bolt-color,#fff8c6);
        text-shadow: 0 0 2px rgba(255,255,255,.95), 0 0 10px rgba(255,240,120,.95), 0 0 20px rgba(119,230,255,.85);
      }
      .wdl-lightning-recent{
        box-shadow: 0 0 10px rgba(255,235,120,.65);
      }
      .lightning-counter{
        background: linear-gradient(180deg, rgba(3,13,32,.90), rgba(10,22,48,.82));
        color:#f7fbff; padding:8px 10px; border-radius:12px; min-width:140px;
        border:1px solid rgba(118,224,255,.35);
        box-shadow: 0 0 12px rgba(90,209,255,.20), inset 0 0 18px rgba(255,255,255,.05);
        font: 800 12px/1.25 Lato, Arial, sans-serif;
        letter-spacing:.02em;
      }
      .lightning-counter .lc-title{font:900 13px/1 Lato, Arial, sans-serif; margin-bottom:5px; color:#fff68d; text-transform:uppercase;}
      .lightning-counter .lc-row{display:flex; justify-content:space-between; gap:10px; margin-top:2px;}
      .lightning-counter .lc-jump{margin-top:6px; font:900 11px/1.1 Lato, Arial, sans-serif; color:#8cf7ff; text-shadow:0 0 8px rgba(140,247,255,.45);}
      @keyframes wdlLightningPulse{
        0%{opacity:0; transform:translate(-2px,-2px) scale(calc(var(--bolt-scale,1) * 0.65));}
        10%{opacity:1;}
        45%{opacity:1; transform:translate(-2px,-2px) scale(calc(var(--bolt-scale,1) * 1.12));}
        100%{opacity:.18; transform:translate(-2px,-2px) scale(var(--bolt-scale,1));}
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
    var flashMs = Math.max(350, Math.min(950, Number((lightningManifest && lightningManifest.style && lightningManifest.style.flashMs) || 650)));
    return L.divIcon({
      className: 'wdl-lightning-icon',
      html: '<div class="wdl-lightning-bolt" style="--glow:' + strength.toFixed(2) + ';--bolt-scale:' + (0.92 + strength * 0.22).toFixed(2) + ';--flash-ms:' + flashMs + 'ms"></div>',
      iconSize: [22,22],
      iconAnchor: [11,11],
      popupAnchor: [0,-10]
    });
  }

  function getLightningRecentStyle(d){
    var strength = lightningStrengthFor(d);
    var op = Math.max(0.14, Math.min(0.78, (productOpacity.lightning || 0.9) * (0.28 + strength * 0.22)));
    return {
      radius: Math.max(2, Math.min(6, 2.2 + strength * 2.2)),
      color: '#fff3a3',
      fillColor: '#fff06a',
      weight: 1,
      opacity: Math.max(0.25, op),
      fillOpacity: op,
      className: 'wdl-lightning-recent'
    };
  }

  function clearLightningLayers(){
    try{ if (lightningFreshLayer && map.hasLayer(lightningFreshLayer)) map.removeLayer(lightningFreshLayer); }catch(e){}
    try{ if (lightningRecentLayer && map.hasLayer(lightningRecentLayer)) map.removeLayer(lightningRecentLayer); }catch(e){}
    lightningFreshLayer = null;
    lightningRecentLayer = null;
    lightningFreshMarkerIndex = Object.create(null);
    lightningRecentMarkerIndex = Object.create(null);
  }

  function ensureLightningCounter(){
    if (lightningCounterControl) return;
    lightningCounterControl = L.control({ position:'bottomleft' });
    lightningCounterControl.onAdd = function(){
      var div = L.DomUtil.create('div', 'lightning-counter');
      div.innerHTML = '';
      return div;
    };
    lightningCounterControl.addTo(map);
  }

  function hideLightningCounter(){
    try{
      if (lightningCounterControl && lightningCounterControl.getContainer){
        var c = lightningCounterControl.getContainer();
        if (c) c.style.display = 'none';
      }
    }catch(e){}
  }

  function renderLightningCounter(nowCount, recentCount, last5Count, totalCount, jumpInfo){
    ensureLightningCounter();
    var div = lightningCounterControl.getContainer();
    if (!div) return;
    div.style.display = '';
    div.innerHTML =
      '<div class="lc-title">⚡ Lightning</div>' +
      '<div class="lc-row"><span>Now</span><span>' + nowCount + '</span></div>' +
      '<div class="lc-row"><span>Recent</span><span>' + recentCount + '</span></div>' +
      '<div class="lc-row"><span>Last 5 min</span><span>' + last5Count + '</span></div>' +
      '<div class="lc-row"><span>Total</span><span>' + totalCount + '</span></div>' +
      (jumpInfo && jumpInfo.active ? '<div class="lc-jump">JUMP +' + jumpInfo.delta + ' vs prev 5 min</div>' : '');
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

  function playLightningSound(count){
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
    fresh.forEach(function(d){
      seen[d.id] = true;
      var marker = lightningFreshMarkerIndex[d.id];
      if (!marker){
        marker = L.marker([d.lat, d.lon], { icon:createLightningIcon(d), keyboard:false, interactive:true });
        marker.bindPopup(buildLightningPopup(d), { className:'hrrr-popup' });
        lightningFreshMarkerIndex[d.id] = marker;
        lightningFreshLayer.addLayer(marker);
      } else {
        marker.setLatLng([d.lat, d.lon]);
        marker.setIcon(createLightningIcon(d));
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
        lightningFreshWindowMs = Math.max(10 * 1000, Math.min(60 * 1000, Number(style.flashWindowMs || style.freshWindowMs || 30 * 1000)));
        lightningRecentWindowMs = Math.max(30 * 1000, Math.min(10 * 60 * 1000, Number(style.recentMinutes || 2) * 60 * 1000));
        lightningCounterWindowMs = Math.max(60 * 1000, Math.min(15 * 60 * 1000, Number(style.counterWindowMinutes || 5) * 60 * 1000));
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
      return;
    }
    if (!lightningEvents.length) return;
    injectLightningStyles();
    var nowMs = curZ.getTime();
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
    var stamp = String(nowMs) + '|' + fresh.map(function(d){ return d.id; }).join(',');
    var isNewFrame = stamp !== lightningLastRenderedStamp;
    lightningLastRenderedStamp = stamp;
    upsertLightningFresh(fresh);
    upsertLightningRecent(recent);
    setLightningOpacity(productOpacity.lightning || 0.9);
    var jumpInfo = evaluateLightningJump(nowMs);
    renderLightningCounter(fresh.length, recent.length, last5, total, jumpInfo);
    if (isNewFrame && fresh.length) playLightningSound(fresh.length);
  }

  async function setLightningEnabled(on){
    lightningEnabled = !!on;
    window.lightningEnabled = lightningEnabled;
    if (lightningEnabled){
      injectLightningStyles();
      await loadLightningManifest();
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


  // ---------- GOES / Satellite ----------
  var goesEnabled = false;
  var goesOverlay = null;
  var goesManifest = null;
  var goesFrames = [];
  var goesBounds = null;
  var currentGoesFrameIndex = 0;
  var goesLoadPromise = null;
  var goesLoadToken = 0;
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
      if (goesOverlay && map && map.hasLayer && map.hasLayer(goesOverlay)) map.removeLayer(goesOverlay);
      return;
    }
    var kickoff = goesManifest ? Promise.resolve(goesManifest) : loadGoesManifest();
    kickoff.then(function(){
      var frame = fromAnim ? (goesFrames[Math.max(0, Math.min(goesFrames.length - 1, currentGoesFrameIndex|0))] || null) : currentGoesFrame();
      if (!frame) return;
      var url = goesFrameUrl(frame);
      var bounds = GOES_BOUNDS || goesBounds || RADAR_BOUNDS;
      var token = ++goesLoadToken;
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function(){
        if (token !== goesLoadToken) return;
        if (goesOverlay && map.hasLayer(goesOverlay)) map.removeLayer(goesOverlay);
        goesOverlay = L.imageOverlay(url, bounds, { opacity: productOpacity.goes || 0.70, interactive:false });
        window.goesOverlay = goesOverlay;
        goesOverlay.addTo(map);
        applyActiveOpacity();
        setStatus('Satellite: ' + (frame.label || frame.time || url));
        try{ updateProductLabel(); }catch(e){}
      };
      img.onerror = function(){ if (token === goesLoadToken) setStatus('Satellite missing: ' + url); };
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
    var hh = base.getHours();
    var mm = String(base.getMinutes()).padStart(2, "0");
    var ap = hh >= 12 ? "PM" : "AM";
    var h12 = hh % 12; if (h12 === 0) h12 = 12;
    return h12 + ":" + mm + " " + ap;
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
    var frac = 0.66; // forward along track, more meteorologist-style
    return L.latLng(
      startLL.lat + (endLL.lat - startLL.lat) * frac,
      startLL.lng + (endLL.lng - startLL.lng) * frac
    );
  }

  function placeStormTrackSpeedBubble(startLL, endLL, mph){
    var ll = getTrackSpeedLatLng(startLL, endLL);
    if (!ll || !isFinite(mph)) return;
    var html = '<div class="storm-speed-box"><div class="storm-speed-label">STORM SPEED</div><div class="storm-speed-value">' +
      Math.max(1, Math.round(mph)) + ' mph</div></div>';

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

    if (stormTrackSpeedBox) stormTrackSpeedBox.classList.remove('open');
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
      if (stormTrackArrivalBox) stormTrackArrivalBox.classList.add("open");
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
    if (stormTrackArrivalBox) stormTrackArrivalBox.classList.add("open");
  }

  function startTrackDrag(e){
    if (!document.body.classList.contains("track-active")) return;
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
    if (!trackDragging) return;
    trackDragging = false;
    if (e && e.latlng) trackCurrentLatLng = e.latlng;
    if (!trackStartLatLng || !trackCurrentLatLng) return;
    drawTrackPreview(trackStartLatLng, trackCurrentLatLng);
    buildStormArrivalTable(trackStartLatLng, trackCurrentLatLng);
  }

  if (stormTrackCloseBtn) stormTrackCloseBtn.onclick = function(){
    if (stormTrackArrivalBox) stormTrackArrivalBox.classList.remove("open");
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
  map.on("mousedown", startTrackDrag);
  map.on("mousemove", moveTrackDrag);
  map.on("mouseup", endTrackDrag);

  // ----- Probe click handler (HRRR temp nearest point) -----
  function handleProbeClick(e){
    if (!e || !e.latlng) return;

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

    // Require active HRRR product with points
    try{
      if (!(typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer) && Array.isArray(hrrrPoints) && hrrrPoints.length)){
        L.popup({ closeButton:true, className:"hrrr-popup" })
          .setLatLng(e.latlng)
          .setContent("<div style='font:900 16px/1.1 Arial,sans-serif'>Probe</div><div style='font:900 16px/1.1 Arial,sans-serif'>Turn on <b>Future Temperatures</b>, <b>Future Wind Gusts</b>, <b>CAPE</b>, or <b>500 mb Winds</b>.</div>")
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
  }

if (toolMeasureBtn) toolMeasureBtn.onclick = function(){
    var on = !document.body.classList.contains("measure-active");
    setMeasureMode(on);
    if (on) setDrawMode(false);
  };

  if (toolProbeBtn) toolProbeBtn.onclick = function(){
    // Allow probing for either HRRR temps or active 500 mb winds.
    try{
      var canProbeHrrr = !!(map && typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer));
      var canProbeJet = !!(jet500Enabled && currentJetVelocityData);
      if (!(canProbeHrrr || canProbeJet)){
        L.popup({ closeButton:true, className:"hrrr-popup" })
          .setLatLng(map.getCenter())
          .setContent("<div style='font:900 16px/1.1 Arial,sans-serif'>Probe</div><div style='font:900 18px/1.1 Arial,sans-serif'>Turn on <b>Future Temperatures</b>, <b>Future Wind Gusts</b>, or <b>500 mb Winds</b> to probe.</div>")
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


  // ---------- Story (Google Sheet / CSV) ----------
  var STORY_CFG = (CFG && CFG.storyboard) ? CFG.storyboard : {};
  var STORYBOARD_OVERRIDE = (_qs("story") || "").trim();
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
  window.__WDL_STORYBOARD_JSON__ = STORYBOARD_JSON;
  window.__WDL_STORYBOARD_CSV__ = STORYBOARD_CSV;

  var storyPanel = document.getElementById("storyPanel");
  var storyTitleEl = document.getElementById("storyTitle");
  var storyBodyEl  = document.getElementById("storyBody");
  var storyStepEl  = document.getElementById("storyStep");
  var storyStationChipEl = document.getElementById("storyStationChip");
  var storyShellKickerEl = document.getElementById("storyShellKicker");

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

    var wantsSpc = _has(layers, ['spc_outlook','spc_day1','day1_outlook']) ||
      productName.indexOf('spc') !== -1 || productName.indexOf('outlook') !== -1;

    var wantsRadar = _has(layers, ['radar','radar_reflectivity','obs_radar','reflectivity','live_doppler']) ||
      productName.indexOf('radar') !== -1 || productName.indexOf('doppler') !== -1;

    var wantsLiveDoppler = _has(layers, ['live_doppler','doppler']) ||
      productName.indexOf('doppler') !== -1;

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

    var wantsJet = _has(layers, ['jet','jet500','500mb','500mb_winds']) ||
      productName.indexOf('jet') !== -1 || productName.indexOf('500mb') !== -1;

    try {
      if (typeof window.setSpcDay1Enabled === 'function') await window.setSpcDay1Enabled(wantsSpc);
    } catch (e) { console.warn('SPC step apply failed', e); }

    try {
      if (typeof window.setObsRadarEnabled === 'function') await window.setObsRadarEnabled(wantsRadar);
    } catch (e) { console.warn('Observed radar step apply failed', e); }

    try {
      if (typeof window.setRadarEnabled === 'function') await window.setRadarEnabled(wantsRadar);
    } catch (e) { console.warn('Radar step apply failed', e); }

    try {
      if (typeof window.setWarningsEnabled === 'function') window.setWarningsEnabled(wantsWarnings);
    } catch (e) { console.warn('Warnings step apply failed', e); }

    try {
      if (typeof window.setReportsEnabled === 'function') await window.setReportsEnabled(wantsReports);
    } catch (e) { console.warn('Reports step apply failed', e); }

    try {
      if (typeof window.setLightningEnabled === 'function') await window.setLightningEnabled(wantsLightning);
    } catch (e) { console.warn('Lightning step apply failed', e); }

    try {
      if (typeof window.setSatelliteEnabled === 'function') await window.setSatelliteEnabled(wantsSatellite);
    } catch (e) { console.warn('Satellite step apply failed', e); }

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
          stepLabel: item.stepLabel || String(storyIndex + 1),
          stepKicker: item.stepKicker || item.label || ""
        }
      }));
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
    if (i < 0) i = 0;
    if (i >= storyItems.length) i = storyItems.length - 1;
    storyIndex = i;

    var item = storyItems[storyIndex];
    storyTitleEl.textContent = item.title || "Storm Story";
    if (storyStationChipEl) storyStationChipEl.textContent = String(item.stepLabel || (storyIndex + 1)).replace(/^\D+/g, "").trim() || String(storyIndex + 1);
    if (storyShellKickerEl) storyShellKickerEl.textContent = item.stepKicker || item.label || "Lesson Flow";
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
              "<img src='" + img + "' alt='Story image' style='display:block;width:100%;max-width:100%;height:auto;max-height:190px;object-fit:contain;border-radius:10px;margin:0 auto;box-shadow:0 6px 18px rgba(0,0,0,.18);'>";
      if (item.imageCredit) {
        html += "<div class='story-credit' style='margin-top:6px;font:700 11px/1.3 Arial,sans-serif;opacity:.78'>Credit: " + escapeHtml(item.imageCredit) + "</div>";
      }
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
      pause: !!interaction.pause,
      allowPlay: interaction.allowPlay !== false,
      allowExplore: interaction.allowExplore !== false,
      ui: (r && r.ui && typeof r.ui === "object") ? r.ui : {},
      interaction: interaction,
      stepTheme: (r.ui && r.ui.stepTheme) || ((scene.product || "").toLowerCase().indexOf("doppler") !== -1 ? "cyan" : ((scene.product || "").toLowerCase().indexOf("spc") !== -1 ? "blue" : (Array.isArray(scene.layers) && scene.layers.indexOf("radar") !== -1 ? "cyan" : "orange"))),
      stepLabel: (r.ui && r.ui.stepLabel) || "",
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
    var popup = p.popupHtml || p.bulletinText || p.text || "<b>Warning</b>";
    var wrapped = '<div style="width:520px; max-width:520px; max-height:260px; overflow-y:auto; overflow-x:hidden; font:800 13px/1.35 Arial,sans-serif; padding-right:6px; box-sizing:border-box;">' + popup + '</div>';
    layer.bindPopup(wrapped, {
      maxWidth: 560,
      minWidth: 560,
      autoPan: true,
      keepInView: true,
      className: "warning-popup-shell"
    });
  }
});

var alertsGeoJson = null;
var alertsLoadPromise = null;
var alertsBlinkOn = true;
var alertsBlinkTimer = null;
var warningsEnabled = false;
window.warningsEnabled = warningsEnabled;
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
    var f = hrrrFrames[currentHrrrFrameIndex];
    var rawUtc = f ? (f.time || f.utc || f.valid || null) : null;
    if (rawUtc) curZ = new Date(rawUtc);
  }

  function getActiveScrubberMode(){
    var liveHrrrFrames = (hrrrFrames && hrrrFrames.length) ? hrrrFrames : ((window.__HRRR_FRAMES__ && window.__HRRR_FRAMES__.length) ? window.__HRRR_FRAMES__ : []);
    if ((hrrrTempEnabled || window.hrrrTempEnabled === true) && liveHrrrFrames.length) return 'hrrr';
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
      var mode = getActiveScrubberMode();
      scrub.min = "0";
      scrub.step = "1";
      if (mode === 'hrrr'){
        var liveHrrrFrames = (hrrrFrames && hrrrFrames.length) ? hrrrFrames : ((window.__HRRR_FRAMES__ && window.__HRRR_FRAMES__.length) ? window.__HRRR_FRAMES__ : []);
        scrub.max = String(Math.max(0, liveHrrrFrames.length - 1));
        scrub.value = String(Math.max(0, Math.min(Math.max(0, liveHrrrFrames.length - 1), currentHrrrFrameIndex|0)));
      } else if (mode === 'metars'){
        var mt = (window.metarsModule && typeof window.metarsModule.getTimeline === 'function') ? (window.metarsModule.getTimeline() || []) : [];
        var mi = (window.metarsModule && typeof window.metarsModule.getCurrentMetarIndex === 'function') ? (window.metarsModule.getCurrentMetarIndex()|0) : 0;
        scrub.max = String(Math.max(0, mt.length - 1));
        scrub.value = String(Math.max(0, Math.min(Math.max(0, mt.length - 1), mi)));
      } else if (mode === 'radar'){
        var radarPool = getRadarFramePool();
        scrub.max = String(Math.max(0, radarPool.length - 1));
        scrub.value = String(Math.max(0, Math.min(Number(scrub.max||0), currentRadarFrameIndex)));
      } else {
        var idx = Math.round((curZ.getTime() - startZ.getTime()) / (STEP_MS));
        if (idx < 0) idx = 0;
        var max = Math.round((endZ.getTime() - startZ.getTime()) / (STEP_MS));
        scrub.max = String(max);
        scrub.value = String(idx);
      }
    }catch(e){}
  }

  window.getActiveScrubberMode = getActiveScrubberMode;
  window.stepRadarFrame = stepRadarFrame;
  window.syncScrubberToActiveProduct = syncScrubberToActiveProduct;
  window.setCurrentRadarFrameIndex = setCurrentRadarFrameIndex;
  window.getRadarFramePool = getRadarFramePool;
  window.setRadarStepLimit = setRadarStepLimit;

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

  function getSpcDay1Url(){
    try {
      if (CFG && Array.isArray(CFG.overlays)) {
        for (var i=0;i<CFG.overlays.length;i++){
          var o = CFG.overlays[i] || {};
          var nm = String(o.name || '').toLowerCase();
          if (nm.indexOf('day 1') !== -1 || nm.indexOf('spc') !== -1 || nm.indexOf('outlook') !== -1){
            var u = o.url || o.file;
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

  function getSpcTextUrlForProduct(product, detailsFile){
    if (detailsFile) return _isAbsUrl(detailsFile) ? detailsFile : _joinUrl(DATA_BASE, detailsFile);
    var p = String(product || '').toLowerCase();
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
        var data = await res.json();
        data.__url = url;
        return data;
      }catch(err){
        lastErr = err;
      }
    }
    throw lastErr || new Error('SPC text unavailable');
  }


  async function openSpcInfoPanel(props){
    try{
      var existing = document.getElementById('spcInfoPanel');
      if (!existing){
        existing = document.createElement('div');
        existing.id = 'spcInfoPanel';
        existing.style.position = 'absolute';
        existing.style.left = '18px';
        existing.style.top = '132px';
        existing.style.zIndex = '100004';
        existing.style.maxWidth = '430px';
        existing.style.maxHeight = '58vh';
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
      var product = activeStory.product || '';
      var detailsFile = activeStory.detailsFile || '';
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
              "<div style='font:900 11px/1 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.88'>SPC Outlook Details</div>" +
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
      var title = payload && payload.title ? String(payload.title) : "SPC Day 1 Outlook";
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
              "<div style='font:900 11px/1 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.88'>SPC Outlook Details</div>" +
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


  async function ensureSpcDay1Layer(){
    if (spcDay1Layer) return spcDay1Layer;
    var url = getSpcDay1Url();
    var res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
    if (!res.ok) throw new Error('SPC Day 1 HTTP ' + res.status + ': ' + url);
    var gj = await res.json();
    spcDay1Layer = L.geoJSON(gj, {
      style:spcStyle,
      onEachFeature:function(feature, layer){
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
    var u = getRadarVelocityManifestPath();
    return _isAbsUrl(u) ? u : _joinUrl(DATA_BASE, u);
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
  function parseRadarVelocityFrames(raw){
    var frames = [];
    if (raw && raw.image){
      frames.push({ file: raw.image, points: raw.pointsFile || raw.pointFile || raw.points || null, time: raw.time || raw.utc || raw.scan_time_utc || null, label: raw.label || 'Velocity Test', bounds: parseRadarVelocityBounds(raw) });
      return frames;
    }
    var src = (raw && (raw.frames || raw.images || raw.files)) || [];
    if (!Array.isArray(src)) return frames;
    src.forEach(function(f, i){
      if (typeof f === 'string') f = { file:f };
      if (!f) return;
      var file = f.file || f.url || f.png || f.image || f.name;
      if (!file) return;
      frames.push({
        file: file,
        points: f.pointsFile || f.pointFile || f.points || raw.pointsFile || raw.pointFile || raw.points || null,
        time: f.time || f.utc || f.scan_time_utc || null,
        label: f.label || ('Velocity ' + (i+1)),
        bounds: parseRadarVelocityBounds(f) || parseRadarVelocityBounds(raw)
      });
    });
    return frames;
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
    if (radarVelocityPoints) return radarVelocityPoints;
    if (radarVelocityPointsPromise) return radarVelocityPointsPromise;
    if (!currentRadarVelocityFrame || !currentRadarVelocityFrame.points) return null;
    var pointsUrl = _isAbsUrl(currentRadarVelocityFrame.points) ? currentRadarVelocityFrame.points : _joinUrl(radarVelocityManifestBaseUrl, currentRadarVelocityFrame.points);
    radarVelocityPointsPromise = fetch(pointsUrl + (pointsUrl.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' })
      .then(function(r){
        if (!r.ok) throw new Error('Velocity points HTTP ' + r.status + ': ' + pointsUrl);
        return r.json();
      })
      .then(function(raw){
        radarVelocityPoints = raw || null;
        window.radarVelocityPoints = radarVelocityPoints;
        return radarVelocityPoints;
      })
      .catch(function(err){
        console.error('Velocity points load failed:', err);
        radarVelocityPointsPromise = null;
        radarVelocityPoints = null;
        window.radarVelocityPoints = null;
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
    if (!currentRadarVelocityFrame || !currentRadarVelocityFrame.file) throw new Error('Velocity manifest missing frame image');
    if (!radarVelocityBounds) throw new Error('Velocity manifest missing bounds');
    var imgUrl = _isAbsUrl(currentRadarVelocityFrame.file) ? currentRadarVelocityFrame.file : _joinUrl(radarVelocityManifestBaseUrl, currentRadarVelocityFrame.file);
    clearRadarVelocityLayer();
    radarVelocityLayer = L.imageOverlay(imgUrl, radarVelocityBounds, { opacity: productOpacity.radarVelocity || 0.70, interactive:false });
    radarVelocityLayer.addTo(map);
    window.radarVelocityLayer = radarVelocityLayer;
    if (currentRadarVelocityFrame.points) {
      try{ await loadRadarVelocityPointsIfNeeded(); }catch(e){ console.warn('Velocity points not loaded:', e); }
    }
    setStatus('Velocity test on');
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
    var lats = raw.latitude, lons = raw.longitude, vals = raw.values_mph || raw.values || raw.velocity_mph || raw.velocity || null;
    if (!Array.isArray(lats) || !Array.isArray(lons) || !Array.isArray(vals) || !lats.length || !lons.length || !vals.length) return null;
    var rows = Math.min(lats.length, lons.length, vals.length);
    var cols = Array.isArray(lats[0]) ? lats[0].length : 0;
    if (!rows || !cols) return null;
    var b = radarVelocityBounds || parseRadarVelocityBounds(raw) || currentRadarVelocityFrame && currentRadarVelocityFrame.bounds;
    if (!b) return null;
    var south = Number(b[0][0]), west = Number(b[0][1]), north = Number(b[1][0]), east = Number(b[1][1]);
    var rowGuess = Math.round((north - latlng.lat) / Math.max(1e-9, (north - south)) * (rows - 1));
    var colGuess = Math.round((latlng.lng - west) / Math.max(1e-9, (east - west)) * (cols - 1));
    rowGuess = Math.max(0, Math.min(rows - 1, rowGuess));
    colGuess = Math.max(0, Math.min(cols - 1, colGuess));
    var best = null, bestD = Infinity, win = 10;
    for (var r = Math.max(0, rowGuess - win); r <= Math.min(rows - 1, rowGuess + win); r++){
      var latRow = lats[r], lonRow = lons[r], valRow = vals[r];
      if (!Array.isArray(latRow) || !Array.isArray(lonRow) || !Array.isArray(valRow)) continue;
      for (var c = Math.max(0, colGuess - win); c <= Math.min(cols - 1, colGuess + win); c++){
        var v = valRow[c];
        if (v == null || !isFinite(v)) continue;
        var plat = Number(latRow[c]), plon = Number(lonRow[c]);
        if (!isFinite(plat) || !isFinite(plon)) continue;
        var d = map.distance(latlng, L.latLng(plat, plon));
        if (d < bestD){ bestD = d; best = { lat: plat, lon: plon, value: Number(v), unit: 'mph' }; }
      }
    }
    if (!best){
      var v0 = vals[rowGuess] && vals[rowGuess][colGuess];
      var plat0 = lats[rowGuess] && lats[rowGuess][colGuess];
      var plon0 = lons[rowGuess] && lons[rowGuess][colGuess];
      if (v0 != null && isFinite(v0) && isFinite(plat0) && isFinite(plon0)) best = { lat:Number(plat0), lon:Number(plon0), value:Number(v0), unit:'mph' };
    }
    return best;
  }

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
  var hrrrManifestUrl = null;
  var hrrrManifestBaseUrl = null;
  window.hrrrTempLayer = hrrrTempLayer;
  window.hrrrTempEnabled = hrrrTempEnabled;
  window.hrrrTempGeo = hrrrTempGeo;
  window.hrrrPoints = hrrrPoints;
  window.__HRRR_FRAMES__ = hrrrFrames;
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
      setStatus('HRRR missing: ' + url);
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
    { on: (typeof jet500Enabled !== "undefined" && jet500Enabled), label: "500 MB WINDS" },
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
    } else { // temp / future temp
      title = (key === "hrrrTemp") ? "Future 2m Temperature (°F)" : "2m Temperature (°F)";
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
      alertsLayer.addData(gj);
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
    updateRadar();
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
  }

  window.updateAll = updateAll;
  window.setMasterTime = function(value){
    var d = (value instanceof Date) ? new Date(value.getTime()) : new Date(value);
    if (isNaN(d)) return false;
    curZ = d;
    clampTime();
    updateAll();
    return true;
  };

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

  var _back = document.getElementById('cbBackBtn') || document.getElementById('bBackBtn');
  if (_back) _back.title = "Back " + STEP_LABEL;
  if (_back) _back.onclick = function(){
    if (stepActiveScrubber(-1)) return;
    if (typeof metarVisible !== 'undefined' && metarVisible){
      if (stepMetarPreset(-1)) return;
    }
    curZ = new Date(curZ.getTime() - STEP_MS);
    clampTime(); updateAll();
  };
  var _fwd = document.getElementById('cbFwdBtn') || document.getElementById('bFwdBtn');
  if (_fwd) _fwd.title = "Forward " + STEP_LABEL;
  if (_fwd) _fwd.onclick = function(){
    if (stepActiveScrubber(1)) return;
    if (typeof metarVisible !== 'undefined' && metarVisible){
      if (stepMetarPreset(1)) return;
    }
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
        ensureAlertsLoaded();
        updateAll();
        return;
      }
      if (mode === 'hrrr'){
        setCurrentHrrrFrameIndex(v);
        try{ window.curZ = new Date(curZ.getTime()); }catch(e){}
        setTimeLabel();
        updateHrrrOverlay();
        if (typeof syncMetarsToMasterScrubber === "function") {
          try{ syncMetarsToMasterScrubber(); }catch(e){}
        }
        updateProductLabel();
        return;
      }
      if (mode === 'metars'){
        try{
          if (window.metarsModule && typeof window.metarsModule.loadMetarsAtIndex === 'function'){
            window.metarsModule.loadMetarsAtIndex(v);
            return;
          }
        }catch(e){}
      }
      curZ = new Date(startZ.getTime() + v*STEP_MS);
      clampTime(); updateAll();
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
}
  if (_sweepBtn){
    _sweepBtn.onclick = function(){
      radarSweepEnabled = !radarSweepEnabled;
      syncSweepButton();
      updateRadar();
    };
    syncSweepButton();
  }

  window.toggleSweep = function(){
    radarSweepEnabled = !radarSweepEnabled;
    syncSweepButton();
    updateRadar();
    return radarSweepEnabled;
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
      return !!(window.obsRadarEnabled || window.metarVisible || window.hrrrTempEnabled || window.spcDay1Enabled || window.lightningEnabled);
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
