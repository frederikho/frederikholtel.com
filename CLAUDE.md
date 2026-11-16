# CLAUDE.md

Personal academic website of Frederik Holtel: **plain HTML + CSS, no framework, no build step.** The only JavaScript: `assets/js/email.js` (email spam protection), `assets/js/lda-plot.js` (self-contained interactive plot for the LDA blog post, no libraries) and the GoatCounter analytics script on every page. (It was briefly an al-folio/Jekyll site; that was deliberately thrown away. Don't reintroduce a static site generator or theme without being asked.)

**Git rule: never run `git add`, `git commit` or `git push` (or anything else that stages, commits or pushes) on your own. The user does that themselves.** Edit files and tell the user what changed; leave version control to them. Also don't create remote repos or publish anything without an explicit go.

## Structure

```
index.html               About / home (bio, contact links, research interests; no news section)
research/index.html      Work in progress, presentations, visits, refereeing
publications/index.html  Publications
cv/index.html            CV (HTML only)
blog/index.html          Blog list (newest first; one <li> per post)
blog/<slug>/index.html   One folder per post; images in assets/img/blog/
datenschutz/index.html   Datenschutzerklärung (German privacy policy: GitHub Pages hosting, GoatCounter), linked from every footer
impressum/index.html     Impressum (German legal notice, § 5 DDG), linked from every footer — STILL MISSING the postal address (§ 5 DDG requires one); user will add it
404.html                 Not-found page (GitHub Pages serves it automatically)
assets/css/style.css     The only stylesheet (design tokens in :root, dark mode via prefers-color-scheme)
assets/js/lda-plot.js    Interactive LDA plot (port of observablehq.com/@frederikho/interactive-lda-plot, CC BY-SA 4.0), used by blog/lda-interactive/
assets/js/email.js       Builds mailto links from reversed data-u/data-d attributes (spam protection)
assets/img/              prof_pic.jpg (full uncropped photo, 900×1105, floated right on the home page with the text wrapping around it; EXIF stripped), favicon.svg
robots.txt               Allows all crawlers, points to the sitemap
sitemap.xml              List of indexable pages (www URLs). Add new pages/blog posts here; Impressum, Datenschutz, 404 are left out (noindex)
CNAME                    Custom domain for GitHub Pages — keep it
.nojekyll                Tells GitHub Pages to serve files as-is (no Jekyll processing) — keep it
```

Header, nav and footer are duplicated in every page. When changing them, change every HTML file (find them with `find . -name '*.html' -not -path './.git/*'`); mark the current page's nav link with `aria-current="page"`.

## Content rules (user's decisions)

- **No CV PDF** on the site or in the repo; don't add download links.
- Never publish the private mobile number or home address. Public: email, LinkedIn, the RPTU office (Building 42, Room 42-412, Gottlieb-Daimler-Str., 67663 Kaiserslautern), the office phone +49 631 205-4104 and the Calendly booking link (https://calendly.com/frederik-holtel/30min). The Impressum address is user-provided.
- Never write the email address in plain text in HTML: use `<a class="js-email" href="#" data-u="letloh.kirederf" data-d="ed.utpr">frederik.holtel [at] rptu.de</a>` and include `<script src="/assets/js/email.js" defer></script>` on that page.
- Publications: only the *Journalism Practice* paper for now. No search/filter box.
- No separate teaching page; teaching is listed in the CV only. The CV has no "work in progress" section (that lives on the research page).
- No external fonts or third-party embeds (GDPR); system font stacks only. The only exception is the GoatCounter analytics script (cookieless, no consent banner needed). Every page ends with `<script data-goatcounter="https://frederikholtel.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>` before `</body>`; add it to new pages. Dashboard: https://frederikholtel.goatcounter.com/. If tracking changes, update `datenschutz/index.html`.
- Strip EXIF/GPS metadata from any photo before adding it.

## SEO

Every indexable page has a unique `<title>`, a meta description, a canonical www URL, and Open Graph tags (`og:image` = prof_pic.jpg unless the page has its own image) plus `twitter:card`. Home has `Person` JSON-LD, the blog post `BlogPosting`, publications `ScholarlyArticle`. Impressum, Datenschutz and 404 are `noindex`. A new page or post needs all of this, and an entry in `sitemap.xml`.

Republished articles (e.g. `blog/lda-interactive/`, first published in Towards Data Science on 20 Feb 2023) keep `rel=canonical` pointing to the original and stay out of `sitemap.xml`, so search engines don't treat them as duplicate content.

## Local preview

```bash
python3 -m http.server 4000 --bind 127.0.0.1    # → http://localhost:4000/
```

Root-relative links (`/research/`) require serving from the repo root, not opening files directly.

## Domain & hosting

- **Domain registrar / DNS: spaceship.com** (`frederikholtel.com`, and `frederikholtel.de` for the redirect; DNS is managed in the Spaceship dashboard → Domain list → domain → Advanced DNS).
- **Hosting: GitHub Pages**, public repo `frederikho/frederikholtel.com`, served directly from branch `main`, folder `/` (Settings → Pages → Deploy from a branch). No GitHub Actions workflow needed.
- **Canonical address: https://www.frederikholtel.com/** (user's choice). `CNAME` contains `www.frederikholtel.com`, so GitHub redirects the bare domain to www. All canonical/og URLs in the HTML use the www form.
- Changing the custom domain via the GitHub API or UI makes GitHub commit to the `CNAME` file on `main`. That counts as a commit, so don't do it without the user's go-ahead, and tell them to `git pull` afterwards.
- DNS for frederikholtel.com at Spaceship: apex `A` records → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 (optional `AAAA` → 2606:50c0:8000::153, …8001::153, …8002::153, …8003::153); `www` `CNAME` → `frederikho.github.io`. Then tick "Enforce HTTPS" in Pages settings.
- frederikholtel.de: Spaceship masked (framed) URL forwarding to https://frederikholtel.com (which then redirects to www), for `@` and `www` (protected A record 15.197.162.184 = Spaceship's forwarding service). The user chose masked over a 301 on purpose. Never put GitHub IPs on .de.
