/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestionEl = document.getElementById("latestQuestion");
// Add config banner element for WORKER_URL notices
const configBanner = document.getElementById("configBanner");
// Dismiss button (inside the banner)
const dismissBannerBtn = document.getElementById("dismissBannerBtn");

/* Conversation state persisted in localStorage to keep context across refreshes */
let conversationMessages = []; // array of { role: 'user'|'assistant', content: '...' }
let userName = localStorage.getItem("loreal_userName") || undefined;

/* Helper: add a message to the chat window */
function appendMessage(role, text) {
  // role: 'user' or 'ai'
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = text;
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Load saved history if available, otherwise set a friendly assistant greeting */
function loadConversation() {
  const saved = localStorage.getItem("loreal_chat_history");
  if (saved) {
    try {
      conversationMessages = JSON.parse(saved);
    } catch {
      conversationMessages = [];
    }
  }

  if (conversationMessages.length === 0) {
    // initial assistant greeting stored in history so it is part of context
    conversationMessages = [
      { role: "assistant", content: "👋 Hello! How can I help you today?" },
    ];
    saveConversation();
  }

  // render conversation
  chatWindow.textContent = "";
  for (const msg of conversationMessages) {
    appendMessage(msg.role === "assistant" ? "ai" : "user", msg.content);
  }
}
function saveConversation() {
  localStorage.setItem(
    "loreal_chat_history",
    JSON.stringify(conversationMessages)
  );
}

/* System prompt: only answer L'Oréal product, routine, and recommendation questions.
   If the user asks something unrelated, reply politely explaining the scope. */
const BASE_SYSTEM_PROMPT = `You are a helpful L'Oréal beauty assistant. Only answer questions about L'Oréal products, skincare, makeup, haircare, fragrances, and personalized routines or recommendations involving L'Oréal brands. If a user asks something outside this topic, politely respond: "I can only help with L'Oréal product information, routines, and recommendations. Please ask about those topics." Keep answers friendly, concise, and product-focused.`;

/* Cloudflare Worker URL (replace with your deployed worker URL) */
const WORKER_URL = "https://your-cloudflare-worker.workers.dev"; // <-- set this to your deployed worker

// Replace the old updateConfigBanner implementation with improved messaging
async function updateConfigBanner() {
  if (!configBanner) return false;

  // If the user dismissed the banner this session, keep it hidden (temporary)
  if (sessionStorage.getItem("configBannerDismissed") === "1") {
    configBanner.hidden = true;
    return true; // treat as OK so UI won't block
  }

  // If still the placeholder, show a clear setup message.
  if (WORKER_URL.includes("your-cloudflare-worker")) {
    configBanner.hidden = false;
    // Provide concise steps and keep the dismiss button available
    configBanner.innerHTML = `
      <div>
        <strong>Configuration required</strong>: deploy the Cloudflare Worker, add OPENAI_API_KEY under Variables & Secrets, then set <code>WORKER_URL</code> in <code>script.js</code>.
        <div style="margin-top:6px;font-size:13px;color:#6b6b6b">
          Tip: paste the worker URL exactly (https://your-worker.your-domain.workers.dev)
        </div>
      </div>
    `;
    if (dismissBannerBtn) configBanner.appendChild(dismissBannerBtn);
    return false;
  }

  // Worker URL provided — test reachability with a short timeout.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

  try {
    const res = await fetch(WORKER_URL, {
      method: "OPTIONS",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // If the worker responded at all, hide the banner.
    configBanner.hidden = true;
    return true;
  } catch (err) {
    clearTimeout(timeout);

    // Network-level error (TypeError: Failed to fetch) often indicates DNS / offline / CORS blocking.
    if (err && err.name === "AbortError") {
      configBanner.hidden = false;
      configBanner.innerHTML = `
        <div>
          <strong>Worker check timed out</strong>: the worker URL was not reachable within 3s.
          Please confirm the worker is deployed and reachable, and that your network allows outbound requests.
        </div>
      `;
    } else if (
      err &&
      err.message &&
      err.message.toLowerCase().includes("failed to fetch")
    ) {
      configBanner.hidden = false;
      configBanner.innerHTML = `
        <div>
          <strong>Network error</strong>: failed to contact the worker URL.
          Possible causes: DNS not resolved, no internet connection, firewall, or CORS blocking the request.
          Check the developer console for details.
        </div>
      `;
    } else {
      configBanner.hidden = false;
      configBanner.innerHTML = `
        <div>
          <strong>Worker unreachable</strong>: an error occurred while checking the worker URL.
          See console for details.
        </div>
      `;
    }

    // re-attach dismiss button if present
    if (dismissBannerBtn) configBanner.appendChild(dismissBannerBtn);

    // Log the detailed error for debugging
    console.error("Worker reachability check failed:", err);
    return false;
  }
}

// Perform a health-check on load so the banner state is accurate immediately.
updateConfigBanner();

/* Utility: try to extract a simple name from the user's message */
function tryExtractName(text) {
  // crude patterns for classroom demo; keep simple
  const patterns = [
    /my name is\s+([A-Za-z]+)/i,
    /i am\s+([A-Za-z]+)/i,
    /i'm\s+([A-Za-z]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1];
  }
  return null;
}

/* New DOM refs for toolbar */
const clearBtn = document.getElementById("clearBtn");
const resetBtn = document.getElementById("resetBtn");

/* Utility: render a small spinner element */
function createSpinnerEl() {
  const s = document.createElement("span");
  s.className = "spinner";
  s.setAttribute("aria-hidden", "true");
  return s;
}

/* Limit history: use only the last N messages when sending to the API */
const MAX_HISTORY_MESSAGES = 20;

function buildOutboundMessages() {
  const systemPrompt = userName
    ? `${BASE_SYSTEM_PROMPT} The user's name is ${userName}.`
    : BASE_SYSTEM_PROMPT;

  // convert conversationMessages to the API shape (role/content)
  // keep only the most recent turns to avoid very long payloads
  const trimmed = conversationMessages.slice(-MAX_HISTORY_MESSAGES);
  const apiMessages = trimmed.map((m) => {
    const role = m.role === "assistant" ? "assistant" : "user";
    return { role, content: m.content };
  });

  return [{ role: "system", content: systemPrompt }, ...apiMessages];
}

/* Clear the conversation UI but keep greeting (for convenience) */
function clearConversationUI() {
  conversationMessages = [
    { role: "assistant", content: "👋 Hello! How can I help you today?" },
  ];
  saveConversation();
  chatWindow.textContent = "";
  for (const msg of conversationMessages) {
    appendMessage(msg.role === "assistant" ? "ai" : "user", msg.content);
  }
  latestQuestionEl.textContent = "";
}

/* Reset context: clears stored history and user name */
function resetContext() {
  conversationMessages = [];
  userName = undefined;
  localStorage.removeItem("loreal_chat_history");
  localStorage.removeItem("loreal_userName");
  clearConversationUI();
}

/* Wire toolbar buttons */
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    clearConversationUI();
    userInput.focus();
  });
}
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    resetContext();
    // show a small confirmation message in the chat
    appendMessage("ai", "Context has been reset. How can I help you now?");
  });
}

/* Dismiss button handler: hide banner for this session */
if (dismissBannerBtn) {
  dismissBannerBtn.addEventListener("click", () => {
    sessionStorage.setItem("configBannerDismissed", "1");
    if (configBanner) configBanner.hidden = true;
  });
}

/* Keyboard shortcut: Ctrl/Cmd+K focuses input (helps quick testing) */
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    userInput.focus();
  }
});

/* Update submit flow: use spinner element instead of plain "AI is typing…" text */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  conversationMessages.push({ role: "user", content: text });
  saveConversation();

  latestQuestionEl.textContent = `Latest question: ${text}`;

  userInput.value = "";
  userInput.disabled = true;

  const extracted = tryExtractName(text);
  if (extracted && !userName) {
    userName = extracted;
    localStorage.setItem("loreal_userName", userName);
  }

  // spinner (visual) instead of plain text
  const typingEl = document.createElement("div");
  typingEl.className = "msg ai";
  const spinner = createSpinnerEl();
  typingEl.textContent = " AI is typing ";
  typingEl.insertBefore(spinner, typingEl.firstChild);
  chatWindow.appendChild(typingEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const outbound = buildOutboundMessages();

    // Use the health-check before making the request to the worker.
    const workerReady = await updateConfigBanner();
    if (!workerReady) {
      typingEl.remove();
      appendMessage(
        "ai",
        "Configuration required: deploy the provided Cloudflare Worker, set OPENAI_API_KEY in the Worker dashboard, then update WORKER_URL in script.js to your worker URL."
      );
      userInput.disabled = false;
      userInput.focus();
      return;
    }

    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: outbound }),
    });

    const data = await response.json();
    typingEl.remove();

    const assistantText =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : "Sorry, I couldn't get a reply. Please try again.";

    appendMessage("ai", assistantText);
    conversationMessages.push({ role: "assistant", content: assistantText });
    saveConversation();
  } catch (err) {
    // Remove typing indicator and show a helpful message
    try {
      typingEl.remove();
    } catch {}

    // Provide specific guidance for common network/fetch errors
    if (
      err &&
      err.message &&
      err.message.toLowerCase().includes("failed to fetch")
    ) {
      appendMessage(
        "ai",
        "Network error: Unable to reach the Cloudflare Worker. Check WORKER_URL, your internet connection, and Cloudflare deployment. See console for details."
      );
    } else {
      appendMessage(
        "ai",
        "Error: Unable to get a response. Check console for details."
      );
    }

    console.error("Worker request error:", err);
  } finally {
    userInput.disabled = false;
    userInput.focus();
  }
});
