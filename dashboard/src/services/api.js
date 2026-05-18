const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

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
    const data = await res.json();
    if (res.ok) {
      this.setToken(data.token);
      this.setProfile(data.user);
    }
    return { ok: res.ok, data };
  },

  async setupAdmin(username, password) {
    const res = await this.request('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName: 'Super Admin' })
    });
    const data = await res.json();
    return { ok: res.ok, data };
  },

  // Status & Channels Data
  async getStatus() {
    const res = await this.request('/api/vtubers/status');
    return res.json();
  },

  async getChannels() {
    const res = await this.request('/api/vtubers');
    return res.json();
  },

  // Admin Actions
  async syncWebSub() {
    const res = await this.request('/api/vtubers/sync-subscriptions', {
      method: 'POST'
    });
    return res;
  },

  async addChannel(channelId, displayName, type, agencyName) {
    const res = await this.request('/api/vtubers/add', {
      method: 'POST',
      body: JSON.stringify({
        channelId,
        displayName,
        type,
        agencyName
      })
    });
    return { ok: res.ok, data: await res.json() };
  },

  async importChannels(channelsList) {
    const res = await this.request('/api/vtubers/import', {
      method: 'POST',
      body: JSON.stringify({ channels: channelsList })
    });
    return { ok: res.ok, data: await res.json() };
  }
};

export default api;
