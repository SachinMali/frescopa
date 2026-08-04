const DEFAULTS = {
  title: 'When will it arrive?',
  ctaText: 'Check estimated delivery',
};

const PRODUCTS = [
  { value: 'house-blend-medium-roast', label: 'House Blend - Medium Roast' },
  { value: 'frescopa-smart-machine', label: 'Fréscopa Smart Machine' },
  { value: 'insulated-travel-thermos', label: 'Insulated Travel Thermos' },
];

const PRODUCT_OPTIONS_HTML = PRODUCTS.map(
  (p) => `<option value="${p.value}">${p.label}</option>`,
).join('');

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

export default function decorate(block) {
  const { title, ctaText } = readBlockContent(block);

  block.innerHTML = `
      <div class="estimated-delivery">
        <h3 data-aue-prop="title" data-aue-label="Heading" data-aue-type="text">${title}</h3>
        <form class="estimated-delivery__form">
          <select name="sku">${PRODUCT_OPTIONS_HTML}</select>
          <input name="postcode" type="text" placeholder="e.g. 10001" required />
          <button type="submit" data-aue-prop="ctaText" data-aue-label="CTA Text" data-aue-type="text">${ctaText}</button>
        </form>
        <div class="estimated-delivery__result" aria-live="polite">
          <p>Select a product, enter your postcode, and click the button.</p>
        </div>
      </div>
    `;

  // form submit logic added in the next step
}
