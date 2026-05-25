import React, { useState } from 'react';

/**
 * Interactive SVG Odontogram — FDI World Dental Federation notation.
 * Upper right (11–18), Upper left (21–28), Lower left (31–38), Lower right (41–48)
 */

type ToothCondition =
  | 'HEALTHY' | 'CAVITY' | 'FILLED' | 'CROWN' | 'MISSING'
  | 'IMPLANT' | 'ROOT_CANAL' | 'EXTRACTION_NEEDED'
  | 'BRIDGE_ABUTMENT' | 'BRIDGE_PONTIC' | 'SEALED';

interface ToothEntry {
  toothNumber: number;
  condition: ToothCondition;
  surface?: string;
  notes?: string;
}

interface Props {
  entries?: ToothEntry[];
  onToothClick?: (toothNumber: number) => void;
  readOnly?: boolean;
}

const CONDITION_COLORS: Record<ToothCondition, string> = {
  HEALTHY:           '#ffffff',
  CAVITY:            '#ef4444',
  FILLED:            '#3b82f6',
  CROWN:             '#a855f7',
  MISSING:           '#6b7280',
  IMPLANT:           '#10b981',
  ROOT_CANAL:        '#f59e0b',
  EXTRACTION_NEEDED: '#dc2626',
  BRIDGE_ABUTMENT:   '#8b5cf6',
  BRIDGE_PONTIC:     '#c084fc',
  SEALED:            '#84cc16',
};

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

function Tooth({
  number,
  condition,
  onClick,
  readOnly,
}: {
  number: number;
  condition?: ToothCondition;
  onClick?: () => void;
  readOnly?: boolean;
}) {
  const fill = condition ? CONDITION_COLORS[condition] : '#ffffff';
  const isAfflicted = condition && condition !== 'HEALTHY';

  return (
    <g
      onClick={readOnly ? undefined : onClick}
      className={readOnly ? '' : 'cursor-pointer'}
      title={`Diente ${number}${condition ? ` — ${condition}` : ''}`}
    >
      {/* Tooth outline */}
      <rect
        x="1"
        y="4"
        width="22"
        height="26"
        rx="4"
        ry="4"
        fill={fill}
        stroke={isAfflicted ? '#374151' : '#d1d5db'}
        strokeWidth="1.5"
        className={readOnly ? '' : 'hover:stroke-blue-500 transition-colors'}
      />
      {/* Root */}
      <rect x="7" y="28" width="10" height="12" rx="3" ry="3"
        fill={fill} stroke={isAfflicted ? '#374151' : '#d1d5db'} strokeWidth="1" />
      {/* Tooth number */}
      <text x="12" y="20" textAnchor="middle" fontSize="7" fill="#374151" fontWeight="500">
        {number}
      </text>
    </g>
  );
}

export function Odontogram({ entries = [], onToothClick, readOnly = false }: Props) {
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);

  const getCondition = (num: number): ToothCondition | undefined => {
    const entry = entries.find((e) => e.toothNumber === num && !e.surface);
    return entry?.condition;
  };

  const renderRow = (teeth: number[], flip = false) => (
    <div className="flex gap-0.5">
      {teeth.map((num) => (
        <div
          key={num}
          onMouseEnter={() => setHoveredTooth(num)}
          onMouseLeave={() => setHoveredTooth(null)}
          style={{ transform: flip ? 'scaleY(-1)' : undefined }}
        >
          <svg width="24" height="40" viewBox="0 0 24 40">
            <Tooth
              number={num}
              condition={getCondition(num)}
              onClick={() => onToothClick?.(num)}
              readOnly={readOnly}
            />
          </svg>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Odontograma (FDI)</h3>

      <div className="space-y-1">
        {/* Upper jaw */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-10">Superior</span>
          {renderRow(UPPER_TEETH)}
        </div>

        {/* Midline */}
        <div className="border-t border-dashed border-gray-300 my-1" />

        {/* Lower jaw */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-10">Inferior</span>
          {renderRow(LOWER_TEETH, true)}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
        {Object.entries(CONDITION_COLORS).map(([cond, color]) => (
          <div key={cond} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded border border-gray-300 flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-500">{cond.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>

      {/* Hovered tooth info */}
      {hoveredTooth && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded px-3 py-1.5">
          Diente <strong>{hoveredTooth}</strong>{' '}
          {getCondition(hoveredTooth) ? `— ${getCondition(hoveredTooth)}` : '— Sano'}
        </div>
      )}
    </div>
  );
}
