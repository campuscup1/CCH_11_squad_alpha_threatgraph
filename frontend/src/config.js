const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export const API_REQUEST_TIMEOUT_MS = 15000;

export const APP_NAME = 'ThreatGraph';

export const APP_TAGLINE = 'Explainable Cyberattack Detection & Investigation';
