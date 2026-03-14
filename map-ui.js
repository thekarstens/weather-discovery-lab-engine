
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
  var toolHomeBtn    = document.getElementById("toolHome");
  var openLessonBtn  = document.getElementById("openLessonBtn");

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

  function clearDrawings(){
    try{ drawGroup.clearLayers(); }catch(e){}
  }

  function setDrawMode(on){
    if (!isTeacherMode){
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

  function startDraw(e){
    if (!document.body.classList.contains("draw-active")) return;
    if (!e || !e.latlng) return;
    drawing = true;
    currentLine = L.polyline([e.latlng], {
      color: "#fdd835", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round"
    }).addTo(drawGroup);
  }
  function moveDraw(e){
    if (!drawing || !currentLine || !e || !e.latlng) return;
    currentLine.addLatLng(e.latlng);
  }
  function endDraw(){
    if (!drawing) return;
    drawing = false;
    currentLine = null;
  }

  map.on("mousedown", startDraw);
  map.on("mousemove", moveDraw);
  map.on("mouseup", endDraw);
  map.on("touchstart", startDraw);
  map.on("touchmove", moveDraw);
  map.on("touchend", endDraw);

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
  if (toolHomeBtn) toolHomeBtn.onclick = function(){
    setMeasureMode(false); setProbeMode(false); setDrawMode(false);
    clearMeasureGraphics();
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
