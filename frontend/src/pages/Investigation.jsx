import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  riskToneFromScore,
  shortText,
} from '../utils/format';

const REVIEW_STATUSES = ['Pending', 'Reviewed', 'False Positive'];

function InvestigationDetail({ alert, feedback, onUpdateStatus, updating }) {
  const { data, loading, error } = useApiData(
    () =>
      Promise.allSettled([
        api.responseAdvice(alert.id),
        api.investigate(alert.ip_address),
      ]).then(([response, investigation]) => ({
        response: response.status === 'fulfilled' ? response.value : null,
        investigation:
          investigation.status === 'fulfilled' ? investigation.value : null,
        responseError:
          response.status === 'rejected' ? response.reason.message : null,
        investigationError:
          investigation.status === 'rejected' ? investigation.reason.message : null,
      })),
    [alert.id, alert.ip_address],
  );

  const response = data?.response;
  const investigation = data?.investigation;
  const relatedEvents = investigation?.events || [];
  const targetedAccounts = investigation?.targeted_accounts || [];
  const recommendedActions = response?.recommended_actions || [];
  const hasInvestigationMessage =
    investigation && !investigation.events && investigation.message;

  return (
    <div className="page-stack">
      <PageIntro
        description="Review backend evidence, detection reasoning, and recommended administrative action."
        eyebrow={`Alert #${alert.id}`}
        title="Investigation Details"
        actions={
          <>
            <Button
              as="link"
              icon="network"
              to={`/investigation?ip=${encodeURIComponent(alert.ip_address)}`}
              variant="secondary"
            >
              Investigate IP
            </Button>
            <Button as="link" icon="arrowLeft" to="/alerts" variant="secondary">
              Back to alerts
            </Button>
          </>
        }
      />

      <Card className="investigation-hero">
        <div className="investigation-hero__main">
          <div className="investigation-hero__badges">
            <RiskBadge level={alert.risk_level} />
            <StatusBadge status={alert.review_status} />
            <Badge tone="neutral">Event #{alert.id}</Badge>
          </div>
          <h2>
            {alert.user_id} <span>from</span>{' '}
            <span className="mono">{alert.ip_address}</span>
          </h2>
          <p>{alert.explanation}</p>
          <div className="detail-grid detail-grid--hero">
            <DetailItem label="Affected account" value={alert.user_id} />
            <DetailItem label="Source IP" value={alert.ip_address} />
            <DetailItem label="Detected at" value={formatDateTime(alert.created_at)} />
            <DetailItem
              label="Risk level"
              value={<RiskBadge level={alert.risk_level} />}
            />
          </div>
        </div>

        <div className="investigation-hero__score">
          <div
            className={`score-orb score-orb--${riskTone(alert.risk_level)}`}
            style={{ '--score': Math.max(0, Math.min(100, Number(alert.risk_score))) }}
          >
            <div className="score-orb__center">
              <strong>{alert.risk_score}</strong>
              <span>risk score</span>
            </div>
          </div>
          <p>Calculated by the backend</p>
        </div>
      </Card>

      {data?.responseError || data?.investigationError ? (
        <InfoCallout icon="alerts" title="Some investigation data is unavailable" tone="warning">
          <ul className="compact-list">
            {data.responseError ? <li>Response advice: {data.responseError}</li> : null}
            {data.investigationError ? (
              <li>Related activity: {data.investigationError}</li>
            ) : null}
          </ul>
        </InfoCallout>
      ) : null}

      <div className="grid grid--investigation">
        <div className="page-stack">
          <Card>
            <CardHeader
              icon="scan"
              subtitle="Rule-level points returned by the backend risk engine."
              title="Detection Explanation & Risk Breakdown"
            />

            {loading && !data ? (
              <div className="inline-loading">
                <span className="spinner spinner--small" /> Loading related evidence…
              </div>
            ) : null}

            <div className="risk-summary">
              <span>Total backend risk score</span>
              <strong className={`text-${riskTone(alert.risk_level)}`}>
                {alert.risk_score}
              </strong>
            </div>

            {alert.reasons?.length ? (
              <ul className="reason-list">
                {alert.reasons.map((reason) => (
                  <li key={reason.rule}>
                    <span className="reason-list__points">+{reason.points}</span>
                    <div className="reason-list__body">
                      <div className="reason-list__heading">
                        <strong>{reason.rule}</strong>
                        <span
                          className="reason-list__bar"
                          style={{
                            '--points': Math.max(
                              0,
                              Math.min(100, Number(reason.points) || 0),
                            ),
                          }}
                        >
                          <i />
                        </span>
                      </div>
                      <p>{reason.explanation}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                description="The backend did not return any triggered rules for this event."
                icon="info"
                title="No rule breakdown"
              />
            )}

            <p className="section-note">
              Risk scores and rule points are generated by the backend. The frontend
              does not calculate or adjust them.
            </p>
          </Card>

          <Card>
            <CardHeader
              icon="file"
              subtitle={`Related activity returned by GET /api/investigate/${alert.ip_address}.`}
              title="Evidence & Related Event History"
            />

            {error ? (
              <InfoCallout icon="xCircle" title="Related evidence unavailable" tone="warning">
                <p>{error}</p>
              </InfoCallout>
            ) : null}

            {hasInvestigationMessage ? (
              <InfoCallout icon="info" title="No related activity found" tone="neutral">
                <p>{investigation.message}</p>
              </InfoCallout>
            ) : null}

            {investigation && !investigation.message ? (
              <div className="evidence-stats">
                <div>
                  <span>Targeted accounts</span>
                  <strong>{formatNumber(investigation.accounts_targeted)}</strong>
                </div>
                <div>
                  <span>Total events from IP</span>
                  <strong>{formatNumber(investigation.total_events)}</strong>
                </div>
                <div>
                  <span>Suspicious events</span>
                  <strong>{formatNumber(investigation.suspicious_events)}</strong>
                </div>
                <div>
                  <span>Highest risk score</span>
                  <strong>{formatNumber(investigation.highest_risk_score)}</strong>
                </div>
              </div>
            ) : null}

            {targetedAccounts.length ? (
              <div className="panel-section">
                <h3>Accounts targeted from this IP</h3>
                <div className="chip-list">
                  {targetedAccounts.map((account) => (
                    <span className="entity-chip entity-chip--static" key={account}>
                      <Icon name="user" size={14} />
                      {account}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {relatedEvents.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>User</th>
                      <th>Risk</th>
                      <th>Timestamp</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedEvents.map((event) => (
                      <tr key={event.event_id}>
                        <td>
                          <span className="mono">#{event.event_id}</span>
                        </td>
                        <td>{event.user_id}</td>
                        <td>
                          <div className="risk-cell">
                            <RiskBadge level={event.risk_level} />
                            <span className="mono">{event.risk_score}</span>
                          </div>
                        </td>
                        <td className="nowrap">{formatDateTime(event.created_at)}</td>
                        <td>{shortText(event.explanation, 120)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !loading && !hasInvestigationMessage ? (
              <EmptyState
                description="No related event history was returned for this IP address."
                icon="file"
                title="No related events"
              />
            ) : null}
          </Card>
        </div>

        <div className="page-stack">
          <Card>
            <CardHeader
              icon="shield"
              subtitle="Advisory actions returned by the backend."
              title="Recommended Response"
            />

            {recommendedActions.length ? (
              <ol className="action-list">
                {recommendedActions.map((action, index) => (
                  <li key={action}>
                    <span className="action-list__number">{index + 1}</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="section-note">
                No response advice is available for this event.
              </p>
            )}

            {alert.recommendation ? (
              <InfoCallout icon="shield" tone="info" title="Risk-engine recommendation">
                <p>{alert.recommendation}</p>
              </InfoCallout>
            ) : null}

            <p className="section-note">
              Recommendations are advisory only. ThreatGraph never automatically
              blocks accounts or IP addresses.
            </p>
          </Card>

          <Card>
            <CardHeader
              icon="network"
              subtitle="Backend correlation details for the source IP."
              title="Related Network Activity"
            />

            {investigation && !investigation.message ? (
              <div className="related-network">
                <div>
                  <span>IP address</span>
                  <strong className="mono">{investigation.ip_address}</strong>
                </div>
                <div>
                  <span>Accounts targeted</span>
                  <strong>{formatNumber(investigation.accounts_targeted)}</strong>
                </div>
                <div>
                  <span>Suspicious / total events</span>
                  <strong>
                    {formatNumber(investigation.suspicious_events)} /{' '}
                    {formatNumber(investigation.total_events)}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="section-note">
                Related network activity is unavailable for this alert.
              </p>
            )}

            <div className="button-row">
              <Button as="link" icon="graph" size="sm" to="/graph" variant="secondary">
                Open attack graph
              </Button>
              <Button as="link" icon="timeline" size="sm" to="/timeline" variant="secondary">
                View timeline
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader
              icon="checkCircle"
              subtitle="Status updates use PATCH /api/alerts/{id}/review."
              title="Investigation Status"
            />

            <div className="current-status">
              <span>Current review status</span>
              <StatusBadge status={alert.review_status} />
            </div>

            <div className="status-actions">
              {REVIEW_STATUSES.map((status) => (
                <Button
                  disabled={updating || status === alert.review_status}
                  icon={status === 'False Positive' ? 'xCircle' : 'check'}
                  key={status}
                  onClick={() => onUpdateStatus(status)}
                  size="sm"
                  variant={status === alert.review_status ? 'primary' : 'secondary'}
                >
                  {status === 'False Positive' ? 'False positive' : `Mark ${status.toLowerCase()}`}
                </Button>
              ))}
            </div>

            {feedback ? (
              <div className={`inline-alert inline-alert--${feedback.type}`} role="status">
                <Icon
                  name={feedback.type === 'success' ? 'checkCircle' : 'xCircle'}
                  size={18}
                />
                <p>{feedback.message}</p>
              </div>
            ) : null}
          </Card>

          <InfoCallout icon="info" tone="neutral" title="Interpretation guidance">
            <p>
              A suspicious event is not proof that an account is compromised. The
              backend does not currently provide per-alert benign explanations, so
              validate the evidence with the account owner and additional telemetry
              before taking disruptive action.
            </p>
          </InfoCallout>
        </div>
      </div>
    </div>
  );
}

function IpInvestigation({ ipAddress }) {
  const navigate = useNavigate();
  const { triggerRefresh } = useRefresh();
  const { data, loading, error } = useApiData(
    () => api.investigate(ipAddress),
    [ipAddress],
  );

  const intro = (
    <PageIntro
      description="Backend activity for the selected source IP address."
      eyebrow="IP investigation"
      title={ipAddress}
      actions={
        <Button
          as="link"
          icon="arrowLeft"
          to="/investigation"
          variant="secondary"
        >
          Back to investigation
        </Button>
      }
    />
  );

  if (loading && !data) {
    return (
      <div className="page-stack">
        {intro}
        <LoadingState label="Loading IP investigation…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        {intro}
        <ErrorState
          message={error}
          onRetry={triggerRefresh}
          title="IP investigation unavailable"
        />
      </div>
    );
  }

  if (data?.message) {
    return (
      <div className="page-stack">
        {intro}
        <Card>
          <EmptyState
            description={data.message}
            icon="investigation"
            title="No activity found"
            action={
              <Button onClick={() => navigate('/investigation')} variant="secondary">
                Investigate another IP
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const events = data?.events || [];

  return (
    <div className="page-stack">
      {intro}

      <div className="stat-grid">
        <StatCard
          hint="Distinct accounts contacted"
          icon="users"
          label="Targeted Accounts"
          tone="info"
          value={formatNumber(data.accounts_targeted)}
        />
        <StatCard
          hint="All events from this IP"
          icon="activity"
          label="Total Events"
          tone="low"
          value={formatNumber(data.total_events)}
        />
        <StatCard
          hint="Risk score 30 or above"
          icon="alerts"
          label="Suspicious Events"
          tone="medium"
          value={formatNumber(data.suspicious_events)}
        />
        <StatCard
          hint="Maximum backend risk score"
          icon="shield"
          label="Highest Risk"
          tone={riskToneFromScore(data.highest_risk_score)}
          value={formatNumber(data.highest_risk_score)}
        />
      </div>

      {data.targeted_accounts?.length ? (
        <Card>
          <CardHeader
            icon="users"
            subtitle="Accounts seen from this IP address."
            title="Targeted Accounts"
          />
          <div className="chip-list">
            {data.targeted_accounts.map((account) => (
              <span className="entity-chip entity-chip--static" key={account}>
                <Icon name="user" size={14} />
                {account}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <Card padded={false}>
        <div className="card-padded-header">
          <CardHeader
            icon="file"
            subtitle={`Events returned by GET /api/investigate/${ipAddress}.`}
            title="Event History"
          />
        </div>

        {events.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>User</th>
                  <th>Risk</th>
                  <th>Timestamp</th>
                  <th>Explanation</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.event_id}>
                    <td>
                      <span className="mono">#{event.event_id}</span>
                    </td>
                    <td>{event.user_id}</td>
                    <td>
                      <div className="risk-cell">
                        <RiskBadge level={event.risk_level} />
                        <span className="mono">{event.risk_score}</span>
                      </div>
                    </td>
                    <td className="nowrap">{formatDateTime(event.created_at)}</td>
                    <td>{shortText(event.explanation, 140)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-padded">
            <EmptyState
              description="No individual events were returned for this IP address."
              icon="file"
              title="No events"
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function InvestigationIndex({ alerts }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [ipAddress, setIpAddress] = useState('');

  function handleIpSubmit(event) {
    event.preventDefault();
    const value = ipAddress.trim();
    if (value) {
      navigate(`/investigation?ip=${encodeURIComponent(value)}`);
    }
  }

  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return alerts;
    return alerts.filter((alert) =>
      [alert.id, alert.user_id, alert.ip_address, alert.risk_level, alert.explanation]
        .map((value) => String(value ?? '').toLowerCase())
        .some((value) => value.includes(query)),
    );
  }, [alerts, search]);

  return (
    <div className="page-stack">
      <PageIntro
        description="Choose an alert to examine its evidence, detection reasoning, and response guidance."
        eyebrow="Investigation workspace"
        title="Investigation Details"
        actions={<Badge tone="info">{formatNumber(alerts.length)} alerts available</Badge>}
      />

      <Card>
        <CardHeader
          icon="investigation"
          subtitle="Search by alert ID, account, IP address, severity, or explanation."
          title="Select an Alert"
        />
        <form className="ip-lookup" onSubmit={handleIpSubmit}>
          <div className="search-field">
            <Icon name="network" size={17} />
            <input
              aria-label="IP address to investigate"
              onChange={(event) => setIpAddress(event.target.value)}
              placeholder="Enter an IP address, e.g. 203.0.113.24"
              type="text"
              value={ipAddress}
            />
          </div>
          <Button
            disabled={!ipAddress.trim()}
            icon="investigation"
            type="submit"
            variant="primary"
          >
            Investigate IP
          </Button>
        </form>

        <div className="panel-section">
          <h3>Alerts</h3>
        </div>
        <div className="search-field">
          <Icon name="investigation" size={17} />
          <input
            aria-label="Search alerts to investigate"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search alerts…"
            type="search"
            value={search}
          />
        </div>

        {results.length ? (
          <ul className="investigation-selector">
            {results.map((alert) => (
              <li key={alert.id}>
                <button
                  className="investigation-selector__item"
                  onClick={() => navigate(`/investigation/${alert.id}`)}
                  type="button"
                >
                  <span className="investigation-selector__main">
                    <span className="mono investigation-selector__id">#{alert.id}</span>
                    <span>
                      <strong>{alert.user_id}</strong>
                      <span className="mono">{alert.ip_address}</span>
                    </span>
                  </span>
                  <span className="investigation-selector__reason">
                    {shortText(alert.explanation, 110)}
                  </span>
                  <span className="investigation-selector__meta">
                    <RiskBadge level={alert.risk_level} />
                    <StatusBadge status={alert.review_status} />
                    <span className="risk-cell">
                      <span>Risk</span>
                      <strong>{alert.risk_score}</strong>
                    </span>
                    <time>{formatDateTime(alert.created_at)}</time>
                  </span>
                  <Icon name="chevronRight" size={18} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            description={
              alerts.length
                ? 'No alerts match the current search.'
                : 'No suspicious alerts are available yet. Analyze events to create alerts.'
            }
            icon="investigation"
            title={alerts.length ? 'No matching alerts' : 'No alerts to investigate'}
          />
        )}
      </Card>
    </div>
  );
}

export default function Investigation() {
  const { alertId } = useParams();
  const [searchParams] = useSearchParams();
  const ipAddress = searchParams.get('ip');
  const { triggerRefresh, markUpdated } = useRefresh();
  const { data: alerts, setData, loading, error } = useApiData(
    () => api.alerts(),
    [],
  );
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const alert = alertId
    ? (alerts || []).find((event) => String(event.id) === String(alertId))
    : null;

  async function handleUpdateStatus(status) {
    if (!alert) return;
    setUpdating(true);
    setFeedback(null);

    try {
      const updated = await api.reviewAlert(alert.id, status);
      setData((current) =>
        (current || []).map((event) => (event.id === updated.id ? updated : event)),
      );
      markUpdated();
      setFeedback({
        type: 'success',
        message: `Review status changed to ${status}.`,
      });
    } catch (requestError) {
      setFeedback({
        type: 'error',
        message: `Could not update review status: ${requestError.message}`,
      });
    } finally {
      setUpdating(false);
    }
  }

  if (ipAddress) {
    return <IpInvestigation ipAddress={ipAddress} />;
  }

  if (loading && !alerts) {
    return <LoadingState label="Loading investigation data…" />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={triggerRefresh}
        title="Investigation data unavailable"
      />
    );
  }

  if (!alertId) {
    return <InvestigationIndex alerts={alerts || []} />;
  }

  if (!alert) {
    return (
      <div className="page-stack">
        <PageIntro
          description="The requested event could not be found in the backend event list."
          eyebrow={`Alert #${alertId}`}
          title="Investigation Details"
        />
        <Card>
          <EmptyState
            description="Verify the alert ID, or return to the alert table and choose an available alert."
            icon="investigation"
            title="Alert not found"
            action={
              <Button as="link" icon="arrowLeft" to="/alerts" variant="primary">
                Back to security alerts
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <InvestigationDetail
      alert={alert}
      feedback={feedback}
      onUpdateStatus={handleUpdateStatus}
      updating={updating}
    />
  );
}
