/**
 * Mock Data for Static Demo (Comprehensive)
 * Contains rich sample data for Nexus Engines, Salesforce, Fiserv, and Gemma.
 */

const MOCK_DATA = {
    // =========================================================================
    // SYSTEM HEALTH & GEMMA STATS
    // =========================================================================
    health: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            gemma: 'healthy',
            transcription: 'healthy',
            database: 'connected',
            salesforce: 'connected',
            fiserv: 'connected'
        }
    },

    gemmaStats: {
        model: 'Gemma 3 4B (Q4_K_M)',
        status: 'loaded',
        vram_usage_mb: 4096,
        context_length: 8192,
        inference_speed_tok_sec: 42.5
    },

    // =========================================================================
    // NEXUS INTELLIGENCE ENGINE RESULTS (22 Engines)
    // =========================================================================
    nexus: {
        engines: {
            // --- ML & Analytics (7) ---
            titan: {
                engine: 'Titan AutoML',
                task_type: 'classification',
                best_model: 'XGBoost Classifier',
                accuracy: 0.942,
                auc: 0.96,
                target_column: 'churn_risk',
                stable_features: ['account_age', 'transaction_volume', 'customer_sentiment'],
                insights: [
                    "Model achieved 94.2% accuracy on validation set.",
                    "Primary driver of churn is 'low_engagement' in the first 30 days.",
                    "Recommended action: Retarget users with account_age < 30 days."
                ],
                feature_importance: [
                    { feature: 'account_age', importance: 0.35, stability: 85 },
                    { feature: 'transaction_volume', importance: 0.25, stability: 92 },
                    { feature: 'customer_sentiment', importance: 0.15, stability: 78 },
                    { feature: 'last_login', importance: 0.10, stability: 60 },
                    { feature: 'support_tickets', importance: 0.08, stability: 55 },
                    { feature: 'demographics', importance: 0.05, stability: 40 },
                    { feature: 'device_type', importance: 0.02, stability: 30 }
                ]
            },
            predictive: {
                engine: 'Predictive Modeling',
                task_type: 'regression',
                target_column: 'next_month_spend',
                r2_score: 0.88,
                mae: 124.50,
                insights: [
                    "Strong correlation between 'previous_month_spend' and target.",
                    "Outliers detected in high-net-worth segment."
                ],
                // Forecast visualization data
                historical_dates: ['2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06'],
                historical_values: [100, 120, 130, 150, 140, 160],
                forecast_dates: ['2023-07', '2023-08', '2023-09', '2023-10'],
                forecast_values: [175, 190, 210, 230],
                lower_bound: [170, 180, 195, 215],
                upper_bound: [180, 200, 225, 245]
            },
            clustering: {
                engine: 'Clustering',
                task_type: 'clustering',
                n_clusters: 4,
                silhouette_score: 0.72,
                insights: [
                    "Identified 4 distinct customer segments.",
                    "Cluster 2 (High Value, Low Risk) represents 15% of the base."
                ],
                // Labels for cluster generation
                labels: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3],
                // PCA 3D visualization data
                pca_3d: {
                    explained_variance: [0.45, 0.28, 0.15],
                    total_variance_explained: 0.88,
                    points: [
                        { x: 2.1, y: 1.5, z: 0.3, cluster: 0 }, { x: 2.3, y: 1.2, z: 0.5, cluster: 0 },
                        { x: 1.8, y: 1.8, z: 0.2, cluster: 0 }, { x: 2.5, y: 1.4, z: 0.4, cluster: 0 },
                        { x: 2.0, y: 1.6, z: 0.6, cluster: 0 }, { x: -1.5, y: 2.2, z: -0.5, cluster: 1 },
                        { x: -1.8, y: 2.5, z: -0.3, cluster: 1 }, { x: -1.2, y: 2.0, z: -0.7, cluster: 1 },
                        { x: -1.6, y: 2.3, z: -0.4, cluster: 1 }, { x: -1.4, y: 2.1, z: -0.6, cluster: 1 },
                        { x: 0.5, y: -2.0, z: 1.5, cluster: 2 }, { x: 0.3, y: -1.8, z: 1.3, cluster: 2 },
                        { x: 0.7, y: -2.2, z: 1.7, cluster: 2 }, { x: 0.4, y: -1.9, z: 1.4, cluster: 2 },
                        { x: -2.0, y: -1.5, z: -1.0, cluster: 3 }, { x: -2.2, y: -1.3, z: -0.8, cluster: 3 },
                        { x: -1.8, y: -1.7, z: -1.2, cluster: 3 }, { x: -2.1, y: -1.4, z: -0.9, cluster: 3 },
                        { x: -1.9, y: -1.6, z: -1.1, cluster: 3 }, { x: -2.3, y: -1.2, z: -0.7, cluster: 3 }
                    ]
                },
                cluster_profiles: [
                    { cluster_id: 0, size: 5, percentage: 25, feature_stats: { spend: { mean: 450, std: 120 }, tenure: { mean: 24, std: 8 } } },
                    { cluster_id: 1, size: 5, percentage: 25, feature_stats: { spend: { mean: 180, std: 45 }, tenure: { mean: 6, std: 3 } } },
                    { cluster_id: 2, size: 4, percentage: 20, feature_stats: { spend: { mean: 850, std: 200 }, tenure: { mean: 48, std: 12 } } },
                    { cluster_id: 3, size: 6, percentage: 30, feature_stats: { spend: { mean: 320, std: 80 }, tenure: { mean: 12, std: 5 } } }
                ]
            },
            anomaly: {
                engine: 'Anomaly Detection',
                anomalies_found: 12,
                contamination: 0.05,
                insights: [
                    "Detected 12 interactions deviating >3 sigma from mean.",
                    "Most anomalies occurred on weekends."
                ],
                // Anomaly score distribution data
                scores: Array.from({ length: 100 }, () => Math.random() * 0.8).concat(
                    Array.from({ length: 12 }, () => 0.85 + Math.random() * 0.15)
                ),
                threshold: 0.75,
                anomaly_indices: [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111]
            },
            statistical: {
                engine: 'Statistical Analysis',
                insights: ["Strong positive correlation (0.82) between spend and income."],
                correlations: [
                    { f1: 'age', f2: 'income', corr: 0.45 },
                    { f1: 'spend', f2: 'income', corr: 0.82 },
                    { f1: 'age', f2: 'spend', corr: 0.38 },
                    { f1: 'tenure', f2: 'spend', corr: 0.65 },
                    { f1: 'tenure', f2: 'income', corr: 0.52 }
                ],
                // Use column_stats which is what statistical.js looks for
                column_stats: {
                    age: { min: 18, q1: 28, median: 35, q3: 48, max: 72, mean: 38.5 },
                    income: { min: 25000, q1: 45000, median: 65000, q3: 95000, max: 250000, mean: 72000 },
                    spend: { min: 50, q1: 150, median: 320, q3: 580, max: 1500, mean: 380 },
                    tenure: { min: 1, q1: 6, median: 18, q3: 36, max: 72, mean: 22 },
                    engagement: { min: 10, q1: 35, median: 55, q3: 75, max: 100, mean: 58 }
                }
            },
            trend: {
                engine: 'Trend Analysis',
                trend_direction: 'upward',
                seasonality: 'weekly',
                confidence: 'high',
                insights: ["Revenue trending up 5% week-over-week."],
                // Trend visualization data at top level (what trend.js expects)
                dates: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
                values: [100, 108, 115, 125, 128, 140, 148, 160],
                trend_line: [102, 110, 118, 126, 134, 142, 150, 158]
            },
            graphs: {
                engine: 'Universal Graph',
                nodes: 150,
                edges: 400,
                density: 0.03,
                insights: ["High centrality detected in node 'Product_A'."],
                // Network visualization data
                network_data: {
                    nodes: [
                        { id: 'Product_A', group: 1, size: 25, centrality: 0.92 },
                        { id: 'Product_B', group: 1, size: 18, centrality: 0.65 },
                        { id: 'Product_C', group: 2, size: 15, centrality: 0.48 },
                        { id: 'Customer_1', group: 3, size: 12, centrality: 0.35 },
                        { id: 'Customer_2', group: 3, size: 10, centrality: 0.28 },
                        { id: 'Channel_Web', group: 4, size: 20, centrality: 0.78 },
                        { id: 'Channel_Mobile', group: 4, size: 16, centrality: 0.55 }
                    ],
                    edges: [
                        { source: 'Product_A', target: 'Customer_1', weight: 5 },
                        { source: 'Product_A', target: 'Customer_2', weight: 3 },
                        { source: 'Product_A', target: 'Channel_Web', weight: 8 },
                        { source: 'Product_B', target: 'Customer_1', weight: 4 },
                        { source: 'Product_B', target: 'Channel_Mobile', weight: 6 },
                        { source: 'Product_C', target: 'Customer_2', weight: 2 },
                        { source: 'Channel_Web', target: 'Channel_Mobile', weight: 4 }
                    ]
                }
            },

            // --- Financial Intelligence (12) ---
            cost: {
                engine: 'Cost Optimization',
                potential_savings: 125000,
                insights: ["Unused licenses costing $15k/month detected."],
                // cost.js expects: cost_breakdown[] with {name, value}
                cost_breakdown: [
                    { name: 'Software Licenses', value: 45000 },
                    { name: 'Cloud Infrastructure', value: 35000 },
                    { name: 'Hardware', value: 25000 },
                    { name: 'Support', value: 12000 },
                    { name: 'Training', value: 8000 }
                ]
            },
            roi: {
                engine: 'ROI Prediction',
                predicted_roi: 2.45,
                payback_period_months: 4.5,
                insights: ["Project Alpha shows highest ROI potential (245%)."],
                // roi.js expects: sensitivity[] with {name, impact}
                sensitivity: [
                    { name: 'Revenue Growth', impact: 25 },
                    { name: 'Cost Reduction', impact: 18 },
                    { name: 'Market Share', impact: -15 },
                    { name: 'Efficiency', impact: 12 },
                    { name: 'Pricing', impact: -10 }
                ]
            },
            spend_patterns: {
                engine: 'Spend Patterns',
                monthly_growth: 0.02,
                top_category: 'Marketing',
                insights: ["Marketing spend marked as seasonal outlier in Q4."],
                // spend.js expects: categories[] with {name, amount} + periods[] + spending[]
                categories: [
                    { name: 'Marketing', amount: 35000 },
                    { name: 'Operations', amount: 28000 },
                    { name: 'R&D', amount: 42000 },
                    { name: 'Sales', amount: 25000 },
                    { name: 'Admin', amount: 15000 }
                ],
                periods: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                spending: [120000, 125000, 130000, 128000, 142000, 145000]
            },
            budget_variance: {
                engine: 'Budget Variance',
                total_variance_pct: -5.2,
                status: 'under_budget',
                actual: 440800,
                budget: 450000,
                insights: ["IT operations running 5.2% under budget."],
                // budget.js expects: variances[] with {category, variance}
                variances: [
                    { category: 'IT', variance: -5200, measure: 'relative' },
                    { category: 'Marketing', variance: 5000, measure: 'relative' },
                    { category: 'Sales', variance: -5000, measure: 'relative' },
                    { category: 'Operations', variance: -2000, measure: 'relative' },
                    { category: 'HR', variance: -2000, measure: 'relative' },
                    { category: 'Total', variance: -9200, measure: 'total' }
                ]
            },
            profit_margins: {
                engine: 'Profit Margins',
                net_margin: 0.18,
                gross_margin: 0.45,
                insights: ["Gross margins improved by 2% due to supplier renegotiation."],
                // margin.js expects: margin_breakdown[] with {name, value}
                margin_breakdown: [
                    { name: 'Product A', value: 125000 },
                    { name: 'Product B', value: 85000 },
                    { name: 'Product C', value: 45000 },
                    { name: 'Services', value: 95000 }
                ]
            },
            revenue_forecasting: {
                engine: 'Revenue Forecast',
                q4_projection: 1500000,
                confidence_interval: [1400000, 1600000],
                insights: ["95% confidence of hitting Q4 targets."],
                // forecast.js expects: historical[], forecast[], dates[], forecast_dates[], lower_bound[], upper_bound[]
                dates: ['Q1', 'Q2', 'Q3', 'Q4', 'Q1-Next', 'Q2-Next'],
                historical: [1200000, 1350000, 1420000],
                forecast: [1500000, 1620000, 1750000],
                forecast_dates: ['Q4', 'Q1-Next', 'Q2-Next'],
                lower_bound: [1400000, 1500000, 1600000],
                upper_bound: [1600000, 1740000, 1900000]
            },
            customer_ltv: {
                engine: 'Customer LTV',
                avg_ltv: 2450,
                total_ltv: 12500000,
                cac: 350,
                ltv_cac_ratio: 7.0,
                churn_rate: 0.08,
                retention_rate: 0.92,
                insights: ["LTV/CAC ratio is extremely healthy at 7.0."],
                // ltv.js expects: segments[] with {name, recency, frequency, monetary, retention, growth}
                segments: [
                    { name: 'Enterprise', recency: 95, frequency: 85, monetary: 100, retention: 98, growth: 75 },
                    { name: 'Mid-Market', recency: 75, frequency: 70, monetary: 60, retention: 85, growth: 65 },
                    { name: 'SMB', recency: 60, frequency: 55, monetary: 35, retention: 70, growth: 80 },
                    { name: 'Startup', recency: 80, frequency: 40, monetary: 20, retention: 55, growth: 95 }
                ]
            },
            cash_flow: {
                engine: 'Cash Flow',
                runway_months: 18,
                burn_rate: 150000,
                insights: ["Positive cash flow projected for next 6 months."],
                // cashflow.js expects: periods[], inflows[], outflows[]
                periods: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                inflows: [280000, 310000, 290000, 340000, 350000, 380000, 390000, 420000],
                outflows: [250000, 280000, 270000, 290000, 310000, 320000, 330000, 340000]
            },
            inventory_optimization: {
                engine: 'Inventory Optimization',
                stockout_risk: 'low',
                overstock_value: 45000,
                insights: ["Reduce 'Widget B' stock by 20% to free up cash."],
                // inventory.js expects: items[] with {name, value, turnover}
                items: [
                    { name: 'Widget A', value: 45000, turnover: 2.5 },
                    { name: 'Widget B', value: 85000, turnover: 0.8 },
                    { name: 'Widget C', value: 32000, turnover: 1.8 },
                    { name: 'Widget D', value: 18000, turnover: 3.2 },
                    { name: 'Widget E', value: 42000, turnover: 1.2 }
                ]
            },
            pricing_strategy: {
                engine: 'Pricing Strategy',
                optimal_price: 49.99,
                current_price: 54.99,
                elasticity: -1.5,
                price_range: [39.99, 69.99],
                insights: ["Demand is elastic. Lowering price to $49.99 maximizes revenue."],
                // pricing.js expects: price_elasticity[][] (2D matrix) + price_points[] + demand_levels[]
                price_elasticity: [
                    [47988, 44090, 40992, 35744, 28795],
                    [52000, 48500, 45000, 39000, 32000],
                    [55000, 51000, 47500, 41500, 34500],
                    [57000, 53000, 49500, 43000, 36000]
                ],
                price_points: [39.99, 44.99, 49.99, 54.99, 59.99],
                demand_levels: [100, 200, 300, 400]
            },
            market_basket: {
                engine: 'Market Basket',
                insights: ["Bundle 'Laptop' + 'Mouse' for 20% conversion lift."],
                // basket.js expects: rules[] with {antecedent, consequent, confidence}
                rules: [
                    { antecedent: 'Laptop', consequent: 'Mouse', confidence: 0.72 },
                    { antecedent: 'Coffee', consequent: 'Muffin', confidence: 0.58 },
                    { antecedent: 'Phone', consequent: 'Case', confidence: 0.81 },
                    { antecedent: 'Printer', consequent: 'Ink', confidence: 0.89 },
                    { antecedent: 'Camera', consequent: 'SD Card', confidence: 0.67 },
                    { antecedent: 'Monitor', consequent: 'HDMI Cable', confidence: 0.75 },
                    { antecedent: 'Keyboard', consequent: 'Mouse', confidence: 0.62 }
                ]
            },
            resource_utilization: {
                engine: 'Resource Utilization',
                bottleneck: 'Server Cluster A',
                insights: ["Server Cluster A is at 95% capacity during peak hours."],
                // resource.js expects: utilization (number 0-1) + target_utilization
                utilization: 0.78,
                target_utilization: 0.85
            },

            // --- Advanced AI Lab (3) ---
            rag_evaluation: {
                engine: 'RAG Evaluation',
                context_precision: 0.88,
                answer_relevance: 0.92,
                faithfulness: 0.95,
                insights: ["RAG pipeline is highly faithful to source documents."],
                // rag.js expects: precision, recall, f1_score, accuracy (all numbers 0-1)
                precision: 0.88,
                recall: 0.82,
                f1_score: 0.85,
                accuracy: 0.91
            },
            chaos: {
                engine: 'Chaos Engine',
                resilience_score: 0.85,
                weak_points: ['Payment Gateway Timeout'],
                insights: ["System recovered from 85% of injected faults."],
                // chaos.js expects: chaos_matrix[][] + labels[]
                labels: ['Latency', 'CPU', 'Memory', 'Disk', 'Network'],
                chaos_matrix: [
                    [1.0, 0.6, 0.3, 0.2, 0.7],
                    [0.6, 1.0, 0.5, 0.1, 0.4],
                    [0.3, 0.5, 1.0, 0.8, 0.2],
                    [0.2, 0.1, 0.8, 1.0, 0.3],
                    [0.7, 0.4, 0.2, 0.3, 1.0]
                ]
            },
            oracle: {
                engine: 'Oracle Causality',
                root_cause: 'Database Latency',
                causal_strength: 0.91,
                insights: ["Database Latency causes 91% of checkout drops."],
                // oracle.js expects: causal_factors[] with {name, effect}
                causal_factors: [
                    { name: 'Database Latency', effect: -0.91 },
                    { name: 'Cache Hit Ratio', effect: 0.75 },
                    { name: 'API Response Time', effect: -0.68 },
                    { name: 'Server Load', effect: -0.55 },
                    { name: 'CDN Performance', effect: 0.42 }
                ]
            }
        },
        qualitySettings: {
            ml_readiness: 88,
            avg_quality: 7.5,
            problem_rows: 142,
            data_points: 15000,
            recommendations: [
                "Normalize column 'income' (skewed distribution).",
                "Impute missing values in 'age' (5% missing).",
                "Remove 12 duplicate records."
            ]
        }
    },

    // =========================================================================
    // SALESFORCE AGENTIC COCKPIT
    // =========================================================================
    salesforce: {
        summary: {
            pipelineValue: 4200000, // $4.2M
            pipelineHealth: 'Healthy',
            openDeals: 15,
            hotLeads: 8
        },
        smartFeed: [
            {
                id: 1,
                type: 'alert',
                severity: 'high',
                title: 'Stalled Deal Alert',
                description: 'Opportunity "Acme Corp Expansion" has been in "Negotiation" for 14+ days.',
                action_label: 'Draft Nudge Email',
                timestamp: '10 mins ago'
            },
            {
                id: 2,
                type: 'insight',
                severity: 'medium',
                title: 'Competitor Mention',
                description: 'Email from "Globex" mentions competitor "Soylent Corp" pricing.',
                action_label: 'View Competitive Battlecard',
                timestamp: '2 hours ago'
            },
            {
                id: 3,
                type: 'success',
                severity: 'low',
                title: 'Lead Score Surge',
                description: 'Lead "Sarah Connor" engagement score jumped +40 points.',
                action_label: 'Prioritize Call',
                timestamp: '3 hours ago'
            },
            {
                id: 4,
                type: 'info',
                severity: 'low',
                title: 'Quarterly Goal',
                description: 'You are 85% to your Q3 quota with 2 weeks remaining.',
                action_label: 'View Quota',
                timestamp: '5 hours ago'
            }
        ],
        opportunities: [
            { Id: 'OP-001', Name: 'Acme Corp Expansion', StageName: 'Negotiation', Amount: 1200000, CloseDate: '2024-11-15', Probability: 80, Account: { Name: 'Acme Corp' } },
            { Id: 'OP-002', Name: 'Globex Enterprise License', StageName: 'Discovery', Amount: 850000, CloseDate: '2024-12-01', Probability: 40, Account: { Name: 'Globex' } },
            { Id: 'OP-003', Name: 'Soylent Corp Renewal', StageName: 'Closed Won', Amount: 500000, CloseDate: '2024-10-30', Probability: 100, Account: { Name: 'Soylent Corp' } },
            { Id: 'OP-004', Name: 'Initech Cloud Migration', StageName: 'Proposal', Amount: 2200000, CloseDate: '2025-01-15', Probability: 60, Account: { Name: 'Initech' } },
            { Id: 'OP-005', Name: 'Umbrella Corp Security', StageName: 'Negotiation', Amount: 3500000, CloseDate: '2024-11-20', Probability: 75, Account: { Name: 'Umbrella Corp' } }
        ],
        leads: [
            { Id: 'LE-001', Name: 'Sarah Connor', Title: 'CTO', Company: 'Skynet System', Status: 'Working', Score: 92, Email: 's.connor@skynet.com' },
            { Id: 'LE-002', Name: 'John Anderson', Title: 'Lead Dev', Company: 'MetaCortex', Status: 'New', Score: 45, Email: 'neo@metacortex.com' },
            { Id: 'LE-003', Name: 'Ellen Ripley', Title: 'Ops Manager', Company: 'Weyland-Yutani', Status: 'Nurturing', Score: 78, Email: 'ripley@weyland.com' },
            { Id: 'LE-004', Name: 'Tony Stark', Title: 'CEO', Company: 'Stark Ind', Status: 'Qualified', Score: 99, Email: 'tony@stark.com' }
        ],
        chatContext: {
            default: "Hello! I've analyzed your pipeline. You have 3 deals at risk and 2 hot leads to contact.",
            responses: {
                "email": "I've drafted an email to Sarah Connor highlighting our new security features. Would you like to review it?",
                "summary": "Your pipeline is healthy with $4.2M in open opportunities. The biggest risk is the Acme Corp deal stalling in negotiation.",
                "quota": "You are currently at 85% of your Q3 quota. Closing the Acme deal will push you to 110%."
            }
        }
    },

    // =========================================================================
    // FINANCIAL INTELLIGENCE DASHBOARD
    // =========================================================================
    banking: {
        token: { status: 'valid', expires_in_seconds: 3599 },
        usage: {
            total_calls: 850,
            calls_remaining: 150,
            usage_percent: 85,
            party_calls: 300,
            account_calls: 250,
            transaction_calls: 300
        },
        partys: [
            { party_id: 'P10001', name: 'Sarah Jenkins', email: 'sarah.j@example.com', accounts: ['A8899001', 'A8899002'] }
        ],
        accounts: {
            'A8899001': { account_id: 'A8899001', type: 'Checking', status: 'Active', balance: 15420.50, name: 'Premium Checking' },
            'A8899002': { account_id: 'A8899002', type: 'Savings', status: 'Active', balance: 45000.00, name: 'High Yield Savings' }
        },
        // Detailed transaction history for graphs
        transactions: Array.from({ length: 50 }, (_, i) => ({
            date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
            description: ['Amazon', 'Grocery', 'Salary', 'Rent', 'Gas', 'Dining', 'Utility', 'Transfer'][Math.floor(Math.random() * 8)],
            amount: (Math.random() * 500).toFixed(2),
            dr_cr: Math.random() > 0.8 ? 'CR' : 'DR' // Mostly debits
        })),

        // Chart Data Sources
        charts: {
            waterfall: {
                x: ['Gross Revenue', 'COGS', 'Gross Profit', 'OpEx', 'Taxes', 'Net Income'],
                y: [1000, -400, 600, -250, -50, 300],
                type: 'waterfall'
            },
            tornado: {
                y: ['Material Cost', 'Labor Cost', 'Exchange Rate', 'Demand', 'Price'],
                x: [20, 15, 10, -15, -25] // Sensitivity impact
            },
            treemap: {
                labels: ['Expenses', 'Fixed', 'Variable', 'Rent', 'Salaries', 'Materials', 'Marketing'],
                parents: ['', 'Expenses', 'Expenses', 'Fixed', 'Fixed', 'Variable', 'Variable'],
                values: [1000, 600, 400, 200, 400, 250, 150]
            },
            network: {
                nodes: [
                    { id: 'Checking', group: 1 }, { id: 'Savings', group: 1 },
                    { id: 'Credit Card', group: 2 }, { id: 'Loan', group: 3 }
                ],
                links: [
                    { source: 'Checking', target: 'Savings', value: 5 },
                    { source: 'Checking', target: 'Credit Card', value: 3 },
                    { source: 'Savings', target: 'Loan', value: 1 }
                ]
            },
            pricingSurface: {
                z: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => Math.random() * 100))
            }
        }
    },

    // =========================================================================
    // GEMMA AI ASSISTANT
    // =========================================================================
    gemma: {
        chatHistory: [
            { role: 'user', content: 'What are the main topics discussed today?' },
            { role: 'model', content: "Based on today's transcripts, the main topics are: 1. Q3 Roadmap Planning, 2. Database Latency Issues, and 3. New Hire Onboarding." }
        ],
        transcripts: [
            {
                id: 't_001',
                speaker: 'Customer',
                text: "I'm really frustrated with the downtime yesterday. It cost us business.",
                emotion: 'anger',
                confidence: 0.92,
                timestamp: '10:00 AM'
            },
            {
                id: 't_002',
                speaker: 'Agent',
                text: "I completely understand. We have identified the issue and pushed a fix.",
                emotion: 'empathy',
                confidence: 0.88,
                timestamp: '10:01 AM'
            },
            {
                id: 't_003',
                speaker: 'Customer',
                text: "Okay, that's good to hear. As long as it doesn't happen again.",
                emotion: 'relief',
                confidence: 0.75,
                timestamp: '10:02 AM'
            }
        ],
        analysis: {
            emotions: { joy: 35, anger: 15, neutral: 40, sadness: 5, surprise: 5 },
            speech: {
                wpm: [120, 130, 125, 140, 150, 130, 120],
                pitch: [200, 210, 205, 220, 230, 215, 200]
            }
        }
    }
};

// Export Logic
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MOCK_DATA;
} else {
    window.MOCK_DATA = MOCK_DATA;
}
