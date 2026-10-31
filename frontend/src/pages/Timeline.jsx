import { useMemo, useState } from 'react';
import { api } from '../api';
import { useApiData } from '../hooks/useApiData';
import { useRefresh } from '../context/RefreshContext';
import { Icon } from '../components/Icons';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DetailItem,
  EmptyState,
  ErrorState,
  InfoCallout,
  LoadingState,
  PageIntro,
  RiskBadge,
  StatCard,
  StatusBadge,
} from '../components/ui';
import {
  formatDateTime,
  formatNumber,
  riskTone,
  shortText,
  statusTone,
} from '../utils/format';

function IncidentDetails({ incident, event }) {
  if (!incident) {
    return (
      <Card className="timeline-details">
        <CardHeader
          icon="investigation"
          subtitle="Choose an incident from the timeline."
          title="Incident Details"
        />
        <EmptyState
          description="Select a timeline entry to review its backend explanation, triggered rules, and recommended response."
          icon="timeline"
          title="No incident selected"
        />
      </Card>
    );
  }

  return (
    <Card className="timeline-details">
      <CardHeader
        actions={<RiskBadge level={incident.risk_level} />}
        icon="investigation"
        subtitle={`Event #${incident.event_id}`}
        title="Incident Details"
      />

      <h3 className="timeline-details__heading">{incident.incident_type}</h3>
      <p className="timeline-details__explanation">{incident.explanation}</p>

      <div className="detail-grid">
        <DetailItem label="Timestamp" value={formatDateTime(incident.created_at)} />
        <DetailItem label="User ID" value={incident.user_id} />
        <DetailItem label="IP address" value={incident.ip_address} />
        <DetailItem
          label="Risk score"
          tone={riskTone(incident.risk_level)}
          value={incident.risk_score}
        />
        {event ? (
          <DetailItem
            label="Review status"
            value={<StatusBadge status={event.review_status} />}
          />
        ) : null}
      </div>

      {event?.reasons?.length ? (
        <div className="panel-section">
          <h3>Triggered detection rules</h3>
          <ul className="reason-list reason-list--compact">
            {event.reasons.map((reason) => (
              <li key={reason.rule}>
                <span className="reason-list__points">+{reason.points}</span>
                <div>
                  <strong>{reason.rule}</strong>
                  <p>{reason.explanation}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="section-note">
          A detailed rule breakdown was not returned for this timeline entry.
        </p>
      )}

      {event?.recommendation ? (
        <InfoCallout icon="shield" tone="info" title="Recommended response">
          <p>{event.recommendation}</p>
        </InfoCallout>
      ) : null}

      <InfoCallout icon="info" tone="neutral" title="Interpretation">
        <p>
          This chronological sequence may suggest a progression from failed access
          attempts toward successful access. It is an investigative lead, not proof
          that the account is compromised.
        </p>
      </InfoCallout>

      <Button
        as="link"
        className="button-block"
        icon="investigation"
        to={`/investigation/${incident.event_id}`}
        variant="primary"
      >
        Open full investigation
      </Button>
    </Card>
  );
}

export default function Timeline() {
  const { triggerRefresh } = useRefresh();
  const { data, loading, error } = useApiData(
    () =>
      Promise.all([api.timeline(), api.events(), api.loginTimeline()]).then(
        ([timeline, events, loginTimeline]) => ({
          timeline,
          events,
          loginTimeline,
        }),
      ),
    [],
  );

  const [tab, setTab] = useState('incidents');
  const [riskFilter, setRiskFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedId, setSelectedId] = useState(null);
  const [loginSearch, setLoginSearch] = useState('');
  const [loginStatus, setLoginStatus] = useState('All');

  const eventMap = useMemo(() => {
    const map = new Map();
    (data?.events || []).forEach((event) => map.set(event.id, event));
    return map;
  }, [data]);

  const incidents = useMemo(() => {
    let list = data?.timeline?.timeline || [];
    if (riskFilter !== 'All') {
      list = list.filter(
        (incident) =>
          String(incident.risk_level).toLowerCase() === riskFilter.toLowerCase(),
      );
    }
    return [...list].sort((first, second) => {
      const firstDate = new Date(String(first.created_at).replace(' ', 'T')).getTime();
      const secondDate = new Date(String(second.created_at).replace(' ', 'T')).getTime();
      return sortOrder === 'asc' ? firstDate - secondDate : secondDate - firstDate;
    });
  }, [data, riskFilter, sortOrder]);

  const selectedIncident =
    incidents.find((incident) => incident.event_id === selectedId) ||
    incidents[0] ||
    null;

  const loginEvents = useMemo(() => {
    let list = [...(data?.loginTimeline?.timeline || [])].reverse();
    if (loginStatus !== 'All') {
      list = list.filter((event) => event.status === loginStatus);
    }
    const query = loginSearch.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (event) =>
          String(event.user_id).toLowerCase().includes(query) ||
          String(event.ip_address).toLowerCase().includes(query),
      );
    }
    return list;
  }, [data, loginSearch, loginStatus]);

  if (loading && !data) {
    return <LoadingState label="Reconstructing attack timeline…" />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={triggerRefresh}
        title="Timeline unavailable"
      />
    );
  }

  return (
    <div className="page-stack">
      <PageIntro
        description="Review related events in chronological order."
        eyebrow="Chronological reconstruction"
        title="Attack Sequence Reconstruction"
        actions={
          <div className="segmented-control">
            <button
              className={tab === 'incidents' ? 'is-active' : ''}
              onClick={() => setTab('incidents')}
              type="button"
            >
              Incidents ({formatNumber(data.timeline?.total_incidents || 0)})
            </button>
            <button
              className={tab === 'logins' ? 'is-active' : ''}
              onClick={() => setTab('logins')}
              type="button"
            >
              Login feed ({formatNumber(data.loginTimeline?.total_login_events || 0)})
            </button>
          </div>
        }
      />

      {tab === 'incidents' ? (
        <>
          <div className="filter-bar">
            <div className="filter-bar__group">
              <label htmlFor="timeline-risk">Risk level</label>
              <select
                id="timeline-risk"
                onChange={(event) => setRiskFilter(event.target.value)}
                value={riskFilter}
              >
                <option>All</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
              </select>
            </div>
            <div className="filter-bar__group">
              <label htmlFor="timeline-sort">Order</label>
              <select
                id="timeline-sort"
                onChange={(event) => setSortOrder(event.target.value)}
                value={sortOrder}
              >
                <option value="asc">Oldest first</option>
                <option value="desc">Newest first</option>
              </select>
            </div>
            <span className="filter-bar__summary">
              Showing {formatNumber(incidents.length)} of{' '}
              {formatNumber(data.timeline?.total_incidents || 0)} incidents
            </span>
            <Button
              icon="refresh"
              onClick={() => {
                setRiskFilter('All');
                setSortOrder('asc');
              }}
              size="sm"
              variant="ghost"
            >
              Reset
            </Button>
          </div>

          <div className="timeline-layout">
            <Card className="timeline-card">
              <CardHeader
                icon="timeline"
                subtitle="Entries come from GET /api/timeline and are ordered chronologically."
                title="Incident Timeline"
              />

              {incidents.length ? (
                <ol className="timeline">
                  {incidents.map((incident) => {
                    const event = eventMap.get(incident.event_id);
                    const active = selectedIncident?.event_id === incident.event_id;
                    return (
                      <li
                        className={`timeline__item ${active ? 'is-active' : ''}`}
                        key={incident.event_id}
                      >
                        <span
                          className={`timeline__marker timeline__marker--${riskTone(
                            incident.risk_level,
                          )}`}
                        />
                        <button
                          className="timeline__button"
                          onClick={() => setSelectedId(incident.event_id)}
                          type="button"
                        >
                          <div className="timeline__top">
                            <time>{formatDateTime(incident.created_at)}</time>
                            <RiskBadge level={incident.risk_level} />
                          </div>
                          <h3>{incident.incident_type}</h3>
                          <div className="timeline__meta">
                            <span>
                              <Icon name="user" size={14} />
                              {incident.user_id}
                            </span>
                            <span>
                              <Icon name="network" size={14} />
                              {incident.ip_address}
                            </span>
                            <span>
                              <Icon name="activity" size={14} />
                              Risk {incident.risk_score}
                            </span>
                          </div>
                          <p>{shortText(incident.explanation, 150)}</p>
                          {event?.reasons?.length ? (
                            <div className="timeline__rules">
                              {event.reasons.slice(0, 2).map((reason) => (
                                <Badge key={reason.rule} tone="neutral">
                                  {reason.rule}
                                </Badge>
                              ))}
                              {event.reasons.length > 2 ? (
                                <Badge tone="neutral">+{event.reasons.length - 2} more</Badge>
                              ) : null}
                            </div>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <EmptyState
                  description={
                    riskFilter === 'All'
                      ? 'No suspicious incidents have been returned by the backend yet.'
                      : 'No incidents match the selected risk level.'
                  }
                  icon="timeline"
                  title="No incidents in this view"
                />
              )}
            </Card>

            <IncidentDetails
              event={selectedIncident ? eventMap.get(selectedIncident.event_id) : null}
              incident={selectedIncident}
            />
          </div>
        </>
      ) : (
        <>
          <div className="stat-grid stat-grid--3">
            <StatCard
              hint="All login events recorded"
              icon="activity"
              label="Total Login Events"
              tone="info"
              value={formatNumber(data.loginTimeline?.total_login_events || 0)}
            />
            <StatCard
              hint="Successful authentication"
              icon="checkCircle"
              label="Successful Logins"
              tone="low"
              value={formatNumber(data.loginTimeline?.successful_logins || 0)}
            />
            <StatCard
              hint="Failed authentication attempts"
              icon="xCircle"
              label="Failed Logins"
              tone="high"
              value={formatNumber(data.loginTimeline?.failed_logins || 0)}
            />
          </div>

          <div className="filter-bar">
            <div className="search-field">
              <Icon name="investigation" size={17} />
              <input
                aria-label="Search login events"
                onChange={(event) => setLoginSearch(event.target.value)}
                placeholder="Search user or IP address…"
                type="search"
                value={loginSearch}
              />
            </div>
            <div className="filter-bar__group">
              <label htmlFor="login-status">Login result</label>
              <select
                id="login-status"
                onChange={(event) => setLoginStatus(event.target.value)}
                value={loginStatus}
              >
                <option>All</option>
                <option>Success</option>
                <option>Failed</option>
              </select>
            </div>
            <span className="filter-bar__summary">
              {formatNumber(loginEvents.length)} login event
              {loginEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          <Card padded={false}>
            <div className="card-padded-header">
              <CardHeader
                icon="clock"
                subtitle="Raw login records from GET /api/login-timeline."
                title="Login Event Feed"
              />
            </div>
            {loginEvents.length ? (
              <div className="table-wrap table-wrap--tall">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Timestamp</th>
                      <th>User ID</th>
                      <th>IP Address</th>
                      <th>Login Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginEvents.map((event) => (
                      <tr key={event.event_id}>
                        <td>
                          <span className="mono">#{event.event_id}</span>
                        </td>
                        <td className="nowrap">{formatDateTime(event.timestamp)}</td>
                        <td>{event.user_id}</td>
                        <td>
                          <span className="mono">{event.ip_address}</span>
                        </td>
                        <td>
                          <StatusBadge status={event.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="card-padded">
                <EmptyState
                  description={
                    loginSearch || loginStatus !== 'All'
                      ? 'No login events match the current search and filter.'
                      : 'No login events have been recorded through POST /api/login-event yet.'
                  }
                  icon="clock"
                  title="No login events"
                />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
