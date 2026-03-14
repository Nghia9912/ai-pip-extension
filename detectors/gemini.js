console.log("AI-PiP: Gemini Detector loaded!");

let isThinking = false;
let checkInterval = null;
let idleCount = 0;
let lastTextLength = 0;

function getSnippet() {
  // Gemini's response structure usually relies on .model-response-text or message-content
  const assistantMessages = document.querySelectorAll('message-content, .model-response-text, [data-test-id="model-response-text"]');
  if (assistantMessages.length === 0) return "Hoàn thành!";
  const lastMsg = assistantMessages[assistantMessages.length - 1];
  let rawText = lastMsg.innerText || lastMsg.textContent || "";
  rawText = rawText.trim().replace(/\n/g, " ");
  return rawText.length > 50 ? rawText.substring(0, 50) + "..." : (rawText || "Hoàn thành!");
}

function checkStatus() {
  // Look for Gemini's generating indicator (usually an animated logo or a Stop button)
  const stopButton = document.querySelector('button[aria-label*="Stop"]') ||
                     document.querySelector('button[mattooltip*="Stop"]'); // Sometimes uses Material layout
  
  // Or look for their loading dots / sparkle animations
  const generatingIndicator = document.querySelector('streaming-message-status, [class*="generating"], [class*="loading"], circle.gmat-mdc-circular-progress-active-path');
  
  // Gemini's text containers
  const assistantMessages = document.querySelectorAll('message-content, .model-response-text, [data-test-id="model-response-text"], .message.bot');
  const lastMsg = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;
  const currentTextLength = lastMsg ? (lastMsg.innerText || lastMsg.textContent || "").length : 0;
  
  // Nút stop của Gemini có thể là thẻ span có text "Stop" bên trong
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

if (!checkInterval) {
  checkInterval = setInterval(checkStatus, 500);
}
