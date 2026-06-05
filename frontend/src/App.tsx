import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Zap, Thermometer, Cpu, Wind, AlertTriangle, CheckCircle2, Info, ArrowRight, Activity } from 'lucide-react'
// ── Config & Utilities (inlined to avoid Vite ESM cache issues) ──────────────
const API_BASE = 'http://localhost:8000'
const WS_URL   = 'ws://localhost:8000/ws/metrics'

const fetchServers     = () => fetch(`${API_BASE}/servers`).then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<ServerData[]> })
const fetchLatestMetrics = () => fetch(`${API_BASE}/metrics/latest`).then(r => { if (!r.ok) throw new Error(); return r.json().then((list: MetricData[]) => { const m: Record<string,MetricData> = {}; list.forEach(x => { m[x.server_id] = x }); return m }) })
const formatTime = (d = new Date()) => d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
const getTempColor = (c: number) => c >= 80 ? '#ff3d00' : c >= 65 ? '#ff8c00' : '#ff6a00'

// ── Local types ───────────────────────────────────────────────────────────────
interface ServerData   { id: string; name: string; status: string }
interface MetricData   { server_id: string; cpu_usage: number; gpu_usage: number; memory_usage: number; temperature: number; power_consumption: number; cooling_efficiency: number; emissions: number; timestamp: string }
interface HistoryPoint { time: string; cpu: number; gpu: number; memory: number; power: number; temp: number }

// ══════════════════════════════════════════════════════════════
// ARC GAUGE — NitroSense style
// ══════════════════════════════════════════════════════════════
function ArcGauge({
  value, max, unit, label, size = 160, color = '#ff6a00', decimals = 0,
}: {
  value: number; max: number; unit: string; label: string
  size?: number; color?: string; decimals?: number
}) {
  // Arc: starts at 135° (bottom-left) sweeps 270° clockwise
  const startDeg = 135
  const sweep    = 270
  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.37
  const stroke = size * 0.072

  const pct = Math.min(Math.max(value / max, 0), 1)

  const toXY = (deg: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy + r * Math.sin((deg * Math.PI) / 180),
  })

  const bgStart  = toXY(startDeg)
  const bgEnd    = toXY(startDeg + sweep - 0.5)
  const fillEnd  = toXY(startDeg + pct * sweep)
  const fillDeg  = pct * sweep

  const arcPath = (start: {x:number,y:number}, end: {x:number,y:number}, large: boolean, cw = true) =>
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large ? 1 : 0} ${cw ? 1 : 0} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        {/* Background track */}
        <path
          d={arcPath(bgStart, bgEnd, true)}
          fill="none" stroke="#261b0a" strokeWidth={stroke} strokeLinecap="round"
        />
        {/* Fill arc */}
        {pct > 0.01 && (
          <path
            d={arcPath(bgStart, fillEnd, fillDeg > 180)}
            fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color}60)` }}
          />
        )}
        {/* Center value */}
        <text
          x={cx} y={cy - size * 0.04}
          textAnchor="middle" dominantBaseline="middle"
          fill="#e8ddd0" fontSize={size * 0.22} fontWeight="700"
          fontFamily="'Sora', sans-serif"
        >
          {value.toFixed(decimals)}
        </text>
        <text
          x={cx} y={cy + size * 0.16}
          textAnchor="middle" dominantBaseline="middle"
          fill="#a09080" fontSize={size * 0.1}
          fontFamily="'JetBrains Mono', monospace"
        >
          {unit}
        </text>
        {/* Label at bottom */}
        <text
          x={cx} y={cy + size * 0.38}
          textAnchor="middle"
          fill={color} fontSize={size * 0.085} fontWeight="600"
          fontFamily="'JetBrains Mono', monospace" letterSpacing="0.08em"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MINI STAT CELL
// ══════════════════════════════════════════════════════════════
function StatRow({ label, val, unit, color }: { label: string; val: string | number; unit?: string; color?: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-val" style={color ? { color } : {}}>
        {typeof val === 'number' ? val.toFixed(1) : val}
        {unit && <span style={{ fontSize: 11, color: '#a09080', marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP
// ══════════════════════════════════════════════════════════════
function ChartTip({ active, payload, label }: { active?: boolean; payload?: {name:string;value:number;color:string}[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#160d04', border: '1px solid #2a1e0e', borderRadius: 4, padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
      <div style={{ color: '#5a4a3a', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span><span style={{ fontWeight: 600 }}>{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ALERT TYPE
// ══════════════════════════════════════════════════════════════
interface Alert {
  id: string
  type: 'info' | 'warn' | 'crit' | 'ok'
  msg: string
  time: string
}

function AlertRow({ a }: { a: Alert }) {
  const icon = {
    ok:   <CheckCircle2 size={14} color="#ff6a00" />,
    info: <Info size={14} color="#a09080" />,
    warn: <AlertTriangle size={14} color="#ff8c00" />,
    crit: <AlertTriangle size={14} color="#ff3d00" />,
  }[a.type]
  return (
    <div className="alert-item">
      <div className="alert-icon">{icon}</div>
      <div>
        <div className="alert-msg">{a.msg}</div>
        <div className="alert-time">{a.time}</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// LANDING PAGE
// ══════════════════════════════════════════════════════════════
function Landing({ onEnter }: { onEnter: () => void }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20
    const y = (e.clientY / window.innerHeight - 0.5) * 20
    setOffset({ x, y })
  }

  return (
    <div className="landing" onMouseMove={handleMouseMove}>
      <div 
        className="landing-bg-layer" 
        style={{ transform: `translate(${-offset.x}px, ${-offset.y}px)` }} 
      />
      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-mark">
            <Activity size={18} color="#000" strokeWidth={2.5} />
          </div>
          <span className="landing-logo-text">Eco<span>Pulse</span></span>
        </div>
        <button id="landing-enter-btn" className="btn btn-primary" onClick={onEnter}>
          Open Dashboard <ArrowRight size={14} />
        </button>
      </nav>

      <div className="landing-hero">
        <div className="landing-tag">AI Data Center Monitor</div>

        <h1 className="landing-h1">
          Real-time telemetry for<br /><span>sustainable AI infrastructure</span>
        </h1>

        <p className="landing-sub">
          Monitor CPU, GPU, thermal and power metrics across your entire data center cluster.
          Live WebSocket stream. Zero configuration.
        </p>

        <div className="landing-cta">
          <button id="hero-enter-btn" className="btn btn-primary" onClick={onEnter} style={{ padding: '12px 28px', fontSize: 15 }}>
            Launch Dashboard <ArrowRight size={16} />
          </button>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            style={{ padding: '12px 22px', fontSize: 14 }}
          >
            API Docs
          </a>
        </div>

        <div className="landing-stats">
          {[
            { val: '4',     label: 'Server Nodes'   },
            { val: '2s',    label: 'Update Interval' },
            { val: '6',     label: 'Metrics / Node'  },
            { val: 'WS',    label: 'Live Protocol'   },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div className="landing-stat-val">{s.val}</div>
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <footer className="landing-footer">
        <span>EcoPulse AI · v2.4.1</span>
        <span>FastAPI + React + WebSocket</span>
      </footer>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
function Dashboard({ onBack }: { onBack: () => void }) {
  const [tab, setTab]             = useState<'overview' | 'servers' | 'analytics' | 'alerts'>('overview')
  const [servers, setServers]     = useState<ServerData[]>([])
  const [selId, setSelId]         = useState<string | null>(null)
  const [metrics, setMetrics]     = useState<Record<string, MetricData>>({})
  const [history, setHistory]     = useState<HistoryPoint[]>([])
  const [alerts, setAlerts]       = useState<Alert[]>([])
  const [ws, setWs]               = useState<'live' | 'sim' | 'dead'>('dead')
  const [now, setNow]             = useState(new Date())

  const histRef  = useRef<HistoryPoint[]>([])
  const wsRef    = useRef<WebSocket | null>(null)
  const simRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  // clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // push alert helper
  const pushAlert = useCallback((type: Alert['type'], msg: string) => {
    setAlerts(prev => [
      { id: Date.now().toString(), type, msg, time: formatTime() },
      ...prev.slice(0, 29),
    ])
  }, [])

  // ── Load servers + initial metrics ──────────────────────────────────────────
  useEffect(() => {
    fetchServers()
      .then(data => {
        setServers(data)
        if (data.length) setSelId(data[0].id)
        pushAlert('ok', `Loaded ${data.length} server nodes from API`)
      })
      .catch(() => pushAlert('warn', 'Could not reach backend — using sim data'))

    fetchLatestMetrics()
      .then(map => setMetrics(map))
      .catch(() => {})
  }, [])

  // ── Simulate metrics locally when backend is not streaming ──────────────────
  const mockMetric = useCallback((id: string): MetricData => {
    const pwr = 180 + Math.random() * 350;
    return {
      server_id:          id,
      cpu_usage:          20 + Math.random() * 65,
      gpu_usage:          30 + Math.random() * 60,
      memory_usage:       45 + Math.random() * 45,
      temperature:        38 + Math.random() * 45,
      power_consumption:  pwr,
      cooling_efficiency: 55 + Math.random() * 40,
      emissions:          pwr * 0.4,
      timestamp:          new Date().toISOString(),
    }
  }, [])

  const startSim = useCallback((srvList: ServerData[]) => {
    if (simRef.current) return
    setWs('sim')
    pushAlert('info', 'WebSocket offline — running local simulation')
    simRef.current = setInterval(() => {
      setServers(prev => {
        const list = prev.length ? prev : srvList
        const updated: Record<string, MetricData> = {}
        list.forEach(s => { updated[s.id] = mockMetric(s.id) })
        setMetrics(updated)

        setSelId(sid => {
          const activeId = sid ?? list[0]?.id
          if (activeId && updated[activeId]) {
            const d = updated[activeId]
            const pt: HistoryPoint = {
              time:   formatTime(),
              cpu:    d.cpu_usage,
              gpu:    d.gpu_usage,
              memory: d.memory_usage,
              power:  (d.power_consumption / 600) * 100,
              temp:   d.temperature,
            }
            histRef.current = [...histRef.current.slice(-29), pt]
            setHistory([...histRef.current])
          }
          return sid
        })
        return list
      })
    }, 2000)
  }, [mockMetric, pushAlert])

  // ── WebSocket connection ─────────────────────────────────────────────────────
  const connectWs = useCallback(() => {
    wsRef.current?.close()
    try {
      const socket = new WebSocket(WS_URL)
      wsRef.current = socket

      socket.onopen = () => {
        setWs('live')
        pushAlert('ok', 'WebSocket connected — live telemetry active')
      }

      socket.onmessage = (e) => {
        const d: MetricData = JSON.parse(e.data)
        setMetrics(prev => ({ ...prev, [d.server_id]: d }))

        setSelId(sid => {
          if (sid === d.server_id || (sid === null)) {
            const pt: HistoryPoint = {
              time:   formatTime(),
              cpu:    d.cpu_usage,
              gpu:    d.gpu_usage,
              memory: d.memory_usage,
              power:  (d.power_consumption / 600) * 100,
              temp:   d.temperature,
            }
            histRef.current = [...histRef.current.slice(-29), pt]
            setHistory([...histRef.current])
          }
          return sid
        })

        if (d.temperature > 80)
          pushAlert('crit', `${d.server_id} — temperature critical: ${d.temperature.toFixed(1)}°C`)
        else if (d.temperature > 70)
          pushAlert('warn', `${d.server_id} — temperature elevated: ${d.temperature.toFixed(1)}°C`)
      }

      socket.onclose = () => {
        setWs('dead')
        setServers(srv => { startSim(srv); return srv })
      }
      socket.onerror = () => socket.close()
    } catch {
      setServers(srv => { startSim(srv); return srv })
    }
  }, [pushAlert, startSim])

  useEffect(() => {
    connectWs()
    return () => {
      wsRef.current?.close()
      if (simRef.current) clearInterval(simRef.current)
    }
  }, [])

  // ── Derived values ───────────────────────────────────────────────────────────
  const sel = selId ? metrics[selId] : null
  const allM = Object.values(metrics)
  const avg = (fn: (m: MetricData) => number) =>
    allM.length ? allM.reduce((s, m) => s + fn(m), 0) / allM.length : 0

  const avgCpu  = avg(m => m.cpu_usage)
  const avgGpu  = avg(m => m.gpu_usage)
  const avgTemp = avg(m => m.temperature)
  const totalPw = allM.reduce((s, m) => s + m.power_consumption, 0)

  const powerBar = servers.map(s => ({
    name:  s.name.split(/\s+/).slice(0, 2).join(' '),
    power: Math.round(metrics[s.id]?.power_consumption ?? 0),
  }))

  const wsBadge = {
    live: { cls: 'badge-live', dot: '#ff6a00', label: 'Live' },
    sim:  { cls: 'badge-sim',  dot: '#ff8c00', label: 'Sim'  },
    dead: { cls: 'badge-dead', dot: '#ff3d00', label: 'Offline' },
  }[ws]

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  const TABS: { id: typeof tab; label: string }[] = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'servers',   label: 'Servers'   },
    { id: 'analytics', label: 'Analytics' },
    { id: 'alerts',    label: 'Alerts'    },
  ]

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="dash-layout">

      {/* ── Top bar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <button
            id="logo-home-btn"
            onClick={onBack}
            className="topbar-logo"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div className="topbar-logo-dot" />
            EcoPulse
          </button>
          <div className="tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                className={`tab${tab === t.id ? ' active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-time">
            {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' · '}<span>{formatTime(now)}</span>
          </div>
          <div id="ws-badge" className={`badge ${wsBadge.cls}`}>
            <div className="status-dot" style={{ background: wsBadge.dot, width: 6, height: 6 }} />
            {wsBadge.label}
          </div>
          <button id="reconnect-btn" className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }} onClick={connectWs}>
            Reconnect
          </button>
        </div>
      </header>

      {/* ── Server selector strip ── */}
      <div className="server-strip">
        <span className="server-strip-label">Local PC:</span>
        {servers.length === 0 ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>Loading…</span>
        ) : servers.filter(s => s.id === 'LOCAL-PC').map(s => {
          const m = metrics[s.id]
          const statusCls = m && m.temperature > 80 ? 'crit' : m && m.cpu_usage > 80 ? 'warn' : 'ok'
          return (
            <button
              key={s.id}
              id={`node-${s.id}`}
              className={`server-pill${selId === s.id ? ' active' : ''}`}
              onClick={() => { setSelId(s.id); histRef.current = []; setHistory([]) }}
              style={{ marginRight: 16, border: '1px solid #ff6a00' }}
            >
              <div className={`status-dot ${statusCls}`} />
              {s.name}
            </button>
          )
        })}
        {servers.length > 0 && <span className="server-strip-label">Data Centers:</span>}
        {servers.filter(s => s.id !== 'LOCAL-PC').map(s => {
          const m = metrics[s.id]
          const statusCls = m && m.temperature > 80 ? 'crit' : m && m.cpu_usage > 80 ? 'warn' : 'ok'
          return (
            <button
              key={s.id}
              id={`node-${s.id}`}
              className={`server-pill${selId === s.id ? ' active' : ''}`}
              onClick={() => { setSelId(s.id); histRef.current = []; setHistory([]) }}
            >
              <div className={`status-dot ${statusCls}`} />
              {s.name}
            </button>
          )
        })}
      </div>

      {/* ── Tab: Overview ── */}
      {tab === 'overview' && (
        <div className="tab-content fade-up">
          <div className="dash-grid">

            {/* LEFT — Gauges */}
            <div className="panel-gauges">
              {/* GPU Temp */}
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="card-header">
                  <span className="card-title">GPU Temp</span>
                  <Thermometer size={14} color="#ff6a00" strokeWidth={1.5} />
                </div>
                <ArcGauge
                  value={sel?.temperature ?? 0}
                  max={100}
                  unit="°C"
                  label="GPU"
                  size={150}
                  color={getTempColor(sel?.temperature ?? 0)}
                />
              </div>

              {/* CPU Temp (approx from temp + offset) */}
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="card-header">
                  <span className="card-title">CPU Temp</span>
                  <Cpu size={14} color="#ff6a00" strokeWidth={1.5} />
                </div>
                <ArcGauge
                  value={sel ? Math.max(0, sel.temperature - 6 + Math.random() * 2) : 0}
                  max={100}
                  unit="°C"
                  label="CPU"
                  size={150}
                  color={getTempColor(sel?.temperature ?? 0)}
                />
              </div>

              {/* Cooling */}
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="card-header">
                  <span className="card-title">Cooling</span>
                  <Wind size={14} color="#ff6a00" strokeWidth={1.5} />
                </div>
                <ArcGauge
                  value={sel?.cooling_efficiency ?? 0}
                  max={100}
                  unit="%"
                  label="Efficiency"
                  size={150}
                  color="#ff6a00"
                />
              </div>
            </div>

            {/* CENTER */}
            <div className="panel-center">
              {/* Selected server headline */}
              {sel ? (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">{servers.find(s => s.id === selId)?.name ?? selId}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{selId}</span>
                  </div>
                  <div className="mini-grid">
                    <div className="mini-cell">
                      <div className="mini-cell-label">CPU Usage</div>
                      <div className="mini-cell-val" style={{ color: '#ff6a00' }}>
                        {sel.cpu_usage.toFixed(1)}<span className="mini-cell-unit">%</span>
                      </div>
                      <div className="pbar" style={{ marginTop: 8 }}>
                        <div className="pbar-fill" style={{ width: `${sel.cpu_usage}%`, background: '#ff6a00' }} />
                      </div>
                    </div>
                    <div className="mini-cell">
                      <div className="mini-cell-label">GPU Usage</div>
                      <div className="mini-cell-val" style={{ color: '#ff8c00' }}>
                        {sel.gpu_usage.toFixed(1)}<span className="mini-cell-unit">%</span>
                      </div>
                      <div className="pbar" style={{ marginTop: 8 }}>
                        <div className="pbar-fill" style={{ width: `${sel.gpu_usage}%`, background: '#ff8c00' }} />
                      </div>
                    </div>
                    <div className="mini-cell">
                      <div className="mini-cell-label">Memory</div>
                      <div className="mini-cell-val">
                        {sel.memory_usage.toFixed(1)}<span className="mini-cell-unit">%</span>
                      </div>
                      <div className="pbar" style={{ marginTop: 8 }}>
                        <div className="pbar-fill" style={{ width: `${sel.memory_usage}%`, background: '#5a4a3a' }} />
                      </div>
                    </div>
                    <div className="mini-cell">
                      <div className="mini-cell-label">Power Draw</div>
                      <div className="mini-cell-val" style={{ color: '#ff8c00' }}>
                        {sel.power_consumption.toFixed(0)}<span className="mini-cell-unit">W</span>
                      </div>
                      <div className="pbar" style={{ marginTop: 8 }}>
                        <div className="pbar-fill" style={{ width: `${(sel.power_consumption / 600) * 100}%`, background: '#ff8c00' }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="no-data">
                    <Activity size={24} color="var(--text-3)" />
                    <span>Waiting for metrics…</span>
                  </div>
                </div>
              )}

              {/* Real-time chart */}
              <div className="card" style={{ flex: 1 }}>
                <div className="card-header">
                  <span className="card-title">Utilization — {servers.find(s => s.id === selId)?.name ?? '—'}</span>
                  <div className="flex gap-12" style={{ alignItems: 'center' }}>
                    {[['CPU', '#ff6a00'], ['GPU', '#ff8c00'], ['Mem', '#5a4a3a']].map(([l, c]) => (
                      <div key={l} className="flex items-center gap-4">
                        <div style={{ width: 18, height: 2, background: c, borderRadius: 1 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {history.length > 1 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={history} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                      <defs>
                        {[['c', '#ff6a00'], ['g', '#ff8c00'], ['m', '#5a4a3a']].map(([k, col]) => (
                          <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={col} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={col} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1508" />
                      <XAxis dataKey="time" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#5a4a3a' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#5a4a3a' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Area type="monotone" dataKey="cpu"    name="CPU" stroke="#ff6a00" strokeWidth={1.5} fill="url(#gc)" dot={false} />
                      <Area type="monotone" dataKey="gpu"    name="GPU" stroke="#ff8c00" strokeWidth={1.5} fill="url(#gg)" dot={false} />
                      <Area type="monotone" dataKey="memory" name="Mem" stroke="#5a4a3a" strokeWidth={1.5} fill="url(#gm)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data" style={{ height: 180 }}>
                    <span>Collecting data…</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Monitoring panel (NitroSense style) */}
            <div className="panel-right">
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Monitoring</span>
                  <Zap size={14} color="#ff6a00" strokeWidth={1.5} />
                </div>
                <StatRow label="CPU" val={sel?.cpu_usage ?? 0} unit="%" color={sel && sel.cpu_usage > 80 ? '#ff3d00' : '#e8ddd0'} />
                <StatRow label="GPU" val={sel?.gpu_usage ?? 0} unit="%" />
                <StatRow label="Memory" val={sel?.memory_usage ?? 0} unit="%" />
                <StatRow label="Temperature" val={sel?.temperature ?? 0} unit="°C" color={getTempColor(sel?.temperature ?? 0)} />
                <StatRow label="Power" val={sel ? `${sel.power_consumption.toFixed(0)}` : '—'} unit="W" />
                <StatRow label="Cooling" val={sel?.cooling_efficiency ?? 0} unit="%" color="#ff6a00" />
                <StatRow label="Emissions" val={sel?.emissions ?? 0} unit="gCO2/h" color="#a09080" />
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Cluster Avg</span>
                </div>
                <StatRow label="CPU" val={avgCpu} unit="%" />
                <StatRow label="GPU" val={avgGpu} unit="%" />
                <StatRow label="Avg Temp" val={avgTemp} unit="°C" color={getTempColor(avgTemp)} />
                <StatRow label="Total Power" val={`${(totalPw / 1000).toFixed(2)}`} unit="kW" />
                <StatRow label="Nodes" val={servers.length} />
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Event Log</span>
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {alerts.slice(0, 8).map(a => <AlertRow key={a.id} a={a} />)}
                  {alerts.length === 0 && <div className="no-data" style={{ padding: '16px 0' }}>No events yet</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Servers ── */}
      {tab === 'servers' && (
        <div className="tab-content fade-up">
          <div className="card">
            <div className="card-header">
              <span className="card-title">All Nodes — {servers.length} total</span>
              <span className="label">{Object.keys(metrics).length} reporting</span>
            </div>
            {servers.length === 0 ? (
              <div className="no-data">No servers loaded — check backend connection</div>
            ) : (
              <table className="servers-table">
                <thead>
                  <tr>
                    <th>Server</th>
                    <th>Status</th>
                    <th>CPU %</th>
                    <th>GPU %</th>
                    <th>Memory %</th>
                    <th>Temp °C</th>
                    <th>Power W</th>
                    <th>Cooling %</th>
                    <th>Emissions</th>
                  </tr>
                </thead>
                <tbody>
                  {servers.map(s => {
                    const m = metrics[s.id]
                    const sc = m && m.temperature > 80 ? 'crit' : m && m.cpu_usage > 80 ? 'warn' : 'ok'
                    return (
                      <tr
                        key={s.id}
                        onClick={() => { setSelId(s.id); setTab('overview') }}
                        id={`row-${s.id}`}
                      >
                        <td>
                          <div style={{ fontWeight: 500 }}>{s.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.id}</div>
                        </td>
                        <td>
                          <div className="flex items-center gap-8">
                            <div className={`status-dot ${sc}`} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>
                              {sc === 'crit' ? 'CRITICAL' : sc === 'warn' ? 'WARNING' : 'ONLINE'}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: m && m.cpu_usage > 80 ? '#ff3d00' : 'var(--text)' }}>
                          {m ? m.cpu_usage.toFixed(1) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: m && m.gpu_usage > 80 ? '#ff3d00' : 'var(--text)' }}>
                          {m ? m.gpu_usage.toFixed(1) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {m ? m.memory_usage.toFixed(1) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: m ? getTempColor(m.temperature) : 'var(--text-3)' }}>
                          {m ? m.temperature.toFixed(1) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--orange-lt)' }}>
                          {m ? m.power_consumption.toFixed(0) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--orange)' }}>
                          {m ? m.cooling_efficiency.toFixed(1) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#a09080' }}>
                          {m ? m.emissions.toFixed(1) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Analytics ── */}
      {tab === 'analytics' && (
        <div className="tab-content fade-up">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* History chart */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header">
                <span className="card-title">Historical Trend — {servers.find(s => s.id === selId)?.name ?? 'Select a node'}</span>
                <span className="label">{history.length} data points</span>
              </div>
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      {[['a', '#ff6a00'], ['b', '#ff8c00'], ['d', '#cc4400']].map(([k, c]) => (
                        <linearGradient key={k} id={`ga${k}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={c} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={c} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1508" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#5a4a3a' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#5a4a3a' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="cpu"    name="CPU"   stroke="#ff6a00" strokeWidth={1.5} fill="url(#gaa)" dot={false} />
                    <Area type="monotone" dataKey="gpu"    name="GPU"   stroke="#ff8c00" strokeWidth={1.5} fill="url(#gab)" dot={false} />
                    <Area type="monotone" dataKey="power"  name="Power" stroke="#cc4400" strokeWidth={1}   fill="url(#gad)" dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data" style={{ height: 260 }}>Waiting for history data — select a node and wait for updates</div>
              )}
            </div>

            {/* Power distribution */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Power by Node (W)</span>
              </div>
              {powerBar.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={powerBar} barSize={32} margin={{ top: 4, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1508" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#5a4a3a' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#5a4a3a' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,106,0,0.05)' }}
                      contentStyle={{ background: '#160d04', border: '1px solid #2a1e0e', borderRadius: 4, fontFamily: 'JetBrains Mono', fontSize: 11 }}
                    />
                    <Bar dataKey="power" name="Power (W)" radius={[3, 3, 0, 0]}>
                      {powerBar.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? '#ff6a00' : '#cc4400'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data" style={{ height: 200 }}>No data</div>
              )}
            </div>

            {/* Thermal trend */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Temperature Trend (°C)</span>
              </div>
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ff3d00" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ff3d00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1508" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#5a4a3a' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[30, 100]} tick={{ fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#5a4a3a' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="temp" name="Temp (°C)" stroke="#ff3d00" strokeWidth={1.5} fill="url(#gt)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data" style={{ height: 200 }}>Collecting…</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Alerts ── */}
      {tab === 'alerts' && (
        <div className="tab-content fade-up">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Event Log</span>
              <span className="label">{alerts.length} events</span>
            </div>
            {alerts.length === 0 ? (
              <div className="no-data">No events recorded yet</div>
            ) : (
              alerts.map(a => <AlertRow key={a.id} a={a} />)
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing')
  return view === 'landing'
    ? <Landing onEnter={() => setView('dashboard')} />
    : <Dashboard onBack={() => setView('landing')} />
}
