import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApiData } from '../hooks/useApiData';
import { useRefresh } from '../context/RefreshContext';
import { Icon } from '../components/Icons';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PageIntro,
  RiskBadge,
  StatusBadge,
} from '../components/ui';
import {
  formatDateTime,
  formatNumber,
  riskTone,
  shortText,
} from '../utils/format';

const REVIEW_STATUSES = ['Pending', 'Reviewed', 'False Positive'];

function compareAlerts(first, second, sort) {
  if (sort === 'risk_desc') return second.risk_score - first.risk_score;
  if (sort === 'risk_asc') return first.risk_score - second.risk_score;
  if (sort === 'user_asc') return String(first.user_id).localeCompare(String(second.user_id));
  if (sort === 'oldest') return first.id - second.id;
  return second.id - first.id;
}

export default function Alerts() {
  const navigate = useNavigate();
  const { triggerRefresh, markUpdated } = useRefresh();
  const [search, setSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState('All');
  const [reviewStatus, setReviewStatus] = useState('All');
  const [sort, setSort] = useState('newest');
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const { data, setData, loading, error } = useApiData(() => api.alerts(), []);

  const alerts = data || [];
  const filtersActive =
    search.trim() !== '' ||
    riskLevel !== 'All' ||
    reviewStatus !== 'All' ||
    sort !== 'newest';

  const visibleAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = [...alerts];

    if (riskLevel !== 'All') {
      list = list.filter(
        (alert) =>
          String(alert.risk_level).toLowerCase() === riskLevel.toLowerCase(),
      );
    }

    if (reviewStatus !== 'All') {
      list = list.filter(
        (alert) =>
          String(alert.review_status).toLowerCase() ===
          reviewStatus.toLowerCase(),
      );
    }

    if (query) {
      list = list.filter((alert) =>
        [
          alert.id,
          alert.user_id,
          alert.ip_address,
          alert.risk_level,
          alert.review_status,
          alert.explanation,
        ]
          .map((value) => String(value ?? '').toLowerCase())
          .some((value) => value.includes(query)),
      );
    }

    return list.sort((first, second) => compareAlerts(first, second, sort));
  }, [alerts, search, sort, riskLevel, reviewStatus]);

  async function handleReviewChange(alert, status) {
    if (status === alert.review_status) return;

    setUpdatingId(alert.id);
    setFeedback(null);

    try {
      const updated = await api.reviewAlert(alert.id, status);
      setData((current) => {
        if (!current) return current;
        if (reviewStatus !== 'All' && updated.review_status !== reviewStatus) {
          return current.filter((item) => item.id !== updated.id);
        }
        return current.map((item) => (item.id === updated.id ? updated : item));
      });
      markUpdated();
      setFeedback({
        type: 'success',
        message: `Alert #${alert.id} review status changed to ${status}.`,
      });
    } catch (requestError) {
      setFeedback({
        type: 'error',
        message: `Could not update alert #${alert.id}: ${requestError.message}`,
      });
    } finally {
      setUpdatingId(null);
    }
  }

  function resetFilters() {
    setSearch('');
    setRiskLevel('All');
    setReviewStatus('All');
    setSort('newest');
  }

  if (loading && !data) {
    return <LoadingState label="Loading security alerts…" />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={triggerRefresh}
        title="Security alerts unavailable"
      />
    );
  }

  return (
    <div className="page-stack">
      <PageIntro
        description="Search, filter, sort, and review suspicious events detected by the backend."
        eyebrow="Alert triage"
        title="Security Alerts"
        actions={
          <Badge tone="info">
            {formatNumber(alerts.length)} alert{alerts.length === 1 ? '' : 's'} loaded
          </Badge>
        }
      />

      <Card>
        <CardHeader
          icon="filter"
          subtitle="Alerts are loaded from GET /api/alerts and filtered in this view."
          title="Alert Filters"
        />

        <div className="alert-filters">
          <div className="search-field alert-filters__search">
            <Icon name="investigation" size={17} />
            <input
              aria-label="Search alerts"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by alert ID, user, IP, reason, or status…"
              type="search"
              value={search}
            />
            {search ? (
              <button
                aria-label="Clear search"
                className="search-field__clear"
                onClick={() => setSearch('')}
                type="button"
              >
                <Icon name="close" size={15} />
              </button>
            ) : null}
          </div>

          <div className="filter-bar__group">
            <label htmlFor="risk-filter">Risk level</label>
            <select
              id="risk-filter"
              onChange={(event) => setRiskLevel(event.target.value)}
              value={riskLevel}
            >
              <option value="All">All risk levels</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
            </select>
          </div>

          <div className="filter-bar__group">
            <label htmlFor="status-filter">Review status</label>
            <select
              id="status-filter"
              onChange={(event) => setReviewStatus(event.target.value)}
              value={reviewStatus}
            >
              <option value="All">All statuses</option>
              {REVIEW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-bar__group">
            <label htmlFor="sort-filter">Sort by</label>
            <select
              id="sort-filter"
              onChange={(event) => setSort(event.target.value)}
              value={sort}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="risk_desc">Risk score: high to low</option>
              <option value="risk_asc">Risk score: low to high</option>
              <option value="user_asc">User ID: A to Z</option>
            </select>
          </div>

          <Button
            disabled={!filtersActive}
            icon="refresh"
            onClick={resetFilters}
            size="sm"
            variant="ghost"
          >
            Clear filters
          </Button>
        </div>

        <div className="results-summary">
          <span>
            Showing <strong>{formatNumber(visibleAlerts.length)}</strong> of{' '}
            <strong>{formatNumber(alerts.length)}</strong> loaded alerts
          </span>
          <span className="results-summary__hint">
            Review changes are saved to the backend immediately.
          </span>
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

      <Card padded={false}>
        <div className="card-padded-header">
          <CardHeader
            actions={
              <Button
                icon="refresh"
                onClick={triggerRefresh}
                size="sm"
                variant="secondary"
              >
                Refresh alerts
              </Button>
            }
            icon="alerts"
            subtitle="Select a row to open the full investigation view."
            title="Alert Table"
          />
        </div>

        {visibleAlerts.length ? (
          <div className="table-wrap">
            <table className="data-table data-table--alerts">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Severity</th>
                  <th>User ID</th>
                  <th>IP Address</th>
                  <th>Detection Reason</th>
                  <th>Risk</th>
                  <th>Timestamp</th>
                  <th>Review Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visibleAlerts.map((alert) => (
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
                    <td className="cell-reason" title={alert.explanation}>
                      {shortText(alert.explanation, 95)}
                    </td>
                    <td>
                      <span className={`score score--${riskTone(alert.risk_level)}`}>
                        {alert.risk_score}
                      </span>
                    </td>
                    <td className="nowrap">{formatDateTime(alert.created_at)}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="status-cell">
                        <StatusBadge status={alert.review_status} />
                        <select
                          aria-label={`Change review status for alert ${alert.id}`}
                          className="select select--sm"
                          disabled={updatingId === alert.id}
                          onChange={(event) =>
                            handleReviewChange(alert, event.target.value)
                          }
                          value={alert.review_status}
                        >
                          {REVIEW_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        {updatingId === alert.id ? (
                          <span className="spinner spinner--small" />
                        ) : null}
                      </div>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <Button
                        icon="chevronRight"
                        onClick={() => navigate(`/investigation/${alert.id}`)}
                        size="sm"
                        variant="ghost"
                      >
                        Open
                      </Button>
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
                alerts.length
                  ? 'No alerts match the current search and filters. Clear the filters to see all alerts.'
                  : 'No suspicious events with a risk score of 30 or above are stored. Alerts will appear after events are analyzed.'
              }
              icon="alerts"
              title={alerts.length ? 'No matching alerts' : 'No alerts available'}
              action={
                filtersActive ? (
                  <Button icon="refresh" onClick={resetFilters} size="sm" variant="secondary">
                    Clear filters
                  </Button>
                ) : null
              }
            />
          </div>
        )}
      </Card>
    </div>
  );
}
