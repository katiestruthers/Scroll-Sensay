const SCROLL_DEBOUNCE = 2000;

let enabled = true;
let lastViewportText = '';
let lastResult = { label: null, explanation: [], warning: '' };
let panelOpen = false;
const textCache = new Map();

chrome.storage.local.get(['enabled'], (r) => { enabled = r.enabled !== false; });
chrome.storage.onChanged.addListener((c) => { if (c.enabled) enabled = c.enabled.newValue; });

// --- Indicator dot ---

const indicator = document.createElement('div');
indicator.id = 'hh-indicator';
indicator.textContent = '😊';
document.body.appendChild(indicator);

function setIndicator(label) {
  indicator.classList.remove('hh-green', 'hh-amber', 'hh-red');
  if (label === 'green')      { indicator.classList.add('hh-green'); indicator.textContent = '😊'; }
  else if (label === 'amber') { indicator.classList.add('hh-amber'); indicator.textContent = '🤔'; }
  else if (label === 'red')   { indicator.classList.add('hh-red');   indicator.textContent = '😧'; }
  else                        {                                       indicator.textContent = '😊'; }
}

// --- Reasons panel ---

const panel = document.createElement('div');
panel.id = 'hh-panel';
document.body.appendChild(panel);

function buildPanel() {
  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'hh-panel-header';

  const title = document.createElement('div');
  title.className = 'hh-panel-title';
  title.textContent = "Sensay's Advice:";

  const subtitle = document.createElement('div');
  subtitle.className = 'hh-panel-subtitle';
  subtitle.textContent = lastResult.label === null ? 'Still scanning…'
    : lastResult.label === 'green' ? 'Looks credible'
    : 'Worth a closer look';

  header.appendChild(title);
  header.appendChild(subtitle);
  panel.appendChild(header);

  if (lastResult.label !== null) {
    const divider = document.createElement('div');
    divider.className = 'hh-panel-divider';
    panel.appendChild(divider);

    if (lastResult.explanation && lastResult.explanation.length > 0) {
      lastResult.explanation.forEach(point => {
        const pointEl = document.createElement('div');
        pointEl.className = `hh-panel-point hh-${lastResult.label}`;
        pointEl.textContent = point;
        panel.appendChild(pointEl);
      });
    }

    if (lastResult.warning) {
      const warningEl = document.createElement('div');
      warningEl.className = 'hh-panel-warning';
      warningEl.textContent = lastResult.warning;
      panel.appendChild(warningEl);
    }
  }
}

function showPanel() {
  buildPanel();
  panel.classList.add('hh-open');
  panelOpen = true;
}

function hidePanel() {
  panel.classList.remove('hh-open');
  panelOpen = false;
}

indicator.addEventListener('click', (e) => {
  e.stopPropagation();
  panelOpen ? hidePanel() : showPanel();
});

document.addEventListener('click', (e) => {
  if (panelOpen && !panel.contains(e.target)) hidePanel();
});

// --- API ---

async function callAPI(text) {
  if (textCache.has(text)) return textCache.get(text);

  const { apiEndpoint, apiKey } = await chrome.storage.local.get(['apiEndpoint', 'apiKey']);
  if (!apiEndpoint) return null;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(apiEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text }),
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return callAPI(text);
  }
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();

  // API returns: { label: 'red'|'amber'|'green', authenticity_score, explanation, warning }
  const result = {
    label: ['red', 'amber', 'green'].includes(data.label) ? data.label : 'amber',
    explanation: Array.isArray(data.explanation) ? data.explanation : [data.explanation || ''],
    warning: data.warning || '',
  };

  textCache.set(text, result);
  return result;
}

// --- Viewport scan ---

function getViewportText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const parts = [];
  let node;

  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (text.length < 5) continue;
    const el = node.parentElement;
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
    if (rect.width === 0 && rect.height === 0) continue;
    parts.push(text);
  }

  return [...new Set(parts)].join(' ').slice(0, 3000);
}

async function updateIndicator() {
  if (!enabled) return;
  const text = getViewportText();
  if (!text || text.length < 50 || text === lastViewportText) return;
  lastViewportText = text;

  try {
    const result = await callAPI(text);
    if (result) {
      lastResult = result;
      setIndicator(result.label);
      if (panelOpen) buildPanel();
    }
  } catch (err) {
    console.warn('[HuddleHive]', err.message);
  }
}

let scrollTimer;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(updateIndicator, SCROLL_DEBOUNCE);
}, { passive: true });

updateIndicator();
