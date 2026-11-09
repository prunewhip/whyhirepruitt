"""
Test: Header Consistency Across Portfolio Pages

Verifies that the shared site header (.site-nav) is present and consistent on
every main portfolio page, and that the mobile menu toggle is accessible.
This is a static file test - no server required.

Run: pip install pytest playwright && playwright install chromium && pytest tests/
"""

from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_PATH = Path(__file__).resolve().parent.parent

# (file, label of the nav link that should carry aria-current="page")
PAGES = [
    ("index.html", "Home"),
    ("apps.html", "Other apps"),
    ("about.html", "About"),
    ("architecture.html", "How it’s built"),
    ("contact.html", "Contact"),
]


def page_url(html_file):
    return (BASE_PATH / html_file).as_uri()


def test_header_present_on_all_pages():
    """Every page has one header, the brand, five nav links, the resume CTA and the right current page."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        for html_file, current in PAGES:
            page.goto(page_url(html_file))

            assert page.locator(".site-nav").count() == 1, f"site-nav missing on {html_file}"
            assert "Pruitt Colon" in page.locator(".site-nav .brand").text_content(), f"brand text wrong on {html_file}"

            links = page.locator("#nav-links .nav-link")
            assert links.count() == 5, f"expected 5 nav links on {html_file}, got {links.count()}"

            assert page.locator("#nav-links a.nav-cta[href='Pruitt_Colon_Resume.pdf']").count() == 1, \
                f"resume button missing on {html_file}"

            active = page.locator('#nav-links .nav-link[aria-current="page"]')
            assert active.count() == 1, f"expected one current link on {html_file}"
            assert active.text_content().strip() == current, f"wrong current link on {html_file}"

            assert page.locator("a.skip-link[href='#main']").count() == 1, f"skip link missing on {html_file}"
            assert page.locator("main#main").count() == 1, f"main#main missing on {html_file}"

        browser.close()


def test_mobile_menu_toggle():
    """The hamburger shows on mobile and toggles aria-expanded."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 375, "height": 667})
        page.goto(page_url("index.html"))

        toggle = page.locator(".nav-toggle")
        assert toggle.is_visible(), "menu toggle not visible on mobile"
        assert toggle.get_attribute("aria-expanded") == "false"

        toggle.click()
        assert toggle.get_attribute("aria-expanded") == "true", "menu did not open"

        page.keyboard.press("Escape")
        assert toggle.get_attribute("aria-expanded") == "false", "Escape did not close the menu"

        browser.close()
