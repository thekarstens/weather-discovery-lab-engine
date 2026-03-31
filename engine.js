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
  var lightningDensityLayer = null;
  var lightningLoadPromise = null;
  var lightningCounterControl = null;
  var lightningHistoryControl = null;
  var lightningStylesInjected = false;
  var lightningFreshWindowMs = 30 * 1000;
  var lightningRecentWindowMs = 20 * 60 * 1000;
  var lightningCounterWindowMs = 5 * 60 * 1000;
  var lightningJumpWindowMs = 5 * 60 * 1000;
  var lightningSoundEnabled = false;
  var lightningDensityEnabled = true;
  var lightningLookbackMin = 20;
  var lightningLastSoundAt = 0;
  var lightningAudioContext = null;
  var lightningLastRenderedStamp = '';
  var lightningFreshMarkerIndex = Object.create(null);
  var lightningRecentMarkerIndex = Object.create(null);
  var lightningDensityIndex = Object.create(null);
  var LIGHTNING_ICON_DATA_URL = "data:image/png;base64,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";
  window.lightningEnabled = lightningEnabled;
  window.lightningSoundEnabled = lightningSoundEnabled;
  window.lightningDensityEnabled = lightningDensityEnabled;

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
      .wdl-lightning-icon {
        background: transparent !important;
        border: 0 !important;
      }
      .wdl-lightning-icon img {
        display:block;
        background: transparent !important;
        border:0 !important;
        box-shadow:none !important;
        object-fit:contain;
        pointer-events:none;
      }
      .wdl-lightning-live {
        animation: wdlLightningLivePulse 1.05s ease-in-out infinite;
        transform-origin: 50% 55%;
      }
      @keyframes wdlLightningLivePulse {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: .35; transform: scale(.86); }
        100% { opacity: 1; transform: scale(1); }
      }
      .lightning-counter {
        background: linear-gradient(180deg, rgba(3,13,32,.90), rgba(10,22,48,.82));
        color:#f7fbff; padding:8px 10px; border-radius:12px; min-width:152px;
        border:1px solid rgba(118,224,255,.35);
        box-shadow: 0 0 12px rgba(90,209,255,.20), inset 0 0 18px rgba(255,255,255,.05);
        font: 800 12px/1.25 Lato, Arial, sans-serif;
        letter-spacing:.02em;
      }
      .lightning-counter .lc-title{font:900 13px/1 Lato, Arial, sans-serif; margin-bottom:5px; color:#fff68d; text-transform:uppercase;}
      .lightning-counter .lc-row{display:flex; justify-content:space-between; gap:10px; margin-top:2px;}
      .lightning-counter .lc-jump{margin-top:6px; font:900 11px/1.1 Lato, Arial, sans-serif; color:#8cf7ff; text-shadow:0 0 8px rgba(140,247,255,.45);}
      .lightning-history-control {
        background: linear-gradient(180deg, rgba(3,13,32,.90), rgba(10,22,48,.82));
        color:#f7fbff;
        padding:8px 10px;
        border-radius:12px;
        border:1px solid rgba(118,224,255,.35);
        box-shadow: 0 0 12px rgba(90,209,255,.20), inset 0 0 18px rgba(255,255,255,.05);
        min-width:220px;
        font:800 11px/1.2 Lato, Arial, sans-serif;
      }
      .lightning-history-control .lh-title {
        font:900 12px/1 Lato, Arial, sans-serif;
        color:#fff68d;
        text-transform:uppercase;
        margin-bottom:6px;
      }
      .lightning-history-control .lh-row {
        display:flex;
        align-items:center;
        gap:8px;
      }
      .lightning-history-control input[type="range"] {
        flex:1 1 auto;
        width:100%;
        accent-color:#ffd83d;
      }
      .lightning-history-control .lh-mins {
        min-width:54px;
        text-align:right;
        font-weight:900;
        color:#fff;
      }
      .lightning-history-control label {
        display:flex;
        align-items:center;
        gap:6px;
        margin-top:6px;
        cursor:pointer;
      }
      .lightning-history-control input[type="checkbox"] {
        accent-color:#ffd83d;
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
    if (!isFinite(min) || !isFinite(max) || max <= min) return { min:0, max:1 };
    return { min:min, max:max };
  }

  function lightningStrengthFor(d){
    if (!d) return 0.85;
    if (typeof d.peakCurrent === 'number' && Number.isFinite(d.peakCurrent)){
      return Math.max(0.45, Math.min(1.65, Math.abs(d.peakCurrent) / 40));
    }
    if (!window.__lightningEnergyRange__) window.__lightningEnergyRange__ = lightningEnergyRange();
    if (typeof d.energy === 'number' && Number.isFinite(d.energy)){
      var r = window.__lightningEnergyRange__;
      if (r.max <= r.min) return 1;
      var n = (d.energy - r.min) / (r.max - r.min);
      return Math.max(0.55, Math.min(1.55, 0.6 + n * 1.05));
    }
    return 1;
  }

  function buildLightningPopup(d){
    function fmt(v){ return (v == null || v === '') ? '' : String(v); }
    function finiteNum(v){ return (typeof v === 'number' && Number.isFinite(v)) ? v : null; }
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
    if (lat != null && lon != null) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Coordinates:</b> " + lat.toFixed(3) + ", " + lon.toFixed(3) + "</div>");
    if (energy != null) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Energy:</b> " + escapeHtml(energy.toExponential(2)) + "</div>");
    if (area != null) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Area:</b> " + escapeHtml(area.toFixed(1)) + "</div>");
    if (fmt(d && d.polarity)) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Polarity:</b> " + escapeHtml(fmt(d.polarity)) + "</div>");
    if (peakCurrent != null) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Peak Current:</b> " + escapeHtml(peakCurrent.toFixed(1)) + " kA</div>");
    if (fmt(d && d.source)) lines.push("<div style='font:800 12px/1.2 Lato,Arial,sans-serif;margin-top:4px'><b>Source:</b> " + escapeHtml(fmt(d.source)) + "</div>");
    return lines.join('');
  }

  function lightningAgeColor(ageMs){
    var t = Math.max(0, Math.min(1, ageMs / lightningRecentWindowMs));
    var r,g,b;
    if (t <= 0.4){
      var p = t / 0.4;
      r = 255;
      g = Math.round(228 - p * 78);
      b = Math.round(90 - p * 35);
    } else if (t <= 0.75){
      var p2 = (t - 0.4) / 0.35;
      r = Math.round(255 - p2 * 95);
      g = Math.round(150 - p2 * 78);
      b = Math.round(55 + p2 * 155);
    } else {
      var p3 = (t - 0.75) / 0.25;
      r = Math.round(160 - p3 * 65);
      g = Math.round(72 + p3 * 43);
      b = Math.round(210 - p3 * 95);
    }
    return { r:r, g:g, b:b };
  }

  function buildBoltFilter(ageMs, strength, fresh){
    var c = lightningAgeColor(ageMs);
    var opacity = fresh ? 1 : Math.max(0.18, 1 - (ageMs / lightningRecentWindowMs) * 0.78);
    var bright = fresh ? 1.08 : Math.max(0.55, 1.05 - (ageMs / lightningRecentWindowMs) * 0.42);
    var drop1 = Math.round(6 + strength * 4);
    var drop2 = Math.round(14 + strength * 8);
    var drop3 = Math.round(28 + strength * 12);
    return {
      opacity: opacity,
      filter: 'sepia(1) saturate(1.25) hue-rotate(0deg) ' +
              'drop-shadow(0 0 ' + drop1 + 'px rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.95)) ' +
              'drop-shadow(0 0 ' + drop2 + 'px rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.62)) ' +
              'drop-shadow(0 0 ' + drop3 + 'px rgba(' + c.r + ',' + c.g + ',' + c.b + ',0.28)) ' +
              'brightness(' + bright.toFixed(2) + ')'
    };
  }

  function createLightningIcon(d, ageMs, fresh){
    var strength = lightningStrengthFor(d);
    var fx = buildBoltFilter(ageMs, strength, !!fresh);
    var cls = 'wdl-lightning-img' + (fresh ? ' wdl-lightning-live' : '');
    var width = fresh ? Math.round(38 + strength * 8) : Math.round(28 + strength * 6);
    var height = fresh ? Math.round(74 + strength * 14) : Math.round(56 + strength * 10);
    var html = '<img src="' + LIGHTNING_ICON_DATA_URL + '" class="' + cls + '" ' +
      'style="width:' + width + 'px;height:' + height + 'px;opacity:' + fx.opacity.toFixed(3) + ';filter:' + fx.filter + ';">';
    return L.divIcon({
      className:'wdl-lightning-icon',
      html: html,
      iconSize:[width, height],
      iconAnchor:[Math.round(width/2), Math.round(height*0.58)],
      popupAnchor:[0, -Math.round(height*0.42)]
    });
  }

  function clearLightningLayers(){
    try{ if (lightningFreshLayer && map.hasLayer(lightningFreshLayer)) map.removeLayer(lightningFreshLayer); }catch(e){}
    try{ if (lightningRecentLayer && map.hasLayer(lightningRecentLayer)) map.removeLayer(lightningRecentLayer); }catch(e){}
    try{ if (lightningDensityLayer && map.hasLayer(lightningDensityLayer)) map.removeLayer(lightningDensityLayer); }catch(e){}
    lightningFreshLayer = null;
    lightningRecentLayer = null;
    lightningDensityLayer = null;
    lightningFreshMarkerIndex = Object.create(null);
    lightningRecentMarkerIndex = Object.create(null);
    lightningDensityIndex = Object.create(null);
  }

  function ensureLightningCounter(){
    if (lightningCounterControl) return;
    lightningCounterControl = L.control({ position:'bottomleft' });
    lightningCounterControl.onAdd = function(){
      var div = L.DomUtil.create('div', 'lightning-counter');
      div.innerHTML = '';
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    lightningCounterControl.addTo(map);
  }

  function ensureLightningHistoryControl(){
    if (lightningHistoryControl) return;
    lightningHistoryControl = L.control({ position:'bottomleft' });
    lightningHistoryControl.onAdd = function(){
      var div = L.DomUtil.create('div', 'lightning-history-control');
      div.innerHTML =
        '<div class="lh-title">Lightning Track Window</div>' +
        '<div class="lh-row">' +
          '<input id="wdlLightningHistorySlider" type="range" min="5" max="60" step="5" value="' + lightningLookbackMin + '">' +
          '<span id="wdlLightningHistoryValue" class="lh-mins">' + lightningLookbackMin + ' min</span>' +
        '</div>' +
        '<label><input id="wdlLightningDensityToggle" type="checkbox"' + (lightningDensityEnabled ? ' checked' : '') + '> Storm track glow</label>';
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      setTimeout(function(){
        var slider = document.getElementById('wdlLightningHistorySlider');
        var value = document.getElementById('wdlLightningHistoryValue');
        var toggle = document.getElementById('wdlLightningDensityToggle');
        if (slider && !slider.__wdlBound){
          slider.__wdlBound = true;
          slider.addEventListener('input', function(){
            var mins = Number(slider.value) || 20;
            if (value) value.textContent = mins + ' min';
            setLightningLookbackMinutes(mins);
          });
        }
        if (toggle && !toggle.__wdlBound){
          toggle.__wdlBound = true;
          toggle.addEventListener('change', function(){
            setLightningDensityEnabled(!!toggle.checked);
          });
        }
      }, 0);
      return div;
    };
    lightningHistoryControl.addTo(map);
  }

  function syncLightningHistoryControl(){
    var slider = document.getElementById('wdlLightningHistorySlider');
    var value = document.getElementById('wdlLightningHistoryValue');
    var toggle = document.getElementById('wdlLightningDensityToggle');
    if (slider) slider.value = String(lightningLookbackMin);
    if (value) value.textContent = lightningLookbackMin + ' min';
    if (toggle) toggle.checked = !!lightningDensityEnabled;
  }

  function hideLightningCounter(){
    try{
      if (lightningCounterControl && lightningCounterControl.getContainer){
        var c = lightningCounterControl.getContainer();
        if (c) c.style.display = 'none';
      }
      if (lightningHistoryControl && lightningHistoryControl.getContainer){
        var h = lightningHistoryControl.getContainer();
        if (h) h.style.display = 'none';
      }
    }catch(e){}
  }

  function renderLightningCounter(nowCount, recentCount, last5Count, totalCount, jumpInfo){
    ensureLightningCounter();
    ensureLightningHistoryControl();
    syncLightningHistoryControl();
    var div = lightningCounterControl.getContainer();
    if (!div) return;
    div.style.display = '';
    var historyContainer = lightningHistoryControl && lightningHistoryControl.getContainer ? lightningHistoryControl.getContainer() : null;
    if (historyContainer) historyContainer.style.display = '';
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
      try{
        if (m && m.getElement) {
          var el = m.getElement();
          if (el) el.style.opacity = String(productOpacity.lightning);
        }
      }catch(e){}
    });
    Object.keys(lightningRecentMarkerIndex).forEach(function(k){
      var m = lightningRecentMarkerIndex[k];
      try{
        if (m && m.getElement) {
          var img = m.getElement().querySelector('img');
          if (img) img.style.opacity = String(Math.max(0.12, productOpacity.lightning));
        }
      }catch(e){}
    });
    Object.keys(lightningDensityIndex).forEach(function(k){
      var m = lightningDensityIndex[k];
      try{ if (m && m.setStyle) m.setStyle({ fillOpacity: Math.max(0.01, Math.min(0.15, productOpacity.lightning * 0.12)) }); }catch(e){}
    });
  }
  window.setLightningOpacity = setLightningOpacity;

  function upsertLightningFresh(fresh, nowMs){
    var seen = Object.create(null);
    if (!lightningFreshLayer){ lightningFreshLayer = L.layerGroup().addTo(map); }
    fresh.forEach(function(d){
      seen[d.id] = true;
      var ageMs = Math.max(0, nowMs - d.timeMs);
      var marker = lightningFreshMarkerIndex[d.id];
      var icon = createLightningIcon(d, ageMs, true);
      if (!marker){
        marker = L.marker([d.lat, d.lon], { icon:icon, keyboard:false, interactive:true });
        marker.bindPopup(buildLightningPopup(d), { className:'hrrr-popup' });
        lightningFreshMarkerIndex[d.id] = marker;
        lightningFreshLayer.addLayer(marker);
      } else {
        marker.setLatLng([d.lat, d.lon]);
        marker.setIcon(icon);
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
      var ageMs = Math.max(lightningFreshWindowMs + 1, nowMs - d.timeMs);
      var marker = lightningRecentMarkerIndex[d.id];
      var icon = createLightningIcon(d, ageMs, false);
      if (!marker){
        marker = L.marker([d.lat, d.lon], { icon:icon, keyboard:false, interactive:true });
        marker.bindPopup(buildLightningPopup(d), { className:'hrrr-popup' });
        lightningRecentMarkerIndex[d.id] = marker;
        lightningRecentLayer.addLayer(marker);
      } else {
        marker.setLatLng([d.lat, d.lon]);
        marker.setIcon(icon);
      }
      try{ var el = marker.getElement && marker.getElement(); if (el) el.style.opacity = String(Math.max(0.2, productOpacity.lightning || 0.9)); }catch(e){}
    });
    Object.keys(lightningRecentMarkerIndex).forEach(function(id){
      if (seen[id]) return;
      var marker = lightningRecentMarkerIndex[id];
      try{ if (lightningRecentLayer && marker) lightningRecentLayer.removeLayer(marker); }catch(e){}
      delete lightningRecentMarkerIndex[id];
    });
  }

  function upsertLightningDensity(recent, nowMs){
    if (!lightningDensityEnabled){
      if (lightningDensityLayer){ try{ map.removeLayer(lightningDensityLayer); }catch(e){} lightningDensityLayer = null; }
      lightningDensityIndex = Object.create(null);
      return;
    }
    var seen = Object.create(null);
    if (!lightningDensityLayer){ lightningDensityLayer = L.layerGroup().addTo(map); }
    recent.forEach(function(d){
      seen[d.id] = true;
      var ageMs = Math.max(0, nowMs - d.timeMs);
      var strength = lightningStrengthFor(d);
      var c = lightningAgeColor(ageMs);
      var op = Math.max(0.015, 0.11 * (1 - ageMs / lightningRecentWindowMs) * (0.75 + strength * 0.35));
      var rad = Math.max(16, Math.min(42, 14 + strength * 9 + (1 - ageMs / lightningRecentWindowMs) * 12));
      var marker = lightningDensityIndex[d.id];
      var style = {
        radius: rad,
        stroke: false,
        fillColor: 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')',
        fillOpacity: op * Math.max(0.4, productOpacity.lightning || 0.9)
      };
      if (!marker){
        marker = L.circleMarker([d.lat, d.lon], style);
        lightningDensityIndex[d.id] = marker;
        lightningDensityLayer.addLayer(marker);
      } else {
        marker.setLatLng([d.lat, d.lon]);
        marker.setStyle(style);
      }
    });
    Object.keys(lightningDensityIndex).forEach(function(id){
      if (seen[id]) return;
      var marker = lightningDensityIndex[id];
      try{ if (lightningDensityLayer && marker) lightningDensityLayer.removeLayer(marker); }catch(e){}
      delete lightningDensityIndex[id];
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
        var defaultLookback = Number(style.recentMinutes || 20);
        lightningLookbackMin = Math.max(5, Math.min(60, isFinite(defaultLookback) ? defaultLookback : 20));
        lightningRecentWindowMs = lightningLookbackMin * 60 * 1000;
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

  function setLightningLookbackMinutes(mins){
    mins = Math.max(5, Math.min(60, Number(mins) || 20));
    lightningLookbackMin = mins;
    lightningRecentWindowMs = mins * 60 * 1000;
    syncLightningHistoryControl();
    if (lightningEnabled) updateLightning();
    return lightningLookbackMin;
  }
  function getLightningLookbackMinutes(){
    return lightningLookbackMin;
  }
  function setLightningDensityEnabled(on){
    lightningDensityEnabled = !!on;
    window.lightningDensityEnabled = lightningDensityEnabled;
    syncLightningHistoryControl();
    if (lightningEnabled) updateLightning();
  }
  window.setLightningLookbackMinutes = setLightningLookbackMinutes;
  window.getLightningLookbackMinutes = getLightningLookbackMinutes;
  window.setLightningDensityEnabled = setLightningDensityEnabled;

  function updateLightning(){
    if (!lightningEnabled || !lightningEvents.length) return;
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
    var stamp = String(nowMs) + '|' + lightningLookbackMin + '|' + (lightningDensityEnabled ? 1 : 0) + '|' + fresh.map(function(d){ return d.id; }).join(',');
    var isNewFrame = stamp !== lightningLastRenderedStamp;
    lightningLastRenderedStamp = stamp;
    upsertLightningDensity(recent, nowMs);
    upsertLightningRecent(recent, nowMs);
    upsertLightningFresh(fresh, nowMs);
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
