# So7baFit Web Translator Extension — Full Audit

**Date:** 2026-08-29  
**Scope:** `E:\.env\Me\So7baFit\extension` (+ related backend `web-translator` + frontend dashboard studio)  
**Status:** Audit only (no product rewrite in this pass)

---

## 1. Current Architecture

### 1.1 Layout

```
extension/
  package.json              # build scripts only (no runtime deps)
  scripts/build.mjs         # copies src → dist/chrome|firefox, injects API URLs, generates PNG icons
  src/
    manifest.chrome.json    # MV3 (service_worker)
    manifest.firefox.json   # MV3 (background.scripts + gecko id)
    background.js           # message hub, context menu, Alt+T, API calls
    content.js              # page UI (Shadow DOM), dblclick / selection chip
    popup/
      popup.html | popup.js | popup.css
    shared/
      api.js | config.js | i18n.js
  dist/chrome | dist/firefox   # load-unpacked outputs
```

### 1.2 Runtime flow

```
Page (any http/https)
  ├─ dblclick word / select phrase → content.js
  ├─ context menu “Translate” / Alt+T → background → content
  └─ Shadow DOM card: loading → translation → Save / Open website

Popup
  ├─ Pairing code → POST /web-translator/auth/exchange → JWT in chrome.storage.local
  ├─ Settings (langs, locale, dblclick, selection chip)
  └─ Recent + Saved lists (API)

Backend (Nest)
  /web-translator/lookup | words | recent | settings | auth/pairing | auth/exchange

Dashboard (Next.js)
  /dashboard/web-translator  → WebTranslatorStudio (overview / words / extension pairing / settings)
```

### 1.3 Important product boundary

| Capability | Inside Next.js dashboard alone | Needs browser extension |
| --- | --- | --- |
| Manual lookup box, word bank, settings, pairing UI | ✅ already | optional companion |
| Double-click / select text on **any** website | ❌ impossible (browser sandbox) | ✅ content script |
| Context menu / Alt+T on other tabs | ❌ | ✅ |

**Conclusion:** Merging into the Frontend repo is about **colocation + shared logic**, not replacing the content-script runtime. A real “works on any site” experience **must** keep an MV3 extension package.

---

## 2. What Already Works (logic review)

Verified against source + backend contracts (not a live Chrome load in this pass):

| Feature | Status | Evidence |
| --- | --- | --- |
| Build Chrome + Firefox packages | ✅ Works | `scripts/build.mjs` copies assets, rewrites `__API_BASE__` / `__WEB_BASE__` |
| Dev/prod API bases | ✅ Works | `build:dev` → `localhost:8083`, `build:all` → `api.so7bafit.com` |
| Account pairing (code → JWT) | ✅ Complete | Popup `CONNECT` → `extApi.exchange` → storage; dashboard generates code |
| Token refresh on 401 | ✅ Complete | `shared/api.js` → `/auth/refresh` |
| Double-click translate | ✅ Mostly | content `dblclick` + `LOOKUP` via background |
| Multi-word selection chip | ✅ Mostly | `mouseup` when ≥2 words |
| Context menu translate | ✅ Complete | `contextMenus` + `TRANSLATE_TEXT` |
| Keyboard shortcut Alt+T | ✅ Complete | `commands` + inject content if missing |
| On-page result card (Shadow DOM) | ✅ Complete | closed shadow + basic styles |
| Save word from card | ⚠️ Likely works, fragile | sends full lookup object; depends on ValidationPipe whitelist |
| Popup recent / saved lists | ✅ Complete | `RECENT` + `WORDS` (limit 12/20, UI shows 5) |
| Settings sync local + server | ✅ Complete | local always; server when logged in |
| i18n EN/AR in popup + card labels | ✅ Complete | `shared/i18n.js` |
| Dashboard companion studio | ✅ Separate product surface | `WebTranslatorStudio.jsx` + backend module |

Backend lookup is real (Meta translate + optional Free Dictionary for EN words + optional AI enrich), with rate limits.

---

## 3. What Is Broken / Fragile

1. **`popup.js` import path in `src/` is wrong for source tree**  
   File lives at `src/popup/popup.js` but imports `./shared/i18n.js`.  
   Build **copies** popup to `dist/popup.js`, so **dist works**, source tree does not. Easy to break if someone “fixes” imports without updating the build.

2. **`contextMenus.create` on every `onInstalled`**  
   Updates can throw duplicate-id errors; menu may fail silently after extension update.

3. **Firefox word pick likely broken**  
   `wordAt()` uses `range.expand?.('word')` (non-standard / WebKit-ish). Without it, double-click may send empty/partial text on Firefox.

4. **Save from content card does not send `sourceUrl` / `sourceTitle`**  
   Lookup request has them; lookup response does not echo them; save payload is the lookup response → page provenance lost on save.

5. **Save error handling**  
   Save click does not catch failures or re-enable button; UI can show “Saved” only on success path, but silent failure leaves user unsure.

6. **Placeholder icons**  
   Build generates solid indigo PNGs — not a branded icon set.

7. **No automated extension tests**  
   Only backend util specs exist for web-translator.

8. **Current `dist` points at localhost**  
   Loaded unpacked builds may be `--dev` builds; production users need `build:all`.

---

## 4. Missing Features (product)

- Delete / edit saved words from popup  
- Search/filter in popup word list  
- Click recent/saved row → reopen card or open word detail  
- Offline / cache last lookups  
- Pronunciation audio  
- Flashcards / spaced repetition (dashboard + extension)  
- Site allowlist/denylist (don’t inject on banking, etc.)  
- Per-site disable toggle  
- Dark mode for card/popup  
- Richer dictionary (synonyms, multiple senses)  
- Progress / streak learning UX  
- Sync settings from server → extension on connect (`me().settings` unused in popup init beyond user)  
- Locale-aware website open (`/{locale}/dashboard/...`)

---

## 5. Technical Issues

| Area | Issue |
| --- | --- |
| Structure | Extension is a **sibling** of `frontend/`, not integrated; no workspace scripts in frontend `package.json` |
| Duplication | i18n strings, settings shape, API paths duplicated vs `frontend/src/lib/web-translator` |
| Messaging | Content is classic script; background/popup are ES modules — fine, but no shared types |
| Build | Copy-only build (no bundler, no minify, no lint) |
| Manifest | Broad `http://*/*` + `https://*/*` content scripts — high privilege surface |
| Validation risk | Extra fields on save (`provider`, `saved`, `websitePath`) if `forbidNonWhitelisted` is on |
| State | Settings toggles live in storage; content reads via `GET_STATE` each time (OK) but no live push when popup changes mid-page without refresh |
| Errors | Popup `loadLists` swallows all errors |

---

## 6. UX / UI Issues

- Card cannot be dragged; may cover the selected word  
- No Escape-to-close documented (click-outside only)  
- Loading state is minimal  
- Selection chip can feel noisy on any drag-select  
- Popup lists are tiny (5 rows) with no “open full library” deep link with locale  
- Gradient indigo UI ≠ So7baFit WhatsApp green brand  
- “Open on website” ignores current UI locale path prefix  

---

## 7. Security Issues

| Risk | Severity | Notes |
| --- | --- | --- |
| JWT + refresh in `storage.local` | Medium | Normal for extensions; protect with short TTL / revoke on disconnect (disconnect clears — good) |
| Content script on all sites | Medium–High | Can run on sensitive sites; prefer optional host permissions or exclude list |
| Pairing code exchange | Low–Medium | Backend rate-limits exchanges; ensure codes are single-use/TTL (service has TTL constants) |
| XSS | Low | `esc()` used for card HTML — good |
| Host permissions include localhost | Low | Fine for dev builds; keep out of store listing if publishing prod-only package |
| `window.open` to webBase | Low | Ensure `webBase` cannot be overwritten by untrusted message (only from storage/config — OK) |

---

## 8. Performance Issues

- Content script injected on **every** page even when logged out  
- Full card rebuild via `innerHTML` each paint (fine at this scale)  
- Lookup always hits network (no short TTL memory cache in content/background)  
- Backend lookup can be slow (translate + dictionary + AI enrich) — UI has no cancel/timeout messaging  

---

## 9. Recommended Improvements (priority)

1. Fix Firefox word extraction; harden save payload (whitelist fields + sourceUrl).  
2. Fix context menu create-or-update.  
3. Sync server settings into extension on connect.  
4. Add site exclusions + “pause on this site”.  
5. Colocate under frontend monorepo; share API types/client constants.  
6. Better card UX: Esc, pin, copy translation, error toast.  
7. Learning features in dashboard first, thin extension entry points later.  

---

## 10. Recommended Architecture inside the React / Next project

**Do not** try to run content scripts “as React pages”. Keep MV3 extension as a **package** inside the frontend workspace.

```
frontend/
  src/                          # Next.js app (unchanged entry)
    lib/web-translator/         # shared API + types + i18n keys (single source)
    app/.../web-translator/     # dashboard studio
  extensions/
    web-translator/             # MV3 package (moved from repo-root/extension)
      src/                      # background, content, popup
      scripts/build.mjs
      package.json
      dist/                     # gitignored build output
  package.json                  # scripts: "ext:build", "ext:build:dev"
```

### Rules

- **Next app** owns account UX, word bank, pairing generation, study features.  
- **Extension** owns page capture + lightweight overlay + thin API bridge.  
- Shared: endpoint paths, DTO types, i18n keys, language enums — imported by extension build via copy/bundle from `src/lib/web-translator/shared/*` (plain JS/TS compiled for extension).  
- Extension build remains **independent**: `npm run ext:build` must not require `next build`.  
- Do not import React into content.js (keep overlay vanilla or Preact island later if needed).

### What “same idea inside the project” means in practice

1. Developers work in one repo (`frontend`).  
2. Users still install the unpacked / store extension for any-site translate.  
3. Dashboard remains the full library viewer (already exists).  

---

## 11. Implementation Plan (Phases)

### Phase 0 — Guardrails (½ day)
- Document load steps; ensure `dist` gitignored; add `ext:build:dev` / `ext:build` to frontend scripts after move.  
- **Verify:** frontend `npm run dev` unchanged; extension builds.

### Phase 1 — Stabilize current extension (1–2 days) **[start here]**
- Fix save payload mapping (`text`, `translation`, langs, enrichment, `sourceUrl`).  
- Fix context menu idempotent create.  
- Firefox-safe `wordAt`.  
- Esc / better dismiss; save error feedback.  
- Apply server settings on `CONNECT` / `ME`.  
- **Verify:** lookup + save + popup lists on Chrome; smoke Firefox.

### Phase 2 — Colocate under `frontend/extensions/web-translator` (1 day)
- Move folder; update README paths; wire npm scripts; no behavior change.  
- **Verify:** Next + extension build both green.

### Phase 3 — Share logic with dashboard (1–2 days)
- Extract shared constants/i18n/API paths to `frontend/src/lib/web-translator/shared`.  
- Extension build copies or bundles that shared slice.  
- Align website open links with `/{locale}/...`.  
- **Verify:** no duplicated divergent endpoint strings.

### Phase 4 — UX polish (2 days)
- Card redesign (brand, copy button, open word).  
- Popup: open full library, empty states, error banners.  
- Optional host permissions / exclude list.  
- Real icons.

### Phase 5 — Learning product (later)
- Flashcards / review queue in dashboard; extension “Save & add to review”.  
- Optional offline last-N cache.

---

## 12. Explicit non-goals / misconceptions

- **Cannot** make double-click-on-Google work from a React route alone.  
- **Should not** rewrite working content/background in React without a strong reason.  
- **Should not** merge extension bundle into the Next client bundle (wrong runtime).

---

## 13. Verdict

The extension is a **small but real MV3 product**: pairing, translate overlay, save, recent/saved, settings, shortcuts — wired to a solid Nest `web-translator` API and a dashboard studio. It is **not** a fake UI shell.

Main gaps: **Firefox word picking**, **save provenance**, **update-time context menu**, **repo colocation / shared code**, and **learning UX**.

**Recommended next step:** Phase 1 stabilizations in place, then Phase 2 move under `frontend/extensions/`.
