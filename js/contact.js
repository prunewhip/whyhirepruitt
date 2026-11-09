/**
 * Contact page — submits the Web3Forms form with fetch so the visitor stays
 * on the page. Without JS the form still posts normally.
 */

(() => {
  'use strict';

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (!form || !status) return;

  const button = form.querySelector('button[type="submit"]');
  const label = button.textContent;

  const setStatus = (message, kind) => {
    status.textContent = message;
    status.className = `form__status${kind ? ` is-${kind}` : ''}`;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Sending…';
    setStatus('', '');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(result.message || `HTTP ${response.status}`);
      setStatus('Message sent. I’ll get back to you soon.', 'success');
      form.reset();
    } catch {
      setStatus('Something went wrong. Please email PruittColon@gmail.com directly.', 'error');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = label;
    }
  });
})();
