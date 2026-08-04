const API_PATH = '/api/frescopa/estimated-delivery';
const LOCAL_EDGE_FUNCTION_ORIGIN = 'http://127.0.0.1:7676';

const STATUS_LABELS = {
  'in-stock': 'In stock',
  'low-stock': 'Low stock',
  'out-of-stock': 'Out of stock',
};

const VALID_STATUS_CLASSES = new Set(Object.keys(STATUS_LABELS));

const DEFAULTS = {
  title: 'When will it arrive?',
  ctaText: 'Check estimated delivery',
};

const PRODUCTS = [
  { value: 'house-blend-medium-roast', label: 'House Blend- Medium Roast' },
  { value: 'frescopa-smart-machine', label: 'Fréscopa Smart Machine' },
  { value: 'insulated-travel-thermos', label: 'Insulated Travel Thermos' },
];

const PRODUCT_OPTIONS_HTML = PRODUCTS.map(
  (p) => `<option value="${p.value}">${p.label}</option>`,
).join('');

const PLACEHOLDER_HTML = `
  <div class="estimated-delivery__placeholder">
    <p class="estimated-delivery__eyebrow">Estimated delivery</p>
    <p class="estimated-delivery__placeholder-title">Your estimate will appear here</p>
    <p class="estimated-delivery__placeholder-text">Select a product, enter your postcode, and click the button to see availability and delivery timing.</p>
  </div>
`;

let cachedApiUrl;

function isLocalDev() {
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isAuthoringHost() {
  return /enablementadobe\.com$/.test(window.location.hostname);
}

function getEstimatedDeliveryApiUrl() {
  if (cachedApiUrl) return cachedApiUrl;

  // Local: site (aem up) on :3000, Edge Function on :7676 — call it directly.
  // Production: relative path, routed to Edge Function via CDN origin selector.
  cachedApiUrl = isLocalDev()
    ? `${LOCAL_EDGE_FUNCTION_ORIGIN}${API_PATH}`
    : API_PATH;

  return cachedApiUrl;
}

function getBlockText(el, fallback) {
  const text = el?.textContent?.trim();
  return text || fallback;
}

function readBlockContent(block) {
  const props = [...block.children].map((row) => row.firstElementChild);

  return {
    title: getBlockText(props[0], DEFAULTS.title),
    ctaText: getBlockText(props[1], DEFAULTS.ctaText),
  };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatError(err) {
  const message = err?.message || '';

  if (message === 'Failed to fetch' || err?.name === 'TypeError') {
    if (isLocalDev()) {
      return {
        title: 'Delivery service unavailable',
        message: 'We could not reach the estimated delivery API on port 7676.',
        hint: 'Start the Edge Function with: aio aem edge-functions serve',
      };
    }

    return {
      title: 'Delivery service unavailable',
      message: 'We could not reach the estimated delivery service. Please try again shortly.',
      hint: isAuthoringHost()
        ? 'Confirm the Edge Function is deployed and the CDN route for /api/frescopa/estimated-delivery is active.'
        : null,
    };
  }

  return {
    title: 'Unable to check delivery',
    message: message || 'Something went wrong. Please try again.',
    hint: null,
  };
}

function renderError(container, error) {
  const { title, message, hint } = typeof error === 'string'
    ? { title: 'Unable to check delivery', message: error, hint: null }
    : error;

  container.innerHTML = `
    <div class="estimated-delivery__alert" role="alert">
      <p class="estimated-delivery__alert-title">${escapeHtml(title)}</p>
      <p class="estimated-delivery__alert-message">${escapeHtml(message)}</p>
      ${hint ? `<p class="estimated-delivery__alert-hint">${escapeHtml(hint)}</p>` : ''}
    </div>
  `;
}

function formatStatus(status) {
  return STATUS_LABELS[status] || status;
}

function getStatusClass(status) {
  return VALID_STATUS_CLASSES.has(status) ? status : 'unknown';
}

function renderPlaceholder(container) {
  container.innerHTML = PLACEHOLDER_HTML;
}

function renderResult(container, state) {
  const { loading, error, data } = state;

  if (loading) {
    container.innerHTML = `
      <div class="estimated-delivery__loading" role="status">
        <span class="estimated-delivery__spinner" aria-hidden="true"></span>
        <p>Checking estimated delivery...</p>
      </div>
    `;
    return;
  }

  if (error) {
    renderError(container, error);
    return;
  }

  if (!data) {
    renderPlaceholder(container);
    return;
  }

  const statusClass = getStatusClass(data.inventoryStatus);

  container.innerHTML = `
    <article class="estimated-delivery__card estimated-delivery__card--${statusClass}">
      <header class="estimated-delivery__card-header">
        <p class="estimated-delivery__eyebrow">Estimated delivery</p>
        <h4 class="estimated-delivery__product">${escapeHtml(data.productName)}</h4>
        <span class="estimated-delivery__badge">${escapeHtml(formatStatus(data.inventoryStatus))}</span>
      </header>

      <div class="estimated-delivery__eta">
        <span class="estimated-delivery__eta-label">Arrives</span>
        <span class="estimated-delivery__eta-value">${escapeHtml(data.deliveryEta)}</span>
      </div>

      <dl class="estimated-delivery__details">
        <div class="estimated-delivery__detail">
          <dt>Qty available</dt>
          <dd>${escapeHtml(data.qtyLeft)}</dd>
        </div>
        <div class="estimated-delivery__detail">
          <dt>Fulfillment region</dt>
          <dd>${escapeHtml(data.fulfillmentRegion)}</dd>
        </div>
      </dl>

      <p class="estimated-delivery__message">${escapeHtml(data.message)}</p>
      <p class="estimated-delivery__cutoff">${escapeHtml(data.cutoffMessage)}</p>
    </article>
  `;
}

async function fetchEstimatedDelivery(sku, postcode, signal) {
  const params = new URLSearchParams({ sku, postcode });
  const response = await fetch(`${getEstimatedDeliveryApiUrl()}?${params.toString()}`, {
    signal,
    cache: 'no-store',
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiMessage = body.message || body.error;
    const err = new Error(apiMessage || 'Unable to check estimated delivery right now.');
    err.code = body.code;
    throw err;
  }

  return body;
}

export default function decorate(block) {
  const { title, ctaText } = readBlockContent(block);

  block.innerHTML = `
    <div class="estimated-delivery">
      <div class="estimated-delivery__intro">
        <p class="estimated-delivery__eyebrow">Delivery checker</p>
        <h3 class="estimated-delivery__title" data-aue-prop="title" data-aue-label="Heading" data-aue-type="text">${escapeHtml(title)}</h3>
        <p class="estimated-delivery__subtitle">Select a product and enter your postcode to see availability and estimated delivery.</p>
      </div>

      <div class="estimated-delivery__layout">
        <form class="estimated-delivery__form">
          <label class="estimated-delivery__field">
            <span class="estimated-delivery__label">Product</span>
            <select name="sku">
              ${PRODUCT_OPTIONS_HTML}
            </select>
          </label>

          <label class="estimated-delivery__field">
            <span class="estimated-delivery__label">Postcode</span>
            <input name="postcode" type="text" placeholder="e.g. 10001" required />
          </label>

          <button type="submit" class="button" data-aue-prop="ctaText" data-aue-label="CTA Text" data-aue-type="text">${escapeHtml(ctaText)}</button>
        </form>

        <div class="estimated-delivery__result" aria-live="polite">${PLACEHOLDER_HTML}</div>
      </div>
    </div>
  `;

  const form = block.querySelector('form');
  const result = block.querySelector('.estimated-delivery__result');
  const submitBtn = form.querySelector('button[type="submit"]');
  const setState = (state) => renderResult(result, state);

  let activeRequest;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const sku = String(formData.get('sku') || '').trim();
    const postcode = String(formData.get('postcode') || '').trim();

    if (!postcode) {
      setState({
        error: {
          title: 'Postcode required',
          message: 'Enter a postcode to check estimated delivery.',
        },
      });
      return;
    }

    activeRequest?.abort();
    const controller = new AbortController();
    activeRequest = controller;

    setState({ loading: true });
    submitBtn.disabled = true;

    try {
      const data = await fetchEstimatedDelivery(sku, postcode, controller.signal);
      setState({ data });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setState({ error: formatError(err) });
    } finally {
      submitBtn.disabled = false;
    }
  });
}
