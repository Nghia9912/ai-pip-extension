// State management (Independent state for each Tab)
let aiStates = {}; 

// Restore state from session storage (in case Service Worker goes to sleep)
chrome.storage.session.get(['aiStates'], (result) => {
  if (result.aiStates) {
    aiStates = result.aiStates;
    console.log("Restored aiStates from session storage:", aiStates);
  }
});

function saveState() {
  chrome.storage.session.set({ aiStates: aiStates });
}

// Listen for messages from content scripts (detectors)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (!tabId) {
    sendResponse({ success: false });
    return;
  }

  console.log("Worker received message:", message, "from tab:", tabId);

  // Initialize state for this tab if not present
  if (!aiStates[tabId]) {
    aiStates[tabId] = { status: "idle", snippet: "", timestamp: 0 };
  }

  if (message.type === "AI_THINKING" || message.type === "AI_DONE") {
    // Update state exclusively for this tab
    aiStates[tabId] = {
      status: message.type === "AI_THINKING" ? "thinking" : "done",
      snippet: message.snippet || "",
      timestamp: Date.now()
    };
    saveState();

    // Broadcast LATEST state of this tab to clients (so Widget can update)
    broadcastState(tabId, aiStates[tabId]);
  }

  if (message.type === "FOCUS_AI_TAB" && message.targetTabId) {
    console.log("Worker: Focusing AI Tab ID:", message.targetTabId);
    chrome.tabs.update(message.targetTabId, { active: true }, (tab) => {
      if (tab && tab.windowId) {
        chrome.windows.update(tab.windowId, { focused: true });
      }
    });

    // Reset state after click
    if (aiStates[message.targetTabId]) {
      aiStates[message.targetTabId].status = "idle";
      saveState();
      broadcastState(message.targetTabId, aiStates[message.targetTabId]);
    }
  }

  // When Widget requests state on load
  if (message.type === "GET_STATE") {
    // Find the latest AI currently 'thinking' or 'done'
    let latestTabId = null;
    let latestState = null;
    let maxTime = 0;

    for (const [id, state] of Object.entries(aiStates)) {
       if (state.status !== "idle" && state.timestamp > maxTime) {
          maxTime = state.timestamp;
          latestState = state;
          latestTabId = parseInt(id);
       }
    }

    if (latestState) {
      // Send targetTabId so Widget knows which tab to focus on click
      sendResponse({ success: true, state: latestState, targetTabId: latestTabId });
    } else {
      sendResponse({ success: true, state: { status: "idle" } });
    }
    return; 
  }
  
  sendResponse({ success: true });
});

function broadcastState(sourceTabId, state) {
  console.log("Broadcasting state:", state, "from Tab:", sourceTabId);
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: "STATE_UPDATE",
        state: state,
        targetTabId: sourceTabId
      }).catch(err => {
        // Ignore tabs without content script injected
      });
    }
  });
}

// Clean up state when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (aiStates[tabId]) {
    delete aiStates[tabId];
    saveState();
    // Treat as 'idle' to dismiss the widget
    broadcastState(tabId, { status: "idle" });
  }
});

// =========================================================================
// SERVICE WORKER KEEP-ALIVE HACK
// Extension Manifest V3 suspends Service Workers after 30s of inactivity.
// Since long AI generations take minutes, we must keep it awake.
// =========================================================================
const KEEP_ALIVE_INTERVAL = 0.25; // Minutes (15 seconds)

chrome.alarms.create("keepAlive", { periodInMinutes: KEEP_ALIVE_INTERVAL });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAlive") {
    console.log("Keep-alive ping thumping...");
  }
});

console.log("AI-PiP Background Worker initialized.");
