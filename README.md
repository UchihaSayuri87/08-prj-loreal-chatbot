# Project 8: L'Oréal Chatbot

L’Oréal is exploring the power of AI, and your job is to showcase what's possible. Your task is to build a chatbot that helps users discover and understand L’Oréal’s extensive range of products—makeup, skincare, haircare, and fragrances—as well as provide personalized routines and recommendations.

## 🚀 Launch via GitHub Codespaces

1. In the GitHub repo, click the **Code** button and select **Open with Codespaces → New codespace**.
2. Once your codespace is ready, open the `index.html` file via the live preview.

## ☁️ Cloudflare Note

When deploying through Cloudflare, make sure your API request body (in `script.js`) includes a `messages` array and handle the response by extracting `data.choices[0].message.content`.

## Deploy & configure Cloudflare Worker (required for production)

1. Deploy the worker:

   - Copy `RESOURCE_cloudflare-worker.js` into a new Cloudflare Worker in your account.
   - In the Workers dashboard, create the worker and deploy it.

2. Store your OpenAI API key securely in Cloudflare:

   - In the Worker settings → Variables and Secrets, add a secret named `OPENAI_API_KEY`.
   - Paste your OpenAI key as the value (do NOT commit this key to your repo).

3. Note the worker URL:

   - After deployment Cloudflare provides a URL for your worker (for example: https://your-worker.your-domain.workers.dev).

4. Update the frontend:

   - Open `script.js` and set:
     const WORKER_URL = "https://your-worker.your-domain.workers.dev"
   - Save and reload the page.

5. Remove any client-side keys:

   - Ensure `secrets.js` is not included in `index.html` and do not commit any real keys.
   - If you used a local `secrets.js` for testing, remove it from git and your commits:
     ```bash
     git rm --cached secrets.js
     git commit -m "Remove local secrets.js"
     ```

6. Test:
   - In the web UI ask a L’Oréal product/routine question.
   - The frontend sends a POST with `{ messages: [...] }` to your worker.
   - The worker forwards the request to OpenAI using the secret and returns the assistant response.

Notes:

- Never expose your OpenAI API key in client-side code for production.
- The worker must be deployed and the `OPENAI_API_KEY` secret configured for the chat to work from browsers.

## Quick checklist — Verify each item

- Branding & logo

  - Place the official raster logo at: /workspaces/08-prj-loreal-chatbot/img/logo.png
  - OR keep the inline SVG (already embedded). If you switch to the raster logo, uncomment the <img> example in `index.html` and remove the SVG to avoid duplicate logos.
  - Confirm no 404s appear for `/img/logo.png` or `/logo.png` in DevTools.

- Fonts & styling

  - Headings use the Playfair Display family and UI uses Montserrat (see `index.html` and `style.css`).
  - Colors follow a L’Oréal-like palette (deep black + warm gold) in `style.css`.

- System prompt & AI relevance

  - `script.js` includes a system prompt limiting responses to L’Oréal products, routines, and recommendations (see `BASE_SYSTEM_PROMPT`).
  - The assistant will politely refuse out-of-scope questions per the prompt.

- Local testing secrets (ONLY for private/local testing)

  - If you need a local key for tests, temporarily add it to `secrets.js` (it's in `.gitignore` so don't commit).
  - For production, DO NOT store keys client-side.

- Cloudflare Worker (production secure flow) — required for deployment

  1. Copy `RESOURCE_cloudflare-worker.js` into a new Cloudflare Worker.
  2. In the Workers dashboard, add a secret named `OPENAI_API_KEY` (Variables & Secrets).
  3. Deploy the worker and note the worker URL (e.g. `https://your-worker.your-domain.workers.dev`).
  4. Update `script.js` and set:
     - `const WORKER_URL = "https://your-worker.your-domain.workers.dev";`
  5. Remove any client-side `secrets.js` usage from `index.html`.

- Frontend behavior (already implemented in `script.js`)

  - Messages are sent as a `messages` array to the worker.
  - Responses are read from `data.choices[0].message.content`.
  - Conversation history is stored in `localStorage` to support multi-turn context.
  - The Latest Question is displayed above each assistant reply (resets each question).
  - UI uses distinct message bubbles for user vs assistant (see `style.css`).

- Debugging & network errors
  - If you see `Failed to load resource: 404` for logos, ensure the raster logo exists at the path above or keep the inline SVG.
  - If you see `Failed to fetch` or `ERR_NAME_NOT_RESOLVED` for the worker URL, confirm the worker is deployed and WORKER_URL is set correctly in `script.js`.
  - Use the developer console to inspect network errors and CORS issues.

## Verifying the full flow locally (recommended)

1. Start a local preview of `index.html` (Codespaces live preview).
2. Ensure the config banner shows guidance if WORKER_URL is not set or unreachable.
3. Set WORKER_URL to your worker and test a question about L’Oréal products.
4. Confirm the assistant reply appears and `localStorage` contains the conversation history.
5. Use the toolbar to Clear or Reset Context to test persistence.

## Local API key (secrets.js) — local testing only

If you want to test the frontend directly (not using the Cloudflare Worker), create a file named `secrets.js` at the project root with your OpenAI API key:

1. Create `/workspaces/08-prj-loreal-chatbot/secrets.js`.
2. Add the key (local testing only):

   ```javascript
   // local secrets.js (DO NOT COMMIT)
   const OPENAI_API_KEY = "sk-REPLACE_WITH_YOUR_KEY";
   window.OPENAI_API_KEY = OPENAI_API_KEY;
   ```

3. Reload the page. The frontend will use `window.OPENAI_API_KEY` to call OpenAI directly.
4. Important: never commit `secrets.js` to git. It's already listed in `.gitignore`. For production use the Cloudflare Worker and store the key in the Worker dashboard as `OPENAI_API_KEY`, then remove `secrets.js` (and the <script> include in `index.html`).

## Prepare for production — protect your API key

1. Do NOT load client-side secrets in production. Remove any <script src="secrets.js"></script> from `index.html`.

2. If you previously created a local `secrets.js` for testing, remove it from the repo and your commits:

```bash
# stop tracking and remove from the next commit
git rm --cached secrets.js
git commit -m "Remove local secrets.js"

# (Optional) To purge from git history (use with caution — rewrites history)
# Use BFG or git filter-branch if needed.
```

3. Use the Cloudflare Worker (provided `RESOURCE_cloudflare-worker.js`) for production:

   - Deploy the worker.
   - In the Workers dashboard → Variables & Secrets add: name = OPENAI_API_KEY, value = <your key>.
   - Update `script.js`: set `WORKER_URL = "https://your-worker.your-domain.workers.dev"` and do NOT include `secrets.js` in `index.html`.

4. Verify in production:
   - The frontend should POST { messages: [...] } to your worker URL.
   - The worker forwards to OpenAI using the secret and returns the assistant response.
   - No API keys are present in client-side code or the repo.

## Quick: configure the worker URL (without editing script.js)

You can set the worker URL in one of two safe ways (do NOT commit these files to git):

1. Create a small config file (local, not committed) named `config.js` in the project root:

```javascript
// local config.js (DO NOT COMMIT)
window.WORKER_URL = "https://your-worker.your-domain.workers.dev";
```

Then include it in `index.html` before `script.js` while testing locally:

```html
<script src="config.js"></script>
<script src="script.js"></script>
```

2. Or set it from the browser console while testing:

```javascript
window.WORKER_URL = "https://your-worker.your-domain.workers.dev";
```

After the worker URL is set, the frontend will POST `{ messages: [...] }` to the worker, and the worker will forward requests to OpenAI using the secret `OPENAI_API_KEY` stored in Cloudflare Workers (recommended for production).

Enjoy building your L’Oréal beauty assistant! 💄
