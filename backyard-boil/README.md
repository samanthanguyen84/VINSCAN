# 🦞 Backyard Boil — Website

Static marketing site for Backyard Boil with the existing order form embedded.

```
backyard-boil/
├── index.html   ← landing page (hero, menu, how-it-works, FAQ)
├── order.html   ← existing order form (untouched, posts to your Make webhook)
└── style.css    ← landing-page styles
```

`index.html` is the homepage. The "Order Now" section embeds `order.html` in an iframe — same form, same Make webhook, same Notion database. Nothing about your existing order pipeline changed.

## Deploy

Drag-and-drop the `backyard-boil/` folder to https://app.netlify.com/drop and you're live. Same idea for Vercel / Cloudflare Pages / GitHub Pages.

## Local preview

```bash
cd backyard-boil
python3 -m http.server 8080
# open http://localhost:8080
```
