// --- Constants & Global Variables ---
const DATA_URL = 'npo_data_geocoded.json';
let npoData = [];
let map = null;
let markersCluster = null;
let npoMarkers = []; // { npo, marker }

// DOM Elements
const npoListEl = document.getElementById('npoList');
const resultNumberEl = document.getElementById('resultNumber');
const searchInput = document.getElementById('searchInput');
const regionButtonGroup = document.getElementById('regionButtonGroup');
const municipalityButtonGroup = document.getElementById('municipalityButtonGroup');
const categoryCheckboxes = document.getElementById('categoryCheckboxes');
const activityCountEl = document.getElementById('activityCount');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

let regionMap = new Map(); // Region -> Set(Municipalities)
let currentSelectedRegion = ''; // 現在選択されている地域
let currentSelectedMunicipality = ''; // 現在選択されている市町村

// 地域の区分定義
const OKINAWA_REGIONS = {
  "北部": ["名護市", "国頭郡国頭村", "国頭郡大宜味村", "国頭郡東村", "国頭郡今帰仁村", "国頭郡本部町", "国頭郡恩納村", "国頭郡宜野座村", "国頭郡金武町", "国頭村", "大宜味村", "東村", "今帰仁村", "本部町", "恩納村", "宜野座村", "金武町"],
  "中部": ["沖縄市", "うるま市", "浦添市", "宜野湾市", "中頭郡読谷村", "中頭郡嘉手納町", "中頭郡北谷町", "中頭郡北中城村", "中頭郡中城村", "中頭郡西原町", "読谷村", "嘉手納町", "北谷町", "北中城村", "中城村", "西原町"],
  "南部": ["那覇市", "糸満市", "豊見城市", "南城市", "島尻郡与那原町", "島尻郡南風原町", "島尻郡八重瀬町", "与那原町", "南風原町", "八重瀬町"],
  "離島": ["宮古島市", "石垣市", "島尻郡渡嘉敷村", "島尻郡座間味村", "島尻郡粟国村", "島尻郡渡名喜村", "島尻郡南大東村", "島尻郡北大東村", "島尻郡久米島町", "島尻郡伊平屋村", "島尻郡伊是名村", "宮古郡多良間村", "八重山郡竹富町", "八重山郡与那国町", "国頭郡伊江村", "伊江村", "渡嘉敷村", "座間味村", "粟国村", "渡名喜村", "南大東村", "北大東村", "久米島町", "伊平屋村", "伊是名村", "多良間村", "竹富町", "与那国町"]
};

// 地域カラー
const REGION_COLORS = {
  "北部": "#0ea5e9",
  "中部": "#10b981",
  "南部": "#f59e0b",
  "離島": "#8b5cf6",
  "その他": "#64748b"
};

// 市町村名からどの地域かを判定するヘルパー
function getRegionForMunicipality(munName) {
  if (!munName) return "その他";
  for (const [region, muns] of Object.entries(OKINAWA_REGIONS)) {
    if (muns.includes(munName)) return region;
  }
  return "その他";
}

// Define Okinawa bounds center roughly
const OKINAWA_CENTER = [26.4, 127.8];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadData();
  buildFilters();
  setupEventListeners();
  renderApp(); // initial render
});

function initMap() {
  map = L.map('map').setView(OKINAWA_CENTER, 10);

  // Clean, modern map tiles (CartoDB Voyager)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  markersCluster = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 40,
    spiderfyOnMaxZoom: true,
    polygonOptions: {
      fillColor: '#0d9488',
      color: '#0f766e',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.2
    }
  });

  map.addLayer(markersCluster);
}

async function loadData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Data fetch failed');
    npoData = await response.json();

    // Sort by name
    npoData.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  } catch (err) {
    console.error(err);
    npoListEl.innerHTML = `<div style="padding: 16px; color: red;">データの読み込みに失敗しました</div>`;
  }
}

function buildFilters() {
  const categories = new Set();
  regionMap = new Map();

  npoData.forEach(npo => {
    if (npo.municipality) {
      const region = getRegionForMunicipality(npo.municipality);

      if (!regionMap.has(region)) {
        regionMap.set(region, new Set());
      }
      regionMap.get(region).add(npo.municipality);
    }

    if (npo.categories) {
      npo.categories.forEach(c => categories.add(c));
    }
  });

  // Populate Region Buttons
  const sortedRegions = ["北部", "中部", "南部", "離島", "その他"].filter(r => regionMap.has(r));

  regionButtonGroup.innerHTML = '';

  // すべての地域ボタン
  const btnAll = document.createElement('button');
  btnAll.className = 'btn-region active';
  btnAll.textContent = 'すべて';
  btnAll.dataset.region = '';
  regionButtonGroup.appendChild(btnAll);

  sortedRegions.forEach(reg => {
    const btn = document.createElement('button');
    btn.className = 'btn-region';
    btn.textContent = reg;
    btn.dataset.region = reg;
    regionButtonGroup.appendChild(btn);
  });

  // Populate Activity Checkboxes
  const sortedCategories = Array.from(categories).sort();
  activityCountEl.textContent = sortedCategories.length;

  sortedCategories.forEach(cat => {
    const label = document.createElement('label');
    label.className = 'checkbox-item';
    label.innerHTML = `
      <input type="checkbox" value="${cat}" class="activity-filter">
      <span>${cat}</span>
    `;
    categoryCheckboxes.appendChild(label);
  });

  // Initial render of municipality buttons
  renderMunicipalityButtons();
}

// --- 市町村ボタン描画（トップレベル関数） ---
function renderMunicipalityButtons() {
  municipalityButtonGroup.innerHTML = '';

  if (currentSelectedRegion === '') {
    municipalityButtonGroup.innerHTML = '<span style="font-size: 13px; color: var(--text-muted); padding: 4px;">（先に地域を選択してください）</span>';
    return;
  }

  // すべての市町村ボタン
  const btnAll = document.createElement('button');
  btnAll.className = 'btn-region btn-mun active';
  btnAll.textContent = 'すべて';
  btnAll.dataset.mun = '';
  municipalityButtonGroup.appendChild(btnAll);

  const muns = Array.from(regionMap.get(currentSelectedRegion) || []).sort();
  muns.forEach(mun => {
    const btn = document.createElement('button');
    btn.className = 'btn-region btn-mun';
    // 郡名を省略して表示
    btn.textContent = mun.includes('郡') ? mun.split('郡')[1] : mun;
    btn.dataset.mun = mun;
    municipalityButtonGroup.appendChild(btn);
  });
}

function setupEventListeners() {
  searchInput.addEventListener('input', () => renderApp());

  // Event Delegation for Region Buttons
  regionButtonGroup.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-region')) {
      document.querySelectorAll('#regionButtonGroup .btn-region').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      currentSelectedRegion = e.target.dataset.region;
      currentSelectedMunicipality = '';

      renderMunicipalityButtons();
      renderApp();
    }
  });

  // Event Delegation for Municipality Buttons
  municipalityButtonGroup.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-mun')) {
      document.querySelectorAll('#municipalityButtonGroup .btn-mun').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      currentSelectedMunicipality = e.target.dataset.mun;
      renderApp();
    }
  });

  // Delegate event for dynamically created checkboxes
  categoryCheckboxes.addEventListener('change', (e) => {
    if (e.target.classList.contains('activity-filter')) {
      renderApp();
    }
  });

  clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';

    // reset region & municipality
    currentSelectedRegion = '';
    currentSelectedMunicipality = '';

    document.querySelectorAll('#regionButtonGroup .btn-region').forEach(b => {
      b.classList.remove('active');
      if (b.dataset.region === '') b.classList.add('active');
    });

    renderMunicipalityButtons();

    document.querySelectorAll('.activity-filter').forEach(cb => cb.checked = false);
    renderApp();
  });
}

function getFilteredData() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedRegion = currentSelectedRegion;
  const selectedMunicipality = currentSelectedMunicipality;

  // Get checked categories
  const checkedCategories = Array.from(document.querySelectorAll('.activity-filter:checked')).map(cb => cb.value);

  return npoData.filter(npo => {
    // Word match
    const matchName = npo.name && npo.name.toLowerCase().includes(searchTerm);
    const matchAddress = npo.address && npo.address.toLowerCase().includes(searchTerm);
    const passSearch = searchTerm === '' || matchName || matchAddress;

    // Region match
    const npoRegion = getRegionForMunicipality(npo.municipality);
    const passRegion = selectedRegion === '' || npoRegion === selectedRegion;

    // Municipality match
    const passMun = selectedMunicipality === '' || npo.municipality === selectedMunicipality;

    // Category match (OR logic)
    let passCat = true;
    if (checkedCategories.length > 0) {
      if (!npo.categories) {
        passCat = false;
      } else {
        passCat = checkedCategories.some(c => npo.categories.includes(c));
      }
    }

    return passSearch && passRegion && passMun && passCat;
  });
}

function renderApp() {
  const filteredData = getFilteredData();

  // Update UI Count
  resultNumberEl.textContent = filteredData.length;

  // Render List
  npoListEl.innerHTML = '';
  if (filteredData.length === 0) {
    npoListEl.innerHTML = `<div style="padding: 16px; color: #64748b; text-align: center;">条件に一致するNPOが見つかりません。</div>`;
  } else {
    const frag = document.createDocumentFragment();

    filteredData.forEach(npo => {
      const card = document.createElement('div');
      card.className = 'npo-card';

      const tagsHtml = (npo.categories || []).map((cat, idx) =>
        `<span class="tag ${idx === 0 ? 'primary' : ''}">${cat}</span>`
      ).join('');

      card.innerHTML = `
        <div class="npo-name">${npo.name}</div>
        <div class="npo-meta">
          <div class="npo-meta-item"><span>📍</span> ${npo.municipality}</div>
          <div class="npo-meta-item"><span>📅</span> ${npo.auth_date}</div>
        </div>
        <div class="npo-tags">${tagsHtml}</div>
        <div class="npo-links">
          <a href="https://www.google.com/search?q=${encodeURIComponent(npo.name + ' 沖縄 公式サイト')}" target="_blank" rel="noopener noreferrer" class="link-btn" title="Googleで公式サイトを検索" onclick="event.stopPropagation()">🌐 Web検索</a>
          <a href="https://www.instagram.com/explore/tags/${encodeURIComponent(npo.name)}/" target="_blank" rel="noopener noreferrer" class="link-btn" title="Instagramでタグ検索" onclick="event.stopPropagation()">📸 Insta</a>
          <a href="https://twitter.com/search?q=${encodeURIComponent(npo.name)}&src=typed_query" target="_blank" rel="noopener noreferrer" class="link-btn" title="X(Twitter)で検索" onclick="event.stopPropagation()">𝕏 X</a>
        </div>
      `;

      // Click focus
      card.addEventListener('click', () => {
        focusNpoOnMap(npo);
        document.querySelectorAll('.npo-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        // Scroll map into view on mobile
        if (window.innerWidth <= 768) {
          document.querySelector('.map-container').scrollIntoView({ behavior: 'smooth' });
        }
      });

      frag.appendChild(card);
    });
    npoListEl.appendChild(frag);
  }

  // Render Map Markers
  markersCluster.clearLayers();
  npoMarkers = [];

  const markers = [];
  let bounds = L.latLngBounds();

  filteredData.forEach(npo => {
    if (npo.lat && npo.lon) {
      const region = getRegionForMunicipality(npo.municipality);
      const color = REGION_COLORS[region] || REGION_COLORS["その他"];

      const tagsHtml = (npo.categories || []).map(cat => `<span class="tag">${cat}</span>`).join('');

      // 地域別カラーピン（SVG）
      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11]
      });

      const marker = L.marker([npo.lat, npo.lon], { icon: customIcon });

      const popupContent = `
        <div class="popup-npo-name">${npo.name}</div>
        <div class="popup-meta">🗺️ ${npo.municipality || ''}${npo.address || ''}</div>
        <div class="popup-meta">📅 認証日: ${npo.auth_date || '-'}</div>
        <div class="popup-tags">${tagsHtml}</div>
        <div class="popup-links">
          <a href="https://www.google.com/search?q=${encodeURIComponent(npo.name + ' 沖縄 公式サイト')}" target="_blank" rel="noopener noreferrer" class="link-btn-small">🌐 Web検索</a>
          <a href="https://www.instagram.com/explore/tags/${encodeURIComponent(npo.name)}/" target="_blank" rel="noopener noreferrer" class="link-btn-small">📸 Insta</a>
        </div>
      `;

      marker.bindPopup(popupContent);
      markers.push(marker);
      npoMarkers.push({ npo, marker });

      bounds.extend([npo.lat, npo.lon]);
    }
  });

  markersCluster.addLayers(markers);

  // Auto zoom to fit markers
  if (markers.length > 0) {
    if (markers.length === 1) {
      map.setView(bounds.getCenter(), 14);
    } else {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  } else {
    map.setView(OKINAWA_CENTER, 10);
  }
}

function focusNpoOnMap(npo) {
  const target = npoMarkers.find(item => item.npo.name === npo.name);
  if (target && target.marker) {
    markersCluster.zoomToShowLayer(target.marker, () => {
      map.setView(target.marker.getLatLng(), 15, { animate: true });
      target.marker.openPopup();
    });
  }
}
