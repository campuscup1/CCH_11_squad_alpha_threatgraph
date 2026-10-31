import { API_BASE_URL, API_REQUEST_TIMEOUT_MS } from './config';

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  const headers = { ...(options.headers || {}) };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text ? { detail: text } : null;
    }

    if (!response.ok) {
      const detail =
        payload?.detail ||
        payload?.error ||
        `Request failed with status ${response.status}.`;
      throw new Error(
        typeof detail === 'string' ? detail : JSON.stringify(detail),
      );
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The backend did not respond in time. Try again.');
    }
    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach the backend at ${API_BASE_URL}. Check that the API is running and that VITE_API_BASE_URL is correct.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

export const api = {
  health: () => request('/'),
  dashboard: () => request('/api/dashboard'),
  events: () => request('/api/events'),
  alerts: () => request('/api/alerts'),
  filterAlerts: ({ riskLevel, reviewStatus } = {}) =>
    request(
      `/api/alerts/filter${buildQuery({
        risk_level: riskLevel,
        review_status: reviewStatus,
      })}`,
    ),
  reviewAlert: (eventId, status) =>
    request(
      `/api/alerts/${eventId}/review${buildQuery({ status })}`,
      { method: 'PATCH' },
    ),
  responseAdvice: (eventId) =>
    request(`/api/alerts/${eventId}/response`),
  timeline: () => request('/api/timeline'),
  investigate: (ipAddress) =>
    request(`/api/investigate/${encodeURIComponent(ipAddress)}`),
  graph: () => request('/api/graph'),
  correlation: (windowMinutes = 60) =>
    request(`/api/correlation${buildQuery({ window_minutes: windowMinutes })}`),
  loginTimeline: () => request('/api/login-timeline'),
  attackPatterns: (windowMinutes = 60) =>
    request(`/api/attack-patterns${buildQuery({ window_minutes: windowMinutes })}`),
  analyze: (event) =>
    request('/api/analyze', { method: 'POST', body: JSON.stringify(event) }),
  simulate: (event) =>
    request('/api/simulate', { method: 'POST', body: JSON.stringify(event) }),
  addLoginEvent: (event) =>
    request('/api/login-event', { method: 'POST', body: JSON.stringify(event) }),
};
