
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
    KGLD:"Goodland", KSTC:"St. Cloud", KAXN:"Alexandria", KOTM:"Ottumwa", KAMW:"Ames",
    KCID:"Cedar Rapids", KDBQ:"Dubuque", KIOW:"Iowa City", KMXO:"Monticello", KDVN:"Davenport",
    KBNW:"Boone", KFFL:"Fairfield", KSHL:"Sheldon", KSDA:"Shenandoah", KAWG:"Washington",
    KFSW:"Fort Madison", KEST:"Estherville", KDEH:"Decorah", KDNS:"Denison", KCSQ:"Creston",
    KCCY:"Charles City", KCBF:"Council Bluffs", KOXB:"Osceola", KTNU:"Newton", KRDK:"Red Oak",
    KSUX:"Sioux City", KFOD:"Fort Dodge", KMIW:"Marshalltown", KMML:"Marshall", KFRM:"Fairmont",
    KRXE:"Roseau", KJMR:"Mora", KRWF:"Redwood Falls", KOTG:"Worthington", KMOX:"Morris",
    KDVP:"Slayton", KHCD:"Hutchinson", KGHW:"Glenwood", KTOB:"Dodge Center", KONA:"Winona",
    KMSN:"Madison", KLSE:"La Crosse", KJMS:"Jamestown", KBIS:"Bismarck", KDIK:"Dickinson",
    KISN:"Williston", KMOT:"Minot", KXWA:"Williston Basin", KGFK:"Grand Forks", KFAR:"Fargo",
    KBJI:"Bemidji", KTVF:"Thief River Falls", KPKD:"Park Rapids", KBRD:"Brainerd", KHIB:"Hibbing",
    KDLH:"Duluth", KRRT:"Warroad", KRGK:"Red Wing", KMHE:"Mitchell", K9V9:"Chamberlain",
    K8D3:"Sisseton", K6V4:"Wall", K5H4:"Harvey", KHEI:"Hettinger", KJHW:"Jamestown",
    KBUB:"Burwell", KBBW:"Broken Bow", KVTN:"Valentine", KAIA:"Alliance", KBFF:"Scottsbluff",
    KCDR:"Chadron", KIML:"Imperial", KMCK:"McCook", KHSI:"Hastings", KAHQ:"Wahoo",
    KJYR:"York", KSNY:"Sidney", KANW:"Ainsworth", KOLU:"Columbus", KJLN:"Joplin",
    KDDC:"Dodge City", KLBL:"Liberal", KGCK:"Garden City", KHYS:"Hays", KICT:"Wichita",
    KTOP:"Topeka", KFOE:"Topeka", KCNK:"Concordia", KGBD:"Great Bend", KHUT:"Hutchinson",
    CKP:"Cherokee",
    FSD:"Sioux Falls", SUX:"Sioux City", OMA:"Omaha", DSM:"Des Moines", RST:"Rochester",
    HON:"Huron", PIR:"Pierre", ABR:"Aberdeen", BKX:"Brookings", YKN:"Yankton",
    MKT:"Mankato", MSP:"Minneapolis", RWF:"Redwood Falls", OTG:"Worthington",
    SPW:"Spencer", SLB:"Storm Lake", ALO:"Waterloo", MCW:"Mason City", ICL:"Clarinda",
    OFK:"Norfolk", LNK:"Lincoln", GRI:"Grand Island", EAR:"Kearney", ATY:"Watertown",
    MBG:"Mobridge", PHP:"Philip", RAP:"Rapid City", CPR:"Casper", DDC:"Dodge City",
    GLD:"Goodland", STC:"St. Cloud", AXN:"Alexandria", OTM:"Ottumwa", AMW:"Ames",
    CID:"Cedar Rapids", DBQ:"Dubuque", IOW:"Iowa City", MXO:"Monticello", DVN:"Davenport",
    BNW:"Boone", FFL:"Fairfield", SHL:"Sheldon", SDA:"Shenandoah", AWG:"Washington",
    FSW:"Fort Madison", EST:"Estherville", DEH:"Decorah", DNS:"Denison", CSQ:"Creston",
    CCY:"Charles City", CBF:"Council Bluffs", OXB:"Osceola", TNU:"Newton", RDK:"Red Oak",
    FOD:"Fort Dodge", MIW:"Marshalltown", MML:"Marshall", FRM:"Fairmont", RXE:"Roseau",
    JMR:"Mora", MOX:"Morris", DVP:"Slayton", HCD:"Hutchinson", GHW:"Glenwood", TOB:"Dodge Center",
    ONA:"Winona", MSN:"Madison", LSE:"La Crosse", JMS:"Jamestown", BIS:"Bismarck",
    DIK:"Dickinson", ISN:"Williston", MOT:"Minot", GFK:"Grand Forks", FAR:"Fargo",
    BJI:"Bemidji", TVF:"Thief River Falls", PKD:"Park Rapids", BRD:"Brainerd", HIB:"Hibbing",
    DLH:"Duluth", RRT:"Warroad", RGK:"Red Wing", MHE:"Mitchell", BUB:"Burwell",
    BBW:"Broken Bow", VTN:"Valentine", AIA:"Alliance", BFF:"Scottsbluff", CDR:"Chadron",
    IML:"Imperial", MCK:"McCook", HSI:"Hastings", AHQ:"Wahoo", JYR:"York", SNY:"Sidney",
    ANW:"Ainsworth", OLU:"Columbus", LBL:"Liberal", GCK:"Garden City", HYS:"Hays",
    ICT:"Wichita", TOP:"Topeka", FOE:"Topeka", CNK:"Concordia", GBD:"Great Bend", HUT:"Hutchinson",
    LYV:"Luverne", LVN:"Airlake", JYG:"St. James", OWA:"Owatonna", STP:"St. Paul Downtown",
    FCM:"Flying Cloud", MIC:"Crystal", FBL:"Faribault", AQP:"Appleton", ETH:"Wheaton",
    BDE:"Baudette", CDD:"Crane Lake", FOZ:"Bigfork", XVG:"Longville", ORB:"Orr",
    DVP:"Slayton", CNB:"Canby", CKN:"Crookston", ICR:"Winner", CUT:"Custer",
    FNB:"Falls City", ODX:"Ord", TQE:"Tekamah", LWD:"Lamoni", HIB:"Hibbing",
    LYV:"Luverne", MCK:"McCook", BFF:"Scottsbluff", AIA:"Alliance", HEI:"Hettinger",
    IEN:"Pine Ridge", N60:"Garrison", JMR:"Mora", PKD:"Park Rapids", BRD:"Brainerd",
    AMW:"Ames", OTM:"Ottumwa", MCW:"Mason City", ALO:"Waterloo",
    "9V9":"Chamberlain", "8D3":"Sisseton", "6V4":"Wall", "5H4":"Harvey", "9MN":"Long Prairie"
  };

  function metarStationName(r){
    var rawId = String(r && (r.id || r.station || r.stid || r.sid || '') || '').toUpperCase().trim();
    var id = rawId;

    // Prefer any plain-language place fields coming from the data itself.
    var candidate = r && (r.city || r.name || r.town || r.station_name || r.location || r.site || r.label || '');
    candidate = String(candidate || '').trim();
    if (candidate && !/^[A-Z0-9]{3,4}$/.test(candidate)) return candidate;

    // Try common FAA prefixes/suffixes.
    if (id && !STATION_NAMES[id] && id.length === 3) {
      if (STATION_NAMES['K' + id]) id = 'K' + id;
      else if (STATION_NAMES['C' + id]) id = 'C' + id;
      else if (STATION_NAMES['P' + id]) id = 'P' + id;
    }
    if (id && !STATION_NAMES[id] && id.length === 4 && id[0] === 'K' && STATION_NAMES[id.slice(1)]) {
      id = id.slice(1);
    }

    return STATION_NAMES[id] || STATION_NAMES[rawId] || candidate || rawId || "Station";
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
    // Show the arrow pointing toward where the wind is blowing, not where it comes from.
    var arrows = ["↓","↙","←","↖","↑","↗","→","↘"];
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

  function metarRelativeHumidity(r){
    var t = Number(r && (r.tmpf ?? r.temp_f));
    var d = Number(r && (r.dwpf ?? r.dewpoint_f));
    if (!isFinite(t) || !isFinite(d)) return "—";
    var tc = (t - 32) * 5 / 9;
    var dc = (d - 32) * 5 / 9;
    var es = 6.112 * Math.exp((17.67 * tc) / (tc + 243.5));
    var e = 6.112 * Math.exp((17.67 * dc) / (dc + 243.5));
    var rh = Math.max(0, Math.min(100, Math.round((e / es) * 100)));
    return rh + "%";
  }

  function metarWeatherInfo(r){
    var raw = String(r && (r.wx || r.wxcodes || r.weather || r.wx_string || r.presentwx || '') || '').trim();
    if (!raw) return { icon: "⛅", label: "Fair / Clouds", raw: "" };

    var code = raw.toUpperCase();
    if (/(TS|VCTS|LTG)/.test(code)) return { icon: "⛈", label: "Thunderstorm", raw: raw };
    if (/(FZRA|PL|SN|BLSN|SG|IP)/.test(code)) return { icon: "🌨", label: "Snow / Ice", raw: raw };
    if (/(RA|SHRA|DZ)/.test(code)) return { icon: "🌧", label: "Rain", raw: raw };
    if (/(FG|BR|HZ|FU|DU|SA)/.test(code)) return { icon: "🌫", label: "Fog / Haze", raw: raw };
    if (/(OVC|BKN)/.test(code)) return { icon: "☁️", label: "Cloudy", raw: raw };
    if (/(SCT|FEW)/.test(code)) return { icon: "⛅", label: "Partly Cloudy", raw: raw };
    if (/(CLR|SKC)/.test(code)) return { icon: "☀️", label: "Sunny / Clear", raw: raw };

    return { icon: "⛅", label: raw, raw: raw };
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
    var rhTxt = metarRelativeHumidity(r);
    var wx = metarWeatherInfo(r);
    var windArrow = metarWindArrow(r.drct);
    var windBarb = metarWindBarbSvg(r);

    return '<div class="hrrr-popup" style="min-width:270px;font-family:Lato,Arial,sans-serif;">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">' +
        '<div style="font:900 19px/1.05 Lato,Arial,sans-serif;color:#202833;text-shadow:0 1px 0 rgba(255,255,255,.45);">' + name + '</div>' +
        '<div style="flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;background:rgba(255,255,255,.65);border:1px solid rgba(0,0,0,.10);">' + windBarb + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 8px 0">' + tempChip + dewChip + '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin:0 0 10px 0;padding:7px 10px;border-radius:12px;background:rgba(17,24,39,.05);border:1px solid rgba(0,0,0,.06);">' +
        '<div style="font-size:22px;line-height:1">' + wx.icon + '</div>' +
        '<div style="font:900 13px/1.15 Lato,Arial,sans-serif;color:#243447;">' + wx.label + '</div>' +
      '</div>' +
      '<div style="font:900 14px/1.15 Lato,Arial,sans-serif;color:#243447;letter-spacing:.2px;margin-bottom:8px;">' + validTxt + '</div>' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font:800 13px/1.25 Lato,Arial,sans-serif;color:#28384b;">' +
        '<div style="opacity:.72;">Wind</div><div style="font-weight:900;">' + windArrow + ' ' + windTxt + '</div>' +
        '<div style="opacity:.72;">Visibility</div><div style="font-weight:900;">' + (r.vsby != null ? r.vsby + ' mi' : '—') + '</div>' +
        '<div style="opacity:.72;">Humidity</div><div style="font-weight:900;">' + rhTxt + '</div>' +
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
