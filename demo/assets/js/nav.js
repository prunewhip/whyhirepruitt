/**
 * Vox Amelior Mobile Navigation
 * Handles hamburger menu toggle for mobile viewports
 */
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.vox-nav-toggle');
    const links = document.querySelector('.vox-nav-links');

    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        links.classList.toggle('open');
        document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
    });

    // Close menu when a link is clicked
    links.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            toggle.classList.remove('active');
            links.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // Handle dropdown toggles on mobile
    document.querySelectorAll('.vox-nav-dropdown').forEach(dropdown => {
        const btn = dropdown.querySelector('button');
        btn?.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                dropdown.classList.toggle('open');
            }
        });
    });
});
