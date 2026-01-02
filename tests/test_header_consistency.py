"""
Test: Header Consistency Across Portfolio Pages

Verifies that the vox-nav header is present and consistent on all portfolio pages.
This is a static file test - no server required.
"""

from playwright.sync_api import sync_playwright
import pytest
import os


BASE_PATH = "/home/pruittcolon/Desktop/whyhirepruitt-main"

PAGES = [
    ("index.html", "Home"),
    ("about.html", "About"),
    ("architecture.html", "Architecture"),
    ("projects.html", None),  # Projects page has no dedicated nav link
    ("contact.html", "Contact"),
]


def test_header_present_on_all_pages():
    """Verify vox-nav header exists on all portfolio pages."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        for html_file, active_link in PAGES:
            file_path = f"file://{BASE_PATH}/{html_file}"
            page.goto(file_path)
            
            # Check vox-nav exists
            nav = page.locator(".vox-nav")
            assert nav.count() == 1, f"vox-nav not found on {html_file}"
            
            # Check logo exists with image
            logo_img = page.locator(".vox-logo-mark img")
            assert logo_img.count() == 1, f"Logo image not found on {html_file}"
            
            # Check logo text
            logo_text = page.locator(".vox-logo-text")
            assert logo_text.count() == 1, f"Logo text not found on {html_file}"
            assert "Pruitt Colon" in logo_text.text_content(), f"Logo text incorrect on {html_file}"
            
            # Check View Demo button exists
            demo_btn = page.locator("a.vox-btn:has-text('View Demo')")
            assert demo_btn.count() == 1, f"View Demo button not found on {html_file}"
            
            # Check nav links exist
            nav_links = page.locator(".vox-nav-links .vox-nav-link")
            assert nav_links.count() >= 5, f"Expected at least 5 nav links on {html_file}, got {nav_links.count()}"
            
            # Verify active state if applicable
            if active_link:
                active = page.locator(f".vox-nav-link.active:has-text('{active_link}')")
                assert active.count() == 1, f"Active link '{active_link}' not found on {html_file}"
        
        browser.close()


def test_mobile_hamburger_visible():
    """Verify hamburger menu toggle appears on mobile viewport."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        # Set mobile viewport
        page.set_viewport_size({"width": 375, "height": 667})
        
        page.goto(f"file://{BASE_PATH}/index.html")
        
        # Hamburger toggle should be visible
        toggle = page.locator(".vox-nav-toggle")
        assert toggle.is_visible(), "Hamburger menu toggle not visible on mobile"
        
        browser.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
