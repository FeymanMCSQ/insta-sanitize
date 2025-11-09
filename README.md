# Instagram Sanitizer - Comprehensive Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File-by-File Breakdown](#file-by-file-breakdown)
4. [How It Works - Complete Flow](#how-it-works---complete-flow)
5. [Features & Capabilities](#features--capabilities)
6. [Installation & Usage](#installation--usage)
7. [Technical Details](#technical-details)

---

## Overview

**Instagram Sanitizer** is a Chromium-based browser extension (Chrome, Edge, Brave, etc.) designed to remove all distracting content from Instagram, allowing users to see only posts from accounts they follow. The extension operates at multiple levels:

- **Network Level**: Intercepts and filters GraphQL API responses before they reach the page
- **DOM Level**: Observes and hides unwanted elements as they appear
- **Navigation Level**: Blocks access to Explore and Reels pages
- **Heuristic Level**: Uses pattern matching to identify and hide suggested/sponsored content

The extension is built using Manifest V3 and employs a sophisticated multi-layered filtering system to ensure comprehensive content removal.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Extension                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Background  │    │    Popup     │    │   Options    │  │
│  │  Service     │    │   (UI)      │    │   Page (UI)  │  │
│  │  Worker      │    │             │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │           │
│         └───────────────────┴────────────────────┘           │
│                           │                                  │
│                    chrome.storage.sync                       │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Instagram Page (www.instagram.com)              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Content Script World (Isolated)              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │   main.js    │  │  filters.js  │  │ observe  │ │   │
│  │  │  (Orchestr.) │  │  (DOM Filter)│  │  (Watch) │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │  settings.js │  │   routes.js  │  │ messaging│ │   │
│  │  │  (Config)    │  │  (Navigation)│  │  (IPC)   │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  │  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ follow-cache │  │ caughtup-gate│              │   │
│  │  │  (Learning)  │  │  (Trigger)   │              │   │
│  │  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                    window.postMessage                        │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Page Script World (Page Context)            │   │
│  │  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ page-guards  │  │page-feed-    │               │   │
│  │  │  (Network    │  │ filter.js    │               │   │
│  │  │   Blocker)  │  │ (JSON Filter)│               │   │
│  │  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Concepts

1. **Content Script World**: Runs in an isolated JavaScript context, can access `chrome.*` APIs but not page variables
2. **Page Script World**: Runs in the page's own context, can access page variables and intercept `fetch`/`XMLHttpRequest`
3. **Communication**: Uses `window.postMessage` to bridge between the two worlds
4. **Storage**: Uses `chrome.storage.sync` for cross-device settings persistence

---

## File-by-File Breakdown

### 📄 `manifest.json`
**Purpose**: Extension configuration and permissions declaration

**Key Components**:
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**:
  - `storage`: For saving user settings
  - `declarativeNetRequest`: For URL-based redirects (Explore/Reels blocking)
  - `tabs`: For communicating with Instagram tabs
- **Content Scripts**: Injects `content.loader.js` at `document_start` to ensure early initialization
- **Web Accessible Resources**: Makes all content scripts available to the page context via `chrome.runtime.getURL()`
- **Declarative Net Request**: Uses `rules.json` to redirect Explore/Reels URLs to home page

**How It Works**:
- When Instagram loads, the browser injects `content.loader.js` before the page's JavaScript runs
- The declarative net request rules automatically redirect `/explore/` and `/reels/` URLs to `/`
- All content scripts are marked as web-accessible so they can be dynamically imported into the page context

---

### 📄 `src/rules.json`
**Purpose**: Declarative net request rules for URL-level blocking

**Structure**:
- Two rules that redirect Explore and Reels pages to the home page (`/`)
- Uses `main_frame` resource type to only intercept top-level navigation

**How It Works**:
- When a user tries to navigate to `/explore/` or `/reels/`, Chrome intercepts the request
- The rule transforms the path to `/`, effectively redirecting to the home feed
- This happens before the page loads, preventing any Explore/Reels content from rendering

---

### 📄 `src/background.js`
**Purpose**: Service worker for extension lifecycle events

**Current Implementation**:
- Minimal: Only logs installation message
- Can be extended for background tasks, notifications, or cross-tab coordination

**How It Works**:
- Runs as a service worker (not a persistent background page)
- Activates when needed (message received, event triggered)
- Currently serves as a placeholder for future functionality

---

### 📄 `src/content.loader.js`
**Purpose**: Entry point for content scripts - dynamically imports the main module

**How It Works**:
1. Executes at `document_start` (before DOM is ready)
2. Uses dynamic `import()` to load `main.js` as an ES module
3. Uses `chrome.runtime.getURL()` to get the correct path to the module
4. Wraps in try-catch to handle loading errors gracefully

**Why Dynamic Import?**:
- Manifest V3 requires ES modules for content scripts
- Dynamic import allows the loader to be a simple script while main.js can use `import/export`
- Ensures proper module resolution in the extension context

---

### 📄 `src/content/main.js`
**Purpose**: Main orchestrator - initializes all content script components

**Initialization Sequence**:
1. **Load Settings**: Reads user preferences from `chrome.storage.sync`
2. **Load Follow Cache**: Loads the list of followed usernames from storage
3. **Attach Follow Learner**: Sets up listener to learn new followed accounts
4. **Inject Network Guards**: Injects page scripts that intercept network requests
5. **Install Caught-Up Gate**: Monitors for "You're all caught up" message
6. **Inject CSS**: Adds styles to hide filtered elements
7. **Install Route Guards**: Intercepts navigation events
8. **Attach Messaging**: Listens for messages from popup/options
9. **Attach Storage Listener**: Watches for settings changes
10. **Filter All**: Runs initial filtering pass
11. **Start Observer**: Begins watching for new DOM elements

**How It Works**:
- Runs as an async IIFE (Immediately Invoked Function Expression)
- Imports all necessary modules using ES6 `import` syntax
- Initializes components in a specific order to ensure dependencies are met
- Handles errors gracefully to prevent breaking Instagram's functionality

---

### 📄 `src/content/settings.js`
**Purpose**: Manages extension settings and provides reactive updates

**Default Settings**:
```javascript
{
  blockExplore: true,        // Block Explore page navigation
  blockReels: true,          // Block Reels page navigation
  hideSuggested: true,       // Hide suggested posts
  hideSponsored: true,       // Hide sponsored posts
  onlyFollowed: true,        // Only show posts from followed accounts
  debug: false,              // Enable debug logging
  allowlist: [],             // Usernames to always show
  phrases: [...],            // Phrases that indicate unwanted content
  followCtaWords: [...],     // Words indicating "Follow" button
  followingWords: [...]      // Words indicating already following
}
```

**Functions**:
- `loadSettings()`: Reads settings from `chrome.storage.sync`, merges with defaults
- `attachStorageListener()`: Watches for settings changes and triggers re-filtering

**How It Works**:
- Maintains a global `SETTINGS` object that all modules import
- When settings change (via popup/options), the storage listener updates `SETTINGS`
- After a short debounce (80ms), triggers `filterAll()` to re-apply filters
- Uses lazy import to avoid circular dependencies

---

### 📄 `src/content/utils.js`
**Purpose**: Shared utility functions used across content scripts

**Functions**:

1. **`log(...args)`**: Debug logging that respects `SETTINGS.debug`
   - Only logs when debug mode is enabled
   - Prefixes all messages with `[InstaSanitizer]`

2. **`once(fn)`**: Ensures a function only runs once
   - Returns a wrapper that tracks if the function has been called
   - Useful for initialization functions

3. **`debounce(fn, ms)`**: Delays function execution until after a quiet period
   - Prevents excessive filtering during rapid DOM changes
   - Default delay: 80ms

4. **`closestFromEvent(e, sel)`**: Finds closest matching ancestor from event target
   - Safely handles cases where `closest()` might not exist
   - Used in click event handlers

5. **`markHidden(el, why)`**: Marks an element as hidden by the extension
   - Sets `data-insta-sanitized="1"` attribute
   - Sets `data-insta-sanitized-why` with reason for debugging
   - Hides element with `display: none`
   - Prevents double-processing

6. **`containsPhrase(el, phrases)`**: Checks if element text contains any filter phrase
   - Case-insensitive matching
   - Searches in `innerText` (visible text only)

7. **`getAuthorUsername(el)`**: Extracts username from a post element
   - Looks for links matching `/username/` pattern
   - Excludes post links (`/p/...`)
   - Returns lowercase username or `null`

**How It Works**:
- Pure utility functions with no side effects (except `markHidden`)
- Designed to be imported and used by any content script module
- Handles edge cases and provides safe fallbacks

---

### 📄 `src/content/filters.js`
**Purpose**: Core filtering logic - identifies and hides unwanted content

**Filter Functions**:

1. **`filterNav(root)`**: Hides navigation links to Explore/Reels
   - Selects all `<a>` tags with `href="/explore/"` or `href="/reels/"`
   - Marks them as hidden with reason `'nav-link'`

2. **`filterSidebar(root)`**: Hides sidebar suggestions and sponsored content
   - Targets `<aside>` and `[role="complementary"]` elements
   - Checks for filter phrases if `hideSuggested` or `hideSponsored` is enabled
   - Marks hidden with reason `'sidebar-phrases'` or `'sidebar-suggested'`

3. **`filterSuggestionModules(root)`**: Hides entire suggestion sections
   - Finds headings with text "Suggestions for you" or "Suggested for you"
   - Hides the parent section/region containing the heading
   - Marks hidden with reason `'suggestions-module'`

4. **`hasFollowCTAInHeader(post)`**: Detects "Follow" buttons in post headers
   - Checks if header contains "following" (already following = keep)
   - Searches for buttons/spans with text matching `followCtaWords`
   - Returns `true` if a Follow button is found (indicates not following)

5. **`shouldHidePost(post)`**: Determines if a post should be hidden
   - **Sponsored Check**: If `hideSponsored` enabled, checks for filter phrases
   - **Follow CTA Check**: If `onlyFollowed` or `hideSuggested` enabled, checks for Follow button
   - **Allowlist Check**: If username is in allowlist, never hide
   - Returns reason string if should hide, `false` if should keep

6. **`filterPosts(root)`**: Filters all post articles
   - Selects all `<article>` elements (Instagram's post container)
   - Skips already-processed posts (`data-insta-sanitized="1"`)
   - Calls `shouldHidePost()` for each and hides if needed

7. **`filterAll()`**: Main entry point - runs all filters
   - Wrapped in `debounce()` to prevent excessive execution
   - Runs all filter functions in sequence
   - Catches and logs errors without breaking

**How It Works**:
- Uses DOM queries to find elements matching Instagram's structure
- Applies heuristics (phrase matching, Follow button detection) to identify unwanted content
- Marks elements as processed to avoid re-filtering
- Debounced to handle rapid DOM mutations efficiently

---

### 📄 `src/content/style.js`
**Purpose**: Injects CSS to hide filtered elements

**CSS Rules**:
```css
a[href="/explore/"], a[href="/reels/"] { 
  display: none !important; 
}
[data-insta-sanitized="1"] { 
  display: none !important; 
}
```

**How It Works**:
- Uses `once()` wrapper to ensure CSS is only injected once
- Creates a `<style>` element with `data-insta-sanitizer="1"` attribute
- Appends to `document.documentElement` (root element)
- Uses `!important` to override Instagram's inline styles
- First rule hides navigation links (redundant with `filterNav` but provides CSS-level protection)
- Second rule ensures all marked elements stay hidden

---

### 📄 `src/content/routes.js`
**Purpose**: Intercepts navigation to prevent accessing blocked pages

**Functions**:

1. **Click Interception**: Prevents clicks on Explore/Reels links
   - Listens for clicks on `<a>` tags with `href` starting with `/explore` or `/reels`
   - Calls `preventDefault()` and `stopPropagation()` to block navigation
   - Only active if `blockExplore` or `blockReels` is enabled

2. **History API Patching**: Monitors programmatic navigation
   - Patches `history.pushState()` and `history.replaceState()`
   - Calls `filterAll()` after navigation to filter new content
   - Listens to `popstate` event (back/forward button)

**How It Works**:
- Uses event capturing (`true` parameter) to intercept clicks early
- Patches native browser APIs to detect SPA (Single Page Application) navigation
- Instagram uses the History API for navigation, so this catches all route changes
- Triggers re-filtering after navigation to handle new page content

---

### 📄 `src/content/observe.js`
**Purpose**: Watches for new DOM elements and filters them automatically

**Function**: `startObserver()`

**How It Works**:
1. Creates a `MutationObserver` that watches the entire document
2. Observes `childList` and `subtree` changes (new elements added anywhere)
3. For each mutation:
   - Checks if new nodes were added
   - Filters posts if `<article>` elements are found
   - Filters navigation if Explore/Reels links are found
   - Filters sidebars if `<aside>` or `[role="complementary"]` are found
   - Filters suggestion modules if headings are found
4. Calls `filterAll()` after processing mutations to catch anything missed

**Why It's Needed**:
- Instagram loads content dynamically (infinite scroll, lazy loading)
- New posts appear as you scroll without full page reloads
- The observer ensures new content is filtered immediately upon appearance

---

### 📄 `src/content/messaging.js`
**Purpose**: Handles communication between popup/options and content script

**Function**: `attachMessaging()`

**Message Types**:
- `insta-sanitizer:refresh`: Triggered when user saves settings in popup
  - Reloads settings from storage
  - Re-runs `filterAll()` to apply new settings
  - Sends response `{ok: true/false}`

**How It Works**:
- Listens for messages via `chrome.runtime.onMessage`
- When popup saves settings, it sends a refresh message to active Instagram tabs
- Content script receives message, reloads settings, and re-filters
- Returns `true` to indicate async response will be sent

---

### 📄 `src/content/inject-network-guards.js`
**Purpose**: Injects page scripts into the page context (not content script context)

**Function**: `injectNetworkGuards()`

**Injected Scripts**:
1. `page-guards.js`: Intercepts network requests to block suggested content
2. `page-feed-filter.js`: Filters GraphQL feed responses

**How It Works**:
- Creates `<script>` elements with `src` pointing to web-accessible resources
- Sets `async = false` to ensure scripts load in order
- Appends to `<head>` or `document.documentElement`
- Immediately removes script tags (scripts are already loaded)
- Scripts run in page context, allowing them to intercept `fetch` and `XMLHttpRequest`

**Why Page Context?**:
- Content scripts run in isolated world - cannot access page's `window.fetch`
- Page scripts run in page context - can patch native APIs
- Needed to intercept Instagram's API calls before they reach the page

---

### 📄 `src/content/caughtup-gate.js`
**Purpose**: Detects "You're all caught up" message and enables aggressive filtering

**Function**: `installCaughtUpGate()`

**How It Works**:
1. **Detection Function**: Scans document for:
   - Text containing "you're all caught up" (case-insensitive)
   - Headings containing "Suggested Posts"
2. **State Management**: Tracks whether blocking is enabled
3. **Message Broadcasting**: Sends `window.postMessage` to page scripts:
   - `insta-sanitizer:enable-suggest-block`: When caught up message appears
   - `insta-sanitizer:disable-suggest-block`: When navigating away or message disappears
4. **Mutation Observer**: Watches for DOM changes to detect when message appears/disappears
5. **Navigation Reset**: Disables blocking on `popstate` (back/forward navigation)

**Why It's Needed**:
- Instagram shows "You're all caught up" after showing all followed posts
- After this point, Instagram starts showing suggested posts
- This gate enables aggressive network-level blocking only after the caught-up point
- Prevents blocking legitimate feed content before you've seen everything

---

### 📄 `src/content/page-guards.js`
**Purpose**: Intercepts network requests in page context to block suggested content

**How It Works**:

1. **State Management**: 
   - `ENABLED` flag controlled by messages from `caughtup-gate.js`
   - Only blocks when `ENABLED = true`

2. **Request Detection**:
   - Checks if URL contains `/graphql/query` (Instagram's API endpoint)
   - Reads `x-fb-friendly-name` header or body parameter
   - Looks for `PolarisFeedRootPaginationCachedQuery_subscribe` (suggested posts query)

3. **Fetch Interception**:
   - Patches `window.fetch` to intercept all requests
   - If request matches criteria and `ENABLED = true`, returns empty response
   - Returns `{data: {}}` with status 204 to prevent errors

4. **XMLHttpRequest Interception**:
   - Patches `XMLHttpRequest.prototype.open` to store URL
   - Patches `XMLHttpRequest.prototype.send` to check and abort if needed
   - Belt-and-suspenders approach (some code might use XHR instead of fetch)

5. **Message Listener**:
   - Listens for `window.postMessage` from `caughtup-gate.js`
   - Updates `ENABLED` flag based on message type

**Why It Works**:
- Runs in page context, so it can patch native browser APIs
- Blocks requests before they're sent, preventing suggested content from loading
- Only activates after "caught up" message to avoid blocking legitimate feed

---

### 📄 `src/content/page-feed-filter.js`
**Purpose**: Intercepts and filters GraphQL feed responses in page context

**How It Works**:

1. **Follow Cache Management**:
   - Maintains `FOLLOW` Set of lowercase usernames
   - Receives updates via `window.postMessage` from content script
   - Messages: `follow-cache-full` (initial load), `follow-cache-update` (incremental)

2. **Strict Mode**:
   - `STRICT` flag determines filtering aggressiveness
   - Controlled by `insta-sanitizer:set-strict` message
   - When strict: only keeps posts from followed accounts
   - When lenient: keeps all except explicit ads/suggestions

3. **Feed Request Detection**:
   - Checks if URL contains `/graphql/query`
   - Reads `x-fb-friendly-name` from headers or body
   - Matches against `PolarisFeedRootQuery` or `PolarisFeedRootPaginationQuery`

4. **JSON Filtering**:
   - Intercepts `fetch` responses
   - Parses JSON response
   - Finds timeline array in response structure:
     - `xdt_api__v1__feed__timeline__connection.edges`
     - `xdt_api__v1__feed__timeline.edges`
     - `user_feed_timeline.edges`
     - `feed_timeline.edges`
   - Filters each edge/node:
     - **Always Drops**: Nodes with `is_suggested: true`, `sponsored`, `is_ad`, `ad_*`, `social_context`
     - **Strict Mode**: Only keeps nodes where:
       - `user.followed_by_viewer === true` OR
       - `owner.followed_by_viewer === true` OR
       - `friendship_status.following === true` OR
       - Username is in `FOLLOW` cache
     - **Lenient Mode**: Keeps all except explicit ads/suggestions

5. **Learning**:
   - When filtering, detects nodes with `followed_by_viewer: true`
   - Extracts usernames and sends `insta-sanitizer:learn-follow` message
   - Content script receives and persists to storage

6. **Response Rewriting**:
   - Modifies filtered JSON
   - Creates new `Response` object with filtered data
   - Preserves original headers and status

**Why It's Powerful**:
- Filters at the API level, preventing unwanted content from ever reaching the DOM
- More efficient than DOM filtering (less work for browser)
- Handles edge cases Instagram might use to bypass DOM filters
- Learns followed accounts automatically from API responses

---

### 📄 `src/content/follow-cache.js`
**Purpose**: Maintains and persists a cache of followed usernames

**Storage Key**: `followSetV1` (array of lowercase usernames)

**Functions**:

1. **`loadFollowCache()`**: Loads cache from `chrome.storage.sync`
   - Reads array from storage
   - Converts to Set for fast lookups
   - Exposes to page context via `postMessage`

2. **`isFollow(username)`**: Checks if username is in cache
   - Case-insensitive comparison
   - Returns boolean

3. **`addFollow(username)`**: Adds username to cache
   - Normalizes to lowercase
   - Skips if already present
   - Schedules save to storage (debounced)
   - Notifies page context via `postMessage`

4. **`scheduleSave()`**: Debounced persistence
   - Waits 300ms after last change
   - Saves entire Set as array to storage

5. **`exposeToPage()`**: Sends full cache to page context
   - Used on initial load
   - Sends `insta-sanitizer:follow-cache-full` message

6. **`attachFollowLearner()`**: Listens for learned usernames
   - Receives `insta-sanitizer:learn-follow` messages from page script
   - Adds usernames to cache
   - Automatically persists

**How It Works**:
- Maintains cache in content script world (can access `chrome.storage`)
- Syncs to page world via `postMessage` (page scripts can't access storage directly)
- Learns from API responses (via `page-feed-filter.js`)
- Persists across page reloads and browser sessions
- Debounced saves prevent excessive storage writes

**Why It's Needed**:
- Instagram's API responses include `followed_by_viewer` flags, but not always
- Cache provides fallback when flags are missing
- Improves filtering accuracy over time as more accounts are learned
- Persists learning across sessions

---

### 📄 `src/popup.html` & `src/popup.js`
**Purpose**: Extension popup UI for quick settings toggles

**UI Components**:
- **Checkboxes**: 
  - Block Explore
  - Block Reels
  - Hide "Suggested"
  - Hide "Sponsored"
  - Only from followed accounts
  - Debug logs
- **Save Button**: Applies settings and notifies active tabs
- **Links**: Open Options page, Open Instagram

**Functions** (`popup.js`):

1. **`getActiveInstaTabs()`**: Finds Instagram tabs in current window
   - Uses `chrome.tabs.query` with `active: true, currentWindow: true`
   - Filters to Instagram URLs using regex

2. **`loadSettings()`**: Reads settings from storage
   - Merges with defaults to ensure all keys exist

3. **`saveSettings(values)`**: Writes settings to storage
   - Uses `chrome.storage.sync.set`

4. **`applyToUI(values)`**: Updates checkbox states
   - Maps settings object to checkbox elements

5. **`readFromUI()`**: Reads current checkbox states
   - Creates settings object from UI

6. **`setStatus(msg, ok)`**: Shows status message
   - Green for success, red for error
   - Auto-clears after 1.5 seconds

7. **`notifyActiveTab()`**: Sends refresh message to Instagram tabs
   - Sends `insta-sanitizer:refresh` message
   - Handles errors gracefully (tab might not have content script yet)

**How It Works**:
- Loads settings on popup open
- User toggles checkboxes
- On "Save & Apply":
  1. Reads UI state
  2. Saves to storage
  3. Shows "Saved. Applying…" status
  4. Notifies active Instagram tabs to refresh
  5. Shows "Done." status

---

### 📄 `src/options.html` & `src/options.js`
**Purpose**: Full options page for advanced configuration

**UI Components**:
- **Phrases Textarea**: Custom filter phrases (one per line)
- **Allowlist Textarea**: Usernames to always show (one per line, no @)
- **Save Button**: Persists changes
- **Reset Button**: Restores default phrases

**Functions** (`options.js`):

1. **`normalizeList(textareaValue)`**: Processes textarea input
   - Splits by newlines
   - Trims whitespace
   - Removes empty lines
   - Deduplicates (case-insensitive)
   - Returns array

2. **`listToTextarea(list)`**: Converts array to textarea text
   - Joins with newlines

3. **`loadSettings()`**: Loads phrases and allowlist
   - Falls back to defaults if missing

4. **`saveSettings(values)`**: Saves phrases and allowlist
   - Triggers automatic re-filtering via storage listener

5. **`setStatus(msg, ok)`**: Shows status message
   - Same as popup version

**Default Phrases**:
- "Suggested for you"
- "Sponsored"
- "Because you follow"
- "More like this"
- "Suggested posts"
- "You might like"

**How It Works**:
- Loads current settings on page load
- User edits textareas
- On "Save":
  1. Normalizes input (removes duplicates, empty lines)
  2. Saves to storage
  3. Content script automatically re-filters (via storage listener)
- On "Reset":
  1. Restores default phrases in textarea
  2. Saves defaults to storage

---

## How It Works - Complete Flow

### 1. Extension Installation
1. User installs extension from Chrome Web Store (or loads unpacked)
2. Browser registers manifest, permissions, and content scripts
3. `background.js` service worker activates and logs installation

### 2. User Visits Instagram
1. Browser detects navigation to `www.instagram.com`
2. **Declarative Net Request**: If URL is `/explore/` or `/reels/`, redirects to `/`
3. **Content Script Injection**: Browser injects `content.loader.js` at `document_start`
4. `content.loader.js` dynamically imports `main.js`

### 3. Content Script Initialization (`main.js`)
1. **Load Settings**: Reads user preferences from `chrome.storage.sync`
2. **Load Follow Cache**: Loads cached followed usernames
3. **Inject Network Guards**: Injects `page-guards.js` and `page-feed-filter.js` into page context
4. **Install Caught-Up Gate**: Sets up observer for "caught up" message
5. **Inject CSS**: Adds styles to hide filtered elements
6. **Install Route Guards**: Patches History API and intercepts clicks
7. **Attach Messaging**: Listens for messages from popup
8. **Attach Storage Listener**: Watches for settings changes
9. **Filter All**: Runs initial DOM filtering pass
10. **Start Observer**: Begins watching for new DOM elements

### 4. Page Script Initialization (Injected Scripts)
1. **`page-guards.js`**: Patches `fetch` and `XMLHttpRequest`, waits for enable message
2. **`page-feed-filter.js`**: Patches `fetch`, receives follow cache via `postMessage`

### 5. User Scrolls Feed
1. Instagram makes GraphQL API call to load more posts
2. **`page-feed-filter.js`** intercepts response:
   - Parses JSON
   - Filters out ads, suggestions, non-followed posts (if strict mode)
   - Learns new followed accounts
   - Returns filtered response
3. Instagram renders filtered posts to DOM
4. **`observe.js`** detects new `<article>` elements
5. **`filters.js`** runs additional DOM-level filtering (belt and suspenders)
6. Elements marked with `data-insta-sanitized="1"` are hidden via CSS

### 6. User Reaches "You're All Caught Up"
1. **`caughtup-gate.js`** detects message in DOM
2. Sends `insta-sanitizer:enable-suggest-block` message
3. **`page-guards.js`** receives message, sets `ENABLED = true`
4. Future suggested post API calls are blocked at network level

### 7. User Clicks Explore/Reels Link
1. **`routes.js`** click handler intercepts click
2. Calls `preventDefault()` to block navigation
3. If navigation somehow occurs, declarative net request redirects to `/`

### 8. User Changes Settings in Popup
1. User opens popup, toggles checkboxes, clicks "Save"
2. **`popup.js`** saves to `chrome.storage.sync`
3. Sends `insta-sanitizer:refresh` message to active Instagram tab
4. **`messaging.js`** receives message
5. **`settings.js`** storage listener also fires (redundant but safe)
6. Settings reloaded, `filterAll()` called
7. DOM re-filtered with new settings

### 9. User Adds Custom Phrases in Options
1. User opens options page, edits phrases textarea, clicks "Save"
2. **`options.js`** normalizes input, saves to storage
3. **`settings.js`** storage listener fires
4. `SETTINGS.phrases` updated
5. `filterAll()` called after debounce
6. DOM re-filtered using new phrases

---

## Features & Capabilities

### Core Features

1. **Explore Page Blocking**
   - URL-level redirect (declarative net request)
   - Navigation link hiding (DOM filter)
   - Click interception (route guards)

2. **Reels Page Blocking**
   - Same triple-layer approach as Explore

3. **Suggested Post Filtering**
   - Phrase matching ("Suggested for you", etc.)
   - Follow button detection (heuristic)
   - Network-level blocking (after caught up)
   - JSON response filtering

4. **Sponsored Post Filtering**
   - Phrase matching ("Sponsored")
   - JSON response filtering (detects `sponsored`, `is_ad` flags)

5. **Followed-Only Mode**
   - Follow button detection
   - Username extraction and cache lookup
   - JSON response filtering (checks `followed_by_viewer` flags)
   - Automatic learning from API responses

6. **Allowlist**
   - Usernames that are never hidden
   - Useful for accounts that might trigger false positives

### Advanced Features

1. **Multi-Layer Filtering**
   - Network level (API response filtering)
   - DOM level (element hiding)
   - Navigation level (route blocking)

2. **Intelligent Learning**
   - Automatically learns followed accounts from API responses
   - Persists cache across sessions
   - Improves accuracy over time

3. **Performance Optimized**
   - Debounced filtering (prevents excessive work)
   - MutationObserver for efficient DOM watching
   - Network-level filtering (less DOM manipulation)

4. **User Customization**
   - Custom filter phrases
   - Allowlist management
   - Granular toggle controls

5. **Debug Mode**
   - Detailed console logging
   - Element marking with reasons (`data-insta-sanitized-why`)

---

## Installation & Usage

### Installation

1. **From Chrome Web Store** (if published):
   - Visit store listing
   - Click "Add to Chrome"
   - Confirm permissions

2. **Unpacked Extension** (for development):
   - Open Chrome, go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select extension directory

### Usage

1. **Quick Settings** (Popup):
   - Click extension icon in toolbar
   - Toggle checkboxes for desired filters
   - Click "Save & Apply"
   - Changes apply immediately

2. **Advanced Settings** (Options):
   - Right-click extension icon → "Options"
   - Or click "Open Options" in popup
   - Edit filter phrases (one per line)
   - Add allowlisted usernames (one per line, no @)
   - Click "Save"

3. **Debug Mode**:
   - Enable "Debug logs" in popup
   - Open browser console (F12)
   - See detailed filtering logs
   - Inspect `data-insta-sanitized-why` attributes on hidden elements

---

## Technical Details

### Browser Compatibility
- **Chrome**: 88+ (Manifest V3 support)
- **Edge**: 88+ (Chromium-based)
- **Brave**: Latest (Chromium-based)
- **Opera**: Latest (Chromium-based)
- **Not Compatible**: Firefox (uses Manifest V2, different API)

### Performance Considerations
- **Debouncing**: Filters run with 80ms debounce to handle rapid DOM changes
- **MutationObserver**: Efficiently watches for new elements without polling
- **Network Filtering**: Reduces DOM work by filtering at API level
- **Cache Persistence**: Debounced saves (300ms) prevent excessive storage writes

### Security & Privacy
- **No Data Collection**: Extension doesn't send data to external servers
- **Local Storage Only**: All settings stored locally via `chrome.storage.sync`
- **No External Requests**: Extension only communicates with Instagram pages
- **Minimal Permissions**: Only requests necessary permissions (storage, declarativeNetRequest, tabs)

### Limitations
- **Instagram Updates**: If Instagram changes DOM structure or API, filters may need updates
- **False Positives**: Heuristic filtering might occasionally hide legitimate posts
- **False Negatives**: Some suggested content might slip through if patterns change
- **SPA Navigation**: Relies on History API patching, might miss some navigation methods

### Extension Structure
```
insta-sanitize/
├── manifest.json              # Extension configuration
├── src/
│   ├── background.js          # Service worker
│   ├── content.loader.js      # Content script entry point
│   ├── content/
│   │   ├── main.js            # Main orchestrator
│   │   ├── settings.js        # Settings management
│   │   ├── utils.js           # Utility functions
│   │   ├── filters.js         # DOM filtering logic
│   │   ├── style.js           # CSS injection
│   │   ├── routes.js          # Navigation interception
│   │   ├── observe.js         # DOM mutation observer
│   │   ├── messaging.js       # Popup communication
│   │   ├── inject-network-guards.js  # Page script injection
│   │   ├── caughtup-gate.js   # "Caught up" detection
│   │   ├── page-guards.js     # Network request blocking (page context)
│   │   ├── page-feed-filter.js # Feed JSON filtering (page context)
│   │   └── follow-cache.js    # Followed accounts cache
│   ├── popup.html             # Popup UI
│   ├── popup.js               # Popup logic
│   ├── options.html           # Options page UI
│   ├── options.js             # Options page logic
│   └── rules.json             # Declarative net request rules
└── assets/
    └── icons/                 # Extension icons
```

---

## Development Notes

### Adding New Filter Phrases
1. Edit `src/content/settings.js` → `DEFAULT_SETTINGS.phrases`
2. Or use Options page (user-customizable)

### Adding New Filter Types
1. Add setting to `DEFAULT_SETTINGS` in `settings.js`
2. Add checkbox to `popup.html` and `popup.js`
3. Implement filter logic in `filters.js`
4. Add to `filterAll()` function

### Debugging
1. Enable debug mode in popup
2. Open browser console
3. Look for `[InstaSanitizer]` prefixed logs
4. Inspect elements with `data-insta-sanitized-why` attributes

### Testing
1. Load extension as unpacked
2. Visit Instagram
3. Open console, check for errors
4. Test each filter toggle
5. Verify network requests are intercepted (Network tab)
6. Check that filtered elements are hidden

---

## Conclusion

Instagram Sanitizer is a sophisticated browser extension that employs multiple filtering strategies to remove distracting content from Instagram. It operates at the network level (API filtering), DOM level (element hiding), and navigation level (route blocking) to provide comprehensive content removal. The extension learns from user behavior, persists settings across sessions, and provides extensive customization options.

The architecture is modular, with clear separation of concerns between content scripts (isolated world) and page scripts (page context). This design allows the extension to intercept network requests while maintaining compatibility with Instagram's security policies.

---

**Version**: 0.1.0  
**Last Updated**: 2024  
**License**: (Check repository for license information)

