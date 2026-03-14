// State management (Lưu trạng thái độc lập cho từng Tab)
let aiStates = {}; 
// aiStates[tabId] = { status: "idle", snippet: "", timestamp: 0 }

// Listen for messages from content scripts (detectors)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (!tabId) {
    sendResponse({ success: false });
    return;
  }

  console.log("Worker received message:", message, "from tab:", tabId);

  // Khởi tạo state cho tab này nếu chưa có
  if (!aiStates[tabId]) {
    aiStates[tabId] = { status: "idle", snippet: "", timestamp: 0 };
  }

  if (message.type === "AI_THINKING" || message.type === "AI_DONE") {
    // Update state cho riêng tab này
    aiStates[tabId] = {
      status: message.type === "AI_THINKING" ? "thinking" : "done",
      snippet: message.snippet || "",
      timestamp: Date.now()
    };

    // Broadcast state MỚI NHẤT của tab này đến các tab khác để Widget cập nhật
    broadcastState(tabId, aiStates[tabId]);
  }

  if (message.type === "FOCUS_AI_TAB" && message.targetTabId) {
    console.log("Worker: Focusing AI Tab ID:", message.targetTabId);
    chrome.tabs.update(message.targetTabId, { active: true }, (tab) => {
      if (tab && tab.windowId) {
        chrome.windows.update(tab.windowId, { focused: true });
      }
    });

    // Reset state sau khi click
    if (aiStates[message.targetTabId]) {
      aiStates[message.targetTabId].status = "idle";
      broadcastState(message.targetTabId, aiStates[message.targetTabId]);
    }
  }

  // Khi Widget (hoặc tab nào đó) mới mở lên và hỏi xem có AI nào đang chạy không
  if (message.type === "GET_STATE") {
    // Tìm AI gần đây nhất đang 'thinking' hoặc 'done'
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
      // Gửi kèm tabId để Widget biết click vào đâu sẽ về đúng AI đó
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
        // Lơ các tab không cấy content script
      });
    }
  });
}

// Dọn dẹp state khi tab bị đóng
chrome.tabs.onRemoved.addListener((tabId) => {
  if (aiStates[tabId]) {
    delete aiStates[tabId];
    // Coi như 'idle' để widget tắt đi
    broadcastState(tabId, { status: "idle" });
  }
});

console.log("AI-PiP Background Worker initialized.");
