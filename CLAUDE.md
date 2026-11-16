# CLAUDE.md

Personal academic website of Frederik Holtel: **plain HTML + CSS, no framework, no build step, no JavaScript.** (It was briefly an al-folio/Jekyll site; that was deliberately thrown away. Don't reintroduce a static site generator or theme without being asked.)

**Git rule: never run `git add`, `git commit` or `git push` (or anything else that stages, commits or pushes) on your own. The user does that themselves.** Edit files and tell the user what changed; leave version control to them. Also don't create remote repos or publish anything without an explicit go.

## Structure

```
index.html               About / home (bio, contact links, research interests, news)
research/index.html      Work in progress, presentations, visits, refereeing
publications/index.html  Publications
cv/index.html            CV (HTML only)
404.html                 Not-found page (GitHub Pages serves it automatically)
assets/css/style.css     The only stylesheet (design tokens in :root, dark mode via prefers-color-scheme)
assets/img/              prof_pic.jpg (full uncropped photo, 900×1105, floated right on the home page with the text wrapping around it; EXIF stripped), favicon.svg
CNAME                    Custom domain for GitHub Pages — keep it
.nojekyll                Tells GitHub Pages to serve files as-is (no Jekyll processing) — keep it
```

Header, nav and footer are duplicated in every page. When changing them, change all five HTML files; mark the current page's nav link with `aria-current="page"`.

## Content rules (user's decisions)

- **No CV PDF** on the site or in the repo; don't add download links.
- Never publish phone number or home address. Email (frederik.holtel@rptu.de) and LinkedIn are public.
- Publications: only the *Journalism Practice* paper for now. No search/filter box.
- No separate teaching page; teaching is listed in the CV only. The CV has no "work in progress" section (that lives on the research page).
- No external fonts or third-party embeds (GDPR); system font stacks only.
- Strip EXIF/GPS metadata from any photo before adding it.

## Local preview

```bash
python3 -m http.server 4000 --bind 127.0.0.1    # → http://localhost:4000/
```

Root-relative links (`/research/`) require serving from the repo root, not opening files directly.

## Domain & hosting

- **Domain registrar / DNS: spaceship.com** (`frederikholtel.com`, and `frederikholtel.de` for the redirect; DNS is managed in the Spaceship dashboard → Domain list → domain → Advanced DNS).
- **Hosting: GitHub Pages**, public repo `frederikho/frederikholtel.com`, served directly from branch `main`, folder `/` (Settings → Pages → Deploy from a branch). No GitHub Actions workflow needed.
- DNS for frederikholtel.com at Spaceship: apex `A` records → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 (optional `AAAA` → 2606:50c0:8000::153, …8001::153, …8002::153, …8003::153); `www` `CNAME` → `frederikho.github.io`. Then tick "Enforce HTTPS" in Pages settings.
- frederikholtel.de: 301 URL redirect (Spaceship URL Redirect records for `@` and `www`) → `https://frederikholtel.com`. If HTTPS on .de fails with Spaceship's redirect, fall back to Cloudflare (free) with a redirect rule.
