/**
 * Demo Initialization Script
 * 
 * Automatically transitions the UI to a "Completed Analysis" state for demo purposes.
 * Injects mock data results, initializes visualizations, and sets up the environment
 * without requiring user interaction or actual API calls.
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[DEMO] Initializing preloaded state...');

    // 1. Hide Upload Area & Show Results
    const uploadSection = document.getElementById('quick-start');
    const resultsSection = document.getElementById('all-engines-section');
    const qualitySection = document.getElementById('quality-dashboard-section');

    if (uploadSection) uploadSection.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'block';
    if (qualitySection) qualitySection.style.display = 'none';

    // 2. Set Header Info
    const dbNameEl = document.getElementById('engines-database-name');
    if (dbNameEl) dbNameEl.textContent = 'enterprise_financial_data_q3.csv';

    const statusEl = document.getElementById('engines-status');
    if (statusEl) statusEl.textContent = 'Complete';

    const progressEl = document.getElementById('engines-progress');
    if (progressEl) progressEl.textContent = '22/22';

    const totalTimeEl = document.getElementById('engines-total-time');
    if (totalTimeEl) totalTimeEl.textContent = '34.7s';

    // 3. Wait for ES6 modules to load (with retry mechanism)
    const waitForModules = () => {
        return new Promise((resolve) => {
            const checkModules = (attempts = 0) => {
                const hasRenderFns = window.createEngineResultCard && window.displayEngineResults;
                const hasNexusViz = window.NexusViz && typeof window.NexusViz.buildVizSection === 'function';

                if (hasRenderFns && hasNexusViz) {
                    console.log('[DEMO] ES6 modules loaded successfully');
                    resolve(true);
                } else if (attempts < 50) {  // Wait up to 5 seconds (50 x 100ms)
                    setTimeout(() => checkModules(attempts + 1), 100);
                } else {
                    console.warn('[DEMO] Modules not fully loaded after 5s, using fallback rendering');
                    resolve(false);
                }
            };
            checkModules();
        });
    };

    const modulesLoaded = await waitForModules();

    // 4. Render Engine Results
    if (window.MOCK_DATA && window.MOCK_DATA.nexus && window.MOCK_DATA.nexus.engines) {
        const engines = window.MOCK_DATA.nexus.engines;
        const allContainer = document.getElementById('all-engines-results');
        const mlContainer = document.getElementById('ml-engines-results');
        const financialContainer = document.getElementById('financial-engines-results');
        const advancedContainer = document.getElementById('advanced-engines-results');

        // Engine Metadata Map (mimicking config)
        const engineMeta = {
            titan: { icon: '(AI)', category: 'ml', display: 'Titan AutoML' },
            predictive: { icon: '(Pred)', category: 'ml', display: 'Predictive Modeling' },
            clustering: { icon: '(Clust)', category: 'ml', display: 'Clustering' },
            anomaly: { icon: '(Anom)', category: 'ml', display: 'Anomaly Detection' },
            statistical: { icon: '(Stat)', category: 'ml', display: 'Statistical Analysis' },
            trend: { icon: '(Trend)', category: 'ml', display: 'Trend Analysis' },
            graphs: { icon: '(Graph)', category: 'ml', display: 'Universal Graph' },
            cost: { icon: '(Cost)', category: 'financial', display: 'Cost Optimization' },
            roi: { icon: '(ROI)', category: 'financial', display: 'ROI Prediction' },
            spend_patterns: { icon: '(Spend)', category: 'financial', display: 'Spend Patterns' },
            budget_variance: { icon: '(Budg)', category: 'financial', display: 'Budget Variance' },
            profit_margins: { icon: '(Marg)', category: 'financial', display: 'Profit Margins' },
            revenue_forecasting: { icon: '(Rev)', category: 'financial', display: 'Revenue Forecast' },
            customer_ltv: { icon: '(LTV)', category: 'financial', display: 'Customer LTV' },
            cash_flow: { icon: '(Cash)', category: 'financial', display: 'Cash Flow' },
            inventory_optimization: { icon: '(Inv)', category: 'financial', display: 'Inventory Optimization' },
            pricing_strategy: { icon: '(Price)', category: 'financial', display: 'Pricing Strategy' },
            market_basket: { icon: '(Basket)', category: 'financial', display: 'Market Basket' },
            resource_utilization: { icon: '(Res)', category: 'financial', display: 'Resource Utilization' },
            rag_evaluation: { icon: '(RAG)', category: 'advanced', display: 'RAG Evaluation' },
            chaos: { icon: '(Chaos)', category: 'advanced', display: 'Chaos Engine' },
            oracle: { icon: '(Oracle)', category: 'advanced', display: 'Oracle Causality' }
        };

        // Simulated execution times (ms) for realistic demo
        const executionTimes = {
            titan: 2100, predictive: 2500, clustering: 1800, anomaly: 1500,
            statistical: 900, trend: 1200, graphs: 1100, cost: 1400, roi: 1300,
            spend_patterns: 1600, budget_variance: 800, profit_margins: 950,
            revenue_forecasting: 2200, customer_ltv: 1700, cash_flow: 1050,
            inventory_optimization: 1400, pricing_strategy: 1250, market_basket: 1550,
            resource_utilization: 1150, rag_evaluation: 2800, chaos: 3100, oracle: 2600
        };

        // Counters for stats
        let successCount = 0;
        let index = 0;

        // Fallback card creation when modules not loaded
        function createFallbackCard(engineKey, data, config) {
            const card = document.createElement('div');
            card.className = 'engine-result-card expanded';
            card.dataset.engine = engineKey;

            const insights = data.insights || [];
            const insightsHtml = insights.length > 0
                ? `<ul style="margin: 0; padding-left: 1.25rem; color: var(--vox-grey-600); font-size: 0.9rem;">
                    ${insights.slice(0, 3).map(i => `<li>${i}</li>`).join('')}
                   </ul>`
                : '<p style="color: var(--vox-grey-500);">Analysis complete.</p>';

            card.innerHTML = `
                <div class="engine-card-header">
                    <span class="engine-status success" style="color: var(--vox-success);">&#10003;</span>
                    <h3>${config.display}</h3>
                    <span style="font-size: 0.85rem; color: var(--vox-grey-500);">${executionTimes[engineKey] || 1500}ms</span>
                </div>
                <div class="engine-card-body">
                    <div style="margin-bottom: 1rem;">
                        <strong style="color: var(--vox-grey-700);">Key Insights</strong>
                        ${insightsHtml}
                    </div>
                    ${data.accuracy ? `<p style="color: var(--vox-success); font-weight: 600;">Accuracy: ${(data.accuracy * 100).toFixed(1)}%</p>` : ''}
                    ${data.best_model ? `<p style="color: var(--vox-grey-600);">Best Model: ${data.best_model}</p>` : ''}
                    ${data.stable_features ? `<p style="color: var(--vox-grey-600); font-size: 0.9rem;">Top Features: ${data.stable_features.slice(0, 3).join(', ')}</p>` : ''}
                    ${data.n_clusters ? `<p style="color: var(--vox-grey-600);">Clusters Found: ${data.n_clusters}</p>` : ''}
                    ${data.anomalies_found !== undefined ? `<p style="color: var(--vox-warning, #f59e0b);">Anomalies Detected: ${data.anomalies_found}</p>` : ''}
                    ${data.potential_savings ? `<p style="color: var(--vox-success);">Potential Savings: $${data.potential_savings.toLocaleString()}</p>` : ''}
                    ${data.predicted_roi ? `<p style="color: var(--vox-success);">Predicted ROI: ${(data.predicted_roi * 100).toFixed(0)}%</p>` : ''}
                </div>
            `;
            return card;
        }

        // Use modular rendering if available, fallback otherwise
        if (modulesLoaded && window.createEngineResultCard && window.displayEngineResults) {
            // Full modular rendering with charts
            Object.entries(engines).forEach(([key, data]) => {
                const config = engineMeta[key] || { icon: '(AI)', category: 'ml', display: data.engine };
                const engineDef = { name: key, ...config };
                const duration = executionTimes[key] || 1500;

                // Create card for 'all' container
                const card = window.createEngineResultCard(engineDef, index, 'all');
                if (allContainer) allContainer.appendChild(card);

                // Create card for category container
                const categoryContainer = config.category === 'ml' ? mlContainer :
                    config.category === 'financial' ? financialContainer :
                        advancedContainer;

                const categoryCard = window.createEngineResultCard(engineDef, index, config.category);
                if (categoryContainer) categoryContainer.appendChild(categoryCard);

                // Build result object matching displayEngineResults expectations
                const fullResult = {
                    status: 'success',
                    duration: duration,
                    dataSize: 15000 * 14, // ~210KB simulated
                    gemmaSummary: data.insights ? data.insights.join(' ') : 'Analysis complete. Review the details below for key insights.',
                    data: data
                };

                // Display results with staggered timing for smooth loading
                setTimeout(() => {
                    window.displayEngineResults(card, fullResult);
                    if (categoryCard) window.displayEngineResults(categoryCard, fullResult);
                }, index * 50);

                successCount++;
                index++;
            });
        } else {
            // Fallback rendering without charts
            console.log('[DEMO] Using fallback rendering (no charts)');
            Object.entries(engines).forEach(([key, data]) => {
                const config = engineMeta[key] || { icon: '(AI)', category: 'ml', display: data.engine || key };

                // Create fallback card for 'all' container
                const card = createFallbackCard(key, data, config);
                if (allContainer) allContainer.appendChild(card);

                // Create card for category container
                const categoryContainer = config.category === 'ml' ? mlContainer :
                    config.category === 'financial' ? financialContainer :
                        advancedContainer;

                if (categoryContainer) {
                    const categoryCard = createFallbackCard(key, data, config);
                    categoryContainer.appendChild(categoryCard);
                }

                successCount++;
            });
        }

        // Update category stats
        document.getElementById('all-success-count').textContent = '22';
        document.getElementById('all-error-count').textContent = '0';
        document.getElementById('all-pending-count').textContent = '0';

        console.log(`[DEMO] Rendered ${successCount} engine results`);
    }

    // 5. Populate Activity Log
    const logContainer = document.getElementById('log');
    if (logContainer) {
        const logs = [
            { time: '0ms', msg: 'Initializing analysis pipeline...', type: 'info' },
            { time: '150ms', msg: 'Uploaded: enterprise_financial_data_q3.csv', type: 'success' },
            { time: '400ms', msg: 'Schema detected: 14 columns, 15,000 rows', type: 'info' },
            { time: '800ms', msg: 'Starting Titan AutoML...', type: 'info' },
            { time: '2.9s', msg: 'Titan AutoML complete (94.2% accuracy)', type: 'success' },
            { time: '4.7s', msg: 'Clustering complete (4 segments found)', type: 'success' },
            { time: '6.2s', msg: 'Anomaly Detection complete (12 anomalies)', type: 'success' },
            { time: '8.4s', msg: 'Statistical Analysis complete', type: 'success' },
            { time: '12.1s', msg: 'Financial Intelligence (12 engines) started...', type: 'info' },
            { time: '22.5s', msg: 'Financial engines complete', type: 'success' },
            { time: '25.0s', msg: 'Advanced AI Lab (3 engines) started...', type: 'info' },
            { time: '33.6s', msg: 'RAG Evaluation, Chaos, Oracle complete', type: 'success' },
            { time: '34.0s', msg: 'Starting Gemma 4B summarization...', type: 'info' },
            { time: '34.7s', msg: 'All 22 engines complete!', type: 'success' }
        ];

        logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            let color = 'var(--vox-grey-600)';
            if (log.type === 'success') color = 'var(--vox-success)';
            if (log.type === 'error') color = 'var(--vox-error)';

            entry.innerHTML = `<span style="color: var(--vox-grey-400); margin-right: 8px;">[${log.time}]</span><span style="color: ${color}">${log.msg}</span>`;
            logContainer.appendChild(entry);
        });
    }

    // 6. Initialize Dashboard Visualizations
    setTimeout(() => {
        if (window.NexusDashboard && typeof window.NexusDashboard.initDashboard === 'function') {
            window.NexusDashboard.initDashboard();

            const mockEngineData = [
                { name: 'titan', display: 'Titan AutoML', category: 'ml', duration: 2100, status: 'success', dataSize: 15000 },
                { name: 'clustering', display: 'Clustering', category: 'ml', duration: 1800, status: 'success', dataSize: 12000 },
                { name: 'anomaly', display: 'Anomaly Detection', category: 'ml', duration: 1500, status: 'success', dataSize: 8000 },
                { name: 'statistical', display: 'Statistical', category: 'ml', duration: 900, status: 'success', dataSize: 5000 },
                { name: 'trend', display: 'Trend Analysis', category: 'ml', duration: 1200, status: 'success', dataSize: 7000 },
                { name: 'predictive', display: 'Predictive', category: 'ml', duration: 2500, status: 'success', dataSize: 18000 },
                { name: 'graphs', display: 'Universal Graph', category: 'ml', duration: 1100, status: 'success', dataSize: 9000 },
                { name: 'cost', display: 'Cost Optimization', category: 'financial', duration: 1400, status: 'success', dataSize: 11000 },
                { name: 'roi', display: 'ROI Prediction', category: 'financial', duration: 1300, status: 'success', dataSize: 10000 },
                { name: 'spend_patterns', display: 'Spend Patterns', category: 'financial', duration: 1600, status: 'success', dataSize: 13000 },
                { name: 'budget_variance', display: 'Budget Variance', category: 'financial', duration: 800, status: 'success', dataSize: 6000 },
                { name: 'profit_margins', display: 'Profit Margins', category: 'financial', duration: 950, status: 'success', dataSize: 5500 },
                { name: 'revenue_forecasting', display: 'Revenue Forecast', category: 'financial', duration: 2200, status: 'success', dataSize: 16000 },
                { name: 'customer_ltv', display: 'Customer LTV', category: 'financial', duration: 1700, status: 'success', dataSize: 14000 },
                { name: 'cash_flow', display: 'Cash Flow', category: 'financial', duration: 1050, status: 'success', dataSize: 8500 },
                { name: 'inventory_optimization', display: 'Inventory', category: 'financial', duration: 1400, status: 'success', dataSize: 11500 },
                { name: 'pricing_strategy', display: 'Pricing Strategy', category: 'financial', duration: 1250, status: 'success', dataSize: 9500 },
                { name: 'market_basket', display: 'Market Basket', category: 'financial', duration: 1550, status: 'success', dataSize: 12500 },
                { name: 'resource_utilization', display: 'Resource Util', category: 'financial', duration: 1150, status: 'success', dataSize: 8800 },
                { name: 'rag_evaluation', display: 'RAG Evaluation', category: 'advanced', duration: 2800, status: 'success', dataSize: 20000 },
                { name: 'chaos', display: 'Chaos Engine', category: 'advanced', duration: 3100, status: 'success', dataSize: 22000 },
                { name: 'oracle', display: 'Oracle Causality', category: 'advanced', duration: 2600, status: 'success', dataSize: 19000 }
            ];

            mockEngineData.forEach(engine => {
                window.NexusDashboard.trackEnginePerformance(engine, engine.duration, engine.status, engine.dataSize);
            });

            console.log('[DEMO] Dashboard visualizations initialized');
        } else {
            console.warn('[DEMO] NexusDashboard not available');
        }
    }, 1500);

    console.log('[DEMO] Nexus demo initialization complete');
});
