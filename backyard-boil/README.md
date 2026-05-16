# 🦞 Backyard Boil — Ordering Website

Static HTML/CSS/JS ordering page for Backyard Boil (Viet Cajun crawfish, Austin TX).
Customers build their order, submit the form, and get Zelle pay instructions.
Orders flow into your existing **🦞 Backyard Boil Orders** Notion database via a Make.com webhook,
and the existing **Print** button in Notion handles label/receipt printing.

```
[Customer] ──► [Static site]
                   │  POST JSON
                   ▼
              [Make.com webhook]
                   │
                   ├──► [Notion module] → 🦞 Backyard Boil Orders (new row, Order Status="New", Payment Status="Unpaid", Order Source="Web Form")
                   └──► (optional) email/SMS receipt confirmation
```

The site is 3 files, no build step. Host on Netlify, Vercel, GitHub Pages, Cloudflare Pages, or any static host.

---

## 1 · Configure the site

Open `script.js` and edit the `CONFIG` block at the top:

```js
const CONFIG = {
  WEBHOOK_URL:  'https://hook.us2.make.com/xxxxxxxxxxxxxxx',  // ← from Make
  ZELLE_HANDLE: 'samanthanguyen84@gmail.com',                 // ← your Zelle email/phone
  PRICE_PER_LB: 12,
  MIN_LBS:      3,
  TAX_RATE:     0,    // set to 0.0825 if you want Austin sales tax added
  ...
};
```

That's it for the front-end.

---

## 2 · Set up the Make.com scenario

In Make.com:

1. **Create a new scenario.**
2. Add a **Webhooks → Custom webhook** module as the trigger.
   - Click *Add* → name it `Backyard Boil — Web Orders` → *Save*.
   - Copy the webhook URL Make gives you and paste it into `CONFIG.WEBHOOK_URL` in `script.js`.
   - Click *Re-determine data structure*, then submit a test order from the site so Make can learn the JSON shape.
3. Add a **Notion → Create a Database Item** module after the webhook.
   - Connect your Notion account (the one that owns the `🦞 Backyard Boil Orders` database).
   - Database: **🦞 Backyard Boil Orders**.
   - Map fields from the incoming webhook's `notion` object — the keys already match your Notion column names exactly:

     | Notion column     | Map from webhook                |
     |-------------------|---------------------------------|
     | Customer Name     | `1.notion.Customer Name`        |
     | Phone             | `1.notion.Phone`                |
     | Pickup Date       | `1.notion.Pickup Date`          |
     | Pickup Time       | `1.notion.Pickup Time`          |
     | Spice Level       | `1.notion.Spice Level`          |
     | Crawfish lbs      | `1.notion.Crawfish lbs`         |
     | Corn              | `1.notion.Corn`                 |
     | Sausage lbs       | `1.notion.Sausage lbs`          |
     | Potatoes          | `1.notion.Potatoes`             |
     | Mild Sauce        | `1.notion.Mild Sauce`           |
     | Spicy Sauce       | `1.notion.Spicy Sauce`          |
     | Sauce Qty         | `1.notion.Sauce Qty`            |
     | Total             | `1.notion.Total`                |
     | Paid              | `0`                             |
     | Balance           | `1.notion.Total`                |
     | Payment Status    | `Unpaid`                        |
     | Order Status      | `New`                           |
     | Order Source      | `Web Form`                      |
     | Notes             | `1.notion.Notes`                |
4. *(Optional)* Add a **Webhooks → Webhook response** module so the site gets a 200 OK back faster.
5. Turn the scenario **ON**.

### Printing

You already have a **Print** button in the Notion database — that handles printing once a row exists. If you want **auto-print on every new order**, two options:

- **Notion automation (easiest):** In Notion, edit the database → *Automations* → add `When page added to database → Run button "Print"`.
- **Make-driven print:** Add a third Make module after the Notion step (e.g. PrintNode, Google Cloud Print, or `HTTP → Make a request` to a local print server). The webhook payload includes a pre-formatted `receipt_text` field you can feed directly to a thermal printer.

---

## 3 · Test locally

```bash
cd backyard-boil
python3 -m http.server 8080
# then open http://localhost:8080
```

While `WEBHOOK_URL` still says `PASTE_…`, submissions are logged to the browser console instead of sent anywhere — useful for designing the form without polluting your Notion DB.

---

## 4 · Deploy

Easiest options:

- **Netlify drop:** drag-and-drop the `backyard-boil/` folder at https://app.netlify.com/drop.
- **Cloudflare Pages / Vercel:** connect this repo, set the build directory to `backyard-boil/`.
- **GitHub Pages:** push this folder, enable Pages on the branch.

After deploy, point your domain (e.g. `order.backyardboil.com`) at the host.

---

## File layout

```
backyard-boil/
├── index.html   ← markup
├── style.css    ← all styles (one file, no framework)
├── script.js    ← form logic, live total, Make webhook POST
└── README.md    ← this file
```

## What the JSON payload looks like

```json
{
  "order_ref": "BB-2620-A4K9",
  "submitted_at": "2026-05-16T22:30:00Z",
  "customer": { "name": "Jane Doe", "phone": "(512) 555-0123", "email": null },
  "pickup":   { "date": "2026-05-23", "time": "12:30pm" },
  "boil":     { "lbs": 5, "spice": "2 - Medium", "addons": { "Whole corn": 2 } },
  "pricing":  { "crawfish_subtotal": 60, "addons_subtotal": 4, "subtotal": 64, "tax": 0, "total": 64, ... },
  "notes": "no onions please",
  "receipt_text": "BACKYARD BOIL — ORDER BB-2620-A4K9\n…",
  "notion": {
    "Customer Name": "Jane Doe",
    "Phone": "(512) 555-0123",
    "Pickup Date": "2026-05-23",
    "Pickup Time": "12:30pm",
    "Spice Level": "2 - Medium",
    "Crawfish lbs": 5,
    "Corn": 2,
    "Sausage lbs": 0,
    "Potatoes": 0,
    "Mild Sauce": 0,
    "Spicy Sauce": 0,
    "Sauce Qty": 0,
    "Total": 64,
    "Paid": 0,
    "Balance": 64,
    "Payment Status": "Unpaid",
    "Order Status": "New",
    "Order Source": "Web Form",
    "Notes": "no onions please",
    "Label Printed": false
  }
}
```

The `notion` block is the easiest thing to map in Make — each key is already the exact Notion column name.
