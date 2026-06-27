const toggle = document.getElementById('enabledToggle');
const endpointInput = document.getElementById('apiEndpoint');
const keyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('save');
const status = document.getElementById('status');

chrome.storage.local.get(['enabled', 'apiEndpoint', 'apiKey'], (result) => {
  toggle.checked = result.enabled !== false;
  endpointInput.value = result.apiEndpoint || '';
  keyInput.value = result.apiKey || '';
});

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: toggle.checked });
});

saveBtn.addEventListener('click', () => {
  const endpoint = endpointInput.value.trim();
  const key = keyInput.value.trim();

  if (endpoint && !endpoint.startsWith('http')) {
    showStatus('Endpoint must start with http(s)://', '#ef4444');
    return;
  }

  chrome.storage.local.set({ apiEndpoint: endpoint, apiKey: key }, () => {
    showStatus('Saved!', '#22c55e');
  });
});

function showStatus(msg, color) {
  status.textContent = msg;
  status.style.color = color;
  setTimeout(() => (status.textContent = ''), 2000);
}
