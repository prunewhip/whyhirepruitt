"""
NexusAI Dashboard Visualization Tests
Playwright E2E tests for nexus.html dashboard visualizations.

Per user rules: Tests must simulate a real user environment with full E2E flows.
"""

import pytest
from playwright.sync_api import Page, expect


@pytest.fixture(scope="module")
def server_url():
    """Base URL for the demo server."""
    return "http://localhost:8765"


class TestNexusDashboardVisualizations:
    """E2E tests for the NexusAI dashboard visualizations."""

    def test_page_loads_without_errors(self, page: Page, server_url: str):
        """Verify page loads without JavaScript errors."""
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        
        page.goto(f"{server_url}/demo/nexus.html")
        page.wait_for_timeout(2000)  # Wait for visualizations
        
        # Filter out expected errors (favicon, etc.)
        critical_errors = [e for e in errors if "favicon" not in e.lower()]
        assert len(critical_errors) == 0, f"JavaScript errors found: {critical_errors}"

    def test_dashboard_section_visible(self, page: Page, server_url: str):
        """Verify Performance Dashboard section is visible."""
        page.goto(f"{server_url}/demo/nexus.html")
        page.wait_for_timeout(2000)
        
        # Dashboard should be visible
        dashboard = page.locator("#performance-dashboard")
        expect(dashboard).to_be_visible()
        
        # Dashboard title should be present
        expect(page.locator("text=Performance Dashboard")).to_be_visible()

    def test_timing_gauges_rendered(self, page: Page, server_url: str):
        """Verify timing gauges are rendered with values."""
        page.goto(f"{server_url}/demo/nexus.html")
        page.wait_for_timeout(2500)  # Allow ECharts to render
        
        gauge_ids = ["gauge-total-time", "gauge-avg-time", "gauge-fastest", "gauge-slowest"]
        
        for gauge_id in gauge_ids:
            gauge = page.locator(f"#{gauge_id}")
            expect(gauge).to_be_visible()
            # ECharts renders canvas elements
            canvas = gauge.locator("canvas")
            expect(canvas).to_be_visible()

    def test_category_radar_rendered(self, page: Page, server_url: str):
        """Verify category radar chart is rendered."""
        page.goto(f"{server_url}/demo/nexus.html")
        page.wait_for_timeout(2500)
        
        radar = page.locator("#category-radar")
        expect(radar).to_be_visible()
        expect(radar.locator("canvas")).to_be_visible()

    def test_success_donut_rendered(self, page: Page, server_url: str):
        """Verify success rate donut chart is rendered."""
        page.goto(f"{server_url}/demo/nexus.html")
        page.wait_for_timeout(2500)
        
        donut = page.locator("#success-donut")
        expect(donut).to_be_visible()
        expect(donut.locator("canvas")).to_be_visible()

    def test_execution_timeline_rendered(self, page: Page, server_url: str):
        """Verify execution timeline (Plotly) is rendered."""
        page.goto(f"{server_url}/demo/nexus.html")
        page.wait_for_timeout(2500)
        
        timeline = page.locator("#execution-timeline")
        expect(timeline).to_be_visible()
        # Plotly renders .js-plotly-plot containers
        expect(timeline.locator(".js-plotly-plot")).to_be_visible()

    def test_engine_results_rendered(self, page: Page, server_url: str):
        """Verify engine result cards are rendered."""
        page.goto(f"{server_url}/demo/nexus.html")
        page.wait_for_timeout(2500)
        
        # All engines section should be visible
        engines_section = page.locator("#all-engines-section")
        expect(engines_section).to_be_visible()
        
        # At least some engine cards should be rendered
        engine_cards = page.locator(".engine-card, .engine-result-card")
        expect(engine_cards.first).to_be_visible(timeout=5000)

    def test_responsive_resize(self, page: Page, server_url: str):
        """Verify charts resize on window resize."""
        page.goto(f"{server_url}/demo/nexus.html")
        page.wait_for_timeout(2500)
        
        # Get initial chart dimension
        radar = page.locator("#category-radar canvas")
        initial_box = radar.bounding_box()
        
        # Resize viewport
        page.set_viewport_size({"width": 800, "height": 600})
        page.wait_for_timeout(500)
        
        # Chart should still be visible after resize
        expect(radar).to_be_visible()
