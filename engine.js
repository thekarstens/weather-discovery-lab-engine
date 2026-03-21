// ===== ADD THIS BLOCK INTO YOUR ENGINE (Storm Reports Module) =====

// ---------- Storm Reports (LSR) ----------
var reportsEnabled = false;
var reportsManifest = null;
var reportsFeatures = [];
var reportsLayer = null;
var reportsLoadPromise = null;

function getReportsManifestUrl(){
  return _joinUrl(DATA_BASE, "reports/manifest.json");
}

async function loadReportsManifest(){
  if (reportsLoadPromise) return reportsLoadPromise;

  var url = getReportsManifestUrl();

  reportsLoadPromise = fetch(url + "?v=" + Date.now(), { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error("Reports manifest HTTP " + r.status);
      return r.json();
    })
    .then(async (manifest) => {
      reportsManifest = manifest;

      var entry = manifest.reports[0];
      var geoUrl = _joinUrl(DATA_BASE + "reports/", entry.file);

      const res = await fetch(geoUrl + "?v=" + Date.now(), { cache: "no-store" });
      const geo = await res.json();

      reportsFeatures = geo.features || [];

      return reportsFeatures;
    })
    .catch(err => {
      console.error("Reports load failed:", err);
      reportsLoadPromise = null;
    });

  return reportsLoadPromise;
}

function getReportTime(feature){
  return new Date(feature.properties.valid).getTime();
}

function filterReportsByTime(){
  var now = curZ.getTime();

  return reportsFeatures.filter(f => {
    var t = getReportTime(f);
    return isFinite(t) && t <= now;
  });
}

function styleReport(feature){
  var type = (feature.properties.type || "").toLowerCase();

  if (type.includes("tornado")) return { color: "#ff0000" };
  if (type.includes("hail")) return { color: "#00ff00" };
  if (type.includes("wind")) return { color: "#ffff00" };

  return { color: "#ffffff" };
}

function updateReportsLayer(){
  if (!reportsEnabled) {
    if (reportsLayer && map.hasLayer(reportsLayer)) {
      map.removeLayer(reportsLayer);
    }
    return;
  }

  var filtered = filterReportsByTime();

  if (reportsLayer) map.removeLayer(reportsLayer);

  reportsLayer = L.geoJSON(filtered, {
    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, {
        radius: 5,
        fillColor: styleReport(feature).color,
        color: "#000",
        weight: 1,
        fillOpacity: 0.9
      });
    },
    onEachFeature: function (feature, layer) {
      var p = feature.properties;

      var html = `
        <b>${p.type || "Report"}</b><br>
        Time: ${p.valid}<br>
        Location: ${p.city || ""}, ${p.state || ""}<br>
        Magnitude: ${p.magnitude || ""}<br>
        ${p.remark || ""}
      `;

      layer.bindPopup(html);
    }
  });

  reportsLayer.addTo(map);
}

async function toggleReports(){
  reportsEnabled = !reportsEnabled;

  if (reportsEnabled){
    await loadReportsManifest();
    updateReportsLayer();
    setStatus("Storm Reports ON");
  } else {
    updateReportsLayer();
    setStatus("Storm Reports OFF");
  }
}

// ===== ALSO ADD THIS LINE INSIDE updateAll() =====
// updateReportsLayer();
