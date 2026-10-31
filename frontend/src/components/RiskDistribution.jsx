import { formatNumber } from '../utils/format';

const SEGMENTS = [
  { key: 'critical', label: 'Critical', color: 'var(--risk-critical)' },
  { key: 'high', label: 'High', color: 'var(--risk-high)' },
  { key: 'medium', label: 'Medium', color: 'var(--risk-medium)' },
  { key: 'normal', label: 'Normal / Low', color: 'var(--risk-low)' },
];

export function RiskDistribution({ counts }) {
  const total = SEGMENTS.reduce(
    (sum, segment) => sum + Number(counts[segment.key] || 0),
    0,
  );
  const circumference = 2 * Math.PI * 42;
  let consumed = 0;

  return (
    <div className="risk-distribution">
      <div className="risk-donut">
        <svg aria-label="Risk distribution chart" role="img" viewBox="0 0 120 120">
          <circle
            className="risk-donut__track"
            cx="60"
            cy="60"
            fill="none"
            r="42"
            strokeWidth="13"
          />
          {SEGMENTS.map((segment) => {
            const value = Number(counts[segment.key] || 0);
            if (!value || !total) return null;
            const length = (value / total) * circumference;
            const offset = consumed;
            consumed += length;
            return (
              <circle
                className="risk-donut__segment"
                cx="60"
                cy="60"
                fill="none"
                key={segment.key}
                r="42"
                stroke={segment.color}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeWidth="13"
                transform="rotate(-90 60 60)"
              />
            );
          })}
        </svg>
        <div className="risk-donut__center">
          <strong>{formatNumber(total)}</strong>
          <span>events</span>
        </div>
      </div>

      <ul className="risk-legend">
        {SEGMENTS.map((segment) => {
          const value = Number(counts[segment.key] || 0);
          const percentage = total ? Math.round((value / total) * 100) : 0;
          return (
            <li key={segment.key}>
              <span
                className="risk-legend__dot"
                style={{ background: segment.color }}
              />
              <span className="risk-legend__label">{segment.label}</span>
              <span className="risk-legend__value">{formatNumber(value)}</span>
              <span className="risk-legend__percent">{percentage}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
