# So7baFit Web Translator extension

Lives inside the frontend app: `frontend/extension`.

Double-click a word (or select text) on any page. The popup talks to the So7baFit API — translation provider keys stay on the server.

## Build (from `frontend/`)

```bash
cd frontend
npm run extension:build:dev    # localhost API (8083) + web (3000)
npm run extension:build        # production so7bafit.com / api.so7bafit.com
```

Or from this folder:

```bash
cd frontend/extension
npm run build:dev
npm run build:all
```

Outputs:

- `dist/chrome` — Chrome, Edge, Brave, Opera (MV3)
- `dist/firefox` — Firefox (MV3)

## Load unpacked

- Chrome / Edge / Brave / Opera: `chrome://extensions` → Developer mode → Load unpacked → `frontend/extension/dist/chrome`
- Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → `frontend/extension/dist/firefox/manifest.json`

## Connect account

1. Sign in on the website.
2. Open **Web Translator** → Extension → Generate code.
3. Paste the code in the extension popup.

## Features

- Double-click word translate
- Selection chip (any selection, including one word)
- Right-click Translate + `Alt+T`
- Save / listen (TTS) / open on website
- Popup: recent, saved search, delete saved words
- Local lookup cache (session memory in background)

## Permissions

- `storage` — tokens and settings
- `contextMenus` — right-click Translate
- `activeTab` / `scripting` — inject for keyboard shortcut
- Host permissions only for the So7baFit API and website

Content scripts run on http(s) pages. UI is Shadow DOM so host CSS cannot restyle it.
