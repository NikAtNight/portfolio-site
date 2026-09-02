# nikhilkapadia.pages.dev

Personal site. One hand-written `index.html`, a few static assets, and a Pages Function in `functions/` that renders the GitHub contribution chart.

## Deploy

```sh
./deploy.sh
```

That copies the static files into `dist/` and uploads them with wrangler. The Pages project is not connected to Git, so pushing to GitHub does not deploy anything. Requires `npx` (Node) and a wrangler login (`npx wrangler login` once).

## Editing

Everything visible lives in `index.html`. `og-src.html` is the source for the social card image; re-render `og.png` from it if the card changes. `archive/` holds old versions and is not deployed.
