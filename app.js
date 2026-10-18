// =========================================================================
// Configuration
// =========================================================================
// If you deploy the Cloudflare Worker (see worker/README.md), paste its URL here
// (e.g. 'https://talk-me-out-of-it-proxy.calicocosmic.workers.dev')
// When set, visitors do NOT need to enter an API key!
const PROXY_API_URL = '';

const app = {
  // State
  apiKey: localStorage.getItem('gemini_api_key') || '',
  proxyUrl: PROXY_API_URL,
  currentPresentation: null,
  currentSlideIndex: 0,
  isGridView: false,
  sampleIndex: 0,

  // Audio Context for subtle tactile sound effects (Web Audio API, no external assets required)
  audioCtx: null,

  init() {
    this.bindEvents();
    this.updateApiKeyUI();
    this.renderIcons();

    // Check if URL has query parameters for shared product or demo
    const urlParams = new URLSearchParams(window.location.search);
    const demoParam = urlParams.get('demo');
    if (demoParam && window.SAMPLE_PRESENTATIONS) {
      this.loadPresentation(window.SAMPLE_PRESENTATIONS[0]);
    }
  },

  renderIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  playBlip(type = 'click') {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;
      if (type === 'click') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'slide') {
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'saved') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      // Audio autoplay restrictions or unsupported
    }
  },

  bindEvents() {
    // Form submission
    const form = document.getElementById('dissuadeForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Toggle extra input fields
    const toggleExtraBtn = document.getElementById('toggleExtraFields');
    const extraContainer = document.getElementById('extraFieldsContainer');
    const chevron = document.getElementById('extraFieldsChevron');
    toggleExtraBtn.addEventListener('click', () => {
      const isHidden = extraContainer.classList.contains('hidden');
      if (isHidden) {
        extraContainer.classList.remove('hidden');
        chevron.classList.add('rotate-90');
      } else {
        extraContainer.classList.add('hidden');
        chevron.classList.remove('rotate-90');
      }
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('productUrl').value = btn.dataset.item;
        document.getElementById('priceInput').value = btn.dataset.price;
        document.getElementById('rationaleInput').value = btn.dataset.why;
        extraContainer.classList.remove('hidden');
        chevron.classList.add('rotate-90');
        this.playBlip('click');
      });
    });

    // API Key modal
    const apiKeyBtn = document.getElementById('apiKeyBtn');
    const apiKeyModal = document.getElementById('apiKeyModal');
    const closeApiKeyModal = document.getElementById('closeApiKeyModal');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const toggleKeyVisibility = document.getElementById('toggleKeyVisibility');

    apiKeyBtn.addEventListener('click', () => {
      apiKeyInput.value = this.apiKey;
      apiKeyModal.classList.remove('hidden');
      apiKeyInput.focus();
    });

    closeApiKeyModal.addEventListener('click', () => {
      apiKeyModal.classList.add('hidden');
    });

    apiKeyModal.addEventListener('click', (e) => {
      if (e.target === apiKeyModal) {
        apiKeyModal.classList.add('hidden');
      }
    });

    saveApiKeyBtn.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        this.showToast('Please enter a valid Gemini API key', 'alert');
        return;
      }
      this.apiKey = key;
      localStorage.setItem('gemini_api_key', key);
      this.updateApiKeyUI();
      apiKeyModal.classList.add('hidden');
      this.showToast('Gemini API key saved securely in browser', 'check');
    });

    clearApiKeyBtn.addEventListener('click', () => {
      this.apiKey = '';
      localStorage.removeItem('gemini_api_key');
      apiKeyInput.value = '';
      this.updateApiKeyUI();
      apiKeyModal.classList.add('hidden');
      this.showToast('API key cleared', 'info');
    });

    toggleKeyVisibility.addEventListener('click', () => {
      const isPass = apiKeyInput.type === 'password';
      apiKeyInput.type = isPass ? 'text' : 'password';
      const eyeIcon = document.getElementById('eyeIcon');
      eyeIcon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
      this.renderIcons();
    });

    // Demo button
    const demoBtn = document.getElementById('demoBtn');
    demoBtn.addEventListener('click', () => {
      if (window.SAMPLE_PRESENTATIONS && window.SAMPLE_PRESENTATIONS.length > 0) {
        const sample = window.SAMPLE_PRESENTATIONS[this.sampleIndex % window.SAMPLE_PRESENTATIONS.length];
        this.sampleIndex++;
        this.loadPresentation(sample);
        this.showToast(`Loaded demo: ${sample.itemName}`, 'info');
      }
    });

    // Slide navigation
    document.getElementById('prevSlideBtn').addEventListener('click', () => this.navigateSlide(-1));
    document.getElementById('nextSlideBtn').addEventListener('click', () => this.navigateSlide(1));

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      const presentationSection = document.getElementById('presentationSection');
      if (presentationSection.classList.contains('hidden') || this.isGridView) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        this.navigateSlide(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        this.navigateSlide(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.goToSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        if (this.currentPresentation?.slides) {
          this.goToSlide(this.currentPresentation.slides.length - 1);
        }
      }
    });

    // Mobile swipe gesture support
    let touchStartX = 0;
    let touchEndX = 0;
    const deckContainer = document.getElementById('deckContainer');
    deckContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    deckContainer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff < 0) this.navigateSlide(1); // Swipe left = next
        else this.navigateSlide(-1); // Swipe right = prev
      }
    }, { passive: true });

    // Grid View Toggle
    const toggleViewModeBtn = document.getElementById('toggleViewModeBtn');
    toggleViewModeBtn.addEventListener('click', () => {
      this.toggleGridView();
    });

    // Fullscreen Toggle
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    fullscreenBtn.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Share / Copy button
    const shareBtn = document.getElementById('shareBtn');
    shareBtn.addEventListener('click', () => {
      this.sharePresentation();
    });

    // Print button
    const printBtn = document.getElementById('printBtn');
    printBtn.addEventListener('click', () => {
      window.print();
    });

    // Back to home button
    const backBtn = document.getElementById('backBtn');
    backBtn.addEventListener('click', () => {
      this.resetToHome();
    });

    // I Won't Buy It button
    const saveMoneyBtn = document.getElementById('saveMoneyBtn');
    const savedModal = document.getElementById('savedModal');
    const closeSavedModalBtn = document.getElementById('closeSavedModalBtn');
    saveMoneyBtn.addEventListener('click', () => {
      this.playBlip('saved');
      const itemTitle = this.currentPresentation?.itemName || 'this item';
      const itemPrice = this.currentPresentation?.estimatedPrice || '';
      document.getElementById('savedModalMessage').textContent = 
        `You just saved ${itemPrice ? itemPrice + ' and ' : ''}spared yourself from buying "${itemTitle}". Practical logic wins!`;
      savedModal.classList.remove('hidden');
    });

    closeSavedModalBtn.addEventListener('click', () => {
      savedModal.classList.add('hidden');
    });

    savedModal.addEventListener('click', (e) => {
      if (e.target === savedModal) {
        savedModal.classList.add('hidden');
      }
    });
  },

  updateApiKeyUI() {
    const label = document.getElementById('apiKeyBtnLabel');
    if (this.apiKey) {
      label.textContent = 'Custom Key ✓';
      label.classList.add('text-emerald-400');
    } else if (this.proxyUrl) {
      label.textContent = 'Shared Key ✓';
      label.classList.add('text-emerald-400');
    } else {
      label.textContent = 'API Key';
      label.classList.remove('text-emerald-400');
    }
  },

  showToast(message, icon = 'info') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');

    msg.textContent = message;
    const iconName = icon === 'check' ? 'check-circle' : (icon === 'alert' ? 'alert-triangle' : 'info');
    toastIcon.setAttribute('data-lucide', iconName);
    this.renderIcons();

    toast.classList.remove('translate-y-16', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-16', 'opacity-0');
    }, 3500);
  },

  resetToHome() {
    document.getElementById('presentationSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('inputSection').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  toggleGridView() {
    this.isGridView = !this.isGridView;
    const deck = document.getElementById('deckContainer');
    const footer = document.getElementById('deckFooter');
    const grid = document.getElementById('gridViewContainer');
    const label = document.getElementById('viewModeLabel');

    if (this.isGridView) {
      deck.classList.add('hidden');
      footer.classList.add('hidden');
      grid.classList.remove('hidden');
      label.textContent = 'Slide View';
      this.renderGridView();
    } else {
      deck.classList.remove('hidden');
      footer.classList.remove('hidden');
      grid.classList.add('hidden');
      label.textContent = 'Grid View';
      this.renderActiveSlide();
    }
    this.renderIcons();
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        this.showToast('Fullscreen mode not available', 'alert');
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  },

  async handleFormSubmit() {
    const productInput = document.getElementById('productUrl').value.trim();
    const priceInput = document.getElementById('priceInput').value.trim();
    const rationaleInput = document.getElementById('rationaleInput').value.trim();

    if (!productInput) {
      this.showToast('Please enter a product URL or item name', 'alert');
      return;
    }

    if (!this.apiKey && !this.proxyUrl) {
      // If no API key and no proxy configured, prompt user or use demo
      document.getElementById('apiKeyModal').classList.remove('hidden');
      this.showToast('Please provide a Google Gemini API Key first (or click Try Demo)', 'alert');
      return;
    }

    this.showLoading();

    try {
      const presentation = await this.generateDissuasionDeck(productInput, priceInput, rationaleInput);
      this.loadPresentation(presentation);
    } catch (err) {
      console.error(err);
      this.showToast(`Generation failed: ${err.message}`, 'alert');
      this.resetToHome();
    }
  },

  showLoading() {
    document.getElementById('inputSection').classList.add('hidden');
    document.getElementById('presentationSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.remove('hidden');

    const steps = [
      { id: 'step1', delay: 1000 },
      { id: 'step2', delay: 2800 },
      { id: 'step3', delay: 4800 }
    ];

    steps.forEach(({ id, delay }) => {
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.querySelector('i')?.setAttribute('data-lucide', 'check-circle');
          el.querySelector('i')?.classList.add('text-rose-500');
          el.querySelector('i')?.classList.remove('text-amber-500', 'animate-spin');
          this.renderIcons();
        }
      }, delay);
    });
  },

  async generateDissuasionDeck(productInput, price, rationale) {
    const promptText = `
You are the world's most relentless, rational, financially savvy, and sharp-witted consumer advocate.
Your mission: "Talk Me Out Of It". A user is on the verge of buying something on impulse.
You must construct a comprehensive, rigorous, 6-slide presentation designed to talk them completely out of making this purchase using rock-solid logic, financial opportunity costs, psychological bias callouts, and brutal practical reality checks.

User Input:
- Product URL or Name: "${productInput}"
${price ? `- Estimated Price: "${price}"` : ''}
${rationale ? `- User's Temptation / Justification: "${rationale}"` : ''}

You MUST output ONLY valid JSON without any markdown code fences or backticks.
The JSON must adhere precisely to this structure:
{
  "itemName": "Specific Clean Name of the product or item",
  "estimatedPrice": "Estimated price with currency (e.g. $499)",
  "regretRisk": 92,
  "verdict": "Short punchy verdict (e.g. Severe Buyer's Remorse Imminent)",
  "bottomLine": "2-3 sentences of executive summary summarizing why they must not buy this.",
  "slides": [
    {
      "slideNumber": 1,
      "category": "Reality vs. Fantasy",
      "headline": "Punchy title exposing the contrast between the marketing fantasy and mundane reality",
      "keyPoint": "The core unvarnished truth",
      "arguments": [
        "First specific observation of how marketing inflates expectations",
        "Second realistic breakdown of everyday friction, annoyance, or hassle",
        "Third reality check on what this will actually feel like after 3 weeks"
      ],
      "burnQuote": "A sharp, witty, memorable quote delivering a cold shower of logic."
    },
    {
      "slideNumber": 2,
      "category": "The Real Cost",
      "headline": "Hidden Costs, Subscriptions, Depreciation & Maintenance",
      "keyPoint": "The sticker price is just the tip of the iceberg",
      "arguments": [
        "Hidden accessories, required peripherals, or recurring subscriptions",
        "Depreciation speed and resale value collapse",
        "True cost-per-actual-use calculation that exposes terrible value"
      ],
      "burnQuote": "A biting comment on the financial leakage."
    },
    {
      "slideNumber": 3,
      "category": "Opportunity Cost",
      "headline": "What Else Could This Exact Capital Accomplish?",
      "keyPoint": "Comparing this transient purchase against enduring wealth or real experiences",
      "arguments": [
        "Compound growth calculation if invested in index funds (S&P 500) over 5-10 years",
        "Alternative real-world experiences (travel, life upgrades, freedom fund) this money buys instead",
        "The psychological peace of keeping liquid money in an emergency reserve"
      ],
      "burnQuote": "A quote framing spending money as trading life energy."
    },
    {
      "slideNumber": 4,
      "category": "Cheaper Alternatives",
      "headline": "The 80/20 Solution: 80% of Joy for 10% of Cost",
      "keyPoint": "You do not need the top-tier luxury version to solve your actual problem",
      "arguments": [
        "Concrete alternative #1: An existing tool or budget product that solves the core need",
        "Concrete alternative #2: A secondhand, refurbished, or borrow/rent strategy",
        "Why the marginal extra features of the expensive model are almost never used"
      ],
      "burnQuote": "A sharp comparison on diminishing returns."
    },
    {
      "slideNumber": 5,
      "category": "Cognitive Bias Callout",
      "headline": "The Psychological Manipulation at Play",
      "keyPoint": "Exposing the cognitive bias or retail trick hijacking your brain",
      "arguments": [
        "Specific bias identification: Aspirational Identity Bias, Diderot Effect, FOMO, or Retail Therapy",
        "How retail marketing exploits dopamine anticipation over actual ownership satisfaction",
        "Why buying the equipment does not equal acquiring the habit, discipline, or talent"
      ],
      "burnQuote": "A punchy wake-up call about self-identity and consumerism."
    },
    {
      "slideNumber": 6,
      "category": "The 72-Hour Challenge",
      "headline": "Action Plan: The Cooling-Off Protocol",
      "keyPoint": "Three concrete steps to guarantee you never make an impulse regret purchase",
      "arguments": [
        "Step 1: Wait 72 hours with a calendar reminder. If the urge fades, you just saved 100%",
        "Step 2: A practical zero-cost trial (borrow from a friend, test in-store, or use existing equipment)",
        "Step 3: Transfer the purchase amount directly to your savings/investment account right now"
      ],
      "burnQuote": "A motivating closing reminder of the power of self-mastery."
    }
  ]
}

Make the points specific, sharp, logical, grounded, and deeply persuasive.
Do NOT include any introduction, conversational filler, or markdown wrappers. Output only the pure JSON.
`;

    // 1. If PROXY_API_URL is configured and user hasn't provided a custom key, use the proxy
    if (this.proxyUrl && !this.apiKey) {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: promptText })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Proxy returned HTTP ${response.status}`);
      }

      const parsed = await response.json();
      if (!parsed.slides || !Array.isArray(parsed.slides)) {
        throw new Error('Invalid presentation structure returned from proxy.');
      }
      return parsed;
    }

    // 2. Otherwise, use user's personal key directly via Google Generative Language API
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: promptText }]
              }
            ],
            generationConfig: {
              temperature: 0.6,
              topK: 40,
              topP: 0.95
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status} from Gemini API`;
          throw new Error(errMsg);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
          throw new Error('No content returned from Gemini API.');
        }

        // Clean JSON output (strip backticks or markdown fences if present)
        const cleaned = textResponse
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        const parsed = JSON.parse(cleaned);
        if (!parsed.slides || !Array.isArray(parsed.slides)) {
          throw new Error('Invalid presentation structure returned.');
        }

        return parsed;
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} attempt failed:`, err);
        // Continue to next model if available
      }
    }

    throw lastError || new Error('Failed to generate presentation deck.');
  },

  loadPresentation(presentation) {
    this.currentPresentation = presentation;
    this.currentSlideIndex = 0;
    this.isGridView = false;

    // Update Header Metadata
    document.getElementById('presentationItemTitle').textContent = presentation.itemName || 'Item Analysis';
    document.getElementById('presentationItemPrice').textContent = presentation.estimatedPrice || '';
    
    const riskBadge = document.getElementById('presentationVerdictBadge');
    const riskScore = presentation.regretRisk || 85;
    riskBadge.textContent = `${riskScore}% Regret Risk • ${presentation.verdict || 'High Risk'}`;
    
    if (riskScore >= 80) {
      riskBadge.className = 'px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-sans text-[10px] uppercase font-bold tracking-wider';
    } else if (riskScore >= 50) {
      riskBadge.className = 'px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-sans text-[10px] uppercase font-bold tracking-wider';
    } else {
      riskBadge.className = 'px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-sans text-[10px] uppercase font-bold tracking-wider';
    }

    // Update Bottom Line Verdict
    document.getElementById('bottomLineText').textContent = presentation.bottomLine || 
      'Put the credit card back. Financial freedom is vastly superior to temporary retail dopamine.';

    // Switch Views
    document.getElementById('inputSection').classList.add('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('presentationSection').classList.remove('hidden');

    // Ensure Deck is visible and Grid is hidden
    document.getElementById('deckContainer').classList.remove('hidden');
    document.getElementById('deckFooter').classList.remove('hidden');
    document.getElementById('gridViewContainer').classList.add('hidden');
    document.getElementById('viewModeLabel').textContent = 'Grid View';

    this.renderSlideDots();
    this.renderActiveSlide();
    this.renderIcons();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderSlideDots() {
    const dotsContainer = document.getElementById('slideDots');
    dotsContainer.innerHTML = '';

    if (!this.currentPresentation?.slides) return;

    this.currentPresentation.slides.forEach((slide, idx) => {
      const dot = document.createElement('button');
      dot.className = `slide-dot ${idx === this.currentSlideIndex ? 'active' : ''}`;
      dot.title = `Slide ${idx + 1}: ${slide.category}`;
      dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
      dot.addEventListener('click', () => {
        this.goToSlide(idx);
      });
      dotsContainer.appendChild(dot);
    });
  },

  goToSlide(index) {
    if (!this.currentPresentation?.slides) return;
    if (index < 0 || index >= this.currentPresentation.slides.length) return;
    
    const direction = index > this.currentSlideIndex ? 1 : -1;
    this.currentSlideIndex = index;
    this.renderActiveSlide(direction);
    this.playBlip('slide');
  },

  navigateSlide(step) {
    if (!this.currentPresentation?.slides) return;
    const nextIndex = this.currentSlideIndex + step;
    if (nextIndex >= 0 && nextIndex < this.currentPresentation.slides.length) {
      this.currentSlideIndex = nextIndex;
      this.renderActiveSlide(step);
      this.playBlip('slide');
    }
  },

  renderActiveSlide(direction = 1) {
    const slide = this.currentPresentation?.slides[this.currentSlideIndex];
    if (!slide) return;

    const totalSlides = this.currentPresentation.slides.length;
    const card = document.getElementById('activeSlideCard');

    // Slide animation class
    card.classList.remove('slide-enter-active', 'slide-enter-prev-active');
    void card.offsetWidth; // trigger reflow
    card.classList.add(direction > 0 ? 'slide-enter-active' : 'slide-enter-prev-active');

    // Slide category icons mapping
    const categoryIcons = {
      "Reality vs. Fantasy": "sparkles",
      "The Real Cost": "calculator",
      "Opportunity Cost": "trending-up",
      "Cheaper Alternatives": "refresh-cw",
      "Cognitive Bias Callout": "brain",
      "The 72-Hour Challenge": "clock"
    };
    const iconName = categoryIcons[slide.category] || "shield-alert";

    card.innerHTML = `
      <div class="slide-accent-border">
        <!-- Slide Header Badge -->
        <div class="flex items-center justify-between gap-4 mb-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-700 text-xs font-mono font-semibold uppercase tracking-wider">
            <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
            <span>${slide.category}</span>
          </div>
          <span class="text-xs font-mono text-slate-500 font-semibold">
            PART ${slide.slideNumber} / ${totalSlides}
          </span>
        </div>

        <!-- Headline & Key Point -->
        <h3 class="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-3 leading-tight">
          ${slide.headline}
        </h3>
        
        <p class="text-base sm:text-lg text-rose-700 font-semibold mb-6">
          ${slide.keyPoint}
        </p>

        <!-- Bullet Arguments -->
        <div class="space-y-3 mb-6">
          ${slide.arguments.map(arg => `
            <div class="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm sm:text-base text-slate-800 shadow-sm">
              <span class="text-rose-600 font-bold shrink-0 mt-0.5">•</span>
              <span class="leading-relaxed">${arg}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Burn Quote / Reality Check Callout -->
      <div class="mt-4 pt-4 border-t border-slate-200 flex items-start gap-3 bg-rose-50/80 p-4 rounded-2xl border-l-4 border-rose-500">
        <span class="text-2xl">🧊</span>
        <div>
          <span class="text-[10px] font-mono uppercase tracking-wider text-rose-700 font-bold block mb-0.5">Cold Reality Check</span>
          <p class="text-xs sm:text-sm italic text-slate-800 font-serif">
            "${slide.burnQuote}"
          </p>
        </div>
      </div>
    `;

    // Update Counter & Controls
    document.getElementById('slideCounter').textContent = `Slide ${this.currentSlideIndex + 1} of ${totalSlides}`;
    document.getElementById('prevSlideBtn').disabled = this.currentSlideIndex === 0;
    document.getElementById('nextSlideBtn').disabled = this.currentSlideIndex === totalSlides - 1;

    // Update Dots
    const dots = document.querySelectorAll('.slide-dot');
    dots.forEach((dot, idx) => {
      if (idx === this.currentSlideIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    this.renderIcons();
  },

  renderGridView() {
    const grid = document.getElementById('gridViewContainer');
    if (!this.currentPresentation?.slides) return;

    grid.innerHTML = this.currentPresentation.slides.map((slide, idx) => `
      <div class="grid-slide-card bg-white border border-slate-200 rounded-2xl p-5 shadow-md flex flex-col justify-between hover:border-slate-300 transition">
        <div>
          <div class="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
            <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">${slide.category}</span>
            <span class="font-bold">#${idx + 1}</span>
          </div>
          <h4 class="text-lg font-bold text-slate-900 mb-2 leading-snug">${slide.headline}</h4>
          <p class="text-xs text-rose-700 font-semibold mb-4">${slide.keyPoint}</p>
          <ul class="space-y-2 mb-4">
            ${slide.arguments.map(arg => `
              <li class="text-xs text-slate-700 flex items-start gap-2">
                <span class="text-rose-600 font-bold shrink-0">•</span>
                <span>${arg}</span>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="pt-3 border-t border-slate-100 text-xs italic text-slate-700 bg-rose-50/70 p-2.5 rounded-lg border-l-2 border-rose-500">
          "${slide.burnQuote}"
        </div>
      </div>
    `).join('');

    this.renderIcons();
  },

  sharePresentation() {
    if (!this.currentPresentation) return;

    const { itemName, estimatedPrice, regretRisk, verdict, bottomLine, slides } = this.currentPresentation;
    let text = `🛑 TALK ME OUT OF IT: ${itemName} (${estimatedPrice || 'Impulse Buy'})\n`;
    text += `Regret Risk: ${regretRisk}% | Verdict: ${verdict}\n\n`;
    text += `Bottom Line: ${bottomLine}\n\n`;
    text += `=== 6-SLIDE LOGICAL DISSUASION ===\n\n`;

    slides.forEach((s) => {
      text += `[Slide ${s.slideNumber}: ${s.category}]\n`;
      text += `${s.headline}\n`;
      text += `${s.keyPoint}\n`;
      s.arguments.forEach(arg => {
        text += `- ${arg}\n`;
      });
      text += `Reality Check: "${s.burnQuote}"\n\n`;
    });

    text += `Generated with "Talk Me Out Of It" — Powered by Google Gemini.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('Presentation summary copied to clipboard!', 'check');
      }).catch(() => {
        this.fallbackShare(text);
      });
    } else {
      this.fallbackShare(text);
    }
  },

  fallbackShare(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.showToast('Presentation copied to clipboard!', 'check');
    } catch (e) {
      this.showToast('Please copy text manually', 'info');
    }
    document.body.removeChild(textarea);
  }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
