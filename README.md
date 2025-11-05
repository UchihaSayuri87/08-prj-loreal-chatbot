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

Enjoy building your L’Oréal beauty assistant! 💄
