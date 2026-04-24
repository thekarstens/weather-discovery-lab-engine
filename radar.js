
window.createRadarModule = function(opts){
  opts = opts || {};
  var map = opts.map;
  var L = opts.L || window.L;
  var getRadarBounds = opts.getRadarBounds || function(){ return null; };
  var getRadarManifest = opts.getRadarManifest || function(){ return null; };
  var getRadarUrl = opts.getRadarUrl || function(){ return null; };
  var getCurrentTime = opts.getCurrentTime || function(){ return new Date(); };
  var getProductOpacity = opts.getProductOpacity || function(){ return { radar:0.7 }; };
  var applyActiveOpacity = opts.applyActiveOpacity || function(){};
  var setStatus = opts.setStatus || function(){};

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
  var radarLoadToken = 0;
  var radarLastRequestedUrl = "";
  var radarLastGoodUrl = "";

  var radarSweepRPM = 2;
  var radarSweepBeamPx = 1;
  var radarSweepRangeMiles = 186;

  window.obsRadarEnabled = obsRadarEnabled;
  window.radarSweepEnabled = radarSweepEnabled;

  function syncWindowState(){
    window.obsRadarEnabled = obsRadarEnabled;
    window.radarSweepEnabled = radarSweepEnabled;
  }

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
    radarSweepCanvas.style.opacity = String((getProductOpacity() && getProductOpacity().radar) || 0.7);
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

  function resetRadarSweepState(){
    radarSweepLastTs = 0;
    radarSweepStartAngle = -Math.PI / 2;
    radarSweepSwept = 0;
    radarSweepCompleted = false;
    radarSweepAngle = radarSweepStartAngle;
  }

  function hideRadarSweepCanvas(){
    stopRadarSweep();
    resetRadarSweepState();
    if (radarSweepCanvas){
      radarSweepCanvas.style.display = 'none';
      if (radarSweepCtx) radarSweepCtx.clearRect(0,0,radarSweepCanvas.width,radarSweepCanvas.height);
    }
    if (radarSweepBeamCanvas){
      radarSweepBeamCanvas.style.display = 'none';
      if (radarSweepBeamCtx) radarSweepBeamCtx.clearRect(0,0,radarSweepBeamCanvas.width,radarSweepBeamCanvas.height);
    }
  }

function updateSweepUi(){
  ['storyDopplerBtn','exploreDopplerBtn'].forEach(function(id){
    var btn = document.getElementById(id);
    if (btn){
      btn.textContent = radarSweepEnabled ? 'LIVE Doppler ON' : 'LIVE Doppler OFF';
      btn.classList.remove('active');
      btn.classList.remove('pulsing');
      if (radarSweepEnabled) btn.classList.add('active');
      else btn.classList.add('pulsing');
      btn.style.display = 'inline-flex';
    }
  });
  try {
    window.dispatchEvent(new CustomEvent('wdl:dopplerchange', { detail: { enabled: !!radarSweepEnabled } }));
  } catch (e) {}
  var panel = document.getElementById('radarSweepControls');
  if (panel) panel.classList.toggle('open', !!radarSweepEnabled);
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
    var range = document.getElementById('sweepRangeSlider');
    if (range){
      range.value = String(radarSweepRangeMiles);
      range.oninput = function(){
        radarSweepRangeMiles = Math.max(25, Math.min(186, parseInt(this.value || '186', 10)));
        if (radarSweepEnabled && radarSweepImage) renderRadarSweepCurrentState();
      };
    }
    updateSweepUi();
  }

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

  function getRadarSweepCenterLatLng(){
    try{
      var manifest = getRadarManifest();
      if (manifest && Array.isArray(manifest.radar_latlon) && manifest.radar_latlon.length === 2){
        return L.latLng(manifest.radar_latlon[0], manifest.radar_latlon[1]);
      }
    }catch(e){}
    var b = getRadarBounds();
    return b ? b.getCenter() : map.getCenter();
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
    var bounds = getRadarBounds();
    var nw = map.latLngToLayerPoint(bounds.getNorthWest());
    var se = map.latLngToLayerPoint(bounds.getSouthEast());
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
    for (var i = 1; i < sectorPts.length; i++) radarSweepCtx.lineTo(sectorPts[i].x, sectorPts[i].y);
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

  function startRadarSweep(){
    ensureRadarSweepCanvas();
    if (!radarSweepEnabled || !radarSweepImage || !radarSweepCtx || !obsRadarEnabled) return;
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

  async function setRadarEnabled(on){
    obsRadarEnabled = !!on;
    syncWindowState();
    if (!obsRadarEnabled){
      hideRadarSweepCanvas();
      if (obsRadarOverlay && map.hasLayer(obsRadarOverlay)) map.removeLayer(obsRadarOverlay);
      setStatus('Radar off');
    } else {
      radarSweepEnabled = false;
      syncWindowState();
      syncSweepButton();
      updateRadar();
      setStatus('Radar on');
    }
  }

  function updateRadar(){
    if (!obsRadarEnabled){
      hideRadarSweepCanvas();
      if (obsRadarOverlay){ try{ map.removeLayer(obsRadarOverlay); }catch(e){} obsRadarOverlay = null; }
      radarLastRequestedUrl = "";
      return;
    }

    var url = getRadarUrl(getCurrentTime());
    if (!url) return;

    if (url === radarLastGoodUrl && obsRadarOverlay && !radarSweepEnabled){
      return;
    }

    if (radarSweepEnabled && url === radarSweepImageUrl && radarSweepImage){
      ensureRadarSweepCanvas();
      if (radarSweepCanvas) radarSweepCanvas.style.display = 'block';
      if (radarSweepBeamCanvas) radarSweepBeamCanvas.style.display = 'block';
      startRadarSweep();
      updateSweepUi();
      return;
    }

    if (url === radarLastRequestedUrl){
      return;
    }

    radarLastRequestedUrl = url;
    var myToken = ++radarLoadToken;
    var img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = function(){
      if (myToken !== radarLoadToken) return;

      radarSweepImage = img;
      radarSweepImageUrl = url;
      radarLastGoodUrl = url;
      radarLastRequestedUrl = "";

      var op = 0.70;
      var rs = document.getElementById("radarOpacity");
      if (rs){
        op = Math.max(0.2, Math.min(1, parseInt(rs.value || "70", 10) / 100));
      }

      if (radarSweepEnabled){
        if (obsRadarOverlay && map.hasLayer(obsRadarOverlay)){
          try{ map.removeLayer(obsRadarOverlay); }catch(e){}
        }
        obsRadarOverlay = null;
        ensureRadarSweepCanvas();
        radarSweepCanvas.style.opacity = String(op);
        startRadarSweep();
        updateSweepUi();
        setStatus("Radar sweep: " + url);
        return;
      }

      hideRadarSweepCanvas();
      updateSweepUi();

      if (!obsRadarOverlay){
        obsRadarOverlay = L.imageOverlay(url, getRadarBounds(), { opacity: op, interactive:false });
        obsRadarOverlay.addTo(map);
      } else {
        obsRadarOverlay.setUrl(url);
        obsRadarOverlay.setBounds(getRadarBounds());
        obsRadarOverlay.setOpacity(op);
      }

      applyActiveOpacity();
      setStatus("Radar: " + url);
    };

    img.onerror = function(){
      if (myToken !== radarLoadToken) return;
      radarLastRequestedUrl = "";
      setStatus("Radar missing: " + url + " (holding last good frame)");
    };

    img.src = url;
  }

  function toggleSweep(){
    radarSweepEnabled = !radarSweepEnabled;
    syncWindowState();
    syncSweepButton();
    updateSweepUi();

    if (!radarSweepEnabled){
      stopRadarSweep();
      hideRadarSweepCanvas();
      updateRadar();
      return;
    }

    if (obsRadarOverlay && map.hasLayer(obsRadarOverlay)){
      try{ map.removeLayer(obsRadarOverlay); }catch(e){}
      obsRadarOverlay = null;
    }

    ensureRadarSweepCanvas();

    if (radarSweepImage){
      if (radarSweepCanvas) radarSweepCanvas.style.display = 'block';
      if (radarSweepBeamCanvas) radarSweepBeamCanvas.style.display = 'block';
      startRadarSweep();
      setStatus("Radar sweep on");
    } else {
      updateRadar();
    }
  }

function syncSweepButton(){
  syncWindowState();
  ['storyDopplerBtn','exploreDopplerBtn','sweepToggleBtn'].forEach(function(id){
    var btn = document.getElementById(id);
    if (btn){
      btn.textContent = radarSweepEnabled ? "LIVE Doppler ON" : "LIVE Doppler OFF";
      btn.classList.toggle("active", !!radarSweepEnabled);
      btn.classList.toggle("pulsing", !radarSweepEnabled);
    }
  });
}

  function installMapEvents(){
    map.on('zoom move resize', function(){
      resizeRadarSweepCanvas();
      if (radarSweepEnabled && radarSweepImage){
        if (radarSweepCanvas) radarSweepCanvas.style.display = 'block';
        if (radarSweepBeamCanvas) radarSweepBeamCanvas.style.display = 'block';
        renderRadarSweepCurrentState();
      }
    });
  }

  bindSweepControls();
  syncSweepButton();
  installMapEvents();

  return {
    stopRadarSweep: stopRadarSweep,
    ensureRadarSweepCanvas: ensureRadarSweepCanvas,
    resizeRadarSweepCanvas: resizeRadarSweepCanvas,
    hideRadarSweepCanvas: hideRadarSweepCanvas,
    updateSweepUi: updateSweepUi,
    bindSweepControls: bindSweepControls,
    getRadarSweepCenterLatLng: getRadarSweepCenterLatLng,
    getRadarSweepCenterPoint: getRadarSweepCenterPoint,
    getRadarSweepRangePx: getRadarSweepRangePx,
    getRadarSweepEndpointPoint: getRadarSweepEndpointPoint,
    buildRadarSweepSectorPoints: buildRadarSweepSectorPoints,
    getRadarSweepDrawState: getRadarSweepDrawState,
    renderRadarSweepCurrentState: renderRadarSweepCurrentState,
    resetRadarSweepState: resetRadarSweepState,
    startRadarSweep: startRadarSweep,
    setRadarEnabled: setRadarEnabled,
    updateRadar: updateRadar,
    toggleSweep: toggleSweep,
    syncSweepButton: syncSweepButton,
    installMapEvents: installMapEvents,
    getObsRadarEnabled: function(){ return obsRadarEnabled; },
    getRadarSweepEnabled: function(){ return radarSweepEnabled; },
    getOverlay: function(){ return obsRadarOverlay; }
  };
};
