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

/* System prompt: only answer L'Oréal product, routine, and recommendation questions.
   If the user asks something unrelated, reply politely explaining the scope. */
const SYSTEM_PROMPT = `You are a helpful L'Oréal beauty assistant. Only answer questions about L'Oréal products, skincare, makeup, haircare, fragrances, and personalized routines or recommendations involving L'Oréal brands. If a user asks something outside this topic, politely respond: "I can only help with L'Oréal product information, routines, and recommendations. Please ask about those topics." Keep answers friendly, concise, and product-focused.`;

/* Cloudflare Worker URL (replace with your deployed worker URL) */
const WORKER_URL = "https://your-cloudflare-worker.workers.dev"; // <-- set this to your deployed worker

if (WORKER_URL.includes("your-cloudflare-worker")) {
  console.warn(
    "WORKER_URL is still the placeholder. Deploy your Cloudflare Worker and set WORKER_URL in script.js to the worker URL."
  );
}

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
    // Build messages array including the system prompt
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ];

    // Send the messages array to your Cloudflare Worker.
    // The worker will forward the request to OpenAI using the secret stored in Cloudflare.
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
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

    appendMessage("ai", assistantText);
  } catch (err) {
    // Remove typing indicator and show error
    typingEl.remove();
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
