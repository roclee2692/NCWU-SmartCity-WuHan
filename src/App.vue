<script setup>
import eventsData from '../GIS_DATA/Wuhan_events.json'
import bridgeData from '../GIS_DATA/Wuhan_bridge.json'
import flyPathData from '../GIS_DATA/fly_path.json'
import flyEndData from '../GIS_DATA/fly_end.json'

const events = eventsData.features ?? []
const bridges = bridgeData.features ?? []
const routes = flyPathData.features ?? []
const destinations = flyEndData.features ?? []

const levels = events.reduce((acc, event) => {
  const level = event.properties?.level ?? 'unknown'
  acc[level] = (acc[level] ?? 0) + 1
  return acc
}, {})

const eventAreas = events.reduce((acc, event) => {
  const area = event.properties?.area ?? '未分区'
  acc[area] = (acc[area] ?? 0) + 1
  return acc
}, {})

const topAreas = Object.entries(eventAreas)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 4)

const outboundTotal = destinations.reduce((sum, item) => {
  return sum + Number(item.properties?.outboundAmount ?? 0)
}, 0)

const metrics = [
  { label: '事件点位', value: events.length, unit: 'points' },
  { label: '过江桥梁', value: bridges.length, unit: 'bridges' },
  { label: '航线模拟', value: routes.length, unit: 'routes' },
  { label: '出境金额', value: outboundTotal.toFixed(1), unit: '$10k' },
]

const layerStack = [
  'Mapbox / L7 base map',
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
        <span class="status-dot"></span>
        <div>
          <strong>Prototype Ready</strong>
          <span>Mock service + local GeoJSON assets</span>
        </div>
      </div>
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
          <span>{{ new Date().getFullYear() }}</span>
        </div>

        <div class="map-visual">
          <span class="river river-one"></span>
          <span class="river river-two"></span>
          <span
            v-for="(bridge, index) in bridges"
            :key="bridge.properties?.name"
            class="bridge-pin"
            :style="{ left: `${18 + index * 15}%`, top: `${55 - index * 6}%` }"
          >
            {{ bridge.properties?.name?.slice(0, 2) }}
          </span>
          <span
            v-for="(area, index) in topAreas"
            :key="area[0]"
            class="event-cluster"
            :style="{ left: `${58 + index * 8}%`, top: `${26 + index * 12}%` }"
          >
            {{ area[1] }}
          </span>
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
          <div class="level-bars">
            <div v-for="(count, level) in levels" :key="level">
              <span>Level {{ level }}</span>
              <meter :value="count" :max="events.length">{{ count }}</meter>
              <strong>{{ count }}</strong>
            </div>
          </div>
        </section>
      </aside>
    </section>
  </main>
</template>
