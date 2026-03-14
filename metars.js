
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
  window.metarVisible = false;

  function syncWindowState(){
    window.metarVisible = metarVisible;
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
    var tempChip = '<span style="display:inline-block;padding:4px 8px;border-radius:999px;background:' + metarTempColorF(r.tmpf) + ';color:#122033;font:900 12px/1 \\"Lato\\",Arial,sans-serif;border:1px solid rgba(0,0,0,.18)">Temp ' + ((r.tmpf ?? '—')) + '°F</span>';
    var dewChip  = '<span style="display:inline-block;padding:4px 8px;border-radius:999px;background:#d9edf7;color:#122033;font:900 12px/1 \\"Lato\\",Arial,sans-serif;border:1px solid rgba(0,0,0,.12)">Dew ' + ((r.dwpf ?? '—')) + '°F</span>';
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
    metarLayer = group;
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
        syncWindowState();
        if (!metarLayer){
          if (!metarData.length) await loadMetars();
          metarLayer = buildMetarLayer();
        }
        refreshMetarLayer();
        requestAnimationFrame(function(){ if (metarVisible) refreshMetarLayer(); });
        setStatus('METARs on');
      }catch(err){
        metarVisible = false;
        syncWindowState();
        setStatus('METARs failed to load');
        console.error(err);
      }
    } else {
      if (metarLayer && map.hasLayer(metarLayer)) map.removeLayer(metarLayer);
      metarVisible = false;
      syncWindowState();
      setStatus('METARs off');
    }
    try{ updateProductLabel(); }catch(e){}
    try{ setTimeLabel(); }catch(e){}
  }

  async function toggleMetars(){
    await setMetarsEnabled(!metarVisible);
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
    isVisible:function(){ return metarVisible; },
    getLayer:function(){ return metarLayer; }
  };
};
