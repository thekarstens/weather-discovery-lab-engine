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
  var LIGHTNING_ICON_DATA_URI = 'data:image/png;base64,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';

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
      .wdl-lightning-icon{ background:transparent !important; border:0 !important; }
      .wdl-lightning-icon > div{ background:transparent !important; border:0 !important; }
      .wdl-lightning-wrap{
        position:relative;
        width:42px;
        height:56px;
        pointer-events:none;
        background:transparent !important;
      }
      .wdl-lightning-wrap.is-fresh{
        animation: wdlLightningLivePulse 0.9s ease-in-out infinite;
      }
      .wdl-lightning-img{
        display:block;
        width:100%;
        height:100%;
        object-fit:contain;
        image-rendering:auto;
        mix-blend-mode:screen;
        background:transparent !important;
        box-shadow:none !important;
      }
      .wdl-lightning-wrap.is-fresh .wdl-lightning-img{
        filter:
          drop-shadow(0 0 3px rgba(255,255,255,.52))
          drop-shadow(0 0 10px rgba(255,210,70,.72))
          drop-shadow(0 0 18px rgba(255,180,50,.48));
      }
      .wdl-lightning-wrap.is-recent .wdl-lightning-img{
        filter: var(--age-filter,
          drop-shadow(0 0 2px rgba(255,220,120,.40))
          drop-shadow(0 0 8px rgba(255,180,70,.26)));
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
        0%{ opacity:1; transform:scale(1); }
        50%{ opacity:.34; transform:scale(.82); }
        100%{ opacity:1; transform:scale(1); }
      }
    `;
    document.head.appendChild(style);
    lightningStylesInjected = true;
  }

  function lightningAgeVisual(ageMs){
    var recentMs = Math.max(1, lightningRecentWindowMs || (20 * 60 * 1000));
    var r = Math.max(0, Math.min(1, ageMs / recentMs));
    var opacity = 0.92;
    var filter = '';
    if (r <= 0.45){
      var t1 = r / 0.45;
      var hue1 = Math.round(10 + t1 * 25);
      var sat1 = (1.35 - t1 * 0.15).toFixed(2);
      var bright1 = (1.02 - t1 * 0.08).toFixed(2);
      opacity = 0.88 - t1 * 0.12;
      filter = 'hue-rotate(' + hue1 + 'deg) saturate(' + sat1 + ') brightness(' + bright1 + ') '
        + 'drop-shadow(0 0 2px rgba(255,240,180,.24)) '
        + 'drop-shadow(0 0 7px rgba(255,174,72,.22))';
    } else if (r <= 0.8){
      var t2 = (r - 0.45) / 0.35;
      var hue2 = Math.round(55 + t2 * 210);
      var sat2 = (1.20 - t2 * 0.12).toFixed(2);
      var bright2 = (0.95 - t2 * 0.12).toFixed(2);
      opacity = 0.76 - t2 * 0.18;
      filter = 'hue-rotate(' + hue2 + 'deg) saturate(' + sat2 + ') brightness(' + bright2 + ') '
        + 'drop-shadow(0 0 2px rgba(246,208,255,.14)) '
        + 'drop-shadow(0 0 6px rgba(168,120,255,.14))';
    } else {
      var t3 = (r - 0.8) / 0.2;
      var gray = (0.25 + t3 * 0.75).toFixed(2);
      var bright3 = (0.80 - t3 * 0.18).toFixed(2);
      opacity = 0.58 - t3 * 0.24;
      filter = 'grayscale(' + gray + ') saturate(' + (0.65 - t3 * 0.20).toFixed(2) + ') brightness(' + bright3 + ') '
        + 'drop-shadow(0 0 2px rgba(255,255,255,.08))';
    }
    return { filter: filter, opacity: Math.max(0.22, opacity) };
  }

  function createLightningImgHtml(d, opts){
    opts = opts || {};
    var ageMs = Math.max(0, (opts.nowMs != null ? opts.nowMs : curZ.getTime()) - d.timeMs);
    var isFresh = !!opts.fresh;
    var visual = isFresh ? { filter:'', opacity:1 } : lightningAgeVisual(ageMs);
    var cls = 'wdl-lightning-wrap ' + (isFresh ? 'is-fresh' : 'is-recent');
    var size = isFresh ? '42px' : '34px';
    var height = isFresh ? '56px' : '46px';
    return '<div class="' + cls + '" style="width:' + size + ';height:' + height + ';opacity:' + visual.opacity.toFixed(2) + ';--age-filter:' + visual.filter + '">' +
      '<img class="wdl-lightning-img" src="' + LIGHTNING_ICON_DATA_URI + '" alt="lightning">' +
      '</div>';
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
    return L.divIcon({
      className: 'wdl-lightning-icon',
      html: createLightningImgHtml(d, { fresh:true }),
      iconSize: [42,56],
      iconAnchor: [21,28],
      popupAnchor: [0,-18]
    });
  }

  function createLightningRecentIcon(d, nowMs){
    return L.divIcon({
      className: 'wdl-lightning-icon',
      html: createLightningImgHtml(d, { fresh:false, nowMs:nowMs }),
      iconSize: [34,46],
      iconAnchor: [17,23],
      popupAnchor: [0,-16]
    });
  }

  function getLightningRecentStyle(d){
    var visual = lightningAgeVisual(Math.max(0, curZ.getTime() - d.timeMs));
    return {
      opacity: visual.opacity,
      fillOpacity: visual.opacity
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
      try{ if (m && m.getElement) { var el = m.getElement(); if (el) el.style.opacity = String(Math.max(0.18, productOpacity.lightning)); } }catch(e){}
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
    var nowMs = curZ.getTime();
    recent.forEach(function(d){
      seen[d.id] = true;
      var marker = lightningRecentMarkerIndex[d.id];
      if (!marker){
        marker = L.marker([d.lat, d.lon], { icon:createLightningRecentIcon(d, nowMs), keyboard:false, interactive:true });
        marker.bindPopup(buildLightningPopup(d), { className:'hrrr-popup' });
        lightningRecentMarkerIndex[d.id] = marker;
        lightningRecentLayer.addLayer(marker);
      } else {
        marker.setLatLng([d.lat, d.lon]);
        marker.setIcon(createLightningRecentIcon(d, nowMs));
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
        lightningRecentWindowMs = Math.max(30 * 1000, Math.min(60 * 60 * 1000, Number(style.recentMinutes || 20) * 60 * 1000));
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
