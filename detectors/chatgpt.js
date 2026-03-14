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
  // 1. Tìm các dấu hiệu hiển nhiên (Stop button)
  const stopButton = document.querySelector('button[aria-label="Stop generating"]') || 
                     document.querySelector('button[data-testid="stop-button"]');
                     
  // 2. Class streaming nếu còn
  const streamingElement = document.querySelector('.result-streaming');
  
  // 3. Lấy text của câu trả lời cuối cùng để xem nó có đang dài ra không
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
    // Không thấy indicator nào.
    if (isThinking) {
      // AI đang trong trạng thái thinking, kiểm tra text xem có đứng im không
      if (currentTextLength > lastTextLength && currentTextLength > 0) {
        // Text vẫn đang mọc ra -> Vẫn đang gen!
        idleCount = 0;
        lastTextLength = currentTextLength;
      } else {
        // Text không mọc ra nữa, tăng biến đếm
        idleCount++;
        // Gọi mỗi 500ms, nên 6 lần = 3 giây giữ im lặng mới tính là xong!
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
       // Không thinking, reset length
       lastTextLength = currentTextLength;
    }
  }
}

// Bắt đầu quét mỗi vòng 500ms - Rất nhẹ, không sợ lag như MutationObserver
if (!checkInterval) {
  checkInterval = setInterval(checkStatus, 500);
}
