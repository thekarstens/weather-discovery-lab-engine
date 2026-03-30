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
  var lightningRecentWindowMs = 20 * 60 * 1000;
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
  var LIGHTNING_BOLT_ICON = "data:image/png;base64,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";

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
      .wdl-lightning-icon .wdl-lightning-bolt-wrap{
        position:relative;
        width:var(--bolt-w,44px);
        height:var(--bolt-h,44px);
        pointer-events:none;
        transform:translate(-4px,-4px) scale(var(--bolt-scale,1));
        transform-origin:center center;
        opacity:var(--bolt-opacity,1);
      }
      .wdl-lightning-icon .wdl-lightning-bolt-img{
        width:100%;
        height:100%;
        display:block;
        object-fit:contain;
        filter:var(--bolt-filter, drop-shadow(0 0 8px rgba(255,210,70,.95)));
      }
      .wdl-lightning-icon .wdl-lightning-bolt-fresh .wdl-lightning-bolt-img{
        animation: wdlLightningLivePulse var(--flash-ms,900ms) ease-in-out infinite;
      }
      .wdl-lightning-icon .wdl-lightning-bolt-aged .wdl-lightning-bolt-img{
        animation:none !important;
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
      @keyframes wdlLightningLivePulse{
        0%{ opacity:.18; transform:translate(-4px,-4px) scale(calc(var(--bolt-scale,1) * 0.92)); }
        18%{ opacity:1; transform:translate(-4px,-4px) scale(calc(var(--bolt-scale,1) * 1.08)); }
        42%{ opacity:.28; transform:translate(-4px,-4px) scale(calc(var(--bolt-scale,1) * 0.97)); }
        65%{ opacity:1; transform:translate(-4px,-4px) scale(calc(var(--bolt-scale,1) * 1.04)); }
        100%{ opacity:.24; transform:translate(-4px,-4px) scale(var(--bolt-scale,1)); }
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

  function createLightningIcon(d, opts){
    opts = opts || {};
    var strength = lightningStrengthFor(d);
    var isFresh = !!opts.fresh;
    var ageMs = Math.max(0, Number(opts.ageMs) || 0);
    var lookbackMs = Math.max(lightningFreshWindowMs + 1, lightningRecentWindowMs || (20 * 60 * 1000));
    var ageFrac = Math.max(0, Math.min(1, ageMs / lookbackMs));
    var flashMs = Math.max(650, Math.min(1400, Number((lightningManifest && lightningManifest.style && lightningManifest.style.flashMs) || 900)));

    var baseScale = isFresh
      ? (1.25 + strength * 0.42)
      : (0.92 + strength * 0.18);

    var size = isFresh
      ? Math.round(34 + strength * 12)
      : Math.round(24 + (1 - ageFrac) * 10 + strength * 4);

    var opacity = isFresh
      ? Math.max(0.72, Math.min(1, productOpacity.lightning || 0.92))
      : Math.max(0.18, Math.min(0.88, (productOpacity.lightning || 0.92) * (0.95 - ageFrac * 0.55)));

    var filter;
    if (isFresh){
      filter =
        'drop-shadow(0 0 ' + (10 + strength * 10).toFixed(0) + 'px rgba(255,214,72,.98)) ' +
        'drop-shadow(0 0 ' + (18 + strength * 14).toFixed(0) + 'px rgba(255,193,7,.72)) ' +
        'drop-shadow(0 0 ' + (8 + strength * 6).toFixed(0) + 'px rgba(255,255,255,.95))';
    } else if (ageFrac < 0.5){
      filter =
        'hue-rotate(-18deg) saturate(1.45) brightness(1.08) ' +
        'drop-shadow(0 0 ' + (6 + (1 - ageFrac) * 4).toFixed(0) + 'px rgba(255,145,32,.70))';
    } else if (ageFrac < 0.82){
      filter =
        'hue-rotate(78deg) saturate(1.25) brightness(.98) ' +
        'drop-shadow(0 0 ' + (4 + (1 - ageFrac) * 3).toFixed(0) + 'px rgba(151,71,255,.44))';
    } else {
      filter =
        'grayscale(1) saturate(0.2) brightness(.82) ' +
        'drop-shadow(0 0 3px rgba(170,170,170,.24))';
    }

    return L.divIcon({
      className: 'wdl-lightning-icon',
      html:
        '<div class="wdl-lightning-bolt-wrap ' + (isFresh ? 'wdl-lightning-bolt-fresh' : 'wdl-lightning-bolt-aged') + '" ' +
        'style="--bolt-scale:' + baseScale.toFixed(2) + ';--flash-ms:' + flashMs + 'ms;--bolt-filter:' + filter + ';--bolt-opacity:' + opacity.toFixed(2) + ';--bolt-w:' + size + 'px;--bolt-h:' + size + 'px">' +
          '<img class="wdl-lightning-bolt-img" src="' + LIGHTNING_BOLT_ICON + '" alt="lightning bolt">' +
        '</div>',
      iconSize: [size, size],
      iconAnchor: [Math.round(size / 2), Math.round(size / 2)],
      popupAnchor: [0, -Math.round(size * 0.42)]
    });
  }

  function getLightningRecentStyle(d){
    var ageMs = Math.max(0, curZ.getTime() - d.timeMs);
    return createLightningIcon(d, { fresh:false, ageMs:ageMs });
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
      '<div class="lc-row"><span>Trail</span><span>' + recentCount + '</span></div>' +
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
      try{ if (m && m.getElement) { var el = m.getElement(); if (el) el.style.opacity = String(Math.max(0.18, productOpacity.lightning)); } }catch(e){}
    });
  }
  window.setLightningOpacity = setLightningOpacity;

  function setLightningLookbackMinutes(mins){
    lightningRecentWindowMs = Math.max(60 * 1000, Math.min(6 * 60 * 60 * 1000, Number(mins || 20) * 60 * 1000));
    if (lightningEnabled) updateLightning();
    return Math.round(lightningRecentWindowMs / 60000);
  }
  function getLightningLookbackMinutes(){
    return Math.round(lightningRecentWindowMs / 60000);
  }
  window.setLightningLookbackMinutes = setLightningLookbackMinutes;
  window.getLightningLookbackMinutes = getLightningLookbackMinutes;

  function upsertLightningFresh(fresh){
    var seen = Object.create(null);
    if (!lightningFreshLayer){ lightningFreshLayer = L.layerGroup().addTo(map); }
    fresh.forEach(function(d){
      seen[d.id] = true;
      var marker = lightningFreshMarkerIndex[d.id];
      if (!marker){
        marker = L.marker([d.lat, d.lon], { icon:createLightningIcon(d, { fresh:true, ageMs:0 }), keyboard:false, interactive:true });
        marker.bindPopup(buildLightningPopup(d), { className:'hrrr-popup' });
        lightningFreshMarkerIndex[d.id] = marker;
        lightningFreshLayer.addLayer(marker);
      } else {
        marker.setLatLng([d.lat, d.lon]);
        marker.setIcon(createLightningIcon(d, { fresh:true, ageMs:0 }));
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

  function upsertLightningRecent(recent, nowMs){
    var seen = Object.create(null);
    if (!lightningRecentLayer){ lightningRecentLayer = L.layerGroup().addTo(map); }
    recent.forEach(function(d){
      seen[d.id] = true;
      var marker = lightningRecentMarkerIndex[d.id];
      var icon = getLightningRecentStyle(d);
      if (!marker){
        marker = L.marker([d.lat, d.lon], { icon:icon, keyboard:false, interactive:true });
        marker.bindPopup(buildLightningPopup(d), { className:'hrrr-popup' });
        lightningRecentMarkerIndex[d.id] = marker;
        lightningRecentLayer.addLayer(marker);
      } else {
        marker.setLatLng([d.lat, d.lon]);
        marker.setIcon(icon);
      }
      try{ var el = marker.getElement && marker.getElement(); if (el) el.style.opacity = String(Math.max(0.18, productOpacity.lightning || 0.9)); }catch(e){}
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
        lightningRecentWindowMs = Math.max(60 * 1000, Math.min(6 * 60 * 60 * 1000, Number(style.recentMinutes || 20) * 60 * 1000));
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
    upsertLightningRecent(recent, nowMs);
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

  function drawTrackPreview(startLL, endLL){
  if (!startLL || !endLL) return;

  var stats = getTrackArrowStats(startLL, endLL);
  var mph = stats ? stats.stormMph : 0;

  if (stormTrackSpeedBox) stormTrackSpeedBox.classList.add("open");
  if (stormTrackSpeedValue) stormTrackSpeedValue.textContent = Math.max(1, Math.round(mph)) + " mph";

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

    L.marker(ll, {
      interactive: false,
      icon: L.divIcon({
        className: "storm-track-city-label",
        html: h.name,
        iconSize: null
      })
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
          .setContent("<div style='font:900 16px/1.1 Arial,sans-serif'>Probe</div><div style='font:900 16px/1.1 Arial,sans-serif'>Turn on <b>Future Temperatures</b>, <b>Future Wind Gusts</b>, or <b>500 mb Winds</b>.</div>")
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

    var probeTitle = (window.hrrrProductMode === 'winds') ? 'Max Surface Wind Gust' : 'Temperature';
    var probeUnit = best.unit || ((window.hrrrProductMode === 'winds') ? 'mph' : '°F');
    var probeValue = (typeof best.value === "number") ? best.value : ((probeUnit === 'mph') ? best.mph : best.tF);
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
  var STORYBOARD_CSV = normalizeStoryboardPath(
    STORYBOARD_OVERRIDE || ((CFG && CFG.storyboardCSV) ? CFG.storyboardCSV : (STORY_CFG.type === "csv" ? (STORY_CFG.url || STORY_CFG.csv || "") : ""))
  );
  var SHEET_ID = STORY_CFG.sheetId || STORY_CFG.googleSheetId || "17Hzg7R2fSHJGbOKAKMqG4QAqA1GlSJwFM-SQwPhQObY";
  var SHEET_TAB = STORY_CFG.sheetTab || STORY_CFG.tab || "April Blizzard Story";
  var storyItems = [];
  var storyMarkers = [];
  var storyIndex = 0;
  var focusRing = null;
  window.__WDL_STORYBOARD_CSV__ = STORYBOARD_CSV;

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

  function resolveStoryAsset(url){
    var u = safeLink(url);
    if (!u) return "";
    if (/^https?:\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:")) return u;
    return _joinUrl(DATA_BASE, u);
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

    var img = resolveStoryAsset(item.image);
    var vid = resolveStoryAsset(item.video);

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

  function normalizeStoryRow(r){
    var lat = parseFloat(r.lat);
    var lon = parseFloat(r.lon);
    var orderRaw = (r.order != null && r.order !== "") ? r.order : r.step;
    return {
      id: r.id || r.step || "",
      title: r.title || "",
      text: r.text || "",
      lat: isFinite(lat) ? lat : null,
      lon: isFinite(lon) ? lon : null,
      image: r.image || "",
      video: r.video || "",
      terms: r.terms || "",
      layer: r.layer || "",
      zoom: (r.zoom != null && r.zoom !== "") ? Number(r.zoom) : null,
      order: parseFloat(orderRaw)
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
document.body.classList.add("explore-mode");
document.body.classList.remove("guide-collapsed");
// Opacity slider (applies to the currently visible product)
var radarOpacity = document.getElementById("radarOpacity");

// Remember per-layer opacity so kids can flip products without losing their setting
var productOpacity = { radar: 0.70, radarVelocity: 0.70, snow: 0.70, temp: 0.70, hrrrTemp: 0.70, hrrrRadar: 0.70, hrrrWinds: 0.70, global: 0.70, goes: 0.70, metars: 1.00, jet: 0.75, lightning: 0.90 };

function getActiveProductKey(){
  // Priority: global > snow > jet > future hrrr > radar
  if (typeof era5Apr10Enabled !== "undefined" && (era5Apr10Enabled || era5Apr11Enabled)) return "global";
  if (typeof gfsSnowEnabled !== "undefined" && gfsSnowEnabled) return "snow";
  if (typeof jet500Enabled !== "undefined" && jet500Enabled) return "jet";
  if (typeof radarVelocityEnabled !== "undefined" && radarVelocityEnabled && typeof radarVelocityLayer !== "undefined" && radarVelocityLayer && map.hasLayer(radarVelocityLayer)) return "radarVelocity";
  if (typeof hrrrTempLayer !== "undefined" && map.hasLayer(hrrrTempLayer)) return (window.hrrrProductMode === 'radar') ? "hrrrRadar" : ((window.hrrrProductMode === 'winds') ? "hrrrWinds" : "hrrrTemp");
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
  } else if (key === "temp" || key === "hrrrTemp" || key === "hrrrRadar"){
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

      var generic = cfg.manifest || cfg.url || cfg.file || '';
      if (generic) {
        var s = String(generic).toLowerCase();
        if (product === 'radar' && s.indexOf('/radar/') !== -1) return generic;
        if (product === 'temp' && s.indexOf('/radar/') === -1) return generic;
      }
    }catch(e){}
    return product === 'radar' ? 'hrrr/radar/manifest.json' : (product === 'winds' ? 'hrrr/winds/manifest.json' : 'hrrr/temp/manifest.json');
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
      var activeKey = (hrrrProductMode === 'radar') ? 'hrrrRadar' : ((hrrrProductMode === 'winds') ? 'hrrrWinds' : 'hrrrTemp');
      var op = productOpacity[activeKey] || 0.70;
      hrrrTempLayer = L.imageOverlay(url, hrrrBounds, { opacity: op, interactive:false });
      window.hrrrTempLayer = hrrrTempLayer;
      hrrrTempLayer.addTo(map);
      applyActiveOpacity();
      loadHrrrPointsForFrame(frame).then(function(pts){
        var name = (hrrrProductMode === 'radar') ? 'Future Radar' : ((hrrrProductMode === 'winds') ? 'Future Wind Gusts' : 'Future Temperatures');
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
      hrrrProductMode = (product === 'radar') ? 'radar' : ((product === 'winds') ? 'winds' : 'temp');
      window.hrrrProductMode = hrrrProductMode;
      resetHrrrManifestState();
    }
    hrrrTempEnabled = turningOn;
    window.hrrrTempEnabled = hrrrTempEnabled;
    if (!hrrrTempEnabled){
      if (hrrrTempLayer && map.hasLayer(hrrrTempLayer)) map.removeLayer(hrrrTempLayer);
      setStatus((hrrrProductMode === 'radar') ? 'Future Radar off' : ((hrrrProductMode === 'winds') ? 'Future Wind Gusts off' : 'Future Temperatures off'));
      try{ updateProductLabel(); }catch(e){}
      try{ setTimeLabel(); }catch(e){}
      try{ syncDockUi(); }catch(e){}
      return;
    }
    try{
      await loadHrrrManifest();
      currentHrrrFrameIndex = nearestHrrrFrameIndexForTime(curZ);
      setCurrentHrrrFrameIndex(currentHrrrFrameIndex);
      updateHrrrOverlay();
      setStatus((hrrrProductMode === 'radar') ? 'Future Radar on' : ((hrrrProductMode === 'winds') ? 'Future Wind Gusts on' : 'Future Temperatures on'));
    }catch(err){
      hrrrTempEnabled = false;
      window.hrrrTempEnabled = false;
      console.error(err);
      setStatus((hrrrProductMode === 'radar') ? 'Future Radar failed' : ((hrrrProductMode === 'winds') ? 'Future Wind Gusts failed' : 'Future Temperatures failed'));
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
  window.setHrrrProductEnabled = setHrrrProductEnabled;
  window.setHrrrTempEnabled = setHrrrTempEnabled;
  window.setHrrrRadarEnabled = setHrrrRadarEnabled;
  window.setHrrrWindsEnabled = setHrrrWindsEnabled;

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
    { on: (typeof radarVelocityEnabled !== "undefined" && radarVelocityEnabled), label: "RADAR VELOCITY" },
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
    if (typeof metarVisible !== 'undefined' && metarVisible){
      if (stepMetarPreset(-1)) return;
    }
    if (stepActiveScrubber(-1)) return;
    curZ = new Date(curZ.getTime() - STEP_MS);
    clampTime(); updateAll();
  };
  var _fwd = document.getElementById('cbFwdBtn') || document.getElementById('bFwdBtn');
  if (_fwd) _fwd.title = "Forward " + STEP_LABEL;
  if (_fwd) _fwd.onclick = function(){
    if (typeof metarVisible !== 'undefined' && metarVisible){
      if (stepMetarPreset(1)) return;
    }
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
    console.warn('Dock not found');
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
