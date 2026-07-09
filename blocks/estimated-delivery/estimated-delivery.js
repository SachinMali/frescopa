const API_PATH = '/api/frescopa/estimated-delivery';

const PRODUCTS = [
  { value: 'house-blend-medium-roast', label: 'House Blend- Medium Roast' },
  { value: 'frescopa-smart-machine', label: 'Fréscopa Smart Machine' },
  { value: 'insulated-travel-thermos', label: 'Insulated Travel Thermos' },
];

function renderResult(container, state) {
  const { loading, error, data } = state;

  if (loading) {
    container.innerHTML = '<p>Checking estimated delivery...</p>';
    return;
  }

  if (error) {
    container.innerHTML = `<p class="estimated-delivery__error">${error}</p>`;
    return;
  }

  if (!data) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="estimated-delivery__card estimated-delivery__card--${data.inventoryStatus}">
      <p><strong>${data.productName}</strong></p>
      <p>Status: ${data.inventoryStatus}</p>
      <p>Qty left: ${data.qtyLeft}</p>
      <p>Fulfillment region: ${data.fulfillmentRegion}</p>
      <p>Delivery ETA: ${data.deliveryEta}</p>
      <p>${data.cutoffMessage}</p>
      <p class="estimated-delivery__message">${data.message}</p>
    </div>
  `;
}

async function fetchEstimatedDelivery(sku, postcode) {
  const params = new URLSearchParams({ sku, postcode });
  const response = await fetch(`${API_PATH}?${params.toString()}`);

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || body.error || 'Unable to check estimated delivery.');
  }

  return body;
}

export default function decorate(block) {
  block.innerHTML = `
    <div class="estimated-delivery">
      <form class="estimated-delivery__form">
        <label class="estimated-delivery__field">
          <span>Product</span>
          <select name="sku">
            ${PRODUCTS.map((p) => `<option value="${p.value}">${p.label}</option>`).join('')}
          </select>
        </label>

        <label class="estimated-delivery__field">
          <span>Postcode</span>
          <input name="postcode" type="text" placeholder="10001" required />
        </label>

        <button type="submit">Check estimated delivery</button>
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
