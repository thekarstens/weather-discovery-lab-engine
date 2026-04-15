
window.createMapUiModule = function(opts){
  opts = opts || {};
  var map = opts.map;
  var homeView = opts.homeView || { lat:43.55, lon:-96.73, zoom:6 };
  var storyPanelEl = opts.storyPanelEl || null;
  var openGuide = opts.openGuide || function(){};
  var closeGuide = opts.closeGuide || function(){};
  var getHrrrTempLayer = opts.getHrrrTempLayer || function(){ return null; };
  var getHrrrPoints = opts.getHrrrPoints || function(){ return []; };
  var isTeacherMode = opts.isTeacherMode !== false;

  var zoomCornerPlus = document.getElementById('zoomCornerPlus');
  var zoomCornerMinus = document.getElementById('zoomCornerMinus');
  if (zoomCornerPlus) zoomCornerPlus.onclick = function(){ map.zoomIn(); };
  if (zoomCornerMinus) zoomCornerMinus.onclick = function(){ map.zoomOut(); };

  var zoomPlus = document.getElementById("zoomPlus");
  var zoomMinus = document.getElementById("zoomMinus");
  if (zoomPlus) zoomPlus.onclick = function(){ map.zoomIn(); };
  if (zoomMinus) zoomMinus.onclick = function(){ map.zoomOut(); };

  var toolMeasureBtn = document.getElementById("toolMeasure");
  var toolProbeBtn   = document.getElementById("toolProbe");
  var toolDrawBtn    = document.getElementById("toolDraw");
  var toolEraseBtn   = document.getElementById("toolErase");
  var toolClearBtn   = document.getElementById("toolClear");
  var toolHomeBtn    = document.getElementById("toolHome");
  var openLessonBtn  = document.getElementById("openLessonBtn");
  var drawColorBtns  = Array.prototype.slice.call(document.querySelectorAll("[data-draw-color]"));

  var measureStart = null;
  var measureLine = null;
  var measureStartMarker = null;
  var measurePopup = null;

  function setToolActive(btn, on){
    if (!btn) return;
    btn.classList.toggle("active", !!on);
  }

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
      setToolActive(toolMeasureBtn, true);
      setToolActive(toolProbeBtn, false);
      setToolActive(toolDrawBtn, false);
    } else {
      document.body.classList.remove("measure-active");
      clearMeasureGraphics();
      setToolActive(toolMeasureBtn, false);
    }
  }

  function setProbeMode(on){
    if (on){
      document.body.classList.add("probe-active");
      document.body.classList.remove("measure-active");
      document.body.classList.remove("draw-active");
      setToolActive(toolProbeBtn, true);
      setToolActive(toolMeasureBtn, false);
      setToolActive(toolDrawBtn, false);
    } else {
      document.body.classList.remove("probe-active");
      setToolActive(toolProbeBtn, false);
    }
  }

  var drawGroup = L.layerGroup().addTo(map);
  var drawing = false;
  var currentLine = null;
  var currentDrawColor = "#fdd835";
  var drawOverlay = null;

  function setMapInteractionsEnabled(enabled){
    try{
      if (enabled){
        if (map.dragging) map.dragging.enable();
        if (map.touchZoom) map.touchZoom.enable();
        if (map.doubleClickZoom) map.doubleClickZoom.enable();
        if (map.boxZoom) map.boxZoom.enable();
        if (map.keyboard) map.keyboard.enable();
        if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
        if (map.tap && map.tap.enable) map.tap.enable();
      } else {
        if (map.dragging) map.dragging.disable();
        if (map.touchZoom) map.touchZoom.disable();
        if (map.doubleClickZoom) map.doubleClickZoom.disable();
        if (map.boxZoom) map.boxZoom.disable();
        if (map.keyboard) map.keyboard.disable();
        if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
        if (map.tap && map.tap.disable) map.tap.disable();
      }
    }catch(e){}
  }

  function setDrawColor(color){
    currentDrawColor = String(color || "#fdd835");
    drawColorBtns.forEach(function(btn){
      var c = String(btn.getAttribute("data-draw-color") || "").toLowerCase();
      btn.classList.toggle("is-active", c === currentDrawColor.toLowerCase());
    });
  }

  function clearDrawings(){
    try{ drawGroup.clearLayers(); }catch(e){}
  }

  function ensureDrawOverlay(){
    if (drawOverlay) return drawOverlay;
    var mapPane = map && map.getPanes ? map.getPanes().overlayPane : null;
    if (!mapPane) return null;

    drawOverlay = document.createElement("div");
    drawOverlay.id = "drawCaptureOverlay";
    drawOverlay.style.position = "absolute";
    drawOverlay.style.left = "0";
    drawOverlay.style.top = "0";
    drawOverlay.style.width = "100%";
    drawOverlay.style.height = "100%";
    drawOverlay.style.pointerEvents = "none";
    drawOverlay.style.touchAction = "none";
    drawOverlay.style.cursor = "crosshair";
    drawOverlay.style.zIndex = "399";
    drawOverlay.style.background = "transparent";
    mapPane.appendChild(drawOverlay);

    function eventLatLng(ev){
      try{
        var src = (ev.touches && ev.touches.length) ? ev.touches[0] :
                  ((ev.changedTouches && ev.changedTouches.length) ? ev.changedTouches[0] : ev);
        var rect = drawOverlay.getBoundingClientRect();
        var pt = L.point(src.clientX - rect.left, src.clientY - rect.top);
        return map.containerPointToLatLng(pt);
      }catch(e){
        return null;
      }
    }

    function begin(ev){
      if (!document.body.classList.contains("draw-active")) return;
      ev.preventDefault();
      ev.stopPropagation();
      var ll = eventLatLng(ev);
      if (!ll) return;
      drawing = true;
      currentLine = L.polyline([ll], {
        color: currentDrawColor,
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(drawGroup);
    }

    function move(ev){
      if (!document.body.classList.contains("draw-active") || !drawing || !currentLine) return;
      ev.preventDefault();
      ev.stopPropagation();
      var ll = eventLatLng(ev);
      if (!ll) return;
      currentLine.addLatLng(ll);
    }

    function end(ev){
      if (!document.body.classList.contains("draw-active") || !drawing) return;
      ev.preventDefault();
      ev.stopPropagation();
      drawing = false;
      currentLine = null;
    }

    ["mousedown","touchstart","pointerdown"].forEach(function(name){
      drawOverlay.addEventListener(name, begin, { passive:false });
    });
    ["mousemove","touchmove","pointermove"].forEach(function(name){
      drawOverlay.addEventListener(name, move, { passive:false });
    });
    ["mouseup","mouseleave","touchend","touchcancel","pointerup","pointercancel"].forEach(function(name){
      drawOverlay.addEventListener(name, end, { passive:false });
    });
    ["click","dblclick","contextmenu"].forEach(function(name){
      drawOverlay.addEventListener(name, function(ev){
        if (!document.body.classList.contains("draw-active")) return;
        ev.preventDefault();
        ev.stopPropagation();
      }, { passive:false });
    });

    return drawOverlay;
  }

  function setDrawMode(on){
    if (!isTeacherMode){
      setToolActive(toolDrawBtn, false);
      setToolActive(toolEraseBtn, false);
      document.body.classList.remove("draw-active");
      return;
    }
    ensureDrawOverlay();
    if (on){
      document.body.classList.add("draw-active");
      document.body.classList.remove("measure-active");
      document.body.classList.remove("probe-active");
      setToolActive(toolDrawBtn, true);
      setToolActive(toolEraseBtn, true);
      setToolActive(toolMeasureBtn, false);
      setToolActive(toolProbeBtn, false);
      setMapInteractionsEnabled(false);
      if (drawOverlay) drawOverlay.style.pointerEvents = "auto";
    } else {
      document.body.classList.remove("draw-active");
      setToolActive(toolDrawBtn, false);
      setToolActive(toolEraseBtn, false);
      drawing = false;
      currentLine = null;
      if (drawOverlay) drawOverlay.style.pointerEvents = "none";
      setMapInteractionsEnabled(true);
    }
  }

  function handleMeasureClick(e){
    if (!e || !e.latlng) return;
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
    measureStart = null;
  }

  function handleProbeClick(e){
    if (!e || !e.latlng) return;
    var hrrrTempLayer = getHrrrTempLayer();
    var hrrrPoints = getHrrrPoints();
    try{
      if (!(hrrrTempLayer && map.hasLayer(hrrrTempLayer) && Array.isArray(hrrrPoints) && hrrrPoints.length)){
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

  drawColorBtns.forEach(function(btn){
    btn.onclick = function(ev){
      try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){}
      setDrawColor(btn.getAttribute("data-draw-color") || "#fdd835");
      if (!document.body.classList.contains("draw-active")) setDrawMode(true);
    };
    btn.addEventListener("mousedown", function(ev){ try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){} }, { passive:false });
    btn.addEventListener("touchstart", function(ev){ try{ ev.preventDefault(); ev.stopPropagation(); }catch(e){} }, { passive:false });
  });

  if (toolMeasureBtn) toolMeasureBtn.onclick = function(){
    var on = !document.body.classList.contains("measure-active");
    setMeasureMode(on);
    if (on) setDrawMode(false);
  };
  if (toolProbeBtn) toolProbeBtn.onclick = function(){
    try{
      var hrrrTempLayer = getHrrrTempLayer();
      if (!(map && hrrrTempLayer && map.hasLayer(hrrrTempLayer))){
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
  if (toolClearBtn) toolClearBtn.onclick = function(){
    clearDrawings();
    clearMeasureGraphics();
  };
  if (toolHomeBtn) toolHomeBtn.onclick = function(){
    setMeasureMode(false); setProbeMode(false); setDrawMode(false);
    clearMeasureGraphics();
    clearDrawings();
    map.setView([homeView.lat, homeView.lon], homeView.zoom);
  };
  if (openLessonBtn){
    openLessonBtn.onclick = function(){
      try{
        if (storyPanelEl && storyPanelEl.classList.contains("story-open")) closeGuide();
        else openGuide();
      }catch(e){}
    };
  }

  const zIn = document.getElementById("zoomInBtn");
  const zOut = document.getElementById("zoomOutBtn");
  if (zIn) zIn.onclick = function(){ map.zoomIn(); };
  if (zOut) zOut.onclick = function(){ map.zoomOut(); };

  setDrawColor(currentDrawColor);
  window.setDrawMode = setDrawMode;
  window.setDrawColor = setDrawColor;

  return {
    setMeasureMode:setMeasureMode,
    setProbeMode:setProbeMode,
    setDrawMode:setDrawMode,
    clearMeasureGraphics:clearMeasureGraphics,
    handleMeasureClick:handleMeasureClick,
    handleProbeClick:handleProbeClick,
    clearDrawings:clearDrawings
  };
};
