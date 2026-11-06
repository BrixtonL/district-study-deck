# District Study Deck 0.1

A React / TypeScript PWA for studying four fictional people. No account, backend, analytics, external API, cloud storage, or synchronization. The public app starts empty. Import a private ZIP separately on each device.

## Launch and test on Linux Mint with Chrome

Linux Mint with Google Chrome is the initial manual testing setup. You can run and install the app locally without deploying to GitHub Pages. Automated Chrome tests have passed on Linux; a manual Linux Mint installation has not yet been verified.

### 1. Check Chrome and Node.js

Use your normal Chrome profile for this test. If Chrome is not installed, download the Debian/Ubuntu `.deb` package for your computer's architecture from [Google Chrome](https://www.google.com/chrome/) and open it with Mint's package installer. See [Google's Linux installation instructions](https://support.google.com/chrome/answer/95346?co=GENIE.Platform%3DDesktop&hl=en).

Open Terminal and check:

```bash
node --version
npm --version
```

The app requires **Node.js 22.13 or later**, with npm. If either command is missing, or Node is older, follow the [official Node.js download instructions](https://nodejs.org/en/download), selecting Linux and a supported Node version (22.13+). The nvm installation option installs Node for your user. Open a new Terminal afterward and repeat the checks.

### 2. Build and launch the production app

The following path matches the supplied unpacked test folder. If you moved or extracted it elsewhere, change the `cd` path accordingly.

```bash
cd "$HOME/Downloads/District_Study_Deck_Fictional_Test_Pack/district-study-deck"
export PATH="$HOME/.local/bin:$PATH"
npm install --global --prefix "$HOME/.local" pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm preview --port 4173 --strictPort
```

This installs pnpm under your own account without `sudo`. In a new Terminal, repeat the `export PATH` line before using pnpm, or add that line once to your shell startup file.

Leave the preview terminal running during initial setup. Open **http://localhost:4173/** in Chrome. Use this exact hostname and port throughout the test: `127.0.0.1`, another port, or another Chrome profile has separate local storage. The production build enables the service worker; `pnpm dev` does not.

### 3. Import the fictional study pack

1. Open **Study data → Choose ZIP file**.
2. Select `District_Study_Deck_Fictional_Private.zip` from the parent `District_Study_Deck_Fictional_Test_Pack` folder. If the ZIP is missing but the original workbook and `photos/` folder are present there, open a second Terminal in the application folder and run `node scripts/create-private-pack.mjs ..` to recreate it.
3. Check the preview shows **four fictional people, four portraits, and 16 custom questions**, then select **Import and save deck**.
4. Wait for **Ready for offline** in the top bar. Open **People directory**, confirm all four portraits display, and try a search.

### 4. Install in Chrome and verify offline use

1. While the preview server is still running, select Chrome's address-bar **Install** icon. Alternatively, use **⋮ → Cast, save, and share → Install page as app…**, then follow the prompt. See [Google's web app installation guide](https://support.google.com/chrome/answer/9658361?hl=en).
2. Open the installed **District Study Deck** app. Confirm the imported deck is available and the top bar says **Ready for offline**.
3. Try **Photo to name**, **Name to photo**, **Know their role**, and **District knowledge**. Each question should have four choices and show feedback after an answer.
4. Answer a question, then close the app. In the preview terminal, press **Ctrl+C** to stop the server, and turn off Wi-Fi or disconnect the network.
5. Reopen the installed app from Mint's application menu, or from `chrome://apps` in the same Chrome profile. Verify the directory and photographs still load. Select **Resume practice** and check the saved question, choices, and answer feedback. Continue a quiz and check **My progress**.

After this setup, offline study does not require Node, pnpm, or the preview server to remain running. Keep the private ZIP as your backup; it contains the study pack, not quiz progress. Do not clear Chrome's data for this site during testing.

To restart the local server later, open Terminal in the application folder, repeat the `export PATH` line above, and run `pnpm preview --port 4173 --strictPort`. If port 4173 is already occupied, stop the other preview process rather than switching ports and appearing to lose the saved deck.

For the automated browser suite using the installed Chrome, run these commands from the application folder with the private workbook and portraits still in the parent folder:

```bash
pnpm build
CHROME_PATH=/usr/bin/google-chrome pnpm test:e2e
```

The suite starts and stops its own preview server on port 4175, separate from your manual preview on port 4173. If Chrome is installed elsewhere, substitute the executable path reported by `command -v google-chrome`.

## Launch locally on Windows

Install **Node.js 22.13 or later** from https://nodejs.org/ (Node 22 LTS is supported). Open PowerShell in the `district-study-deck` application folder, then run:

```powershell
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm build
pnpm preview --port 4173 --strictPort
```

Open **http://localhost:4173/** in Edge or Chrome. Keep this terminal running while serving the initial app. Go to **Study data → Choose ZIP file**, choose the supplied fictional study ZIP, inspect the four portraits, then select **Import and save deck**. Wait for **Ready for offline**.

If PowerShell blocks `pnpm.ps1`, use `pnpm.cmd` in place of `pnpm`; changing your system execution policy is unnecessary. `pnpm dev` is available for development at http://localhost:5173/, but the service worker is intentionally enabled only in production builds.

The unpacked attachment is already beside this app. A private import ZIP has also been prepared beside the app as `District_Study_Deck_Fictional_Private.zip`. To recreate it from the unpacked workbook and `photos` folder:

```powershell
node scripts/create-private-pack.mjs ..
```

If your data is elsewhere:

```powershell
node scripts/create-private-pack.mjs "C:\path\to\unpacked-pack" "C:\path\to\private-study-pack.zip"
```

## Install on Windows

1. Open the built app at the localhost address above, or its published HTTPS address, in Edge or Chrome while online.
2. Select the browser's address-bar installation icon. Alternatively, use the browser menu's Apps / Install option.
3. Open the installed app. Import the private ZIP if this browser profile does not already have it, and wait for **Ready for offline**.
4. Disconnect Wi-Fi and reopen the app. Search the directory, view portraits, and answer a question. For a localhost installation, stop the preview server too to confirm the app loads from its service worker.

## GitHub Pages deployment

For the numbered account-creation, clean upload, deployment verification, iPhone installation, and future-update walkthrough, use [Publish to GitHub Pages](DEPLOY_GITHUB_PAGES.md). The clean upload folder can be refreshed with `pnpm prepare:github`. Deployment is not complete until the live site is verified.

Deploy **only the contents of the `district-study-deck` application folder** as the repository root. Keep the workbook, `photos` folder, and private ZIP outside that repository. This folder's `.gitignore` also excludes spreadsheets, ZIPs, and JPGs.

1. Create a GitHub repository and put the application source, `.github` workflow, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` at its root. Do not upload the entire parent dataset folder.
2. In the repository, go to **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Push the source to the `main` branch (or run **Actions → Deploy application shell to GitHub Pages → Run workflow**).
4. The included workflow installs locked dependencies, runs unit tests, configures Pages, builds, runs the deployment privacy check, and uploads **only `dist/`**. It derives the correct base path from `actions/configure-pages`, including repository subpaths and custom domains.
5. Once the deployment succeeds, use the HTTPS URL shown by GitHub's deployment. No repository or live URL was created as part of this local build.

For a manual repository-subpath build in PowerShell:

```powershell
$env:BASE_PATH = "/YOUR-REPOSITORY/"
pnpm build
Remove-Item Env:BASE_PATH
```

Use `/` for a user-site repository or custom-domain root. Rebuild after changing the base. The manifest, icons, app assets, navigation fallback, and service worker follow this base path. There are no server routes to configure.

Deployment follows the [Vite GitHub Pages guide](https://vite.dev/guide/static-deploy) and [GitHub's custom Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Install on iPhone

An iPhone needs the **published HTTPS URL**, or a trusted HTTPS development server. A laptop's ordinary `http://192.168...` address is not sufficient for service-worker installation. `localhost` on the phone refers to the phone itself.

1. Save the private fictional ZIP in the iPhone **Files** app. You can transfer it directly from your laptop using your preferred method. It is never part of the deployed website.
2. While connected to the internet, open the GitHub Pages HTTPS address in **Safari**.
3. Tap **Share → Add to Home Screen**. If the option is not visible, scroll the share actions or use **Edit Actions**. Enable **Open as Web App** if offered, then tap **Add**. See [Apple's installation instructions](https://support.apple.com/en-az/guide/iphone/iphea86e5236/26/ios/26).
4. Launch **Study Deck from its new Home Screen icon**. Import the private ZIP through **Study data → Choose ZIP file → Browse**. Choose it from Files, review the four portraits, then tap **Import and save deck**. Import inside the installed app even if you previously imported in a Safari tab, because storage can be separate.
5. Wait until the top bar says **Ready for offline**. Open the directory and verify all four portraits.
6. Turn on **Airplane Mode**, turn Wi-Fi off, close the app, and reopen it from its Home Screen icon. Confirm the directory and all quiz modes work. Answers save automatically. Close and reopen during a question to verify **Resume practice** keeps the same question, choices, and feedback.

Keep the original ZIP in Files as a backup. Browser storage is tied to the site origin, browser/profile, and device. Removing the app, clearing website data, or device storage pressure can remove local data. **Study data → Request persistent storage** asks the browser for protection; the browser decides whether to grant it. The original ZIP download preserves the imported pack, **not quiz history**. There is no progress backup/restore or device synchronization in 0.1.

## Study behavior and import contract

- Four modes: Photo to name, Name to photo, Know their role, and District knowledge (all imported custom multiple-choice questions).
- Every question has four unique choices. Both question order and choice order are randomized with Fisher–Yates on a new session. A resumed session retains its original order.
- Each photo/position session covers all four people; a custom session covers every Active workbook question. Feedback shows the correct answer and explanation. Each question records one attempt only.
- A current unfinished session can be resumed from Practice or My progress. Starting another mode replaces that unfinished session; recorded attempts remain in overall progress.
- Search matches name, role, organization, city, and county, with an optional category filter.
- Import validates and stages data before any existing deck changes. Replacing a deck explicitly resets quiz progress. Invalid imports leave the prior deck intact. Removing local data requires an in-app confirmation.
- ZIP contains exactly one `.xlsx` and its neighboring `photos/` folder. A wrapping folder is supported. `People.Photo_Filename` must match the JPG filename exactly. No source-URL images are fetched.
- Only rows with `Record_Status` exactly `Active` enter the study records. This first test requires exactly four fictional people (identified by `FICTIONAL` in Notes), unique Person_IDs, unique names, and four distinct position titles. Real-person imports are excluded in this test version.
- Required People columns: `Person_ID`, `Full_Name`, `Position_Title`, `Organization`, `Photo_Filename`, `Notes`, `Record_Status`. Other workbook fields are retained.
- Required Questions columns: `Question_ID`, `Question`, `Correct_Answer`, `Distractor_1`, `Distractor_2`, `Distractor_3`, `Record_Status`. Person answers use `Answer_Type=Person` and active Person_IDs; other types use display text. All questions need three supplied distractors in 0.1. Optional explanations appear after answering.
- Active Geography and Organizations rows are retained and imported questions can study them. Separate automatic geography quizzes and question editing are outside 0.1.
- ZIP size limit: 20 MB compressed, 50 MB expanded; workbook expansion limit: 30 MB; individual JPG limit: 5 MB. Nested ZIPs are not recursively imported. The tabular XLSX reader supports inline/shared rich strings, sparse columns, worksheet relationships, and cached formula values. It retains date serials as stored values rather than formatting them. It does not execute workbook formulas, macros, or source links. Original workbook and ZIP blobs are retained unchanged in IndexedDB, including any non-Active rows they contain.

## Architecture and privacy

`src/importer.ts` uses fflate and the browser’s namespace-aware XML parser locally. `src/quiz.ts` constructs serializable quiz sessions. `src/db.ts` stores the current deck and progress in IndexedDB, committing deck replacement and progress reset in one transaction. Photographs are stored as Blobs and displayed through temporary object URLs, which are revoked when the component closes. React renders workbook text as text, without injecting HTML.

Vite PWA / Workbox precaches all production app JavaScript (including the lazy workbook importer), CSS, HTML, manifest, and app icons. Navigation falls back to the cached application shell. Imported data is never added to the service-worker cache or deployment files. App updates display an update prompt and preserve IndexedDB. All libraries and fonts are served locally. There are no runtime third-party requests.

`pnpm build` runs a deployment check that rejects spreadsheets, ZIPs, JPGs, JSON files, unexpected bitmap images, and known portrait/data markers in `dist`. Only static app files are deployed. The test pack is a local test fixture outside this project and is never copied by the build.

## Tests

```powershell
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The importer/integration tests use the provided workbook and four portraits from the parent folder. If absent, those private-fixture tests are clearly skipped, while basic validation and IndexedDB tests still run. To use another unpacked location:

```powershell
$env:STUDY_PACK_DIR = "C:\path\to\unpacked-pack"
pnpm test
pnpm test:e2e
```

Browser tests start a separate production preview on port 4175 and exercise import, directory search, portraits, all four quiz modes, saved feedback/choice order, offline reload, offline import, narrow-screen overflow, and deletion. To test a subpath, build with `BASE_PATH` and set `TEST_BASE_PATH` to the same value before running `pnpm test:e2e`. An existing Chrome executable can be selected with `CHROME_PATH`; otherwise Playwright's Chromium is used.

Automated browser coverage uses Chromium. Physical iPhone Safari and Windows installation should be checked with the steps above; those devices are not available in this development environment.
