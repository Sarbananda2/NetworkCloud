import './style.css';
import './app.css';
import logoUrl from './assets/images/favicon.png';

import {
  GetStatus,
  StartLink,
  LinkStatus,
  Unlink,
  StartService,
  StopService,
  TailLogs,
  GetNetwork,
  GetAdapterGroups,
  SaveAdapterGroups,
} from '../wailsjs/go/main/App';

document.querySelector('#app').innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <img src="${logoUrl}" alt="NetworkCloud" class="brand-logo" />
        <div class="brand-text">
          <div class="brand-title">NetworkCloud</div>
          <div class="brand-subtitle">Agent</div>
        </div>
      </div>
      <div class="nav-label">Navigation</div>
      <nav class="nav">
        <button class="nav-item active" data-target="dashboard">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1"></rect>
              <rect x="14" y="3" width="7" height="5" rx="1"></rect>
              <rect x="14" y="12" width="7" height="9" rx="1"></rect>
              <rect x="3" y="16" width="7" height="5" rx="1"></rect>
            </svg>
          </span>
          Dashboard
        </button>
        <button class="nav-item" data-target="network">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="6" cy="6" r="2"></circle>
              <circle cx="18" cy="6" r="2"></circle>
              <circle cx="12" cy="18" r="2"></circle>
              <path d="M6 8v4a2 2 0 0 0 2 2h4"></path>
              <path d="M18 8v4a2 2 0 0 1-2 2h-4"></path>
            </svg>
          </span>
          Network
        </button>
        <button class="nav-item" data-target="link">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 16.5a4.5 4.5 0 0 0-4-4.5 6 6 0 0 0-11.5 2A4 4 0 0 0 6 20h11a3 3 0 0 0 3-3.5z"></path>
            </svg>
          </span>
          Cloud Link
        </button>
        <button class="nav-item" data-target="status">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 12h-4l-3 9-4-18-3 9H2"></path>
            </svg>
          </span>
          Status
        </button>
        <button class="nav-item" data-target="service">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v10"></path>
              <path d="M18.4 6.6a8 8 0 1 1-12.8 0"></path>
            </svg>
          </span>
          Service Control
        </button>
        <button class="nav-item" data-target="logs">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <path d="M14 2v6h6"></path>
              <path d="M16 13H8"></path>
              <path d="M16 17H8"></path>
            </svg>
          </span>
          Logs
        </button>
      </nav>
      <div class="sidebar-footer">v1.0.0</div>
    </aside>

    <main class="main">
      <section class="section active" data-section="dashboard">
        <div class="section-header">
          <div>
            <h2>Dashboard</h2>
            <p class="section-subtitle">Monitor your network adapters and cloud sync status.</p>
          </div>
          <div id="dashboardAgentPill" class="status-pill">Agent Status</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="6" cy="6" r="2"></circle>
                <circle cx="18" cy="6" r="2"></circle>
                <circle cx="12" cy="18" r="2"></circle>
                <path d="M6 8v4a2 2 0 0 0 2 2h4"></path>
                <path d="M18 8v4a2 2 0 0 1-2 2h-4"></path>
              </svg>
            </div>
            <div class="stat-label">Network Adapters</div>
            <div id="dashboardAdapterCount" class="stat-value">-</div>
            <div id="dashboardConnectedCount" class="stat-sub">-</div>
            <button class="stat-link" data-target="network">View details →</button>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 16.5a4.5 4.5 0 0 0-4-4.5 6 6 0 0 0-11.5 2A4 4 0 0 0 6 20h11a3 3 0 0 0 3-3.5z"></path>
              </svg>
            </div>
            <div class="stat-label">Cloud Status</div>
            <div id="dashboardCloudStatus" class="stat-value">-</div>
            <div class="stat-sub">Last synced just now</div>
            <button class="stat-link" data-target="link">View Details →</button>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 12h-4l-3 9-4-18-3 9H2"></path>
              </svg>
            </div>
            <div class="stat-label">Agent Status</div>
            <div id="dashboardAgentStatus" class="stat-value">-</div>
            <div class="stat-sub">Uptime: -</div>
            <button class="stat-link" data-target="status">View Details →</button>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                <path d="M5 12.5a11 11 0 0 1 14 0"></path>
                <path d="M8.5 16a6 6 0 0 1 7 0"></path>
                <line x1="12" y1="20" x2="12.01" y2="20"></line>
              </svg>
            </div>
            <div class="stat-label">Primary Adapter</div>
            <div id="dashboardPrimaryName" class="stat-value">-</div>
            <div id="dashboardPrimaryIp" class="stat-sub">-</div>
            <button class="stat-link" data-target="network">View Details →</button>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="card primary-card">
            <div class="card-header">
              <div>
                <div class="card-title">Primary Adapter</div>
                <div class="card-subtitle">Live adapter status for this device</div>
              </div>
              <div id="dashboardPrimaryState" class="status-chip">-</div>
            </div>
            <div class="card-body">
              <div class="primary-layout">
                <div class="primary-details">
                  <div id="dashboardPrimaryLabel" class="primary-name">-</div>
                  <div id="dashboardPrimaryType" class="adapter-type">-</div>
                  <div class="primary-metrics">
                    <div class="metric">
                      <div class="meta-label">IP Address</div>
                      <div id="dashboardPrimaryIpDetail" class="meta-value">-</div>
                    </div>
                    <div class="metric">
                      <div class="meta-label">Gateway</div>
                      <div id="dashboardPrimaryGateway" class="meta-value">-</div>
                    </div>
                    <div class="metric">
                      <div class="meta-label">DNS</div>
                      <div id="dashboardPrimaryDns" class="meta-value">-</div>
                    </div>
                  <div class="metric">
                    <div class="meta-label">Subnet Mask</div>
                    <div id="dashboardPrimarySubnet" class="meta-value">-</div>
                  </div>
                    <div class="metric">
                      <div class="meta-label">MAC Address</div>
                      <div id="dashboardPrimaryMac" class="meta-value">-</div>
                    </div>
                    <div class="metric">
                      <div class="meta-label">Type</div>
                      <div id="dashboardPrimaryTypeLabel" class="meta-value adapter-type">-</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card quick-actions">
            <div class="card-title">Quick Actions</div>
            <button id="dashboardRefreshNetwork" class="action-button">
              <span class="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36"></path>
                  <path d="M21 3v6h-6"></path>
                </svg>
              </span>
              Refresh Network
            </button>
            <button id="dashboardSyncCloud" class="action-button">
              <span class="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 16.5a4.5 4.5 0 0 0-4-4.5 6 6 0 0 0-11.5 2A4 4 0 0 0 6 20h11a3 3 0 0 0 3-3.5z"></path>
                </svg>
              </span>
              Sync to Cloud
            </button>
            <button id="dashboardViewLogs" class="action-button ghost">
              <span class="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 12h-4l-3 9-4-18-3 9H2"></path>
                </svg>
              </span>
              View Activity
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">All Network Adapters</div>
            <button class="ghost stat-link" data-target="network">View All →</button>
          </div>
          <div id="dashboardAdapterPreview" class="adapter-preview"></div>
        </div>
      </section>

      <section class="section" data-section="network">
        <div class="section-header">
          <div>
            <h2>Network Overview</h2>
            <p class="section-subtitle">Live adapter status for this device.</p>
          </div>
          <button id="refreshNetwork">Refresh Network</button>
        </div>
        <div id="networkPrimary" class="primary-summary"></div>
        <div id="networkList" class="adapter-grid"></div>
      </section>

      <section class="section" data-section="link">
        <div class="section-header">
          <div>
            <h2>Cloud Link</h2>
            <p class="section-subtitle">Connect this agent to your cloud dashboard.</p>
          </div>
        </div>
        <div class="cta-card">
          <div class="cta-header">
            <div>
              <div class="cta-title">Connected to Cloud</div>
              <div id="linkStatus" class="status-chip">Not linked</div>
            </div>
            <button id="startLink" class="primary">Start Link</button>
          </div>
          <div id="linkInfo" class="muted">Not linked</div>
          <div class="cta-actions">
            <button id="checkLink">Check Link</button>
            <button id="unlink" class="ghost">Unlink</button>
          </div>
        </div>
      </section>

      <section class="section" data-section="status">
        <div class="section-header">
          <div>
            <h2>Agent Status</h2>
            <p class="section-subtitle">Runtime state and link state.</p>
          </div>
          <button id="refresh">Refresh</button>
        </div>
        <div id="status" class="muted">Status: loading...</div>
      </section>

      <section class="section" data-section="service">
        <div class="section-header">
          <div>
            <h2>Service Control</h2>
            <p class="section-subtitle">Start or stop the background agent.</p>
          </div>
        </div>
        <div class="actions">
          <button id="startService">Start</button>
          <button id="stopService">Stop</button>
        </div>
      </section>

      <section class="section" data-section="logs">
        <div class="section-header">
          <div>
            <h2>Activity Logs</h2>
            <p class="section-subtitle">Recent agent activity and events.</p>
          </div>
          <button id="refreshLogs">Refresh Logs</button>
        </div>
        <pre id="logs"></pre>
      </section>
    </main>
  </div>
`;

const statusEl = document.getElementById('status');
const linkInfoEl = document.getElementById('linkInfo');
const logsEl = document.getElementById('logs');
const networkPrimaryEl = document.getElementById('networkPrimary');
const networkListEl = document.getElementById('networkList');
const sectionEls = document.querySelectorAll('.section');
const navButtons = document.querySelectorAll('.nav-item');
const linkStatusEl = document.getElementById('linkStatus');
const dashboardAdapterCountEl = document.getElementById('dashboardAdapterCount');
const dashboardConnectedCountEl = document.getElementById('dashboardConnectedCount');
const dashboardCloudStatusEl = document.getElementById('dashboardCloudStatus');
const dashboardAgentStatusEl = document.getElementById('dashboardAgentStatus');
const dashboardPrimaryNameEl = document.getElementById('dashboardPrimaryName');
const dashboardPrimaryIpEl = document.getElementById('dashboardPrimaryIp');
const dashboardPrimaryLabelEl = document.getElementById('dashboardPrimaryLabel');
const dashboardPrimaryTypeEl = document.getElementById('dashboardPrimaryType');
const dashboardPrimaryIpDetailEl = document.getElementById('dashboardPrimaryIpDetail');
const dashboardPrimaryGatewayEl = document.getElementById('dashboardPrimaryGateway');
const dashboardPrimaryDnsEl = document.getElementById('dashboardPrimaryDns');
const dashboardPrimarySubnetEl = document.getElementById('dashboardPrimarySubnet');
const dashboardPrimaryMacEl = document.getElementById('dashboardPrimaryMac');
const dashboardPrimaryTypeLabelEl = document.getElementById('dashboardPrimaryTypeLabel');
const dashboardPrimaryStateEl = document.getElementById('dashboardPrimaryState');
const dashboardAgentPillEl = document.getElementById('dashboardAgentPill');
const dashboardAdapterPreviewEl = document.getElementById('dashboardAdapterPreview');
let expandedAdapterKey = null;
let adapterGroups = {};
let groupsLoaded = false;
let lastNetworkResponse = null;
let lastStatusResponse = null;

function capitalize(value) {
  if (!value) {
    return '-';
  }
  const lower = String(value).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatDnsLines(dnsServers) {
  const servers = (dnsServers || []).map((server) => String(server).trim()).filter(Boolean);
  if (servers.length === 0) {
    return '-';
  }
  return servers.map((server, index) => `${index + 1}. ${server}`).join('\n');
}

function adapterKey(adapter) {
  return `${adapter.name}::${adapter.macAddress || adapter.type || ''}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function ensureGroupsLoaded() {
  if (groupsLoaded) {
    return;
  }
  try {
    adapterGroups = (await GetAdapterGroups()) || {};
  } catch {
    adapterGroups = {};
  }
  if (typeof adapterGroups !== 'object' || Array.isArray(adapterGroups)) {
    adapterGroups = {};
  }
  groupsLoaded = true;
}

async function saveGroups() {
  await SaveAdapterGroups(adapterGroups);
}

function setActiveSection(target) {
  sectionEls.forEach((section) => {
    section.classList.toggle('active', section.dataset.section === target);
  });
  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.target === target);
  });
}

async function refreshStatus() {
  try {
    const status = await GetStatus();
    lastStatusResponse = status;
    statusEl.innerText = `Status: ${capitalize(status.state)} (Linked: ${status.linked ? 'Yes' : 'No'})`;
    if (status.linked) {
      linkInfoEl.innerText = `Agent UUID: ${status.agentUuid}\nObtained: ${status.obtainedAt}`;
      if (linkStatusEl) {
        linkStatusEl.innerText = 'Linked';
        linkStatusEl.classList.add('linked');
      }
    } else {
      linkInfoEl.innerText = 'Not linked';
      if (linkStatusEl) {
        linkStatusEl.innerText = 'Not linked';
        linkStatusEl.classList.remove('linked');
      }
    }
    updateDashboardStatus(status);
  } catch (err) {
    statusEl.innerText = `Status error: ${err}`;
  }
}

async function startLink() {
  try {
    const resp = await StartLink();
    linkInfoEl.innerText = `Visit: ${resp.verificationUri}\nCode: ${resp.userCode}\nExpires: ${resp.expiresIn}s`;
  } catch (err) {
    linkInfoEl.innerText = `Link error: ${err}`;
  }
}

async function checkLink() {
  try {
    const resp = await LinkStatus();
    linkInfoEl.innerText = `Link status: ${resp.status}`;
    await refreshStatus();
  } catch (err) {
    linkInfoEl.innerText = `Link status error: ${err}`;
  }
}

async function unlink() {
  try {
    const resp = await Unlink();
    linkInfoEl.innerText = `Unlink: ${resp.status}`;
    await refreshStatus();
  } catch (err) {
    linkInfoEl.innerText = `Unlink error: ${err}`;
  }
}

async function refreshLogs() {
  try {
    const resp = await TailLogs();
    logsEl.innerText = (resp.lines || []).join('\n');
  } catch (err) {
    logsEl.innerText = `Log error: ${err}`;
  }
}

async function refreshNetwork() {
  try {
    await ensureGroupsLoaded();
    const resp = await GetNetwork();
    lastNetworkResponse = resp;
    renderNetwork(resp);
    updateDashboardNetwork(resp);
  } catch (err) {
    networkPrimaryEl.innerText = `Network error: ${err}`;
    networkListEl.innerHTML = '';
  }
}

function updateDashboardStatus(status) {
  if (!status) {
    return;
  }
  const stateLabel = capitalize(status.state);
  if (dashboardCloudStatusEl) {
    dashboardCloudStatusEl.innerText = status.linked ? 'Linked' : 'Not Linked';
  }
  if (dashboardAgentStatusEl) {
    dashboardAgentStatusEl.innerText = stateLabel;
  }
  if (dashboardAgentPillEl) {
    dashboardAgentPillEl.innerText = status.state ? `Agent ${stateLabel}` : 'Agent Status';
  }
}

function updateDashboardNetwork(resp) {
  if (!resp) {
    return;
  }
  const adapters = resp.adapters || [];
  const connected = adapters.filter((adapter) => adapter.connected).length;
  if (dashboardAdapterCountEl) {
    dashboardAdapterCountEl.innerText = `${adapters.length}`;
  }
  if (dashboardConnectedCountEl) {
    dashboardConnectedCountEl.innerText = `${connected} connected`;
  }
  if (resp.primary) {
    const primary = resp.primary;
    const dns = formatDnsLines(primary.dnsServers);
    if (dashboardPrimaryNameEl) {
      dashboardPrimaryNameEl.innerText = primary.name || '-';
    }
    if (dashboardPrimaryIpEl) {
      dashboardPrimaryIpEl.innerText = primary.ipv4Address || '-';
    }
    if (dashboardPrimaryLabelEl) {
      dashboardPrimaryLabelEl.innerText = primary.name || '-';
    }
    if (dashboardPrimaryTypeEl) {
      dashboardPrimaryTypeEl.innerText = primary.description || primary.name || '-';
    }
    if (dashboardPrimaryIpDetailEl) {
      dashboardPrimaryIpDetailEl.innerText = primary.ipv4Address || '-';
    }
    if (dashboardPrimaryGatewayEl) {
      dashboardPrimaryGatewayEl.innerText = primary.defaultGateway || '-';
    }
    if (dashboardPrimaryDnsEl) {
      dashboardPrimaryDnsEl.innerText = dns;
    }
    if (dashboardPrimarySubnetEl) {
      dashboardPrimarySubnetEl.innerText = primary.subnetMask || '-';
    }
    if (dashboardPrimaryMacEl) {
      dashboardPrimaryMacEl.innerText = primary.macAddress || '-';
    }
    if (dashboardPrimaryTypeLabelEl) {
      dashboardPrimaryTypeLabelEl.innerText = primary.type || '-';
    }
    if (dashboardPrimaryStateEl) {
      dashboardPrimaryStateEl.innerText = primary.connected ? 'Connected' : 'Disconnected';
      dashboardPrimaryStateEl.classList.toggle('linked', primary.connected);
    }
  }
  if (dashboardAdapterPreviewEl) {
    dashboardAdapterPreviewEl.innerHTML = adapters.slice(0, 6).map((adapter) => `
      <div class="preview-card">
        <div class="preview-title">${adapter.name}</div>
        <div class="preview-subtitle adapter-type">${adapter.type}</div>
        <div class="preview-row">
          <span>${adapter.ipv4Address || 'No IP'}</span>
          <span class="preview-pill ${adapter.connected ? 'online' : 'offline'}">
            ${adapter.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    `).join('');
  }
}

function renderNetwork(resp) {
  if (!resp) {
    return;
  }
  if (resp.primary) {
    const primaryDns = formatDnsLines(resp.primary.dnsServers);
    networkPrimaryEl.innerHTML = `
      <div class="primary-label">Primary Adapter</div>
      <div class="primary-value">${resp.primary.name}</div>
        <div class="primary-meta">
          <span>${resp.primary.ipv4Address || '-'}</span>
          <span>${resp.primary.defaultGateway || '-'}</span>
          <span class="dns-lines">${primaryDns}</span>
        </div>
    `;
  } else {
    networkPrimaryEl.innerHTML = `
      <div class="primary-label">Primary Adapter</div>
      <div class="primary-value">Unknown</div>
    `;
  }

  const grouped = new Map();
  (resp.adapters || []).forEach((adapter) => {
    const key = adapterKey(adapter);
    const groupName = adapterGroups[key] || 'Ungrouped';
    if (!grouped.has(groupName)) {
      grouped.set(groupName, []);
    }
    grouped.get(groupName).push({ adapter, key });
  });

  const groupNames = Array.from(grouped.keys()).sort((a, b) => {
    if (a === 'Ungrouped') return 1;
    if (b === 'Ungrouped') return -1;
    return a.localeCompare(b);
  });

  networkListEl.innerHTML = groupNames.map((groupName) => {
    const adapters = grouped.get(groupName) || [];
    const safeGroupName = escapeHtml(groupName);
    return `
      <div class="group-section">
        <div class="group-header">
          <div class="group-title">${safeGroupName}</div>
          <div class="group-count">${adapters.length} adapter${adapters.length === 1 ? '' : 's'}</div>
        </div>
        <div class="adapter-grid">
          ${adapters.map(({ adapter, key }) => renderAdapterCard(adapter, key, groupName)).join('')}
        </div>
      </div>
    `;
  }).join('');

  networkListEl.querySelectorAll('.adapter-card').forEach((card) => {
    card.addEventListener('click', () => {
      const key = card.dataset.key;
      expandedAdapterKey = expandedAdapterKey === key ? null : key;
      renderNetwork(lastNetworkResponse);
    });
  });

  networkListEl.querySelectorAll('.group-action').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const key = button.dataset.key;
      const currentGroup = adapterGroups[key];
      const name = window.prompt('Group name', currentGroup || '');
      if (!name) {
        return;
      }
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }
      adapterGroups[key] = trimmed;
      await saveGroups();
      renderNetwork(lastNetworkResponse);
    });
  });

  networkListEl.querySelectorAll('.group-remove').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const key = button.dataset.key;
      delete adapterGroups[key];
      await saveGroups();
      renderNetwork(lastNetworkResponse);
    });
  });
}

function renderAdapterCard(adapter, key, groupName) {
  const dns = formatDnsLines(adapter.dnsServers);
  const ipAddress = adapter.ipv4Address || '-';
  const subnetMask = adapter.subnetMask || '-';
  const gateway = adapter.defaultGateway || '-';
  const mac = adapter.macAddress || '-';
  const isExpanded = expandedAdapterKey === key;
  const showRemove = groupName && groupName !== 'Ungrouped';
  return `
    <div class="adapter-card ${isExpanded ? 'expanded' : ''}" data-key="${key}">
      <div class="adapter-top">
        <div>
          <div class="adapter-name">${adapter.name}</div>
          <div class="adapter-type">${adapter.type}</div>
        </div>
        <div class="adapter-state ${adapter.connected ? 'online' : 'offline'}">
          ${adapter.connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      <div class="adapter-key">
        <div class="key-label">IP Address</div>
        <div class="key-value">${ipAddress}</div>
      </div>
      <div class="adapter-key">
        <div class="key-label">Gateway</div>
        <div class="key-value">${gateway}</div>
      </div>
      <div class="adapter-details">
        <div>MAC: ${mac}</div>
        <div>Subnet: ${subnetMask}</div>
        <div>DHCP: ${adapter.dhcpEnabled}</div>
        <div class="dns-lines">DNS: ${dns}</div>
        <div class="adapter-actions">
          <button class="group-action" data-key="${key}">Add to group</button>
          ${showRemove ? `<button class="group-remove ghost" data-key="${key}">Remove group</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

document.getElementById('refresh').addEventListener('click', refreshStatus);
document.getElementById('startLink').addEventListener('click', startLink);
document.getElementById('checkLink').addEventListener('click', checkLink);
document.getElementById('unlink').addEventListener('click', unlink);
document.getElementById('startService').addEventListener('click', async () => {
  await StartService();
});
document.getElementById('stopService').addEventListener('click', async () => {
  await StopService();
});
document.getElementById('refreshLogs').addEventListener('click', refreshLogs);
document.getElementById('refreshNetwork').addEventListener('click', refreshNetwork);
document.getElementById('dashboardRefreshNetwork').addEventListener('click', refreshNetwork);
document.getElementById('dashboardSyncCloud').addEventListener('click', checkLink);
document.getElementById('dashboardViewLogs').addEventListener('click', () => {
  setActiveSection('logs');
  refreshLogs();
});
navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveSection(button.dataset.target);
  });
});
document.querySelectorAll('.stat-link').forEach((button) => {
  button.addEventListener('click', () => {
    setActiveSection(button.dataset.target);
  });
});

refreshStatus();
refreshNetwork();
setActiveSection('dashboard');
