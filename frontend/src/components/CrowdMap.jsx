import { useState, useMemo } from 'react';

// --- Crowd helpers -----------------------------------------------------------
function getCrowdLevel(waitTime) {
  if (waitTime <= 5)  return 'low';
  if (waitTime <= 12) return 'medium';
  return 'high';
}
const CROWD_COLORS = {
  low:    { fill: '#10b981', glow: '#10b98150', ring: '#10b98180', label: 'Low' },
  medium: { fill: '#f59e0b', glow: '#f59e0b50', ring: '#f59e0b80', label: 'Medium' },
  high:   { fill: '#ef4444', glow: '#ef444450', ring: '#ef444480', label: 'High' },
};

// --- Gate → SVG position lookup (in a 400×360 viewBox) ---------------------
//  Stadium oval centred at (200, 180), semi-axes 110w × 90h
//  Pitch inner oval: 80w × 60h
//  Gate A = North stand top, B = East right, C = South bottom, D = West left
const GATE_POS = {
  'Gate A': { x: 200, y: 42 },   // North stand
  'Gate B': { x: 345, y: 180 },  // East stand
  'Gate C': { x: 200, y: 318 },  // South stand
  'Gate D': { x: 55,  y: 180 },  // West stand
};

function getMarkerPos(location) {
  for (const [gate, pos] of Object.entries(GATE_POS)) {
    if (location?.includes(gate)) return pos;
  }
  return { x: 200, y: 180 };
}

// --- Sub-components ---------------------------------------------------------

function StallMarker({ stall, isSelected, onClick }) {
  const pos   = getMarkerPos(stall.location);
  const wait  = stall.wait_time ?? stall.liveWait ?? 0;
  const level = getCrowdLevel(wait);
  const c     = CROWD_COLORS[level];
  const pulse = level === 'high';

  return (
    <g
      className="cursor-pointer"
      onClick={() => onClick(isSelected ? null : stall)}
      style={{ filter: isSelected ? `drop-shadow(0 0 8px ${c.fill})` : 'none' }}
    >
      {/* Glow ring */}
      <circle cx={pos.x} cy={pos.y} r={18} fill={c.glow} className={pulse ? 'animate-pulse' : ''} />
      {/* Outer ring */}
      <circle cx={pos.x} cy={pos.y} r={13} fill="none" stroke={c.ring} strokeWidth={1.5} />
      {/* Main dot */}
      <circle cx={pos.x} cy={pos.y} r={9} fill={c.fill} />
      {/* Icon */}
      <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={9} style={{ userSelect: 'none' }}>
        {stall.category === 'food' ? '🍔' : stall.category === 'beverage' ? '🥤' : stall.category === 'snacks' ? '🍿' : '🍦'}
      </text>
    </g>
  );
}

function StallInfoPanel({ stall, onClose }) {
  if (!stall) return null;
  const wait  = stall.wait_time ?? stall.liveWait ?? 0;
  const level = getCrowdLevel(wait);
  const c     = CROWD_COLORS[level];

  return (
    <div className="animate-fade-in glass-card p-4 border border-white/10 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">{stall.name}</h3>
          <p className="text-xs text-white/40 mt-0.5">{stall.location}</p>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none">×</button>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full border"
          style={{ color: c.fill, background: c.glow, borderColor: c.ring }}
        >
          {c.label} crowd
        </span>
        <span className="text-xs text-white/50">~{wait} min wait</span>
        {stall.active_orders !== undefined && (
          <span className="text-xs text-white/40">{stall.active_orders} in queue</span>
        )}
      </div>

      {stall.rush_status && (
        <p className="text-xs text-wait-crowded animate-pulse">{stall.rush_status}</p>
      )}
    </div>
  );
}

// --- Main SVG Stadium -------------------------------------------------------

function StadiumSVG({ stalls, selectedStall, onSelect }) {
  return (
    <svg
      viewBox="0 0 400 360"
      className="w-full"
      style={{ maxHeight: 420 }}
      aria-label="Stadium crowd map"
    >
      <defs>
        {/* Pitch grass gradient */}
        <radialGradient id="pitchGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#166534" />
          <stop offset="45%"  stopColor="#15803d" />
          <stop offset="100%" stopColor="#14532d" />
        </radialGradient>
        {/* Stand gradient */}
        <radialGradient id="standGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#1e1b2e" />
          <stop offset="100%" stopColor="#13111c" />
        </radialGradient>
        {/* Track gradient */}
        <radialGradient id="trackGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#292450" />
          <stop offset="100%" stopColor="#1a1730" />
        </radialGradient>

        {/* Clip path for stands */}
        <clipPath id="outerClip">
          <ellipse cx="200" cy="180" rx="190" ry="165" />
        </clipPath>
      </defs>

      {/* ── Background ─────────────────────────────────────────────────────── */}
      <rect width="400" height="360" fill="#0c0a14" />

      {/* ── Outer stadium shell ─────────────────────────────────────────────── */}
      <ellipse cx="200" cy="180" rx="190" ry="165" fill="#13111c" stroke="#3b2d6e" strokeWidth="2" />

      {/* ── Running track ───────────────────────────────────────────────────── */}
      <ellipse cx="200" cy="180" rx="155" ry="128" fill="#1e1b2e" stroke="#2d2450" strokeWidth="1" />
      <ellipse cx="200" cy="180" rx="148" ry="121" fill="none" stroke="#332d5c" strokeWidth="1" strokeDasharray="6 4" />

      {/* ── Pitch ───────────────────────────────────────────────────────────── */}
      <ellipse cx="200" cy="180" rx="110" ry="88" fill="url(#pitchGrad)" stroke="#15803d" strokeWidth="1.5" />
      {/* Pitch markings */}
      <ellipse cx="200" cy="180" rx="110" ry="88" fill="none" stroke="#166534" strokeWidth="0.5" />
      {/* Centre circle */}
      <circle cx="200" cy="180" r="28" fill="none" stroke="#166534" strokeWidth="1" />
      <circle cx="200" cy="180" r="2"  fill="#166534" />
      {/* Half-way line */}
      <line x1="90" y1="180" x2="310" y2="180" stroke="#166534" strokeWidth="1" />
      {/* Penalty areas (simplified) */}
      <rect x="148" y="105" width="104" height="44" fill="none" stroke="#166534" strokeWidth="0.8" />
      <rect x="148" y="211" width="104" height="44" fill="none" stroke="#166534" strokeWidth="0.8" />
      {/* Goals */}
      <rect x="183" y="92" width="34" height="12" fill="none" stroke="#166534" strokeWidth="1" />
      <rect x="183" y="256" width="34" height="12" fill="none" stroke="#166534" strokeWidth="1" />

      {/* ── Stand seats (rows of tiny rects per quadrant) ───────────────────── */}
      {/* North stand seats */}
      {[0, 1, 2, 3].map(row => (
        <ellipse key={`ns${row}`} cx="200" cy={180} rx={118 + row * 9} ry={97 + row * 8}
          fill="none" stroke="#2d2065" strokeWidth="3.5" strokeDasharray="3 2.5"
          clipPath="url(#outerClip)"
        />
      ))}

      {/* ── Stand labels ────────────────────────────────────────────────────── */}
      {[
        { label: 'NORTH STAND', x: 200, y: 20, anchor: 'middle' },
        { label: 'SOUTH STAND', x: 200, y: 348, anchor: 'middle' },
        { label: 'EAST STAND',  x: 392, y: 183, anchor: 'end' },
        { label: 'WEST STAND',  x: 8,   y: 183, anchor: 'start' },
      ].map(({ label, x, y, anchor }) => (
        <text key={label} x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
          fontSize="7.5" fontWeight="700" letterSpacing="1.5"
          fill="#6d5fd0" style={{ userSelect: 'none' }}
        >
          {label}
        </text>
      ))}

      {/* ── Gate labels ────────────────────────────────────────────────────── */}
      {[
        { label: 'Gate A', x: 200, y: 62 },
        { label: 'Gate B', x: 325, y: 180 },
        { label: 'Gate C', x: 200, y: 298 },
        { label: 'Gate D', x: 75,  y: 180 },
      ].map(({ label, x, y }) => (
        <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
          fontSize="7" fill="#4c3d91" style={{ userSelect: 'none' }}
        >
          {label}
        </text>
      ))}

      {/* ── Stall markers (rendered last so they're on top) ─────────────────── */}
      {stalls.map(stall => (
        <StallMarker
          key={stall.id}
          stall={stall}
          isSelected={selectedStall?.id === stall.id}
          onClick={onSelect}
        />
      ))}
    </svg>
  );
}

// --- Legend -----------------------------------------------------------------
function Legend() {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/5 flex-wrap">
      {Object.entries(CROWD_COLORS).map(([level, c]) => (
        <span key={level} className="flex items-center gap-1.5 text-xs text-white/50">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.fill }} />
          {c.label} crowd
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-xs text-white/50 ml-auto">
        <span className="w-3 h-3 rounded-full shrink-0 bg-primary-500" />
        Tap a marker for details
      </span>
    </div>
  );
}

// --- Main export ------------------------------------------------------------
export default function CrowdMap({ stalls = [] }) {
  const [selectedStall, setSelectedStall] = useState(null);

  // Merge live WebSocket data if liveData is on stalls
  const enrichedStalls = useMemo(() => stalls, [stalls]);

  if (!enrichedStalls.length) {
    return (
      <div className="glass-card p-8 text-center">
        <span className="text-3xl block mb-2">🏟️</span>
        <p className="text-white/40 text-sm">Loading stadium data...</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🏟️</span>
          <span className="font-semibold text-sm text-white">Stadium Crowd Map</span>
          <span className="text-[10px] bg-wait-fast/10 text-wait-fast px-2 py-0.5 rounded-full border border-wait-fast/20 ml-1">
            Live
          </span>
        </div>
        <span className="text-[10px] text-white/30 uppercase tracking-wider">
          {stalls.length} stalls
        </span>
      </div>

      {/* SVG Map */}
      <div className="bg-surface-950 p-2">
        <StadiumSVG
          stalls={enrichedStalls}
          selectedStall={selectedStall}
          onSelect={setSelectedStall}
        />
      </div>

      {/* Info panel for selected stall */}
      {selectedStall && (
        <div className="px-3 pb-3">
          <StallInfoPanel stall={selectedStall} onClose={() => setSelectedStall(null)} />
        </div>
      )}

      {/* Legend */}
      <Legend />
    </div>
  );
}
