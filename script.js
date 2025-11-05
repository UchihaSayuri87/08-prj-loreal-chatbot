/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestionEl = document.getElementById("latestQuestion");
// Add config banner element for WORKER_URL notices
const configBanner = document.getElementById("configBanner");

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

// Show UI banner if WORKER_URL is still the placeholder
if (configBanner && WORKER_URL.includes("your-cloudflare-worker")) {
  configBanner.hidden = false;
  configBanner.textContent =
    "Configuration required: deploy the provided Cloudflare Worker, set OPENAI_API_KEY in the Worker dashboard, then update WORKER_URL in script.js to your worker URL.";
}

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

/* Build messages array to send to the API: system prompt (personalized if we know the name)
   followed by the full conversation history so the model has context. */
function buildOutboundMessages() {
  const systemPrompt = userName
    ? `${BASE_SYSTEM_PROMPT} The user's name is ${userName}.`
    : BASE_SYSTEM_PROMPT;

  // convert conversationMessages to the API shape (role/content)
  const apiMessages = conversationMessages.map((m) => {
    const role = m.role === "assistant" ? "assistant" : "user";
    return { role, content: m.content };
  });

  return [{ role: "system", content: systemPrompt }, ...apiMessages];
}

/* Initialize UI from saved history */
loadConversation();

/* When the user submits a question */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // Show user's message in the chat and add to history
  appendMessage("user", text);
  conversationMessages.push({ role: "user", content: text });
  saveConversation();

  // Display the user's latest question above the response (resets each new question)
  latestQuestionEl.textContent = `Latest question: ${text}`;

  userInput.value = "";
  userInput.disabled = true;

  // Try to capture a simple name from the user's input and remember it
  const extracted = tryExtractName(text);
  if (extracted && !userName) {
    userName = extracted;
    localStorage.setItem("loreal_userName", userName);
  }

  // Show a temporary "typing" indicator as an assistant message (visual only)
  const typingEl = document.createElement("div");
  typingEl.className = "msg ai";
  typingEl.textContent = "AI is typing…";
  chatWindow.appendChild(typingEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const outbound = buildOutboundMessages();

    // If WORKER_URL not configured, show friendly UI message and abort request
    if (WORKER_URL.includes("your-cloudflare-worker")) {
      typingEl.remove();
      // also ensure banner is visible in case it wasn't
      if (configBanner) {
        configBanner.hidden = false;
        configBanner.textContent =
          "Configuration required: deploy the provided Cloudflare Worker, set OPENAI_API_KEY in the Worker dashboard, then update WORKER_URL in script.js to your worker URL.";
      }
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

    // Append assistant reply to history and UI
    appendMessage("ai", assistantText);
    conversationMessages.push({ role: "assistant", content: assistantText });
    saveConversation();
  } catch (err) {
    // Remove typing indicator and show error
    try {
      typingEl.remove();
    } catch {}
    appendMessage(
      "ai",
      "Error: Unable to get a response. Check console for details."
    );
    console.error("Worker request error:", err);
  } finally {
    userInput.disabled = false;
    userInput.focus();
  }
});
