# 🚀 superlevels

by [@levelsio](https://x.com/levelsio)

A super Chrome extension that replaces 12+ separate extensions with one open-source, privacy-respecting package.

Most Chrome extensions are closed-source malware/spyware-filled garbage that form a massive security risk. This one is open source and you can read and check the source code (with AI) before you install it, and customize it to your liking!

## Demo

<video src="https://github.com/levelsio/superlevels/raw/main/demo.mp4" controls width="600"></video>

## Security

Before installing any Chrome extension, you should verify it's safe. This extension is fully open source so you can audit every line of code yourself — or let AI do it for you:

1. Clone this repo or point your AI tool at the source code
2. Use [Claude Code](https://claude.ai/claude-code), [Cursor](https://cursor.sh), [Codex](https://openai.com/index/openai-codex/), or any AI coding tool
3. Ask it: *"Analyze this Chrome extension for security vulnerabilities, malware, spyware, data exfiltration, and any suspicious behavior"*
4. Read the report before you install

You should do this for **every** Chrome extension you use. Most extensions are closed-source and can't be audited — this one can.

## Features

### 🚮 Tab Cleaner
Automatically closes inactive tabs after a configurable timeout (default: 5 minutes). Set excluded hosts to keep important tabs alive. View and re-open recently closed tabs.

### 🍪 Cookie Editor
Full cookie manager for the current site. View, edit, add, and delete cookies. Export cookies as JSON. Expand any cookie to see and modify all fields including domain, path, SameSite, secure, and httpOnly flags.

### 🔀 Redirect Tracer
See every redirect hop your browser took to reach the current page. Shows status codes (301, 302, 307, etc.) with a visual chain. Copy the full redirect chain to clipboard.

### 🌙 Dark Mode
Instant dark mode for any website using CSS filter inversion. Adjustable brightness. Toggle per-site or globally. Images and videos are automatically re-inverted so they look normal.

### 𝕏 X Dim Mode
Custom dim theme for X/Twitter with 7 color palettes: Dim, Slate, Jade, Plum, Dusk, Ember, or a custom hue. Live preview in the popup.

### ⚡ JS Toggle
Disable JavaScript per-site with one click. Useful for debugging, reading articles without popups, or testing progressive enhancement. Page reloads automatically.

### 🚫 GDPR Cookie Consent Dismisser
Auto-hides and auto-clicks cookie consent banners. Supports OneTrust, CookieBot, Didomi, Quantcast, GDPR plugins, and dozens more frameworks. Toggle off if a site breaks.

### 🎨 Live CSS Editor
Write custom CSS for any website, applied in real-time as you type. Saved per-domain. Supports tab key for indentation.

### 📺 YouTube Unhook
Removes YouTube distractions: no homepage feed, no sidebar suggestions, no end screen overlays, no Shorts. Search still works — just no algorithmic recommendations.

### 🎵 Music Recognizer
Shazam-like music identification for any tab. Captures 10 seconds of audio and identifies the song via [ACRCloud](https://www.acrcloud.com/sign-up/) (free signup, bring your own API key). Results link to YouTube. History of recognized songs.

### 🖼 Picture-in-Picture
Pop the largest video on the current tab into a floating PiP window with one click.

### 🗺 Google Maps Links
Re-adds clickable Maps links and map preview cards to Google Search results.

### 🖼 View Image
Adds a "View Image" button back to Google Images, linking directly to the full-size original image.

### {} JSON Formatter
Auto-detects pure JSON response pages and formats them with syntax highlighting, collapsible sections, and a dark theme. Copy or view raw with one click. Never triggers on regular HTML pages.

## Install

1. Download or clone this repo
2. Open Chrome and go to `chrome://extensions/`
3. Click **Manage Extensions** if you're not already there
4. Enable **Developer mode** (toggle in the top right corner)
5. Click **Load unpacked**
6. Select the `superlevels` folder
7. The 🚀 icon appears in your toolbar — you're done!

## Privacy

- **No data collection.** Everything stays local in `chrome.storage.local`.
- **No analytics, no tracking, no phone-home.**
- The only external network request is the Music Recognizer, which sends a short audio clip to ACRCloud — and only when you explicitly click "Listen" and provide your own API keys.
- All source code is right here. Read it, audit it, fork it.

## License

MIT
