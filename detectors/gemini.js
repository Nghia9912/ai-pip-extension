console.log("AI-PiP: Gemini Detector loaded (with Visibility Hack)!");

// =========================================================================
// HACK: Override Page Visibility API to prevent Gemini from halting its DOM
// updates when the tab is hidden. We inject an inline script into the document
// before Gemini runs.
// =========================================================================
const hackScript = document.createElement('script');
hackScript.textContent = `
  Object.defineProperty(document, 'visibilityState', {
    get: function() { return 'visible'; }
  });
  Object.defineProperty(document, 'hidden', {
    get: function() { return false; }
  });
  
  // Block the visibilitychange event
  const originalAddEventListener = document.addEventListener;
  document.addEventListener = function(type, listener, options) {
    if (type === 'visibilitychange') return;
    originalAddEventListener.call(document, type, listener, options);
  };
`;
document.documentElement.appendChild(hackScript);
hackScript.remove(); // Clean up script tag

// State declarations
let isThinking = false;
let checkInterval = null;
let idleCount = 0;
let lastTextLength = 0;

function getSnippet() {
  const assistantMessages = document.querySelectorAll('message-content, .model-response-text, [data-test-id="model-response-text"], .message.bot');
  if (assistantMessages.length === 0) return "Hoàn thành!";
  const lastMsg = assistantMessages[assistantMessages.length - 1];
  let rawText = lastMsg.innerText || lastMsg.textContent || "";
  rawText = rawText.trim().replace(/\n/g, " ");
  return rawText.length > 50 ? rawText.substring(0, 50) + "..." : (rawText || "Hoàn thành!");
}

function checkStatus() {
  const stopButton = document.querySelector('button[aria-label*="Stop"]') ||
                     document.querySelector('button[mattooltip*="Stop"]');
  
  const generatingIndicator = document.querySelector('streaming-message-status, [class*="generating"], [class*="loading"], circle.gmat-mdc-circular-progress-active-path');
  
  const assistantMessages = document.querySelectorAll('message-content, .model-response-text, [data-test-id="model-response-text"], .message.bot');
  const lastMsg = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;
  const currentTextLength = lastMsg ? (lastMsg.innerText || lastMsg.textContent || "").length : 0;
  
  const isStopWordPresent = Array.from(document.querySelectorAll('span')).some(el => el.textContent.trim() === 'Stop generating');

  const hasExplicitIndicator = !!(stopButton || generatingIndicator || isStopWordPresent);
  
  if (hasExplicitIndicator) {
    idleCount = 0;
    lastTextLength = currentTextLength;
    if (!isThinking) {
      isThinking = true;
      console.log("Gemini: AI is thinking...");
      chrome.runtime.sendMessage({ type: "AI_THINKING" });
    }
  } else {
    if (isThinking) {
      if (currentTextLength > lastTextLength && currentTextLength > 0) {
        idleCount = 0;
        lastTextLength = currentTextLength;
      } else {
        idleCount++;
        if (idleCount >= 6) { // 3 seconds idle
          isThinking = false;
          console.log("Gemini: AI is done.");
          chrome.runtime.sendMessage({ 
            type: "AI_DONE", 
            snippet: getSnippet() 
          });
          idleCount = 0;
        }
      }
    } else {
       lastTextLength = currentTextLength;
    }
  }
}

// Retain Web Worker to bypass Chromium Throttling
const workerContent = `
  setInterval(() => {
    postMessage('tick');
  }, 500);
`;
const blob = new Blob([workerContent], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const timerWorker = new Worker(workerUrl);

timerWorker.onmessage = () => {
  checkStatus();
};
