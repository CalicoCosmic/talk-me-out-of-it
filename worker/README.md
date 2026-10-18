# 🛡️ Serverless Gemini Proxy for "Talk Me Out Of It"

This lightweight Cloudflare Worker hides your Google Gemini API key securely on the backend while serving requests to your GitHub Pages website (`https://calicocosmic.github.io/talk-me-out-of-it/`).

- **Cost:** Free (Cloudflare includes 100,000 requests/day on the free tier).
- **Security:** Key is never exposed to visitors or in client-side code.
- **CORS Protection:** Configured specifically for your GitHub Pages domain.

---

## ⚡ Deployment Method 1: Cloudflare Web Dashboard (No terminal needed, 2 mins)

1. **Log in to Cloudflare:**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com) (free signup if you don't have an account).
2. **Create a Worker:**
   - In the left sidebar, click **Compute (Workers) > Workers & Pages**.
   - Click **Create** > **Create Worker**.
   - Name it `talk-me-out-of-it-proxy` and click **Deploy**.
3. **Paste the Code:**
   - Click **Edit Code**.
   - Replace everything in `worker.js` with the contents of [`worker/worker.js`](./worker.js).
   - Click **Deploy** in the top right.
4. **Add your Gemini API Key:**
   - Go back to the worker's **Settings** tab.
   - Click **Variables and Secrets** > **Add**.
   - **Variable name:** `GEMINI_API_KEY`
   - **Value:** Paste your Google Gemini API key.
   - Mark as **Secret** (or Encrypt) and click **Save**.
5. **Copy Your Worker URL:**
   - Copy the URL shown under your worker name (e.g. `https://talk-me-out-of-it-proxy.<your-subdomain>.workers.dev`).

---

## 💻 Deployment Method 2: Command Line (Wrangler)

If you prefer terminal:

```bash
cd worker
# Deploy the worker to your Cloudflare account
npx wrangler deploy

# Set your secret Gemini API key
npx wrangler secret put GEMINI_API_KEY
```

---

## 🔗 Connect it to your Website

Once you have your Worker URL (e.g., `https://talk-me-out-of-it-proxy.calicocosmic.workers.dev`), simply open [`app.js`](../app.js) and paste it into the `PROXY_API_URL` constant:

```javascript
const PROXY_API_URL = 'https://talk-me-out-of-it-proxy.calicocosmic.workers.dev';
```

Then commit and push:
```bash
git add app.js
git commit -m "Connect live serverless proxy"
git push
```

Now, anyone in the world can visit your GitHub Pages site and generate presentations **without having to enter their own API key**!
