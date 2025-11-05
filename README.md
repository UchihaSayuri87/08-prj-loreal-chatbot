# Project 8: L'Oréal Chatbot

L’Oréal is exploring the power of AI, and your job is to showcase what's possible. Your task is to build a chatbot that helps users discover and understand L’Oréal’s extensive range of products—makeup, skincare, haircare, and fragrances—as well as provide personalized routines and recommendations.

## 🚀 Launch via GitHub Codespaces

1. In the GitHub repo, click the **Code** button and select **Open with Codespaces → New codespace**.
2. Once your codespace is ready, open the `index.html` file via the live preview.

## ☁️ Cloudflare Note

When deploying through Cloudflare, make sure your API request body (in `script.js`) includes a `messages` array and handle the response by extracting `data.choices[0].message.content`.

## ☁️ Cloudflare Worker (production)

Deploy the provided `RESOURCE_cloudflare-worker.js` as a Cloudflare Worker and set the worker's secret named `OPENAI_API_KEY` in the Workers dashboard.

In `script.js` set:

- WORKER_URL = "https://your-worker.your-domain.workers.dev"

Then remove `secrets.js` from `index.html` so the API key is not exposed to the browser. For local classroom testing you may keep a local `secrets.js`, but never commit real keys to a public repo.

Enjoy building your L’Oréal beauty assistant! 💄
