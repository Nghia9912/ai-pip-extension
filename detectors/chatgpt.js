console.log("AI-PiP: ChatGPT Detector loaded (Robust Polling Mode)!");

let isThinking = false;
let checkInterval = null;
let idleCount = 0;
let lastTextLength = 0;

function getSnippet() {
  const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
  if (assistantMessages.length === 0) return "Hoàn thành!";
  const lastMsg = assistantMessages[assistantMessages.length - 1];
  let rawText = lastMsg.innerText || lastMsg.textContent || "";
  rawText = rawText.trim().replace(/\n/g, " ");
  return rawText.length > 50 ? rawText.substring(0, 50) + "..." : (rawText || "Hoàn thành!");
}

function checkStatus() {
  const stopButton = document.querySelector('button[aria-label="Stop generating"]') || 
                     document.querySelector('button[data-testid="stop-button"]');
                     
  const streamingElement = document.querySelector('.result-streaming');
  
  const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
  const lastMsg = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;
  const currentTextLength = lastMsg ? (lastMsg.innerText || lastMsg.textContent || "").length : 0;
  
  const hasExplicitIndicator = !!(stopButton || streamingElement);
  
  if (hasExplicitIndicator) {
    idleCount = 0;
    lastTextLength = currentTextLength;
    if (!isThinking) {
      isThinking = true;
      console.log("ChatGPT: AI is thinking (Indicator found)...");
      chrome.runtime.sendMessage({ type: "AI_THINKING" });
    }
  } else {
    if (isThinking) {
      if (currentTextLength > lastTextLength && currentTextLength > 0) {
        idleCount = 0;
        lastTextLength = currentTextLength;
      } else {
        idleCount++;
        // Trigger done after 3 seconds of text inactivity (6 cycles * 500ms)
        if (idleCount >= 6) {
          isThinking = false;
          console.log("ChatGPT: AI is done (Text stopped growing).");
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

const workerScript = `
  setInterval(() => {
    postMessage('tick');
  }, 500);
`;
const blob = new Blob([workerScript], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const timerWorker = new Worker(workerUrl);

timerWorker.onmessage = () => {
  checkStatus();
};
