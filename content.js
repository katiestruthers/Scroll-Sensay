const SCROLL_DEBOUNCE = 350;

let enabled = true;
let lastViewportText = '';
let lastResult = { score: null, reasons: [] };
let panelOpen = false;
const textCache = new Map();

chrome.storage.local.get(['enabled'], (r) => { enabled = r.enabled !== false; });
chrome.storage.onChanged.addListener((c) => { if (c.enabled) enabled = c.enabled.newValue; });

// --- Indicator dot ---

const indicator = document.createElement('div');
Object.assign(indicator.style, {
  position: 'fixed',
  bottom: '80px',
  right: '24px',
  zIndex: '2147483647',
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: '#94a3b8',
  transition: 'background-color 0.5s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '28px',
  lineHeight: '1',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  userSelect: 'none',
});

indicator.textContent = '😊';
document.body.appendChild(indicator);

function setIndicator(score) {
  if (score === null)     { indicator.style.background = '#94a3b8'; indicator.textContent = '😊'; }
  else if (score < 0.35) { indicator.style.background = '#22c55e'; indicator.textContent = '😊'; }
  else if (score < 0.65) { indicator.style.background = '#f59e0b'; indicator.textContent = '🤔'; }
  else                   { indicator.style.background = '#ef4444'; indicator.textContent = '😧'; }
}

// --- Reasons panel ---

const panel = document.createElement('div');
Object.assign(panel.style, {
  position: 'fixed',
  bottom: '152px',
  right: '24px',
  width: '300px',
  zIndex: '2147483646',
  display: 'none',
  flexDirection: 'column',
  gap: '8px',
});
document.body.appendChild(panel);

function buildPanel() {
  panel.innerHTML = '';

  if (!lastResult.reasons || lastResult.reasons.length === 0) {
    const empty = document.createElement('div');
    Object.assign(empty.style, {
      background: 'rgba(15,23,42,0.92)',
      color: '#94a3b8',
      borderRadius: '12px',
      padding: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '13px',
    });
    empty.textContent = lastResult.score === null ? 'Still scanning...' : 'No specific flags found.';
    panel.appendChild(empty);
    return;
  }

  lastResult.reasons.slice(0, 3).forEach(({ quote, reason }) => {
    const card = document.createElement('div');
    Object.assign(card.style, {
      background: 'rgba(15,23,42,0.92)',
      borderRadius: '12px',
      padding: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      borderLeft: `3px solid ${indicator.style.background}`,
    });

    const quoteEl = document.createElement('div');
    Object.assign(quoteEl.style, {
      color: '#e2e8f0',
      fontSize: '12px',
      fontStyle: 'italic',
      marginBottom: '8px',
      lineHeight: '1.5',
    });
    quoteEl.textContent = `"${quote}"`;

    const reasonEl = document.createElement('div');
    Object.assign(reasonEl.style, {
      color: '#94a3b8',
      fontSize: '12px',
      lineHeight: '1.5',
    });
    reasonEl.textContent = reason;

    card.appendChild(quoteEl);
    card.appendChild(reasonEl);
    panel.appendChild(card);
  });
}

function showPanel() {
  buildPanel();
  panel.style.display = 'flex';
  panelOpen = true;
}

function hidePanel() {
  panel.style.display = 'none';
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

  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();

  // Expected: { score: 0–1, reasons: [{ quote, reason }] }
  const result = {
    score: typeof data.score === 'number' ? data.score : 0,
    reasons: Array.isArray(data.reasons) ? data.reasons : [],
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
      setIndicator(result.score);
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
