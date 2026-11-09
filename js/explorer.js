/**
 * Keyword explorer: technology → files on GitHub + a highlighted code excerpt.
 * Used on the "How it's built" page. Expects js/keyword-data.js
 * (keywordData, GITHUB_BASE) to load first.
 */

(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Small DOM helper: el('div', { class: 'x', text: 'y' }, children)
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'text') node.textContent = value;
      else if (key === 'class') node.className = value;
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of [].concat(children)) {
      if (child) node.append(child);
    }
    return node;
  }

  function icon(id) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${id}`);
    svg.append(use);
    return svg;
  }

  const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  /* ════════════════════════════════════════════════════════
     1. KEYWORD EXPLORER
     ════════════════════════════════════════════════════════ */

  // Curated excerpts in /code-snippets, keyed by keyword
  const SNIPPET_FILES = {
    'PyTorch': 'pytorch',
    'Gemma LLM': 'gemma-llm',
    'Llama.cpp': 'llama-cpp',
    'NVIDIA NeMo': 'nemo-asr',
    'Parakeet ASR': 'parakeet-asr',
    'FAISS': 'faiss',
    'Sentence-Transformers': 'sentence-transformers',
    'DistilRoBERTa': 'distilroberta',
    'Titan AutoML': 'titan-automl',
    'Oracle Causal': 'oracle-causal',
    'Newton Symbolic': 'newton-symbolic',
    'Chronos Temporal': 'chronos-timeseries',
    'Galileo Geometric': 'galileo-gnn',
    'Mirror Synthetic': 'mirror-synthetic',
    'Scout Discovery': 'scout-discovery',
    'Chaos Non-Linear': 'chaos-nonlinear',
    'FastAPI': 'fastapi',
    'Redis': 'redis',
    'PostgreSQL': 'postgresql',
    'WebSocket': 'websocket',
    'SQLCipher': 'sqlcipher',
    'Docker': 'docker',
    'Kubernetes': 'kubernetes',
    'Kustomize': 'kustomize',
    'CUDA': 'cuda-gpu',
    'JWT Authentication': 'jwt-auth',
    'AES-256 Encryption': 'aes-encryption',
    'Docker Secrets': 'docker-secrets',
    'GPU Semaphore': 'redis',
    'Microservices': 'microservices',
    'RAG (Retrieval-Augmented Generation)': 'rag-pipeline',
    'System 2 Thinking': 'system2-thinking'
  };

  const snippetCache = new Map();

  // An entry can name its own excerpt (voice-app entries do); others use the map above
  const snippetFor = (keyword) => keywordData[keyword]?.snippet || SNIPPET_FILES[keyword];
  const langFor = (keyword) => keywordData[keyword]?.lang || 'python';
  const repoFor = (data) => data.base || GITHUB_BASE;

  async function loadSnippet(keyword) {
    const file = snippetFor(keyword);
    if (!file) return null;
    if (!snippetCache.has(file)) {
      snippetCache.set(
        file,
        fetch(`code-snippets/${file}.txt`).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
      );
    }
    return snippetCache.get(file);
  }

  // Single-pass tokenizers, so highlighting never re-matches its own markup
  const LANGS = {
    python: {
      token: /(#.*$)|("""[\s\S]*?"""|'''[\s\S]*?''')|("""[\s\S]*$|'''[\s\S]*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(@[\w.]+)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g,
      groups: ['comment', 'string', 'unclosed', 'string', 'decorator', 'number', 'word'],
      keywords: new Set(['import', 'from', 'class', 'def', 'async', 'await', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'in', 'not', 'and', 'or', 'is', 'None', 'True', 'False', 'raise', 'yield', 'lambda', 'pass', 'break', 'continue', 'global', 'nonlocal', 'assert', 'del']),
      builtins: new Set(['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr', 'open', 'super', 'self', 'cls', 'enumerate', 'zip', 'min', 'max', 'sum', 'any', 'all', 'sorted']),
      defWords: new Set(['def', 'class'])
    },
    dart: {
      token: /(\/\/.*$)|(r?"(?:[^"\\]|\\.)*"|r?'(?:[^'\\]|\\.)*')|(@\w+)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g,
      groups: ['comment', 'string', 'decorator', 'number', 'word'],
      keywords: new Set(['import', 'export', 'library', 'part', 'class', 'enum', 'extension', 'mixin', 'with', 'extends', 'implements', 'abstract', 'final', 'const', 'var', 'late', 'required', 'static', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'try', 'catch', 'finally', 'on', 'throw', 'rethrow', 'new', 'this', 'super', 'null', 'true', 'false', 'async', 'await', 'yield', 'is', 'as', 'in', 'get', 'set', 'typedef', 'void', 'override']),
      builtins: new Set(['int', 'double', 'num', 'String', 'bool', 'List', 'Map', 'Set', 'Iterable', 'Future', 'Stream', 'Duration', 'DateTime', 'Object', 'dynamic', 'Float32List', 'Completer', 'Queue', 'Timer', 'RegExp', 'RegExpMatch', 'math']),
      defWords: new Set(['class', 'enum', 'extension', 'mixin'])
    }
  };

  // Highlights one line; returns the triple-quote delimiter if a Python docstring stays open
  function highlightLine(line, container, lang) {
    const spec = LANGS[lang] || LANGS.python;
    let last = 0;
    let previousWord = '';
    let open = null;
    for (const match of line.matchAll(spec.token)) {
      const text = match[0];
      const kind = spec.groups[match.slice(1).findIndex((g) => g !== undefined)];
      if (match.index > last) container.append(line.slice(last, match.index));
      let cls = '';
      if (kind === 'comment') cls = 'syn-comment';
      else if (kind === 'string') cls = 'syn-string';
      else if (kind === 'unclosed') {
        cls = 'syn-string';
        open = text.slice(0, 3);
      } else if (kind === 'decorator') cls = 'syn-decorator';
      else if (kind === 'number') cls = 'syn-number';
      else if (kind === 'word') {
        if (spec.keywords.has(text)) cls = 'syn-keyword';
        else if (spec.defWords.has(previousWord)) cls = 'syn-def';
        else if (spec.builtins.has(text)) cls = 'syn-builtin';
        previousWord = text;
      }
      container.append(cls ? el('span', { class: cls, text }) : text);
      last = match.index + text.length;
    }
    if (last < line.length) container.append(line.slice(last));
    return open;
  }

  function renderCode(target, code, lang) {
    const fragment = document.createDocumentFragment();
    let open = null; // delimiter of a docstring that spans lines
    code.replace(/\s+$/, '').split('\n').forEach((line, index) => {
      const src = el('span', { class: 'code__src' });
      let rest = line;
      if (open) {
        const close = line.indexOf(open);
        const end = close === -1 ? line.length : close + 3;
        src.append(el('span', { class: 'syn-string', text: line.slice(0, end) }));
        rest = line.slice(end);
        if (close !== -1) open = null;
      }
      if (!open && rest) open = highlightLine(rest, src, lang);
      fragment.append(el('div', { class: 'code__line' }, [el('span', { class: 'code__ln', text: String(index + 1) }), src]));
    });
    target.replaceChildren(fragment);
  }

  function buildPanel(keyword, data, panelId) {
    const closeBtn = el('button', { class: 'kw-panel__close', type: 'button', 'aria-label': `Close ${keyword}` }, [icon('i-close')]);
    closeBtn.dataset.close = keyword;

    const files = el('div', { class: 'kw-files' }, [
      el('div', { class: 'kw-files__path' }, [icon('i-folder'), el('span', { text: data.folder })])
    ]);

    data.files.forEach((file) => {
      const link = el('a', {
        class: 'kw-file__preview',
        href: `${repoFor(data)}/${file.path}`,
        rel: 'noopener',
        title: file.path
      }, [
        icon('i-code'),
        el('span', { class: 'kw-file__name', text: file.name }),
        el('span', { class: 'kw-file__size', text: file.size || '' })
      ]);
      const gh = el('a', {
        class: 'kw-file__gh',
        href: `${repoFor(data)}/${file.path}`,
        rel: 'noopener',
        'aria-label': `View ${file.name} on GitHub`
      }, [icon('i-github'), el('span', { text: 'GitHub' })]);
      files.append(el('div', { class: 'kw-file' }, [link, gh]));
    });

    const panel = el('div', { class: 'kw-panel', id: panelId, role: 'region', 'aria-label': keyword }, [
      el('div', { class: 'kw-panel__head' }, [
        el('div', {}, [
          el('h4', { class: 'kw-panel__title', text: keyword }),
          el('p', { class: 'kw-panel__summary', text: data.summary })
        ]),
        closeBtn
      ]),
      el('p', { class: 'kw-panel__text', text: data.explanation }),
      files
    ]);

    if (snippetFor(keyword)) {
      const codeId = `${panelId}-code`;
      const toggle = el('button', {
        class: 'btn btn--secondary btn--sm kw-panel__excerpt',
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': codeId
      }, [icon('i-code'), el('span', { text: 'Show code excerpt' })]);
      toggle.dataset.excerpt = keyword;

      const code = el('div', { class: 'code', id: codeId, hidden: true }, [
        el('div', { class: 'code__head' }, [el('span', { text: `excerpt · ${keyword}` }), el('span', { text: 'read-only' })]),
        el('pre', { class: 'code__body', tabindex: '0' })
      ]);

      panel.append(el('div', { class: 'kw-panel__actions' }, [toggle]), code);
    }

    return panel;
  }

  async function toggleExcerpt(button, keyword) {
    const code = document.getElementById(button.getAttribute('aria-controls'));
    if (!code) return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.querySelector('span').textContent = open ? 'Hide code excerpt' : 'Show code excerpt';
    code.hidden = !open;
    if (!open || code.dataset.loaded) return;

    const body = code.querySelector('.code__body');
    body.textContent = 'Loading…';
    try {
      renderCode(body, await loadSnippet(keyword), langFor(keyword));
      code.dataset.loaded = 'true';
    } catch {
      body.textContent = 'Could not load this excerpt. Use the GitHub links above to read the full source.';
    }
  }

  function initExplorer() {
    const root = document.querySelector('[data-explorer]');
    if (!root || typeof keywordData === 'undefined') return;

    const panelIdFor = (keyword) => `kw-panel-${slug(keyword)}`;

    // A group lists one category, or an explicit, curated set of keywords
    root.querySelectorAll('[data-category]').forEach((group) => {
      const category = group.dataset.category;
      const list = group.querySelector('.explorer__keywords');
      const picked = group.dataset.keywords ? group.dataset.keywords.split('|') : null;
      const keywords = picked
        ? picked.filter((k) => keywordData[k])
        : Object.keys(keywordData).filter((k) => keywordData[k].category === category);
      keywords.forEach((keyword) => {
          const btn = el('button', {
            class: 'kw',
            type: 'button',
            'aria-expanded': 'false',
            text: keyword
          });
          btn.dataset.keyword = keyword;
          list.append(btn);
      });
    });

    const setOpen = (keyword, open) => {
      const data = keywordData[keyword];
      const btn = root.querySelector(`.kw[data-keyword="${CSS.escape(keyword)}"]`);
      if (!data || !btn) return;
      const panelId = panelIdFor(keyword);
      const existing = document.getElementById(panelId);
      btn.setAttribute('aria-expanded', String(open));

      if (!open) {
        existing?.remove();
        btn.removeAttribute('aria-controls');
        return;
      }
      if (existing) return;
      btn.setAttribute('aria-controls', panelId);

      const details = btn.closest('.explorer__group').querySelector('.explorer__details');
      const panel = buildPanel(keyword, data, panelId);
      details.append(panel);
      panel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    };

    root.addEventListener('click', (event) => {
      const kw = event.target.closest('.kw');
      if (kw) {
        setOpen(kw.dataset.keyword, kw.getAttribute('aria-expanded') !== 'true');
        return;
      }
      const close = event.target.closest('[data-close]');
      if (close) {
        const keyword = close.dataset.close;
        setOpen(keyword, false);
        root.querySelector(`.kw[data-keyword="${CSS.escape(keyword)}"]`)?.focus();
        return;
      }
      const excerpt = event.target.closest('[data-excerpt]');
      if (excerpt) toggleExcerpt(excerpt, excerpt.dataset.excerpt);
    });
  }

  initExplorer();
})();
