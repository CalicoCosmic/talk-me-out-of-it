/**
 * Cloudflare Worker Proxy for "Talk Me Out Of It"
 * Securely wraps the Google Gemini API with CORS protection and secret key management.
 */

const ALLOWED_ORIGINS = [
  'https://calicocosmic.github.io',
  'http://localhost:8000',
  'http://localhost:3000',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:5500'
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.endsWith('.github.io'));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(request);

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({
          error: 'GEMINI_API_KEY is not configured in the worker environment.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await request.json().catch(() => null);
      if (!body || !body.prompt) {
        return new Response(JSON.stringify({ error: 'Missing "prompt" field in request body.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Dynamic model discovery for worker
      let resolvedEndpoints = [];
      try {
        const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (listResp.ok) {
          const listData = await listResp.json();
          const available = (listData.models || []).filter(m => 
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
          );
          available.sort((a, b) => {
            const score = (n) => (n.includes('2.0-flash') ? 4 : (n.includes('flash-latest') ? 3 : (n.includes('flash') ? 2 : 1)));
            return score(b.name.toLowerCase()) - score(a.name.toLowerCase());
          });
          resolvedEndpoints = available.map(m => `https://generativelanguage.googleapis.com/v1beta/${m.name}:generateContent?key=${apiKey}`);
        }
      } catch (e) {
        console.warn('Could not auto-fetch model list in worker:', e);
      }

      if (resolvedEndpoints.length === 0) {
        const candidateModels = [
          'gemini-2.0-flash',
          'gemini-1.5-flash-latest',
          'gemini-2.0-flash-exp',
          'gemini-1.5-flash',
          'gemini-1.5-pro-latest'
        ];
        resolvedEndpoints = [
          ...candidateModels.map(m => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`),
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`
        ];
      }

      let lastError = null;

      for (const geminiUrl of resolvedEndpoints) {
        try {
          const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: body.prompt }] }],
              generationConfig: {
                temperature: 0.6,
                topK: 40,
                topP: 0.95
              }
            })
          });

          if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            throw new Error(`Gemini API HTTP ${geminiResponse.status}: ${errText}`);
          }

          const geminiData = await geminiResponse.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!rawText) {
            throw new Error('Gemini API returned empty response.');
          }

          // Clean markdown JSON wrapper
          const cleanedText = rawText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

          const parsedData = JSON.parse(cleanedText);

          return new Response(JSON.stringify(parsedData), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        } catch (err) {
          lastError = err;
          console.warn(`Endpoint attempt failed: ${geminiUrl}`, err);
        }
      }

      throw lastError || new Error('Failed to generate content from Gemini API.');
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || 'Internal server error.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
