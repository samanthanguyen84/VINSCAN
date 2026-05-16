/* ===========================================================
   Backyard Boil — order form logic
   ===========================================================
   Fill these in before going live:
     - WEBHOOK_URL : your Make.com custom-webhook URL
     - ZELLE_HANDLE: the Zelle email or phone customers pay
   =========================================================== */

const CONFIG = {
  WEBHOOK_URL:   'PASTE_MAKE_WEBHOOK_URL_HERE',
  ZELLE_HANDLE:  'PASTE_ZELLE_EMAIL_OR_PHONE_HERE',
  PRICE_PER_LB:  12,
  MIN_LBS:       3,
  TAX_RATE:      0,        // set to 0.0825 for Austin sales tax if you charge it
  // addons map directly to Notion column names
  ADDONS: {
    corn:       { label: 'Whole corn',         price: 2,  unit: '',      notion: 'Corn',         multiplier: 1 },
    sausage:    { label: 'Sausage',            price: 6,  unit: 'lb',    notion: 'Sausage lbs',  multiplier: 1 },
    potato:     { label: 'Potatoes (2-pack)',  price: 1,  unit: '',      notion: 'Potatoes',     multiplier: 2 },
    sauceMild:  { label: 'Bottle — Mild Sauce',  price: 10, unit: 'bottle', notion: 'Mild Sauce',   multiplier: 1 },
    sauceSpicy: { label: 'Bottle — Spicy Sauce', price: 10, unit: 'bottle', notion: 'Spicy Sauce',  multiplier: 1 },
  },
  // Exact Notion select options for Pickup Time
  PICKUP_TIMES: [
    '10:30am', '11:00am', '11:15am', '11:30am', '11:45am',
    '12:00pm', '12:15pm', '12:30pm', '12:45pm',
    '1:00pm', '1:15pm', '1:30pm', '1:45pm',
    '2:00pm', '2:15pm', '2:30pm', '2:45pm',
    '3:00pm', '3:15pm', '3:30pm', '3:45pm',
    '4:00pm', '4:15pm', '4:30pm', '4:45pm',
    '5:00pm', '5:15pm', '5:30pm', '5:45pm',
    '6:00pm', '6:15pm', '6:30pm', '6:45pm',
    '7:00pm',
  ],
};

/* ------------ Element refs ------------ */
const form        = document.getElementById('orderForm');
const lbsInput    = document.getElementById('lbs');
const summaryList = document.getElementById('summaryList');
const sumSubtotal = document.getElementById('sumSubtotal');
const sumTax      = document.getElementById('sumTax');
const sumTotal    = document.getElementById('sumTotal');
const submitBtn   = document.getElementById('submitBtn');
const pickupDate  = document.getElementById('pickup_date');
const pickupTime  = document.getElementById('pickup_time');

const modal       = document.getElementById('confirmModal');
const orderRef    = document.getElementById('orderRef');
const zelleAmount = document.getElementById('zelleAmount');
const zelleHandle = document.getElementById('zelleHandle');
const zelleMemo   = document.getElementById('zelleMemo');
const copyZelle   = document.getElementById('copyZelle');
const closeModal  = document.getElementById('closeModal');

/* ------------ Helpers ------------ */
const fmt = (n) => '$' + n.toFixed(2);

function getQty(name) {
  const el = document.querySelector(`input[name="${name}"]`);
  if (!el) return 0;
  const v = parseInt(el.value, 10);
  return isNaN(v) ? 0 : Math.max(0, v);
}

function getLbs() {
  const v = parseInt(lbsInput.value, 10);
  return isNaN(v) ? 0 : v;
}

/* ------------ Pickup-date dropdown (next 6 Saturdays) ------------ */
(function populateSaturdays() {
  const today = new Date();
  const opts = ['<option value="">Pick a Saturday…</option>'];
  let added = 0, d = new Date(today);
  while (added < 6) {
    if (d.getDay() === 6 && d >= today) {
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric'
      });
      opts.push(`<option value="${iso}">${label}</option>`);
      added++;
    }
    d.setDate(d.getDate() + 1);
  }
  pickupDate.innerHTML = opts.join('');
})();

/* ------------ Pickup-time dropdown (15-min slots matching Notion) ------------ */
(function populateTimes() {
  const opts = ['<option value="">Pick a time…</option>']
    .concat(CONFIG.PICKUP_TIMES.map(t => `<option value="${t}">${t}</option>`));
  pickupTime.innerHTML = opts.join('');
})();

/* ------------ Live total ------------ */
function recompute() {
  let lbs = getLbs();
  if (isNaN(lbs)) lbs = 0;

  // Validate min (display only — actual block happens at submit)
  if (lbs > 0 && lbs < CONFIG.MIN_LBS) {
    lbsInput.classList.add('invalid');
  } else {
    lbsInput.classList.remove('invalid');
  }

  const items = [];
  let subtotal = 0;

  // crawfish
  if (lbs > 0) {
    const cwSub = lbs * CONFIG.PRICE_PER_LB;
    subtotal += cwSub;
    items.push({ name: `Crawfish · ${lbs} lb @ $${CONFIG.PRICE_PER_LB}/lb`, price: cwSub });

    // Note included items if any complete 5-lb increments
    const fives = Math.floor(lbs / 5);
    if (fives > 0) {
      items.push({
        name: `↳ Includes: ${5 * fives} sausage slices · ${fives} potato · ${fives * 2} corn quarters`,
        price: null, incl: true
      });
    }
  }

  // addons
  for (const [key, def] of Object.entries(CONFIG.ADDONS)) {
    const q = getQty(`addon_${key}`);
    if (q > 0) {
      const sub = q * def.price;
      subtotal += sub;
      const unitTxt = def.unit ? ` ${def.unit}` : '';
      items.push({ name: `${def.label} · ${q}${unitTxt}`, price: sub });
    }
  }

  const tax   = subtotal * CONFIG.TAX_RATE;
  const total = subtotal + tax;

  // render summary
  if (items.length === 0) {
    summaryList.innerHTML = '<li class="li-incl">Nothing in your boil yet — start by picking your lbs.</li>';
  } else {
    summaryList.innerHTML = items.map(it =>
      it.incl
        ? `<li class="li-incl">${it.name}</li>`
        : `<li><span>${it.name}</span><strong>${fmt(it.price)}</strong></li>`
    ).join('');
  }
  sumSubtotal.textContent = fmt(subtotal);
  sumTax.textContent      = fmt(tax);
  sumTotal.textContent    = fmt(total);

  submitBtn.disabled = !(lbs >= CONFIG.MIN_LBS);

  return { items, subtotal, tax, total, lbs };
}

/* ------------ Wiring: lb buttons & quick picks ------------ */
document.querySelectorAll('.qty-btn[data-action]').forEach(btn => {
  btn.addEventListener('click', () => {
    const addon = btn.dataset.addon;
    if (addon) {
      const input = document.querySelector(`input[data-addon="${addon}"]`);
      const cur   = parseInt(input.value, 10) || 0;
      input.value = Math.max(0, btn.dataset.action === 'inc' ? cur + 1 : cur - 1);
    } else {
      // lbs +/-
      const cur = getLbs();
      lbsInput.value = Math.max(0, btn.dataset.action === 'inc' ? cur + 1 : cur - 1);
    }
    recompute();
  });
});

document.querySelectorAll('.pick').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.pick').forEach(x => x.classList.remove('is-active'));
    b.classList.add('is-active');
    lbsInput.value = b.dataset.lbs;
    recompute();
  });
});

document.querySelectorAll('input[type="number"]').forEach(el => {
  el.addEventListener('input', recompute);
});

/* ------------ Wiring: spice picker active state ------------ */
document.querySelectorAll('.spice-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.spice-opt').forEach(o => o.classList.remove('is-active'));
    opt.classList.add('is-active');
  });
});

/* ------------ Build order payload ------------ */
function buildOrder() {
  const { items, subtotal, tax, total, lbs } = recompute();
  const fd = new FormData(form);
  const ref = makeOrderRef();

  const addons = {};
  // notion block matches "🦞 Backyard Boil Orders" column names exactly
  const notion = {
    'Customer Name':  fd.get('customer_name'),
    'Phone':          fd.get('customer_phone'),
    'Pickup Date':    fd.get('pickup_date'),       // YYYY-MM-DD
    'Pickup Time':    fd.get('pickup_time'),       // matches Notion select option (e.g. "11:00am")
    'Spice Level':    fd.get('spice'),             // matches Notion select option (e.g. "2 - Medium")
    'Crawfish lbs':   lbs,
    'Notes':          fd.get('notes') || '',
    'Total':          Number(total.toFixed(2)),
    'Paid':           0,
    'Balance':        Number(total.toFixed(2)),
    'Payment Status': 'Unpaid',
    'Order Status':   'New',
    'Order Source':   'Web Form',
    'Label Printed':  false,
  };

  for (const [key, def] of Object.entries(CONFIG.ADDONS)) {
    const q = getQty(`addon_${key}`);
    if (q > 0) addons[def.label] = q;
    // map to Notion field if defined (always set so blanks stay 0)
    if (def.notion) notion[def.notion] = (notion[def.notion] || 0) + q * def.multiplier;
  }
  // Sauce Qty is the sum of mild + spicy sauce bottles
  notion['Sauce Qty'] = (notion['Mild Sauce'] || 0) + (notion['Spicy Sauce'] || 0);

  return {
    order_ref:       ref,
    submitted_at:    new Date().toISOString(),
    customer: {
      name:  fd.get('customer_name'),
      phone: fd.get('customer_phone'),
      email: fd.get('customer_email') || null,
    },
    pickup: {
      date: fd.get('pickup_date'),
      time: fd.get('pickup_time'),
    },
    boil: {
      lbs,
      spice:  fd.get('spice'),
      addons,
    },
    pricing: {
      crawfish_subtotal: lbs * CONFIG.PRICE_PER_LB,
      addons_subtotal:   subtotal - (lbs * CONFIG.PRICE_PER_LB),
      subtotal,
      tax,
      total,
      price_per_lb:      CONFIG.PRICE_PER_LB,
      tax_rate:          CONFIG.TAX_RATE,
    },
    notes: fd.get('notes') || '',
    // Human-readable receipt line for the kitchen printer
    receipt_text: buildReceiptText({ ref, items, lbs, subtotal, tax, total, fd }),
    line_items: items.filter(i => !i.incl).map(i => ({ name: i.name, price: i.price })),
    // Drop-in mapping for Make.com → Notion "Create a Database Item" module
    notion,
  };
}

function buildReceiptText({ ref, items, lbs, subtotal, tax, total, fd }) {
  const lines = [];
  lines.push(`BACKYARD BOIL — ORDER ${ref}`);
  lines.push(new Date().toLocaleString('en-US'));
  lines.push('--------------------------------');
  lines.push(`Customer: ${fd.get('customer_name')}`);
  lines.push(`Phone:    ${fd.get('customer_phone')}`);
  lines.push(`Pickup:   ${fd.get('pickup_date')} · ${fd.get('pickup_time')}`);
  lines.push(`Spice:    ${fd.get('spice')}`);
  lines.push('--------------------------------');
  items.forEach(it => {
    if (it.incl) {
      lines.push(`  ${it.name}`);
    } else {
      lines.push(`${it.name.padEnd(28)} ${fmt(it.price).padStart(8)}`);
    }
  });
  lines.push('--------------------------------');
  lines.push(`Subtotal${fmt(subtotal).padStart(26)}`);
  if (CONFIG.TAX_RATE > 0) lines.push(`Tax${fmt(tax).padStart(31)}`);
  lines.push(`TOTAL${fmt(total).padStart(29)}`);
  const notes = fd.get('notes');
  if (notes) {
    lines.push('--------------------------------');
    lines.push('Notes:');
    lines.push(notes);
  }
  return lines.join('\n');
}

function makeOrderRef() {
  // Short, human-readable: BB-{yy}{wk}-{4 chars}
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const wk = String(Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7)).padStart(2, '0');
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BB-${yy}${wk}-${rnd}`;
}

/* ------------ Submit ------------ */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // basic required-field check
  const required = form.querySelectorAll('[required]');
  let firstInvalid = null;
  required.forEach(el => {
    if (!el.value.trim()) {
      el.classList.add('invalid');
      if (!firstInvalid) firstInvalid = el;
    } else {
      el.classList.remove('invalid');
    }
  });
  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstInvalid.focus();
    return;
  }
  if (getLbs() < CONFIG.MIN_LBS) {
    lbsInput.classList.add('invalid');
    lbsInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const order = buildOrder();

  submitBtn.disabled = true;
  const origText = submitBtn.textContent;
  submitBtn.textContent = 'Sending…';

  try {
    if (CONFIG.WEBHOOK_URL && !CONFIG.WEBHOOK_URL.startsWith('PASTE_')) {
      const res = await fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error(`Webhook ${res.status}`);
    } else {
      // dev mode — just log it
      console.warn('[Backyard Boil] No webhook configured. Order payload:', order);
      await new Promise(r => setTimeout(r, 400));
    }

    // show confirmation
    orderRef.textContent    = '#' + order.order_ref;
    zelleAmount.textContent = fmt(order.pricing.total);
    zelleHandle.textContent = CONFIG.ZELLE_HANDLE.startsWith('PASTE_')
      ? '— update Zelle handle in script.js —'
      : CONFIG.ZELLE_HANDLE;
    zelleMemo.textContent   = order.order_ref;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  } catch (err) {
    console.error(err);
    alert("Sorry — couldn't send your order. Please text us directly to confirm.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = origText;
  }
});

/* ------------ Modal close + copy ------------ */
closeModal.addEventListener('click', () => {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  form.reset();
  lbsInput.value = 5;
  document.querySelectorAll('.pick').forEach(p => p.classList.toggle('is-active', p.dataset.lbs === '5'));
  document.querySelectorAll('.spice-opt').forEach((o, i) => o.classList.toggle('is-active', i === 1));
  recompute();
});

copyZelle.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(zelleHandle.textContent);
    copyZelle.textContent = 'Copied!';
    setTimeout(() => (copyZelle.textContent = 'Copy'), 1500);
  } catch {
    /* ignore */
  }
});

/* ------------ Misc ------------ */
document.getElementById('year').textContent = new Date().getFullYear();

// initial render
recompute();
