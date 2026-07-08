<script setup>
import eventsData from '../GIS_DATA/Wuhan_events.json'
import bridgeData from '../GIS_DATA/Wuhan_bridge.json'
import flyPathData from '../GIS_DATA/fly_path.json'
import flyEndData from '../GIS_DATA/fly_end.json'

const currentYear = new Date().getFullYear()
const mapToken = import.meta.env.VITE_TOKEN?.trim() ?? ''
const hasMapToken = Boolean(mapToken && !mapToken.includes('your_mapbox'))

function getFeatures(collection) {
  return Array.isArray(collection?.features) ? collection.features : []
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function shortName(value, fallback = 'NA') {
  return String(value || fallback).slice(0, 2)
}

const events = getFeatures(eventsData)
const bridges = getFeatures(bridgeData)
const routes = getFeatures(flyPathData)
const destinations = getFeatures(flyEndData)

const levels = Object.entries(
  events.reduce((acc, event) => {
    const level = event.properties?.level ?? 'unknown'
    acc[level] = (acc[level] ?? 0) + 1
    return acc
  }, {}),
).sort(([a], [b]) => String(a).localeCompare(String(b), 'zh-Hans-CN'))

const eventAreas = events.reduce((acc, event) => {
  const area = event.properties?.area ?? '未分区'
  acc[area] = (acc[area] ?? 0) + 1
  return acc
}, {})

const topAreas = Object.entries(eventAreas)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 4)

const outboundTotal = destinations.reduce((sum, item) => {
  return sum + toFiniteNumber(item.properties?.outboundAmount)
}, 0)

const maxEventCount = Math.max(events.length, 1)
const mapMode = hasMapToken ? 'Mapbox token configured' : 'Local fallback mode'
const dataWarnings = [
  events.length === 0 ? 'Event dataset is empty' : '',
  bridges.length === 0 ? 'Bridge dataset is empty' : '',
  routes.length === 0 ? 'Flight route dataset is empty' : '',
].filter(Boolean)

const metrics = [
  { label: '事件点位', value: events.length, unit: 'points' },
  { label: '过江桥梁', value: bridges.length, unit: 'bridges' },
  { label: '航线模拟', value: routes.length, unit: 'routes' },
  { label: '出境金额', value: outboundTotal.toFixed(1), unit: '$10k' },
]

const layerStack = [
  'Mapbox / L7 base map with local fallback',
  'GeoJSON city layers',
  'Mock API service',
  'Vue dashboard widgets',
  '3D model assets',
]
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
        <span class="status-dot" :class="{ 'status-dot--warn': !hasMapToken }"></span>
        <div>
          <strong>{{ mapMode }}</strong>
          <span>Mock service + local GeoJSON assets</span>
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

        <div class="map-visual" :class="{ 'map-visual--fallback': !hasMapToken }">
          <span class="river river-one"></span>
          <span class="river river-two"></span>
          <span
            v-for="(bridge, index) in bridges"
            :key="bridge.properties?.name || index"
            class="bridge-pin"
            :style="{ left: `${18 + index * 15}%`, top: `${55 - index * 6}%` }"
          >
            {{ shortName(bridge.properties?.name) }}
          </span>
          <span
            v-for="(area, index) in topAreas"
            :key="area[0]"
            class="event-cluster"
            :style="{ left: `${58 + index * 8}%`, top: `${26 + index * 12}%` }"
          >
            {{ area[1] }}
          </span>
          <p v-if="!hasMapToken" class="fallback-label">
            Mapbox token unavailable. Rendering stable local preview.
          </p>
          <svg viewBox="0 0 600 320" role="img" aria-label="Flight route preview">
            <path d="M170 168 C240 70 370 68 490 118" />
            <path d="M170 168 C270 210 380 236 520 214" />
            <path d="M170 168 C240 118 310 152 420 70" />
          </svg>
        </div>
      </article>

      <aside class="side-panel">
        <section>
          <h2>Architecture</h2>
          <ol class="stack-list">
            <li v-for="layer in layerStack" :key="layer">{{ layer }}</li>
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
