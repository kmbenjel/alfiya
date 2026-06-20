# Deploying

The repo ships a GitHub Action (`.github/workflows/deploy.yml`) that builds and
publishes on every push to `main`. You only need to flip a few switches once.

## 1. GitHub Pages
1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push (or re-run the workflow). Your site is live at
   `https://<user>.github.io/<repo>/` within a minute, and at your custom domain
   once DNS is set (below).

> The build writes `dist/CNAME` from `config.domain`, so GitHub Pages picks up the
> custom domain automatically. You can also set it under **Settings → Pages →
> Custom domain** (GitHub will offer “Enforce HTTPS” once the cert is issued).

## 2. Custom domain
Set `"domain": "poem.example.com"` in `content/poem.config.json` (bare host, no
`https://`). That value becomes the `CNAME`, the canonical URL, OG/Twitter URLs,
the sitemap, and the manifest scope.

## 3. Cloudflare (DNS + CDN + SSL) — same setup as hmittou
Use Cloudflare for DNS and edge caching:

1. **DNS → Add record**
   - Type `CNAME`, Name `poem` (your subdomain), Target `<user>.github.io`,
     **Proxy: Proxied** (orange cloud). For an apex domain, use a `CNAME`/`ALIAS`
     to `<user>.github.io` (Cloudflare flattens it).
2. **SSL/TLS → Overview → Full** (not “Flexible” — GitHub Pages serves HTTPS).
   Enable **Always Use HTTPS** and **Automatic HTTPS Rewrites**.
3. **Caching** — defaults are fine; the site is fingerprinted (`app.min.js?v=<hash>`)
   and the service worker bumps its cache name on every JS change, so updates
   propagate cleanly. Optionally enable **Cloudflare Web Analytics** (the CSP
   already allows `static.cloudflareinsights.com`).
4. In GitHub **Settings → Pages**, keep the custom domain set and **Enforce HTTPS**
   on once the certificate is issued.

## Updating a live site
Edit `content/poem.txt` / `content/poem.config.json` and commit — the Action
rebuilds and redeploys. Installed PWAs refresh on their own schedule (the service
worker re-caches when the build hash changes); a hard reload or reinstall forces it.
