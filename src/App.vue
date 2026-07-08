<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const currentYear = new Date().getFullYear()
const mapContainer = ref(null)
const loadError = ref('')
const mapReady = ref(false)
const emptyCollection = { type: 'FeatureCollection', features: [] }
const dataUrls = {
  events: new URL('../GIS_DATA/Wuhan_events.json', import.meta.url).href,
  bridges: new URL('../GIS_DATA/Wuhan_bridge.json', import.meta.url).href,
  roads: new URL('../GIS_DATA/Wuhan_roads.json', import.meta.url).href,
  routes: new URL('../GIS_DATA/fly_path.json', import.meta.url).href,
  destinations: new URL('../GIS_DATA/fly_end.json', import.meta.url).href,
}
const cityData = ref({
  events: emptyCollection,
  bridges: emptyCollection,
  roads: emptyCollection,
  routes: emptyCollection,
  destinations: emptyCollection,
})
let map

function getFeatures(collection) {
  return Array.isArray(collection?.features) ? collection.features : []
}

function featureCollection(features) {
  return { type: 'FeatureCollection', features }
}

function limitedFeatureCollection(collection, limit) {
  return featureCollection(getFeatures(collection).slice(0, limit))
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function loadCollection(key, label) {
  try {
    const response = await fetch(dataUrls[key])
    if (!response.ok) {
      throw new Error(`${label} returned ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    loadError.value = `${label} failed to load`
    console.warn(error)
    return emptyCollection
  }
}

const events = computed(() => getFeatures(cityData.value.events))
const bridges = computed(() => getFeatures(cityData.value.bridges))
const roads = computed(() => getFeatures(cityData.value.roads))
const routes = computed(() => getFeatures(cityData.value.routes))
const destinations = computed(() => getFeatures(cityData.value.destinations))
const renderedRoadLimit = 900
const renderedRoads = computed(() => Math.min(roads.value.length, renderedRoadLimit))

const levels = computed(() => Object.entries(
  events.value.reduce((acc, event) => {
    const level = event.properties?.level ?? 'unknown'
    acc[level] = (acc[level] ?? 0) + 1
    return acc
  }, {}),
).sort(([a], [b]) => String(a).localeCompare(String(b), 'zh-Hans-CN')))

const eventAreas = computed(() => events.value.reduce((acc, event) => {
  const area = event.properties?.area ?? '未分区'
  acc[area] = (acc[area] ?? 0) + 1
  return acc
}, {}))

const topAreas = computed(() => Object.entries(eventAreas.value)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 4))

const outboundTotal = computed(() => destinations.value.reduce((sum, item) => {
  return sum + toFiniteNumber(item.properties?.outboundAmount)
}, 0))

const maxEventCount = computed(() => Math.max(events.value.length, 1))
const dataWarnings = computed(() => [
  loadError.value,
  !mapReady.value ? 'Loading map data' : '',
  events.value.length === 0 && mapReady.value ? 'Event dataset is empty' : '',
  bridges.value.length === 0 && mapReady.value ? 'Bridge dataset is empty' : '',
  roads.value.length === 0 && mapReady.value ? 'Road dataset is empty' : '',
  roads.value.length > renderedRoadLimit ? `Road layer sampled: ${renderedRoads.value}/${roads.value.length}` : '',
].filter(Boolean))

const metrics = computed(() => [
  { label: '事件点位', value: events.value.length, unit: 'points' },
  { label: '道路要素', value: roads.value.length, unit: 'features' },
  { label: '过江桥梁', value: bridges.value.length, unit: 'bridges' },
  { label: '航线模拟', value: routes.value.length, unit: 'routes' },
  { label: '出境金额', value: outboundTotal.value.toFixed(1), unit: '$10k' },
])

const layerStack = [
  'OpenStreetMap raster base tiles',
  'Leaflet GeoJSON road and bridge layers',
  'Traffic event circle markers with popups',
  'Runtime-loaded local GeoJSON assets',
  '3D model assets kept for scene extension',
]

function addMapLayers() {
  if (!map) return

  const roadsLayer = L.geoJSON(limitedFeatureCollection(cityData.value.roads, renderedRoadLimit), {
    style: {
      color: '#2f80ed',
      opacity: 0.42,
      weight: 1.2,
    },
  })

  const bridgeLayer = L.geoJSON(cityData.value.bridges, {
    style: {
      color: '#f59e0b',
      opacity: 0.95,
      weight: 5,
    },
    onEachFeature(feature, layer) {
      const name = escapeHtml(feature.properties?.name ?? 'Bridge')
      const info = escapeHtml(feature.properties?.info ?? '').slice(0, 180)
      layer.bindPopup(`<strong>${name}</strong><br>${info}`)
    },
  })

  const eventLayer = L.geoJSON(cityData.value.events, {
    pointToLayer(feature, latlng) {
      const level = toFiniteNumber(feature.properties?.level, 1)
      return L.circleMarker(latlng, {
        radius: 5 + level,
        color: '#b91c1c',
        fillColor: '#ef4444',
        fillOpacity: 0.82,
        weight: 1,
      })
    },
    onEachFeature(feature, layer) {
      const p = feature.properties ?? {}
      layer.bindPopup(
        `<strong>${escapeHtml(p.name ?? 'Event')}</strong><br>` +
          `Level: ${escapeHtml(p.level ?? '-')}` +
          `<br>Area: ${escapeHtml(p.area ?? '-')}` +
          `<br>ID: ${escapeHtml(p.event_num ?? '-')}`,
      )
    },
  })

  roadsLayer.addTo(map)
  bridgeLayer.addTo(map)
  eventLayer.addTo(map)

  L.control.layers(
    {},
    {
      'Roads / 道路': roadsLayer,
      'Bridges / 桥梁': bridgeLayer,
      'Events / 事件': eventLayer,
    },
    { collapsed: false },
  ).addTo(map)

  const visibleLayers = [roadsLayer, bridgeLayer, eventLayer].filter((layer) => layer.getBounds?.().isValid())
  if (visibleLayers.length) {
    const bounds = visibleLayers.reduce((acc, layer) => acc.extend(layer.getBounds()), L.latLngBounds())
    map.fitBounds(bounds.pad(0.08), { maxZoom: 12 })
  }
}

async function loadMapData() {
  const [eventsCollection, bridgesCollection, roadsCollection, routesCollection, destinationsCollection] =
    await Promise.all([
      loadCollection('events', 'Events'),
      loadCollection('bridges', 'Bridges'),
      loadCollection('roads', 'Roads'),
      loadCollection('routes', 'Flight routes'),
      loadCollection('destinations', 'Destinations'),
    ])

  cityData.value = {
    events: eventsCollection,
    bridges: bridgesCollection,
    roads: roadsCollection,
    routes: routesCollection,
    destinations: destinationsCollection,
  }
  mapReady.value = true
}

onMounted(async () => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    center: [30.5928, 114.3055],
    zoom: 11,
    preferCanvas: true,
    zoomControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  await loadMapData()
  addMapLayers()
  setTimeout(() => map?.invalidateSize(), 0)
})

onBeforeUnmount(() => {
  map?.remove()
  map = undefined
})
</script>

<template>
  <main class="shell">
    <section class="hero">
      <div>
        <p class="eyebrow">NCWU SmartCity Wuhan</p>
        <h1>武汉智慧城市 GIS 可视化中台</h1>
        <p class="summary">
          A Vue 3 geospatial dashboard prototype for city operation visualization,
          traffic/event monitoring, bridge assets, and flight-flow simulation.
        </p>
      </div>

      <div class="status-panel" aria-label="System overview">
        <span class="status-dot"></span>
        <div>
          <strong>OpenStreetMap Live</strong>
          <span>Leaflet + local GeoJSON layers</span>
        </div>
      </div>
    </section>

    <section v-if="dataWarnings.length" class="notice" aria-label="Data notices">
      <strong>Data notice</strong>
      <span>{{ dataWarnings.join(' · ') }}</span>
    </section>

    <section class="metrics" aria-label="Data metrics">
      <article v-for="item in metrics" :key="item.label" class="metric-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.unit }}</small>
      </article>
    </section>

    <section class="workspace">
      <article class="map-card">
        <div class="map-toolbar">
          <span>Wuhan Operations Canvas</span>
          <span>{{ currentYear }}</span>
        </div>

        <div ref="mapContainer" class="map-visual" aria-label="Interactive Wuhan GIS map"></div>
      </article>

      <aside class="side-panel">
        <section>
          <h2>Architecture</h2>
          <ol class="stack-list">
            <li v-for="layer in layerStack" :key="layer">{{ layer }}</li>
          </ol>
        </section>

        <section>
          <h2>Top Event Areas</h2>
          <ol class="stack-list compact-list">
            <li v-for="area in topAreas" :key="area[0]">{{ area[0] }}: {{ area[1] }}</li>
          </ol>
        </section>

        <section>
          <h2>Event Levels</h2>
          <div v-if="levels.length" class="level-bars">
            <div v-for="([level, count]) in levels" :key="level">
              <span>Level {{ level }}</span>
              <meter :value="count" :max="maxEventCount">{{ count }}</meter>
              <strong>{{ count }}</strong>
            </div>
          </div>
          <p v-else class="empty-state">No event levels available.</p>
        </section>
      </aside>
    </section>
  </main>
</template>
