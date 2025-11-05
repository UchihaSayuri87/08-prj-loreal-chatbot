/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestionEl = document.getElementById("latestQuestion");

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

/* Keyboard shortcut: Ctrl/Cmd+K focuses input (helps quick testing) */
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    userInput.focus();
  }
});

/* Update submit flow: use spinner element and call OpenAI directly if a local key is provided.
   Otherwise, if WORKER_URL is configured, forward to the worker. If neither is available,
   show a brief neutral message in the chat. */
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

  // spinner (visual)
  const typingEl = document.createElement("div");
  typingEl.className = "msg ai";
  const spinner = createSpinnerEl();
  typingEl.textContent = " AI is typing ";
  typingEl.insertBefore(spinner, typingEl.firstChild);
  chatWindow.appendChild(typingEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const outbound = buildOutboundMessages();

    let data;

    // If a local API key is present, call OpenAI directly (local testing)
    if (window.OPENAI_API_KEY) {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${window.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: outbound,
            max_tokens: 300,
          }),
        }
      );
      data = await response.json();
    } else if (!WORKER_URL.includes("your-cloudflare-worker")) {
      // Fallback: call the deployed Cloudflare Worker if WORKER_URL has been set
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outbound }),
      });
      data = await response.json();
    } else {
      // Neither local key nor worker URL configured: inform user in-chat (no worker banner)
      typingEl.remove();
      appendMessage(
        "ai",
        "No API key configured. For local testing set window.OPENAI_API_KEY in secrets.js or deploy a server to proxy requests."
      );
      userInput.disabled = false;
      userInput.focus();
      return;
    }

    // Remove typing indicator
    typingEl.remove();

    // Extract assistant text per instructions (data.choices[0].message.content)
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
    try {
      typingEl.remove();
    } catch {}
    // Generic network/error message (avoid mentioning worker banner)
    appendMessage(
      "ai",
      "Error: Unable to get a response. Check console for details."
    );
    console.error("Request error:", err);
  } finally {
    userInput.disabled = false;
    userInput.focus();
  }
});
