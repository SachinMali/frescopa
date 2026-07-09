const API_PATH = '/api/frescopa/estimated-delivery';
const LOCAL_EDGE_FUNCTION_ORIGIN = 'http://127.0.0.1:7676';

const STATUS_LABELS = {
  'in-stock': 'In stock',
  'low-stock': 'Low stock',
  'out-of-stock': 'Out of stock',
};

function isLocalDev() {
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getEstimatedDeliveryApiUrl() {
  // Local: site (aem up) on :3000, Edge Function on :7676 — call it directly.
  // Production: relative path, routed to Edge Function via CDN origin selector.
  if (isLocalDev()) {
    return `${LOCAL_EDGE_FUNCTION_ORIGIN}${API_PATH}`;
  }
  return API_PATH;
}

const PRODUCTS = [
  { value: 'house-blend-medium-roast', label: 'House Blend- Medium Roast' },
  { value: 'frescopa-smart-machine', label: 'Fréscopa Smart Machine' },
  { value: 'insulated-travel-thermos', label: 'Insulated Travel Thermos' },
];

function formatStatus(status) {
  return STATUS_LABELS[status] || status;
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
    container.innerHTML = `
      <div class="estimated-delivery__alert" role="alert">
        <p>${error}</p>
      </div>
    `;
    return;
  }

  if (!data) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <article class="estimated-delivery__card estimated-delivery__card--${data.inventoryStatus}">
      <header class="estimated-delivery__card-header">
        <p class="estimated-delivery__eyebrow">Estimated delivery</p>
        <h4 class="estimated-delivery__product">${data.productName}</h4>
        <span class="estimated-delivery__badge">${formatStatus(data.inventoryStatus)}</span>
      </header>

      <div class="estimated-delivery__eta">
        <span class="estimated-delivery__eta-label">Arrives</span>
        <span class="estimated-delivery__eta-value">${data.deliveryEta}</span>
      </div>

      <dl class="estimated-delivery__details">
        <div class="estimated-delivery__detail">
          <dt>Qty available</dt>
          <dd>${data.qtyLeft}</dd>
        </div>
        <div class="estimated-delivery__detail">
          <dt>Fulfillment region</dt>
          <dd>${data.fulfillmentRegion}</dd>
        </div>
      </dl>

      <p class="estimated-delivery__message">${data.message}</p>
      <p class="estimated-delivery__cutoff">${data.cutoffMessage}</p>
    </article>
  `;
}

async function fetchEstimatedDelivery(sku, postcode) {
  const params = new URLSearchParams({ sku, postcode });
  const response = await fetch(`${getEstimatedDeliveryApiUrl()}?${params.toString()}`);

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || body.error || 'Unable to check estimated delivery.');
  }

  return body;
}

export default function decorate(block) {
  block.innerHTML = `
    <div class="estimated-delivery">
      <div class="estimated-delivery__intro">
        <p class="estimated-delivery__eyebrow">Delivery checker</p>
        <h3 class="estimated-delivery__title">When will it arrive?</h3>
        <p class="estimated-delivery__subtitle">Select a product and enter your postcode to see availability and estimated delivery.</p>
      </div>

      <form class="estimated-delivery__form">
        <label class="estimated-delivery__field">
          <span class="estimated-delivery__label">Product</span>
          <select name="sku">
            ${PRODUCTS.map((p) => `<option value="${p.value}">${p.label}</option>`).join('')}
          </select>
        </label>

        <label class="estimated-delivery__field">
          <span class="estimated-delivery__label">Postcode</span>
          <input name="postcode" type="text" placeholder="e.g. 10001" required />
        </label>

        <button type="submit" class="button">Check estimated delivery</button>
      </form>

      <div class="estimated-delivery__result" aria-live="polite"></div>
    </div>
  `;

  const form = block.querySelector('form');
  const result = block.querySelector('.estimated-delivery__result');
  const setState = (state) => renderResult(result, state);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const sku = String(formData.get('sku') || '').trim();
    const postcode = String(formData.get('postcode') || '').trim();

    if (!postcode) {
      setState({ error: 'Enter a postcode to check estimated delivery.' });
      return;
    }

    setState({ loading: true });

    try {
      const data = await fetchEstimatedDelivery(sku, postcode);
      setState({ data });
    } catch (err) {
      setState({ error: err.message || 'Something went wrong.' });
    }
  });
}
