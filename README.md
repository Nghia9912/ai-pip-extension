# AI Picture-in-Picture Extension

A lightweight Chrome / Edge extension that tracks the status of AI requests from platforms like ChatGPT, Claude, and Gemini dynamically and gives users a "picture-in-picture" widget that floats on other tabs. 

Never switch back and forth between tabs to see if your AI has finished generating long responses again!

## Features
- **Multi-Tab Tracking:** Tracks generations across ChatGPT, Claude, and Gemini simultaneously. Focuses on the latest active generation.
- **Floating Notification:** When the AI is done, a small checkmark widget (`✅ Hoàn thành!`) instantly appears on whichever tab you are currently viewing.
- **Smart Focus:** Clicking the notification widget instantly teleports you back to the exact AI tab that generated the response.
- **Unobtrusive:** The widget stays hidden completely while the AI is "Thinking" so it doesn't block your screen content. It only shows up when the answer is fully ready.

## Supported Platforms
- ChatGPT (chatgpt.com & chat.openai.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)

## Installation (Unpacked mode)

Currently, the extension is not on the Web Store. You can install it manually in Developer Mode:

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/your-username/ai-pip-extension.git
   ```
2. Open your Chromium-based browser (Chrome, Edge, Brave, etc.) and navigate to the Extensions page:
   - For Chrome: Go to `chrome://extensions/`
   - For Edge: Go to `edge://extensions/`
3. Toggle on **Developer mode** (usually a switch in the top right or left menu).
4. Click **Load unpacked** (hoặc "Tải phần mở rộng chưa được đóng gói").
5. Select the `ai-pip-extension` folder.
6. The extension is now active!

## How it works (Under the hood)
- **Content Scripts Detectors:** Specific detectors inject into AI tabs. They monitor the DOM size every 500ms and watch for "Stop generating" button loops to accurately determine when the AI finishes a stream without false positives.
- **Background Worker:** A central message broker (`worker.js`) that persists states for each `tabId` and orchestrates communication between AI tabs and your active viewing tabs.
- **Shadow DOM Widget:** The UI notification is safely injected via closed Shadow DOM so that its CSS (`widget.css`) will never conflict with the styles of the websites you are browsing.

## License
MIT
