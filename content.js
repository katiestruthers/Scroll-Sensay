const SCROLL_DEBOUNCE = 350;

let enabled = true;
let lastViewportText = '';
const textCache = new Map();

chrome.storage.local.get(['enabled'], (r) => { enabled = r.enabled !== false; });
chrome.storage.onChanged.addListener((c) => { if (c.enabled) enabled = c.enabled.newValue; });

// --- Corner indicator ---

const indicator = document.createElement('div');
Object.assign(indicator.style, {
  position: 'fixed',
  bottom: '80px',
  right: '24px',
  zIndex: '2147483647',
  pointerEvents: 'none',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
});

Object.assign(indicator.style, {
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
});

indicator.textContent = '😊';
document.body.appendChild(indicator);

function setIndicator(score) {
  if (score === null)     { indicator.style.background = '#94a3b8'; indicator.textContent = '😊'; }
  else if (score < 0.35) { indicator.style.background = '#22c55e'; indicator.textContent = '😊'; }
  else if (score < 0.65) { indicator.style.background = '#f59e0b'; indicator.textContent = '🤔'; }
  else                   { indicator.style.background = '#ef4444'; indicator.textContent = '😧'; }
}

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
  const score = typeof data.score === 'number' ? data.score : 0;
  textCache.set(text, score);
  return score;
}

// --- Viewport text scan ---

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
    const score = await callAPI(text);
    setIndicator(score);
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
