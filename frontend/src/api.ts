// ─── EcoPulse API Service Layer ──────────────────────────────────────────────
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
export const WS_URL   = API_BASE.replace(/^http/, 'ws') + '/ws/metrics'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ServerData {
  id: string
  name: string
  status: string
}

export interface MetricData {
  server_id: string
  cpu_usage: number
  gpu_usage: number
  memory_usage: number
  temperature: number
  power_consumption: number
  cooling_efficiency: number
  emissions: number
  timestamp: string
}

export interface HistoryPoint {
  time: string
  cpu: number
  gpu: number
  memory: number
  power: number
  temp: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export async function fetchServers(): Promise<ServerData[]> {
  const res = await fetch(`${API_BASE}/servers`)
  if (!res.ok) throw new Error(`GET /servers → ${res.status}`)
  return res.json()
}

export async function fetchLatestMetrics(): Promise<Record<string, MetricData>> {
  const res = await fetch(`${API_BASE}/metrics/latest`)
  if (!res.ok) throw new Error(`GET /metrics/latest → ${res.status}`)
  const list: MetricData[] = await res.json()
  const map: Record<string, MetricData> = {}
  list.forEach(m => { map[m.server_id] = m })
  return map
}

export function formatTime(d = new Date()) {
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function getStatusColor(value: number, warn = 70, crit = 85) {
  if (value >= crit) return '#ff3d00'
  if (value >= warn) return '#ff8c00'
  return '#ff6a00'
}

export function getTempColor(c: number) {
  if (c >= 80) return '#ff3d00'
  if (c >= 65) return '#ff8c00'
  return '#ff6a00'
}
