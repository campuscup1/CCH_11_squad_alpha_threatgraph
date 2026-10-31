import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApiData } from '../hooks/useApiData';
import { useRefresh } from '../context/RefreshContext';
import { RiskDistribution } from '../components/RiskDistribution';
import { Icon } from '../components/Icons';
import {
  Badge,
  Button,
  Card,
  CardHeader,
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

async function loadOverview() {
  const [dashboard, alerts, loginTimeline, correlation, attackPatterns] =
    await Promise.allSettled([
      api.dashboard(),
      api.alerts(),
      api.loginTimeline(),
      api.correlation(60),
      api.attackPatterns(60),
    ]);

  if (dashboard.status === 'rejected') {
    throw dashboard.reason;
  }

  return {
    dashboard: dashboard.value,
    alerts: alerts.status === 'fulfilled' ? alerts.value : [],
    loginTimeline:
      loginTimeline.status === 'fulfilled' ? loginTimeline.value : null,
    correlation:
      correlation.status === 'fulfilled' ? correlation.value : null,
    attackPatterns:
      attackPatterns.status === 'fulfilled' ? attackPatterns.value : null,
    partialErrors: [
      alerts.status === 'rejected' ? `Alerts: ${alerts.reason.message}` : null,
      loginTimeline.status === 'rejected'
        ? `Login timeline: ${loginTimeline.reason.message}`
        : null,
      correlation.status === 'rejected'
        ? `Correlation: ${correlation.reason.message}`
        : null,
      attackPatterns.status === 'rejected'
        ? `Attack patterns: ${attackPatterns.reason.message}`
        : null,
    ].filter(Boolean),
  };
}

export default function Overview() {
  const navigate = useNavigate();
  const { triggerRefresh } = useRefresh();
  const { data, loading, error } = useApiData(loadOverview, []);

  if (loading && !data) {
    return <LoadingState label="Loading security overview…" />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={triggerRefresh}
        title="Security overview unavailable"
      />
    );
  }

  const { dashboard, alerts, loginTimeline, correlation, attackPatterns, partialErrors } =
    data;

  const highRiskCount =
    Number(dashboard.critical_events || 0) + Number(dashboard.high_events || 0);
  const correlatedCampaigns = correlation
    ? correlation.correlations.filter((item) => item.possible_password_spraying)
        .length
    : null;
  const recentAlerts = alerts.slice(0, 5);
  const recentLogins = (loginTimeline?.timeline || []).slice(-8).reverse();
  const patterns = attackPatterns?.detected_patterns || [];
  const topCorrelations = (correlation?.correlations || []).slice(0, 3);

  return (
    <div className="page-stack">
      <PageIntro
        description="Monitor suspicious login activity and investigate correlated threats."
        eyebrow="Live backend data"
        title="Security Overview"
        actions={
          <>
            <Button as="link" icon="alerts" to="/alerts" variant="secondary">
              View alerts
            </Button>
            <Button as="link" icon="activity" to="/timeline" variant="primary">
              Open timeline
            </Button>
          </>
        }
      />

      {partialErrors.length ? (
        <InfoCallout
          icon="alerts"
          title="Some optional data could not be loaded"
          tone="warning"
        >
          <ul className="compact-list">
            {partialErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </InfoCallout>
      ) : null}

      <div className="stat-grid">
        <StatCard
          hint="All analyzed events"
          icon="activity"
          label="Total Events"
          tone="info"
          value={formatNumber(dashboard.total_events)}
        />
        <StatCard
          hint="Risk score below 30"
          icon="checkCircle"
          label="Normal Events"
          tone="low"
          value={formatNumber(dashboard.normal_events)}
        />
        <StatCard
          hint="Risk score 30 or above"
          icon="alerts"
          label="Suspicious Events"
          tone="medium"
          value={formatNumber(dashboard.suspicious_events)}
        />
        <StatCard
          hint="Critical and high severity"
          icon="shield"
          label="High-Risk Alerts"
          tone="high"
          value={formatNumber(highRiskCount)}
        />
        <StatCard
          hint={
            correlation
              ? `Password-spraying pattern in last ${correlation.time_window_minutes} min`
              : 'Correlation endpoint unavailable'
          }
          icon="network"
          label="Correlated Campaigns"
          tone="critical"
          value={
            correlatedCampaigns === null
              ? '—'
              : formatNumber(correlatedCampaigns)
          }
        />
      </div>

      <div className="grid grid--chart">
        <Card>
          <CardHeader
            icon="scan"
            subtitle="Backend risk classifications across all analyzed events."
            title="Risk Distribution"
          />
          <RiskDistribution
            counts={{
              critical: dashboard.critical_events,
              high: dashboard.high_events,
              medium: dashboard.medium_events,
              normal: dashboard.normal_events,
            }}
          />
        </Card>

        <Card>
          <CardHeader
            icon="crosshair"
            subtitle="Patterns detected by the backend in the last 60 minutes."
            title="Detection Summary"
          />
          {patterns.length ? (
            <ul className="pattern-list">
              {patterns.slice(0, 4).map((pattern, index) => (
                <li key={`${pattern.type}-${pattern.ip_address}-${index}`}>
                  <span className="pattern-list__icon">
                    <Icon name="alerts" size={17} />
                  </span>
                  <div>
                    <strong>{pattern.type}</strong>
                    <span>
                      {pattern.ip_address} · {pattern.accounts_targeted}{' '}
                      {pattern.accounts_targeted === 1 ? 'account' : 'accounts'} ·{' '}
                      {pattern.failed_attempts} failed attempts
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              description="The backend did not return any brute-force or password-spraying patterns for this window."
              icon="checkCircle"
              title="No attack patterns detected"
            />
          )}

          {topCorrelations.length ? (
            <div className="correlation-preview">
              <h3>Cross-account correlation</h3>
              <ul>
                {topCorrelations.map((item) => (
                  <li key={item.ip_address}>
                    <span className="mono">{item.ip_address}</span>
                    <span>
                      {item.accounts_targeted} accounts · highest risk{' '}
                      {item.highest_risk_score}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid grid--wide">
        <Card padded={false}>
          <div className="card-padded-header">
            <CardHeader
              actions={
                <Button as="link" icon="chevronRight" size="sm" to="/alerts" variant="ghost">
                  All alerts
                </Button>
              }
              icon="alerts"
              subtitle="Most recent suspicious events returned by /api/alerts."
              title="Recent Security Alerts"
            />
          </div>
          {recentAlerts.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Alert</th>
                    <th>Severity</th>
                    <th>Account</th>
                    <th>Source IP</th>
                    <th>Risk</th>
                    <th>Status</th>
                    <th>Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.map((alert) => (
                    <tr
                      className="clickable-row"
                      key={alert.id}
                      onClick={() => navigate(`/investigation/${alert.id}`)}
                    >
                      <td>
                        <span className="mono">#{alert.id}</span>
                      </td>
                      <td>
                        <RiskBadge level={alert.risk_level} />
                      </td>
                      <td>{alert.user_id}</td>
                      <td>
                        <span className="mono">{alert.ip_address}</span>
                      </td>
                      <td>
                        <span className={`score score--${riskTone(alert.risk_level)}`}>
                          {alert.risk_score}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={alert.review_status} />
                      </td>
                      <td className="nowrap">{formatDateTime(alert.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card-padded">
              <EmptyState
                description="No suspicious events are currently stored. Events will appear after records are analyzed by the backend."
                icon="alerts"
                title="No security alerts yet"
              />
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div className="card-padded-header">
            <CardHeader
              actions={
                <Button as="link" icon="chevronRight" size="sm" to="/timeline" variant="ghost">
                  Timeline
                </Button>
              }
              icon="clock"
              subtitle="Latest entries from /api/login-timeline."
              title="Recent Login Activity"
            />
          </div>
          {recentLogins.length ? (
            <ul className="activity-list">
              {recentLogins.map((event) => (
                <li key={event.event_id}>
                  <span
                    className={`activity-list__dot activity-list__dot--${
                      event.status === 'Success' ? 'success' : 'failed'
                    }`}
                  />
                  <div className="activity-list__body">
                    <div className="activity-list__row">
                      <strong>{event.user_id}</strong>
                      <Badge tone={statusTone(event.status)}>{event.status}</Badge>
                    </div>
                    <span className="mono">{event.ip_address}</span>
                    <time>{formatDateTime(event.timestamp)}</time>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card-padded">
              <EmptyState
                description="No login events have been recorded through /api/login-event yet."
                icon="clock"
                title="No login activity"
              />
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          icon="activity"
          subtitle="A compact view of the latest suspicious event explanations."
          title="Recent Activity"
        />
        {alerts.length ? (
          <ul className="event-feed">
            {alerts.slice(0, 4).map((alert) => (
              <li key={alert.id}>
                <span className="event-feed__time">{formatDateTime(alert.created_at)}</span>
                <div>
                  <strong>
                    {alert.user_id} from {alert.ip_address}
                  </strong>
                  <p>{shortText(alert.explanation, 180)}</p>
                </div>
                <Badge tone={riskTone(alert.risk_level)}>
                  {alert.risk_level} · {alert.risk_score}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            description="Suspicious event activity will appear here once the backend has analyzed records."
            icon="activity"
            title="No recent suspicious activity"
          />
        )}
      </Card>
    </div>
  );
}

