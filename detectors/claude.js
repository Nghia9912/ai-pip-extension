console.log("AI-PiP: Claude Detector loaded!");

let isThinking = false;
let checkInterval = null;
let idleCount = 0;
let lastTextLength = 0;

function getSnippet() {
  const assistantMessages = document.querySelectorAll('.font-claude-message, [data-message-author-role="assistant"], .prose');
  if (assistantMessages.length === 0) return "Hoàn thành!";
  const lastMsg = assistantMessages[assistantMessages.length - 1];
  let rawText = lastMsg.innerText || lastMsg.textContent || "";
  rawText = rawText.trim().replace(/\n/g, " ");
  return rawText.length > 50 ? rawText.substring(0, 50) + "..." : (rawText || "Hoàn thành!");
}

function checkStatus() {
  // Claude typically uses a button with a square stop icon when generating
  // Or look for an aria-label="Stop generating" equivalent if they have one
  const stopButton = document.querySelector('button[aria-label*="Stop"]') || 
                     document.querySelector('.stop-generating-button'); 
  
  // Or check for "streaming" attributes which they sometimes apply
  const streamingElement = document.querySelector('[data-is-streaming="true"]');
  
  const assistantMessages = document.querySelectorAll('.font-claude-message, [data-message-author-role="assistant"], .prose');
  const lastMsg = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;
  const currentTextLength = lastMsg ? (lastMsg.innerText || lastMsg.textContent || "").length : 0;
  
  const hasExplicitIndicator = !!(stopButton || streamingElement);
  
  if (hasExplicitIndicator) {
    idleCount = 0;
    lastTextLength = currentTextLength;
    if (!isThinking) {
      isThinking = true;
      console.log("Claude: AI is thinking...");
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
          console.log("Claude: AI is done.");
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
