const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function unwrapApiData(body) {
  if (body && body.status === "success") return body.data;
  return body;
}

function getApiErrorMessage(body, fallback = "Request failed") {
  if (body?.status === "error" && body?.message) return body.message;
  return fallback;
}

let token = localStorage.getItem('admin_token') || '';
let onUnauthorizedCallback = null;

const api = {
  setToken(newToken) {
    token = newToken;
    if (newToken) {
      localStorage.setItem('admin_token', newToken);
    } else {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_profile');
    }
  },

  getToken() {
    return token;
  },

  setProfile(profile) {
    if (profile) {
      localStorage.setItem('admin_profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('admin_profile');
    }
  },

  getProfile() {
    try {
      return JSON.parse(localStorage.getItem('admin_profile')) || null;
    } catch {
      return null;
    }
  },

  registerOnUnauthorized(callback) {
    onUnauthorizedCallback = callback;
  },

  logout() {
    this.setToken('');
    this.setProfile(null);
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  },

  async request(endpoint, options = {}) {
    const url = `${BACKEND_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, { ...options, headers });
      
      if (res.status === 401) {
        this.logout();
        throw new Error('Unauthorized');
      }

      return res;
    } catch (err) {
      console.error(`[API ERROR] Endpoint: ${endpoint}`, err);
      throw err;
    }
  },

  // Auth Operations
  async login(username, password) {
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    const body = await res.json();
    if (res.ok) {
      const payload = unwrapApiData(body) || {};
      this.setToken(payload.token);
      this.setProfile(payload.user);
    }
    const payload = res.ok ? unwrapApiData(body) : null;
    return { ok: res.ok, data: payload, raw: body, error: getApiErrorMessage(body) };
  },

  async changePassword(currentPassword, newPassword) {
    const res = await this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const body = await res.json();
    return {
      ok: res.ok,
      data: res.ok ? unwrapApiData(body) : null,
      raw: body,
      error: getApiErrorMessage(body),
      message: body?.message,
    };
  },

  // Status & Channels Data
  async getStatus() {
    const res = await this.request('/api/channels/status');
    const body = await res.json();
    return unwrapApiData(body) ?? body;
  },

  async getChannels() {
    const res = await this.request('/api/channels?limit=100&sort=popular');
    const body = await res.json();
    const payload = unwrapApiData(body) ?? body;
    return Array.isArray(payload) ? payload : [];
  },

  // Admin Actions
  async syncWebSub() {
    const res = await this.request('/api/channels/sync', {
      method: 'POST'
    });
    return res;
  },

  async addChannel(channelId, displayName, type, parentChannelId = null) {
    const res = await this.request('/api/channels', {
      method: 'POST',
      body: JSON.stringify({
        channelId,
        displayName,
        type,
        parentChannelId,
      })
    });
    const body = await res.json();
    return {
      ok: res.ok,
      data: body,
      message: body?.message,
      error: getApiErrorMessage(body),
    };
  },

  async importChannels(channelsList) {
    const res = await this.request('/api/channels/import', {
      method: 'POST',
      body: JSON.stringify({ channels: channelsList })
    });
    const body = await res.json();
    return {
      ok: res.ok,
      data: body,
      message: body?.message,
      error: getApiErrorMessage(body),
    };
  },

  async getGoogleApiKeys() {
    const res = await this.request('/api/google-api-keys');
    const body = await res.json();
    const list = res.ok ? unwrapApiData(body) : null;
    return {
      ok: res.ok,
      list: Array.isArray(list) ? list : [],
      meta: body?.meta ?? {},
      error: getApiErrorMessage(body),
    };
  },

  async createGoogleApiKey(key) {
    const res = await this.request('/api/google-api-keys', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
    const body = await res.json();
    return {
      ok: res.ok,
      data: res.ok ? unwrapApiData(body) : null,
      error: getApiErrorMessage(body),
    };
  },

  async updateGoogleApiKey(id, payload) {
    const res = await this.request(`/api/google-api-keys/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    return {
      ok: res.ok,
      data: res.ok ? unwrapApiData(body) : null,
      error: getApiErrorMessage(body),
    };
  },

  async deleteGoogleApiKey(id) {
    const res = await this.request(`/api/google-api-keys/${id}`, {
      method: 'DELETE',
    });
    const body = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      error: getApiErrorMessage(body),
    };
  },
};

export { unwrapApiData, getApiErrorMessage };

export default api;
