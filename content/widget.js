console.log("AI-PiP: Widget script loaded!");

// Create Host Element
const hostElement = document.createElement('div');
// Use a unique ID to avoid collisions
hostElement.id = 'ai-pip-extension-host';
document.body.appendChild(hostElement);

// Create Shadow Root (mode closed to protect CSS from host page)
const shadowRoot = hostElement.attachShadow({ mode: 'closed' });

// Load CSS into Shadow DOM
const styleLink = document.createElement('link');
styleLink.rel = 'stylesheet';
styleLink.href = chrome.runtime.getURL('assets/widget.css');
shadowRoot.appendChild(styleLink);

// Create Widget UI
const widget = document.createElement('div');
widget.className = 'ai-pip-widget hidden';

// Initial HTML structure
widget.innerHTML = `
  <div class="ai-pip-icon" id="pip-icon"></div>
  <div class="ai-pip-content">
    <p class="ai-pip-title" id="pip-title">AI is thinking...</p>
    <p class="ai-pip-snippet" id="pip-snippet"></p>
  </div>
`;

shadowRoot.appendChild(widget);

let currentTargetTabId = null;

// Event Listener for Click to focus AI Tab
widget.addEventListener('click', () => {
  // Tell background worker to focus the originating AI tab
  if (currentTargetTabId) {
    chrome.runtime.sendMessage({ type: "FOCUS_AI_TAB", targetTabId: currentTargetTabId });
  }
});

// Update UI Function
function updateWidgetUI(state) {
  const icon = shadowRoot.getElementById('pip-icon');
  const title = shadowRoot.getElementById('pip-title');
  const snippet = shadowRoot.getElementById('pip-snippet');

  if (state.status === 'idle' || state.status === 'thinking') {
    widget.classList.add('hidden');
    return;
  }

  // Show the widget
  widget.classList.remove('hidden');

  if (state.status === 'done') {
    icon.className = 'ai-pip-icon done';
    // Checkmark SVG
    icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    title.textContent = 'Done!';
    snippet.textContent = state.snippet || 'Click to view response';
  }
}

// Listen for state updates from the background worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "STATE_UPDATE" && message.state) {
    console.log("Widget received state update:", message.state);
    if (message.targetTabId) {
      currentTargetTabId = message.targetTabId;
    }
    updateWidgetUI(message.state);
  }
});

// Whenever the content script loads, it might be joining late. 
// Ask the background worker for the current state.
chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
  if (response && response.state) {
    console.log("Widget received initial state:", response.state);
    if (response.targetTabId) {
       currentTargetTabId = response.targetTabId;
    }
    updateWidgetUI(response.state);
  }
});
