/**
 * API Mock Interceptor for Static Demo
 * Intercepts fetch requests and routes them to the comprehensive MOCK_DATA.
 */

(function () {
  console.log('⚠️ API Mocker Loaded: Intercepting network requests for DEMO MODE.');

  const originalFetch = window.fetch;

  // Helper: Simulate network delay
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  window.fetch = async function (url, options) {
    console.log(`[MOCK API] Request: ${url}`);
    await delay(500 + Math.random() * 500); // 0.5s - 1s random latency

    const urlString = url.toString();

    // =====================================================================
    // 1. NEXUS ENGINE ROUTING
    // =====================================================================
    if (urlString.includes('/api/analytics/run-engine/')) {
      const engineId = urlString.split('/').pop().toLowerCase();
      const result = window.MOCK_DATA.nexus.engines[engineId];

      if (result) {
        console.log(`[MOCK API] Returning mocked result for engine: ${engineId}`);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        console.warn(`[MOCK API] No mock data found for engine: ${engineId}, returning generic success.`);
        // Fallback generic
        return new Response(JSON.stringify({
          engine: engineId,
          status: 'completed',
          insights: ['Analysis complete (Mock Generic)']
        }), { status: 200 });
      }
    }

    // =====================================================================
    // 2. SALESFORCE ROUTING
    // =====================================================================
    if (urlString.includes('/api/v1/salesforce/opportunities')) {
      return new Response(JSON.stringify({ records: window.MOCK_DATA.salesforce.opportunities }), { status: 200 });
    }

    if (urlString.includes('/api/v1/salesforce/leads')) {
      return new Response(JSON.stringify({ records: window.MOCK_DATA.salesforce.leads }), { status: 200 });
    }

    if (urlString.includes('/api/v1/salesforce/analytics/smart-feed')) {
      return new Response(JSON.stringify(window.MOCK_DATA.salesforce.smartFeed), { status: 200 });
    }

    // =====================================================================
    // 3. FINANCIAL / FISERV ROUTING
    // =====================================================================
    if (urlString.includes('fiserv/api/v1/transactions')) {
      return new Response(JSON.stringify(window.MOCK_DATA.banking.transactions), { status: 200 });
    }

    if (urlString.includes('fiserv/api/v1/account')) {
      return new Response(JSON.stringify(window.MOCK_DATA.banking.accounts), { status: 200 });
    }

    // =====================================================================
    // 4. GEMMA / SEARCH ROUTING
    // =====================================================================
    if (urlString.includes('/api/gemma/chat')) {
      // Simple keyword matching for chat
      let responseText = "I'm not sure about that, but I can help you analyze your data.";
      const body = options?.body ? JSON.parse(options.body) : {};
      const prompt = (body.prompt || "").toLowerCase();

      if (prompt.includes('email')) responseText = window.MOCK_DATA.salesforce.chatContext.responses.email;
      else if (prompt.includes('summary')) responseText = window.MOCK_DATA.salesforce.chatContext.responses.summary;
      else if (prompt.includes('quota')) responseText = window.MOCK_DATA.salesforce.chatContext.responses.quota;

      return new Response(JSON.stringify({ response: responseText }), { status: 200 });
    }

    // =====================================================================
    // 5. ML DASHBOARD ROUTING
    // =====================================================================
    if (urlString.includes('/api/v1/ml/cross-sell')) {
      return new Response(JSON.stringify(window.MOCK_DATA.ml.cross_sell), { status: 200 });
    }

    if (urlString.includes('/api/v1/ml/churn')) {
      return new Response(JSON.stringify(window.MOCK_DATA.ml.churn), { status: 200 });
    }

    if (urlString.includes('/api/v1/ml/pricing')) {
      return new Response(JSON.stringify(window.MOCK_DATA.ml.pricing), { status: 200 });
    }

    // =====================================================================
    // 6. DEFAULT FALLBACK
    // =====================================================================
    console.log(`[MOCK API] Unhandled route: ${url}, returning 200 OK.`);
    return new Response(JSON.stringify({ status: 'ok', message: 'Mock fallback' }), { status: 200 });
  };
})();
