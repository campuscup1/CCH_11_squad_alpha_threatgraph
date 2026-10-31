import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE } from '../config';
import { useRefresh } from '../context/RefreshContext';
import { formatClock, formatDateTime } from '../utils/format';
import { Icon } from './Icons';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: 'overview', end: true },
  { to: '/ingestion', label: 'Event Ingestion', icon: 'upload' },
  { to: '/graph', label: 'Attack Graph', icon: 'graph' },
  { to: '/timeline', label: 'Attack Timeline', icon: 'timeline' },
  { to: '/alerts', label: 'Security Alerts', icon: 'alerts' },
  { to: '/investigation', label: 'Investigation', icon: 'investigation' },
];

const PAGE_TITLES = [
  { path: '/ingestion', title: 'Event Ingestion' },
  { path: '/graph', title: 'Attack Relationship Graph' },
  { path: '/timeline', title: 'Attack Sequence Reconstruction' },
  { path: '/alerts', title: 'Security Alerts' },
  { path: '/investigation', title: 'Investigation Details' },
  { path: '/', title: 'Security Overview' },
];

function getPageTitle(pathname) {
  const match = PAGE_TITLES.find((item) =>
    item.path === '/' ? pathname === '/' : pathname.startsWith(item.path),
  );
  return match ? match.title : 'ThreatGraph';
}

function BackendStatusPill({ status, error }) {
  const labels = {
    online: 'Backend connected',
    offline: 'Backend offline',
    checking: 'Checking backend…',
  };

  return (
    <span
      className={`connection-pill connection-pill--${status}`}
      title={error || labels[status]}
    >
      <span className="connection-pill__dot" />
      {labels[status]}
    </span>
  );
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();
  const {
    triggerRefresh,
    lastUpdated,
    backendStatus,
    backendError,
  } = useRefresh();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-open', sidebarOpen);
    return () => document.body.classList.remove('nav-open');
  }, [sidebarOpen]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setSidebarOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    triggerRefresh();
    window.setTimeout(() => setRefreshing(false), 700);
  }

  return (
    <div className="app-shell">
      <button
        aria-label="Close navigation"
        className={`sidebar-backdrop ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        type="button"
      />

      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <span className="brand__mark">
            <Icon name="shield" size={24} />
          </span>
          <div className="brand__text">
            <strong>{APP_NAME}</strong>
            <span>{APP_TAGLINE}</span>
          </div>
          <button
            aria-label="Close navigation"
            className="icon-button sidebar__close"
            onClick={() => setSidebarOpen(false)}
            type="button"
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="sidebar__section-label">Security operations</div>
        <nav aria-label="Primary navigation" className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `nav-item ${isActive ? 'is-active' : ''}`.trim()
              }
              end={item.end}
              key={item.to}
              to={item.to}
            >
              <span className="nav-item__icon">
                <Icon name={item.icon} size={19} />
              </span>
              <span>{item.label}</span>
              <Icon className="nav-item__chevron" name="chevronRight" size={15} />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__system">
            <span className="sidebar__system-icon">
              <Icon name="server" size={17} />
            </span>
            <div>
              <strong>API endpoint</strong>
              <span className="sidebar__endpoint">FastAPI · SQLite</span>
            </div>
          </div>
          <div className="sidebar__status">
            <BackendStatusPill status={backendStatus} error={backendError} />
            <span className="sidebar__version">ThreatGraph v1.0</span>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              aria-label="Open navigation"
              className="icon-button topbar__menu"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <Icon name="menu" size={21} />
            </button>
            <div className="topbar__titles">
              <span className="topbar__eyebrow">ThreatGraph console</span>
              <h1>{getPageTitle(location.pathname)}</h1>
            </div>
          </div>

          <div className="topbar__right">
            <BackendStatusPill status={backendStatus} error={backendError} />

            <span className="topbar__updated" title={lastUpdated ? formatDateTime(lastUpdated) : ''}>
              <Icon name="clock" size={15} />
              {lastUpdated ? `Updated ${formatClock(lastUpdated)}` : 'Awaiting data'}
            </span>

            <button
              className="btn btn--secondary btn--sm topbar__refresh"
              onClick={handleRefresh}
              title="Refresh data from the backend"
              type="button"
            >
              <Icon className={refreshing ? 'spin' : ''} name="refresh" size={16} />
              Refresh
            </button>

            <div className="admin-chip" title="Administrator session">
              <span className="admin-chip__avatar">AD</span>
              <span className="admin-chip__text">
                <strong>Administrator</strong>
                <span>SOC Analyst</span>
              </span>
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
