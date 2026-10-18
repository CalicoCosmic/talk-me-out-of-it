# 🛑 Talk Me Out Of It

> **The practical, logical antidote to buyer's remorse — powered by the Google Gemini API.**

"Talk Me Out Of It" is an anti-consumerism, financial mindfulness web application designed to save you from impulsive spending. Simply enter or paste the URL of a product you're tempted to buy, and Gemini formulates a comprehensive, 6-slide logical presentation to talk you out of it.

Built specifically to run **100% serverless from a GitHub Pages site**.

---

## ⚡ Features

- **🎯 Direct URL or Item Input**: Paste an Amazon, BestBuy, or retail link—or simply type the item name.
- **📊 6-Slide Dissuasion Deck**: Formulates an uncompromising presentation covering:
  1. **Reality vs. Fantasy**: Marketing halo vs. daily friction & inevitable dust-gathering.
  2. **The Real Cost**: Hidden recurring subscriptions, depreciation, accessories, and true cost-per-use.
  3. **Opportunity Cost**: Compound index fund returns over 5–10 years vs. fleeting novelties.
  4. **The 80/20 & Cheaper Alternatives**: What you already own or a 10x cheaper alternative that solves 80% of the need.
  5. **Cognitive Bias Callout**: Aspirational identity bias, retail dopamine spikes, and planned obsolescence.
  6. **The 72-Hour Cooldown Challenge**: Concrete action steps to test whether you genuinely need the item.
- **🖥️ Interactive Slide Presentation Mode**:
  - Full slide deck with smooth transitions.
  - Keyboard navigation (`←`, `→`, `Space`, `Home`, `End`).
  - Mobile swipe gesture support.
  - Fullscreen presentation mode.
  - Grid view to see all slides at a glance.
- **🧊 Cold Reality Check Quotes**: A witty, brutal reality check on every slide.
- **📄 Share & Export**: Copy formatted markdown to clipboard or print/save as clean PDF.
- **🔒 Privacy First & Zero Backend Required**:
  - Runs entirely client-side in the browser.
  - Your Google Gemini API key is stored only in your browser's `localStorage` and never sent anywhere else.
- **✨ Instant Demo Mode**: Includes pre-built presentations (e.g. Apple Vision Pro, Commercial Espresso Machine) so you can test it with one click before even adding an API key.

---

## 🚀 How to Deploy to GitHub Pages (2 Minutes)

Because this project is built with vanilla HTML, modern CSS, and JavaScript, **there are no build steps or Node.js dependencies required**.

### Step 1: Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new) and create a repository (e.g. `talk-me-out-of-it`).
2. Clone or push this project folder to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Talk Me Out Of It"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/talk-me-out-of-it.git
   git push -u origin main
   ```

### Step 2: Enable GitHub Pages
1. Go to your repository on GitHub.
2. Click on **Settings** > **Pages** (in the left sidebar).
3. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`.
   - **Branch**: Select `main` and folder `/ (root)`.
   - Click **Save**.
4. In about 30 seconds, your site will be live at:
   `https://<YOUR-USERNAME>.github.io/talk-me-out-of-it/`

---

## 🔑 Getting a Free Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **"Create API Key"**.
4. Copy your key and paste it into the **"API Key"** button on the website.
5. Your key is stored locally in your browser (`localStorage`) and used directly for API requests.

---

## 💻 Local Development / Preview

To test or preview locally:

```bash
# Using Python 3's built-in web server:
python3 -m http.server 8000

# Open in browser:
http://localhost:8000
```

---

## 🛠️ Tech Stack

- **HTML5 & CSS3**: Clean, responsive layout with dark-mode aesthetic.
- **Tailwind CSS**: Loaded via CDN for styling without a build step.
- **Lucide Icons**: Crisp SVG icons.
- **Google Generative Language API**: Connects to `gemini-2.5-flash` (with automatic fallback to `gemini-1.5-flash`).
- **Web Audio API**: Synthetic non-intrusive sound effects for tactile feedback.

---

## 📜 License

MIT License. Feel free to fork, customize, and save yourself thousands of dollars!
