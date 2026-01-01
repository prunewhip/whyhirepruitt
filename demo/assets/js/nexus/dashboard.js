/**
 * NexusAI Dashboard Visualizations
 * 
 * Dashboard-level metrics and performance charts using ECharts and Plotly.
 * Provides timing gauges, category radar, success donut, and execution timeline.
 *
 * @module nexus/dashboard
 */

// ============================================================================
// Configuration & State
// ============================================================================

const VIZ_COLORS = {
    primary: '#8B5CF6',      // Vox Amelior Purple
    primaryLight: '#A78BFA',
    accent: '#22D3EE',       // Cyan accent
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#1F2937',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    // Category colors
    ml: '#8B5CF6',
    financial: '#F59E0B',
    operations: '#8B5CF6',
    advanced: '#EC4899'
};

let echartsInstances = {};
let plotlyCharts = {};
let dashboardInitialized = false;
let enginePerformanceData = [];

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize all dashboard visualizations.
 */
function initDashboard() {
    if (dashboardInitialized) return;
    dashboardInitialized = true;

    // Initialize ECharts components
    initTimingGauges();
    initCategoryRadar();
    initSuccessDonut();

    // Initialize Plotly timeline
    initTimelineChart();

    console.log('[NexusDashboard] Dashboard initialized');
}

// ============================================================================
// ECharts Timing Gauges
// ============================================================================

/**
 * Initialize timing gauge charts.
 */
function initTimingGauges() {
    const gaugeConfigs = [
        { id: 'gauge-total-time', max: 120, color: VIZ_COLORS.primary, label: 'Total' },
        { id: 'gauge-avg-time', max: 10, color: VIZ_COLORS.accent, label: 'Avg' },
        { id: 'gauge-fastest', max: 5, color: VIZ_COLORS.success, label: 'Fastest' },
        { id: 'gauge-slowest', max: 30, color: VIZ_COLORS.warning, label: 'Slowest' }
    ];

    gaugeConfigs.forEach(config => {
        const container = document.getElementById(config.id);
        if (!container || typeof echarts === 'undefined') return;

        const chart = echarts.init(container, null, { renderer: 'canvas' });
        echartsInstances[config.id] = chart;

        const option = {
            series: [{
                type: 'gauge',
                startAngle: 200,
                endAngle: -20,
                min: 0,
                max: config.max,
                splitNumber: 4,
                itemStyle: {
                    color: config.color,
                    shadowColor: config.color,
                    shadowBlur: 10
                },
                progress: {
                    show: true,
                    roundCap: true,
                    width: 10
                },
                pointer: { show: false },
                axisLine: {
                    roundCap: true,
                    lineStyle: {
                        width: 10,
                        color: [[1, VIZ_COLORS.border]]
                    }
                },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false },
                title: { show: false },
                detail: {
                    valueAnimation: true,
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: config.color,
                    offsetCenter: [0, 0],
                    formatter: val => val.toFixed(1) + 's'
                },
                data: [{ value: 0 }]
            }]
        };
        chart.setOption(option);
    });
}

/**
 * Update timing gauges with current values.
 */
function updateTimingGauges(totalTime, avgTime, fastest, slowest) {
    const updates = [
        { id: 'gauge-total-time', value: totalTime },
        { id: 'gauge-avg-time', value: avgTime },
        { id: 'gauge-fastest', value: fastest },
        { id: 'gauge-slowest', value: slowest }
    ];

    updates.forEach(u => {
        const chart = echartsInstances[u.id];
        if (chart) {
            chart.setOption({
                series: [{ data: [{ value: u.value }] }]
            });
        }
    });
}

// ============================================================================
// Category Radar Chart
// ============================================================================

/**
 * Initialize category performance radar chart.
 */
function initCategoryRadar() {
    const container = document.getElementById('category-radar');
    if (!container || typeof echarts === 'undefined') return;

    const chart = echarts.init(container, null, { renderer: 'canvas' });
    echartsInstances['category-radar'] = chart;

    const option = {
        backgroundColor: 'transparent',
        radar: {
            indicator: [
                { name: 'ML & Analytics', max: 100 },
                { name: 'Financial', max: 100 },
                { name: 'Operations', max: 100 },
                { name: 'Advanced', max: 100 },
                { name: 'Speed', max: 100 }
            ],
            shape: 'polygon',
            splitNumber: 4,
            axisName: {
                color: VIZ_COLORS.textMuted,
                fontSize: 11
            },
            splitLine: {
                lineStyle: { color: VIZ_COLORS.border }
            },
            splitArea: {
                areaStyle: { color: ['rgba(139,92,246,0.02)', 'rgba(139,92,246,0.05)'] }
            },
            axisLine: {
                lineStyle: { color: VIZ_COLORS.border }
            }
        },
        series: [{
            type: 'radar',
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: {
                width: 2,
                color: VIZ_COLORS.primary
            },
            areaStyle: {
                color: 'rgba(139, 92, 246, 0.2)'
            },
            itemStyle: {
                color: VIZ_COLORS.primary,
                borderColor: VIZ_COLORS.primaryLight,
                borderWidth: 2
            },
            data: [{
                value: [0, 0, 0, 0, 0],
                name: 'Performance'
            }]
        }]
    };
    chart.setOption(option);
}

/**
 * Update category radar with performance scores.
 */
function updateCategoryRadar(mlScore, financialScore, opsScore, advancedScore, speedScore) {
    const chart = echartsInstances['category-radar'];
    if (chart) {
        chart.setOption({
            series: [{
                data: [{
                    value: [mlScore, financialScore, opsScore, advancedScore, speedScore]
                }]
            }]
        });
    }
}

// ============================================================================
// Success Rate Donut
// ============================================================================

/**
 * Initialize success rate donut chart.
 */
function initSuccessDonut() {
    const container = document.getElementById('success-donut');
    if (!container || typeof echarts === 'undefined') return;

    const chart = echarts.init(container, null, { renderer: 'canvas' });
    echartsInstances['success-donut'] = chart;

    const option = {
        backgroundColor: 'transparent',
        series: [{
            type: 'pie',
            radius: ['50%', '75%'],
            center: ['50%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
                borderRadius: 6,
                borderColor: VIZ_COLORS.background,
                borderWidth: 2
            },
            label: {
                show: true,
                position: 'center',
                formatter: '{d}%',
                fontSize: 24,
                fontWeight: 'bold',
                color: VIZ_COLORS.success
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 28,
                    fontWeight: 'bold'
                }
            },
            data: [
                { value: 0, name: 'Success', itemStyle: { color: VIZ_COLORS.success } },
                { value: 0, name: 'Failed', itemStyle: { color: VIZ_COLORS.error } },
                { value: 22, name: 'Pending', itemStyle: { color: VIZ_COLORS.border } }
            ]
        }]
    };
    chart.setOption(option);
}

/**
 * Update success donut with engine counts.
 */
function updateSuccessDonut(success, failed, pending) {
    const chart = echartsInstances['success-donut'];
    if (chart) {
        const total = success + failed + pending;
        const successPercent = total > 0 ? Math.round((success / total) * 100) : 0;

        chart.setOption({
            series: [{
                label: {
                    formatter: successPercent + '%',
                    color: success > failed ? VIZ_COLORS.success : VIZ_COLORS.error
                },
                data: [
                    { value: success, name: 'Success' },
                    { value: failed, name: 'Failed' },
                    { value: pending, name: 'Pending' }
                ]
            }]
        });
    }
}

// ============================================================================
// Execution Timeline (Plotly)
// ============================================================================

/**
 * Initialize execution timeline chart.
 */
function initTimelineChart() {
    const container = document.getElementById('execution-timeline');
    if (!container || typeof Plotly === 'undefined') return;

    const layout = {
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: VIZ_COLORS.textMuted, size: 11, family: 'Inter, sans-serif' },
        margin: { l: 140, r: 50, t: 20, b: 40 },
        xaxis: {
            title: 'Duration (seconds)',
            gridcolor: VIZ_COLORS.border,
            zerolinecolor: VIZ_COLORS.border
        },
        yaxis: {
            autorange: 'reversed',
            gridcolor: VIZ_COLORS.border
        },
        showlegend: false
    };

    Plotly.newPlot(container, [], layout, { responsive: true, displayModeBar: false });
    plotlyCharts['timeline'] = container;
}

/**
 * Update execution timeline with engine data.
 */
function updateTimelineChart(engineData) {
    const container = plotlyCharts['timeline'];
    if (!container || !engineData.length) return;

    const data = [{
        type: 'bar',
        orientation: 'h',
        x: engineData.map(e => e.duration / 1000),
        y: engineData.map(e => e.display),
        marker: {
            color: engineData.map(e => {
                if (e.status === 'error') return VIZ_COLORS.error;
                return VIZ_COLORS[e.category] || VIZ_COLORS.primary;
            }),
            line: { width: 0 }
        },
        text: engineData.map(e => (e.duration / 1000).toFixed(2) + 's'),
        textposition: 'outside',
        textfont: { color: VIZ_COLORS.text, size: 10 },
        hovertemplate: '<b>%{y}</b><br>Duration: %{x:.2f}s<extra></extra>'
    }];

    Plotly.react(container, data, {
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: VIZ_COLORS.textMuted, size: 10, family: 'Inter, sans-serif' },
        margin: { l: 140, r: 50, t: 10, b: 30 },
        xaxis: {
            title: 'Duration (seconds)',
            gridcolor: VIZ_COLORS.border,
            zerolinecolor: VIZ_COLORS.border
        },
        yaxis: {
            autorange: 'reversed',
            gridcolor: VIZ_COLORS.border
        },
        showlegend: false
    }, { responsive: true, displayModeBar: false });
}

// ============================================================================
// Performance Tracking
// ============================================================================

/**
 * Track engine performance when engine completes.
 */
function trackEnginePerformance(engine, duration, status, dataSize) {
    const existing = enginePerformanceData.findIndex(e => e.name === engine.name);
    const perfData = {
        name: engine.name,
        display: engine.display,
        icon: engine.icon,
        category: engine.category,
        duration: duration,
        status: status,
        dataSize: dataSize || 0,
        timestamp: Date.now()
    };

    if (existing >= 0) {
        enginePerformanceData[existing] = perfData;
    } else {
        enginePerformanceData.push(perfData);
    }

    updateDashboard();
}

/**
 * Master function to update all dashboard visualizations.
 */
function updateDashboard() {
    if (!enginePerformanceData.length) return;

    const completed = enginePerformanceData.filter(e => e.status !== 'pending');
    const successful = completed.filter(e => e.status === 'success');
    const failed = completed.filter(e => e.status === 'error');
    const pending = enginePerformanceData.filter(e => e.status === 'pending');

    const durations = completed.map(e => e.duration / 1000);
    const totalTime = durations.reduce((a, b) => a + b, 0);
    const avgTime = durations.length ? totalTime / durations.length : 0;
    const fastest = durations.length ? Math.min(...durations) : 0;
    const slowest = durations.length ? Math.max(...durations) : 0;

    // Update gauges
    updateTimingGauges(totalTime, avgTime, fastest, slowest);

    // Update success donut
    updateSuccessDonut(successful.length, failed.length, pending.length);

    // Calculate category scores
    const categoryScores = {};
    ['ml', 'financial', 'operations', 'advanced'].forEach(cat => {
        const catEngines = successful.filter(e => e.category === cat);
        const catTotal = enginePerformanceData.filter(e => e.category === cat).length;
        categoryScores[cat] = catTotal > 0 ? (catEngines.length / catTotal) * 100 : 0;
    });

    const speedScore = avgTime > 0 ? Math.max(0, 100 - (avgTime * 10)) : 100;

    updateCategoryRadar(
        categoryScores.ml || 0,
        categoryScores.financial || 0,
        categoryScores.operations || 0,
        categoryScores.advanced || 0,
        speedScore
    );

    // Update timeline
    updateTimelineChart(completed);
}

/**
 * Reset performance tracking for new analysis.
 */
function resetPerformanceTracking() {
    enginePerformanceData = [];
    dashboardInitialized = false;
}

/**
 * Resize all charts on window resize.
 */
function resizeAllCharts() {
    Object.values(echartsInstances).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
            chart.resize();
        }
    });

    if (typeof Plotly !== 'undefined') {
        document.querySelectorAll('.js-plotly-plot').forEach(plot => {
            try {
                Plotly.Plots.resize(plot);
            } catch (e) {
                // Ignore resize errors
            }
        });
    }
}

// Handle window resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeAllCharts, 250);
});

// ============================================================================
// Export to Window
// ============================================================================

window.NexusDashboard = {
    initDashboard,
    updateTimingGauges,
    updateCategoryRadar,
    updateSuccessDonut,
    updateTimelineChart,
    trackEnginePerformance,
    updateDashboard,
    resetPerformanceTracking,
    resizeAllCharts,
    VIZ_COLORS
};

console.log('[NexusDashboard] Module loaded');
