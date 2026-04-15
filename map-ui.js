window.createMapUiModule = function(opts){
  opts = opts || {};
  var map = opts.map;
  var homeView = opts.homeView || { lat:43.55, lon:-96.73, zoom:6 };

  var zoomCornerPlus = document.getElementById('zoomCornerPlus');
  var zoomCornerMinus = document.getElementById('zoomCornerMinus');
  if (zoomCornerPlus) zoomCornerPlus.onclick = function(){ map.zoomIn(); };
  if (zoomCornerMinus) zoomCornerMinus.onclick = function(){ map.zoomOut(); };

  var zoomPlus = document.getElementById("zoomPlus");
  var zoomMinus = document.getElementById("zoomMinus");
  if (zoomPlus) zoomPlus.onclick = function(){ map.zoomIn(); };
  if (zoomMinus) zoomMinus.onclick = function(){ map.zoomOut(); };

  function noop(){}

  // IMPORTANT:
  // The engine file owns the tool buttons (measure/probe/track/draw/home).
  // This module intentionally does not bind those controls, so it does not
  // compete with the engine telestrator / storm-track handlers.

  return {
    setMeasureMode: noop,
    setProbeMode: noop,
    setDrawMode: noop,
    clearMeasureGraphics: noop,
    handleMeasureClick: noop,
    handleProbeClick: noop,
    clearDrawings: noop
  };
};
