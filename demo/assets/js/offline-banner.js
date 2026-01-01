/**
 * Offline Mode Banner Injection
 * Adds a "Secure Offline Mode" banner to the top of every demo page.
 */
(function () {
    // Styling for the banner
    const style = document.createElement('style');
    style.textContent = `
        .offline-banner {
            background: linear-gradient(90deg, #059669, #10b981); /* Emerald Green for Security */
            color: white;
            text-align: center;
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
            font-weight: 600;
            font-family: 'Inter', sans-serif;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
        }
        body {
            margin-top: 36px !important; /* Push body down */
        }
    `;
    document.head.appendChild(style);

    // Create Banner
    const banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        <span>SECURE OFFLINE MODE: Running 100% Locally. Zero Data Leaks.</span>
    `;

    // Remove existing "Demo Mode" banners if any
    const existing = document.querySelector('.demo-mode-banner');
    if (existing) existing.remove();

    document.body.prepend(banner);
})();
