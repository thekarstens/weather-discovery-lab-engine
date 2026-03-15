
window.createMetarsModule = function(opts){
  opts = opts || {};
  var map = opts.map;
  var CFG = opts.CFG || {};
  var DATA_BASE = opts.DATA_BASE || "./";
  var _isAbsUrl = opts._isAbsUrl || function(u){ return /^https?:\/\//i.test(String(u||"")); };
  var _joinUrl = opts._joinUrl || function(base, rel){
    if (!rel) return String(base || "");
    if (_isAbsUrl(rel)) return String(rel);
    var b = String(base || "");
    var r = String(rel).replace(/^\.\//, "").replace(/^\//, "");
    return (b.endsWith('/') ? b : (b + '/')) + r;
  };
  var setStatus = opts.setStatus || function(){};
  var updateProductLabel = opts.updateProductLabel || function(){};
  var setTimeLabel = opts.setTimeLabel || function(){};

  var metarLayer = null;
  var metarVisible = false;
  var metarData = [];
  var metarLoadPromise = null;
  var metarManifest = null;
  var metarManifestPromise = null;
  var metarTimeline = [];
  var currentMetarIndex = 0;
  var currentMetarFile = null;
  var currentMetarTime = null;
  window.metarVisible = false;
  window.currentMetarIndex = 0;

  function syncWindowState(){
    window.metarVisible = metarVisible;
  }

  var STATION_NAMES = {
    KFSD:"Sioux Falls", KSUX:"Sioux City", KOMA:"Omaha", KDSM:"Des Moines", KRST:"Rochester",
    KHON:"Huron", KPIR:"Pierre", KABR:"Aberdeen", KBKX:"Brookings", KYKN:"Yankton",
    KMKT:"Mankato", KMSP:"Minneapolis", KRWF:"Redwood Falls", KOTG:"Worthington",
    KSPW:"Spencer", KSLB:"Storm Lake", KALO:"Waterloo", KMCW:"Mason City", KICL:"Clarinda",
    KOFK:"Norfolk", KLNK:"Lincoln", KGRI:"Grand Island", KEAR:"Kearney", KATY:"Watertown",
    KMBG:"Mobridge", KPHP:"Philip", KRAP:"Rapid City", KCPR:"Casper", KDDC:"Dodge City",
    KGLD:"Goodland", CKP:"Cherokee"
  };

  function metarStationName(r){
    var id = String(r && (r.id || r.station || r.stid || '') || '').toUpperCase();
    return (r && (r.city || r.name)) || STATION_NAMES[id] || id || "Station";
  }

  function metarWindDirText(deg){
    var d = Number(deg);
    if (!isFinite(d)) return "";
    var dirs = ["N","NE","E","SE","S","SW","W","NW"];
    return dirs[Math.round(d / 45) % 8];
  }

  function metarWindText(r){
    var spd = Number(r && (r.sknt ?? r.wind_speed_kt));
    if (!isFinite(spd)) return "—";
    var mph = Math.round(spd * 1.15078);
    var dir = metarWindDirText(r && r.drct);
    var out = (dir ? dir + " " : "") + mph + " mph";
    var gust = Number(r && (r.gust ?? r.gust_kt));
    if (isFinite(gust)) out += " G" + Math.round(gust * 1.15078);
    return out;
  }

  function metarWindArrow(deg){
    var d = Number(deg);
    if (!isFinite(d)) return "•";
    var arrows = ["↑","↗","→","↘","↓","↙","←","↖"];
    return arrows[Math.round(d / 45) % 8];
  }

  function metarValidText(r){
    var raw = r && (r.valid || r.time || r.datetime || r.observed);
    if (!raw) return "—";
    var d = new Date(raw);
    if (isNaN(d)) return String(raw);
    var hh = d.getHours() % 12 || 12;
    var mm = String(d.getMinutes()).padStart(2, "0");
    var ampm = d.getHours() >= 12 ? "PM" : "AM";
    var month = d.toLocaleString("en-US", { month:"short" });
    var day = d.getDate();
    return month + " " + day + " • " + hh + ":" + mm + " " + ampm;
  }

  function metarBaroText(r){
    var v = Number(r && r.alti);
    return isFinite(v) ? v.toFixed(2) + '"' : "—";
  }

  function metarWindBarbSvg(r){
    var dir = Number(r && r.drct);
    var spd = Number(r && (r.sknt ?? r.wind_speed_kt));
    if (!isFinite(dir) || !isFinite(spd)) return '';
    var feathers = '';
    var y = 20;
    var knots = Math.round(spd / 5) * 5;
    while (knots >= 10){
      feathers += '<line x1="20" y1="' + y + '" x2="30" y2="' + (y+5) + '" stroke="#122033" stroke-width="2" stroke-linecap="round"/>';
      y -= 5;
      knots -= 10;
    }
    if (knots >= 5){
      feathers += '<line x1="20" y1="' + y + '" x2="26" y2="' + (y+3) + '" stroke="#122033" stroke-width="2" stroke-linecap="round"/>';
    }
    return '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" style="transform:rotate(' + dir + 'deg)">' +
      '<line x1="17" y1="28" x2="17" y2="6" stroke="#122033" stroke-width="2.4" stroke-linecap="round"/>' +
      feathers + '</svg>';
  }

  var metarAnimTimer = null;
  function stopMetarAnimation(){
    if (metarAnimTimer){
      clearInterval(metarAnimTimer);
      metarAnimTimer = null;
    }
  }
  function playMetarAnimation(ms){
    stopMetarAnimation();
    metarAnimTimer = setInterval(function(){
      try{
        if (window.stepActiveScrubber) {
          window.stepActiveScrubber(1);
        } else if (window.clickIf) {
          window.clickIf('cbFwdBtn');
        }
      }catch(e){}
    }, Math.max(400, ms || 1200));
  }

  function getMetarUrl(){
    try{
      if (!CFG || !CFG.metars) return null;
      var f = CFG.metars.file || CFG.metars.url || CFG.metars.fallbackFile || null;
      if (!f && CFG.metars.enabled) f = 'metars/metars.json';
      if (!f) return null;
      return _isAbsUrl(f) ? f : _joinUrl(DATA_BASE, f);
    }catch(e){
      return null;
    }
  }

  function getMetarManifestUrl(){
    try{
      if (!CFG || !CFG.metars) return null;
      var f = CFG.metars.manifest || CFG.metars.manifestFile || null;
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
    var name = metarStationName(r);
    var tempChip = '<span style="display:inline-block;padding:5px 11px;border-radius:999px;background:' + metarTempColorF(r.tmpf) + ';color:#122033;font:900 13px/1 Lato,Arial,sans-serif;border:1px solid rgba(0,0,0,.18)">Temp ' + ((r.tmpf ?? '—')) + '°F</span>';
    var dewChip  = '<span style="display:inline-block;padding:5px 11px;border-radius:999px;background:#d9edf7;color:#122033;font:900 13px/1 Lato,Arial,sans-serif;border:1px solid rgba(0,0,0,.12)">Dew ' + ((r.dwpf ?? '—')) + '°F</span>';
    var validTxt = metarValidText(r);
    var windTxt = metarWindText(r);
    var baroTxt = metarBaroText(r);
    var windArrow = metarWindArrow(r.drct);
    var windBarb = metarWindBarbSvg(r);

    return '<div class="hrrr-popup" style="min-width:250px;font-family:Lato,Arial,sans-serif;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">' +
        '<div style="font:900 19px/1.05 Lato,Arial,sans-serif;color:#202833;text-shadow:0 1px 0 rgba(255,255,255,.45);">' + name + '</div>' +
        '<div style="flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;background:rgba(255,255,255,.65);border:1px solid rgba(0,0,0,.10);">' + windBarb + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 10px 0">' + tempChip + dewChip + '</div>' +
      '<div style="font:900 14px/1.15 Lato,Arial,sans-serif;color:#243447;letter-spacing:.2px;margin-bottom:8px;">' + validTxt + '</div>' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font:800 13px/1.25 Lato,Arial,sans-serif;color:#28384b;">' +
        '<div style="opacity:.72;">Wind</div><div style="font-weight:900;">' + windArrow + ' ' + windTxt + '</div>' +
        '<div style="opacity:.72;">Visibility</div><div style="font-weight:900;">' + (r.vsby != null ? r.vsby + ' mi' : '—') + '</div>' +
        '<div style="opacity:.72;">Barometer</div><div style="font-weight:900;">' + baroTxt + '</div>' +
      '</div>' +
    '</div>';
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
      currentMetarFile = url;
      currentMetarTime = null;
      setStatus('METARs loaded: ' + metarData.length + ' stations');
      return metarData;
    }).catch(function(err){
      metarLoadPromise = null;
      setStatus('METAR load failed');
      throw err;
    });
    return metarLoadPromise;
  }

  async function loadMetarManifest(){
    if (metarManifest) return metarManifest;
    if (metarManifestPromise) return metarManifestPromise;
    var url = getMetarManifestUrl();
    if (!url) return null;
    metarManifestPromise = fetch(url, { cache:'no-store' }).then(function(r){
      if (!r.ok) throw new Error('METAR manifest HTTP ' + r.status + ' :: ' + url);
      return r.json();
    }).then(function(raw){
      metarManifest = raw || {};
      metarTimeline = Array.isArray(metarManifest.hours) ? metarManifest.hours.slice() : [];
      window.__METAR_TIMELINE__ = metarTimeline;
      return metarManifest;
    }).catch(function(err){
      metarManifestPromise = null;
      console.warn('METAR manifest load failed', err);
      return null;
    });
    return metarManifestPromise;
  }

  function metarEntryTime(entry){
    return Date.parse((entry && (entry.time || entry.utc || entry.valid)) || '');
  }

  function findNearestMetarEntryForTime(d){
    if (!metarManifest || !Array.isArray(metarManifest.hours) || !metarManifest.hours.length) return null;
    var target = (d instanceof Date) ? d.getTime() : Date.parse(d);
    if (!isFinite(target)) return metarManifest.hours[0] || null;
    var best = null;
    var bestDelta = Infinity;
    for (var i=0; i<metarManifest.hours.length; i++){
      var h = metarManifest.hours[i] || {};
      var t = Date.parse(h.time || h.utc || h.valid || '');
      if (!isFinite(t)) continue;
      var delta = Math.abs(t - target);
      if (delta < bestDelta){ bestDelta = delta; best = h; }
    }
    return best || metarManifest.hours[0] || null;
  }

  function findNearestMetarIndexForTime(d){
    if (!metarTimeline || !metarTimeline.length) return 0;
    var target = (d instanceof Date) ? d.getTime() : Date.parse(d);
    if (!isFinite(target)) return 0;
    var bestIdx = 0;
    var bestDelta = Infinity;
    for (var i=0; i<metarTimeline.length; i++){
      var t = metarEntryTime(metarTimeline[i]);
      if (!isFinite(t)) continue;
      var delta = Math.abs(t - target);
      if (delta < bestDelta){ bestDelta = delta; bestIdx = i; }
    }
    return bestIdx;
  }

  function setCurrentMetarIndex(idx){
    if (!metarTimeline || !metarTimeline.length) return;
    currentMetarIndex = Math.max(0, Math.min(metarTimeline.length - 1, idx|0));
    window.currentMetarIndex = currentMetarIndex;
    var entry = metarTimeline[currentMetarIndex];
    var t = metarEntryTime(entry);
    if (isFinite(t)) currentMetarTime = new Date(t).toISOString();
  }

  async function loadMetarsForTime(d){
    var manifest = await loadMetarManifest();
    if (!manifest || !Array.isArray(manifest.hours) || !manifest.hours.length){
      return loadMetars();
    }
    var entryIdx = findNearestMetarIndexForTime(d);
    setCurrentMetarIndex(entryIdx);
    var entry = metarTimeline[entryIdx] || findNearestMetarEntryForTime(d);
    if (!entry) return loadMetars();
    var rel = entry.file || entry.url || null;
    if (!rel) return loadMetars();
    var url = _isAbsUrl(rel) ? rel : _joinUrl(_joinUrl(DATA_BASE, 'metars/'), rel);
    if (currentMetarFile === url && Array.isArray(metarData) && metarData.length){
      currentMetarTime = entry.time || entry.utc || entry.valid || null;
      return metarData;
    }
    setStatus('Loading METARs ' + (entry.time || '') + '…');
    metarLoadPromise = fetch(url, { cache:'no-store' }).then(function(r){
      if (!r.ok) throw new Error('METAR HTTP ' + r.status + ' :: ' + url);
      return r.json();
    }).then(function(rows){
      metarData = Array.isArray(rows) ? rows : [];
      currentMetarFile = url;
      currentMetarTime = entry.time || entry.utc || entry.valid || null;
      setStatus('METARs loaded: ' + metarData.length + ' stations');
      return metarData;
    }).catch(function(err){
      metarLoadPromise = null;
      console.warn('Timed METAR load failed', err);
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
    metarLayer = group;
    return group;
  }

  function refreshMetarLayer(){
    if (!metarVisible) return;
    if (metarLayer && map.hasLayer(metarLayer)) map.removeLayer(metarLayer);
    metarLayer = buildMetarLayer();
    if (metarLayer) metarLayer.addTo(map);
  }


  function formatMetarHourLabel(entry){
    var t = metarEntryTime(entry);
    if (!isFinite(t)) return "METAR HOUR";
    var d = new Date(t);
    var hh = d.getHours() % 12 || 12;
    var ampm = d.getHours() >= 12 ? "PM" : "AM";
    return d.toLocaleString("en-US", { month:"short" }) + " " + d.getDate() + " • " + hh + ":00 " + ampm;
  }

  function ensureMetarControls(){
    var box = document.getElementById("metarHourControls");
    if (box) return box;

    box = document.createElement("div");
    box.id = "metarHourControls";
    box.className = "metar-hour-controls";
    box.innerHTML =
      '<div class="mhc-head">METAR HOURS</div>' +
      '<div class="mhc-row">' +
        '<button id="metarPrevBtn" class="mhc-btn" type="button">◀ HOUR</button>' +
        '<div id="metarHourLabel" class="mhc-label">—</div>' +
        '<button id="metarNextBtn" class="mhc-btn" type="button">HOUR ▶</button>' +
      '</div>';

    var target = document.body || document.documentElement;
    target.appendChild(box);

    var prev = document.getElementById("metarPrevBtn");
    var next = document.getElementById("metarNextBtn");

    if (prev) prev.onclick = async function(){
      if (!metarVisible) return;
      await stepMetarTime(-1);
      updateMetarControls();
    };
    if (next) next.onclick = async function(){
      if (!metarVisible) return;
      await stepMetarTime(1);
      updateMetarControls();
    };

    return box;
  }

  function updateMetarControls(){
    var box = ensureMetarControls();
    if (!box) return;
    box.style.display = metarVisible ? "" : "none";

    var label = document.getElementById("metarHourLabel");
    var prev = document.getElementById("metarPrevBtn");
    var next = document.getElementById("metarNextBtn");

    var timeline = metarTimeline || [];
    var idx = Math.max(0, Math.min(timeline.length - 1, currentMetarIndex|0));
    var entry = timeline[idx] || null;

    if (label) label.textContent = formatMetarHourLabel(entry);
    if (prev) prev.disabled = !(timeline.length && idx > 0);
    if (next) next.disabled = !(timeline.length && idx < timeline.length - 1);
  }

  async function loadMetarsAtIndex(idx){
    await loadMetarManifest();
    if (!metarTimeline || !metarTimeline.length) return false;
    setCurrentMetarIndex(idx);
    var entry = metarTimeline[currentMetarIndex];
    var t = metarEntryTime(entry);
    if (isFinite(t)){
      currentMetarTime = new Date(t).toISOString();
      try{ window.curZ = new Date(t); }catch(e){}
    }
    await loadMetarsForTime(new Date(t));
    if (metarVisible) refreshMetarLayer();
    updateMetarControls();
    return true;
  }

  async function setMetarsEnabled(on){
    var want = !!on;
    if (want){
      try{
        metarVisible = true;
        syncWindowState();

        // Simple mode: METARs use their own hour controls, not the shared bottom scrubber
        await loadMetarManifest();
        ensureMetarControls();

        if (metarTimeline && metarTimeline.length){
          await loadMetarsAtIndex(0);
        } else {
          await loadMetars();
          refreshMetarLayer();
        }

        updateMetarControls();
        requestAnimationFrame(function(){
          if (metarVisible) {
            try{ refreshMetarLayer(); }catch(e){}
            try{ updateMetarControls(); }catch(e){}
          }
        });

        setStatus('METARs on');
      }catch(err){
        metarVisible = false;
        syncWindowState();
        try{ updateMetarControls(); }catch(e){}
        setStatus('METARs failed to load');
        console.error(err);
      }
    } else {
      if (metarLayer && map.hasLayer(metarLayer)) map.removeLayer(metarLayer);
      metarVisible = false;
      syncWindowState();
      try{ updateMetarControls(); }catch(e){}
      setStatus('METARs off');
    }
    try{ updateProductLabel(); }catch(e){}
  }

  async function toggleMetars(){
    await setMetarsEnabled(!metarVisible);
  }

  async function stepMetarTime(delta){
    await loadMetarManifest();
    if (!metarTimeline || !metarTimeline.length) return false;
    var nextIdx = Math.max(0, Math.min(metarTimeline.length - 1, (currentMetarIndex|0) + delta));
    await loadMetarsAtIndex(nextIdx);
    return true;
  }

  function installMapEvents(){
    map.on('zoomend moveend', function(){
      if (metarVisible) refreshMetarLayer();
    });
  }

  return {
    getMetarUrl:getMetarUrl,
    metarTempColorF:metarTempColorF,
    metarOutlineColor:metarOutlineColor,
    metarPopupHtml:metarPopupHtml,
    loadMetars:loadMetars,
    metarMinSepForZoom:metarMinSepForZoom,
    buildMetarLayer:buildMetarLayer,
    refreshMetarLayer:refreshMetarLayer,
    setMetarsEnabled:setMetarsEnabled,
    toggleMetars:toggleMetars,
    installMapEvents:installMapEvents,
    playMetarAnimation:playMetarAnimation,
    stopMetarAnimation:stopMetarAnimation,
    stepMetarTime:stepMetarTime,
    loadMetarManifest:loadMetarManifest,
    loadMetarsForTime:loadMetarsForTime,
    findNearestMetarIndexForTime:findNearestMetarIndexForTime,
    setCurrentMetarIndex:setCurrentMetarIndex,
    updateMetarControls:updateMetarControls,
    loadMetarsAtIndex:loadMetarsAtIndex,
    getCurrentMetarIndex:function(){ return currentMetarIndex; },
    getTimeline:function(){ return metarTimeline || []; },
    isVisible:function(){ return metarVisible; },
    getLayer:function(){ return metarLayer; }
  };
};
