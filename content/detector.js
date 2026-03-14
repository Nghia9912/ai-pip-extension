console.log("AI-PiP Detector script loaded!");

// Dummy logic to test the broadcast pipeline (Bước 1.4)
// We'll simulate an AI thinking event 3 seconds after load,
// and an AI done event 8 seconds after load.
setTimeout(() => {
  console.log("Detector: Simulating AI_THINKING...");
  chrome.runtime.sendMessage({
    type: "AI_THINKING"
  });
}, 3000);

setTimeout(() => {
  console.log("Detector: Simulating AI_DONE...");
  chrome.runtime.sendMessage({
    type: "AI_DONE",
    snippet: "Có 3 cách để giải quyết vấn đề này..."
  });
}, 8000);
