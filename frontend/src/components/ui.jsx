import { Link } from 'react-router-dom';
import { Icon } from './Icons';
import { riskTone, statusTone } from '../utils/format';

export function Card({ children, className = '', padded = true }) {
  return (
    <section className={`card ${padded ? 'card--padded' : ''} ${className}`.trim()}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, icon, actions }) {
  return (
    <header className="card-header">
      <div className="card-header__title">
        {icon ? (
          <span className="card-header__icon">
            <Icon name={icon} size={17} />
          </span>
        ) : null}
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="card-header__actions">{actions}</div> : null}
    </header>
  );
}

export function Badge({ tone = 'neutral', children, dot = false, className = '' }) {
  return (
    <span className={`badge badge--${tone} ${className}`.trim()}>
      {dot ? <span className="badge__dot" /> : null}
      {children}
    </span>
  );
}

export function RiskBadge({ level }) {
  return <Badge tone={riskTone(level)} dot>{level || 'Unknown'}</Badge>;
}

export function StatusBadge({ status }) {
  return <Badge tone={statusTone(status)} dot>{status || 'Unknown'}</Badge>;
}

export function StatCard({ label, value, hint, tone = 'info', icon, loading = false }) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {icon ? (
          <span className="stat-card__icon">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
      <div className="stat-card__value">
        {loading ? <span className="skeleton skeleton--number" /> : value}
      </div>
      {hint ? <p className="stat-card__hint">{hint}</p> : null}
    </div>
  );
}

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  as = 'button',
  ...props
}) {
  const classes = `btn btn--${variant} btn--${size} ${className}`.trim();
  const content = (
    <>
      {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 17} /> : null}
      {children}
    </>
  );

  if (as === 'link') {
    return (
      <Link className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} type="button" {...props}>
      {content}
    </button>
  );
}

export function LoadingState({ label = 'Loading backend data…' }) {
  return (
    <div className="state-view" role="status">
      <span className="spinner" />
      <div>
        <h3>{label}</h3>
        <p>Fetching the latest data from the ThreatGraph API.</p>
      </div>
    </div>
  );
}

export function ErrorState({ title = 'Unable to load data', message, onRetry }) {
  return (
    <div className="state-view state-view--error">
      <span className="state-view__icon state-view__icon--error">
        <Icon name="xCircle" size={24} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{message || 'The backend request failed.'}</p>
        {onRetry ? (
          <Button icon="refresh" onClick={onRetry} size="sm" variant="secondary">
            Retry request
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ icon = 'info', title, description, action }) {
  return (
    <div className="state-view state-view--empty">
      <span className="state-view__icon">
        <Icon name={icon} size={24} />
      </span>
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        {action}
      </div>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, actions }) {
  return (
    <div className="page-intro">
      <div>
        {eyebrow ? <span className="page-intro__eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-intro__actions">{actions}</div> : null}
    </div>
  );
}

export function InfoCallout({ tone = 'info', icon = 'info', title, children }) {
  return (
    <div className={`callout callout--${tone}`}>
      <span className="callout__icon">
        <Icon name={icon} size={19} />
      </span>
      <div>
        {title ? <h3>{title}</h3> : null}
        <div className="callout__body">{children}</div>
      </div>
    </div>
  );
}

export function SectionNote({ children }) {
  return <p className="section-note">{children}</p>;
}

export function DetailItem({ label, value, tone }) {
  return (
    <div className="detail-item">
      <span className="detail-item__label">{label}</span>
      <span className={`detail-item__value ${tone ? `text-${tone}` : ''}`.trim()}>
        {value ?? '—'}
      </span>
    </div>
  );
}
