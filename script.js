/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

/* Helper: add a message to the chat window */
function appendMessage(role, text) {
  // role: 'user' or 'ai'
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = text;
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Set initial message */
chatWindow.textContent = "";
appendMessage("ai", "👋 Hello! How can I help you today?");

/* Cloudflare Worker URL (replace with your deployed worker URL) */
const WORKER_URL = "https://your-cloudflare-worker.workers.dev"; // <-- set this

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // Show user's message in the chat
  appendMessage("user", text);
  userInput.value = "";
  userInput.disabled = true;

  // Show a temporary "typing" indicator
  const typingEl = document.createElement("div");
  typingEl.className = "msg ai";
  typingEl.textContent = "AI is typing…";
  chatWindow.appendChild(typingEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Build messages array for the chat API
    const messages = [
      {
        role: "system",
        content: "You are a helpful L'Oréal beauty assistant.",
      },
      { role: "user", content: text },
    ];

    let data;

    if (window.OPENAI_API_KEY) {
      // Local/testing: call OpenAI directly (not for production)
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // secrets.js exposes the key as window.OPENAI_API_KEY
            Authorization: `Bearer ${window.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: messages,
            max_tokens: 300,
          }),
        }
      );
      data = await response.json();
    } else {
      // Production: call your Cloudflare Worker which forwards the request securely
      // The worker expects a JSON body like: { messages: [...] }
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });
      data = await response.json();
    }

    // Remove typing indicator
    typingEl.remove();

    // Extract assistant text per instructions
    const assistantText =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : "Sorry, I couldn't get a reply. Please try again.";

    appendMessage("ai", assistantText);
  } catch (err) {
    // Remove typing indicator and show error
    typingEl.remove();
    appendMessage(
      "ai",
      "Error: Unable to get a response. Check console for details."
    );
    console.error("OpenAI request error:", err);
  } finally {
    userInput.disabled = false;
    userInput.focus();
  }
});
