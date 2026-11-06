# Publish District Study Deck to GitHub Pages

The application is prepared for GitHub Pages. **It is not deployed until GitHub reports success and the live HTTPS site has been checked.** The connected GitHub account is **BrixtonL**. The intended repository is **BrixtonL/district-study-deck**; no website URL is verified yet.

## 1. Create your GitHub account — you do this

1. Open https://github.com/signup in Chrome.
2. Create a free personal account, choose your username and password, complete GitHub's checks, and verify your email. Complete any agreement or authentication step yourself.
3. Sign in. You can share your GitHub username and public repository URL with your assistant; keep your password, recovery codes, and access tokens private.

## 2. Create the repository — you do this, or use a connected GitHub integration

1. Open https://github.com/new.
2. Under your own account, enter **district-study-deck** as the repository name.
3. Choose **Public**. GitHub Free supports Pages for public repositories. Only application source and approved app assets will be uploaded. Your study pack and browser data stay separate. See [GitHub's Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
4. Leave the options to add a README, `.gitignore`, and license unchecked; the prepared source already includes its own README and `.gitignore`.
5. Click **Create repository**. Keep the new repository page open.

## 3. Upload the clean application source — you do this if GitHub is not connected

The clean folder prepared on your laptop is:

```text
~/Downloads/District_Study_Deck_Fictional_Test_Pack/District_Study_Deck_GitHub_Upload
```

It contains only approved source files, instructions, tests, and three app icons. It contains no Excel workbook, portrait JPGs, private import ZIP, browser storage, or test screenshots. The refreshed `District_Study_Deck_v0.1_Source.zip` contains the same approved files, inside its `district-study-deck` folder.

1. On the empty repository page, select **uploading an existing file**. In an initialized repository, use **Add file → Upload files**.
2. Open the clean upload folder in Mint's file manager. Press **Ctrl+H** to reveal hidden files. You should see `.github` and `.gitignore` as well as `src`, `public`, `scripts`, `tests`, and `package.json`.
3. Select and drag the **contents** of this clean folder onto GitHub's upload area. Do not drag its enclosing folder and do not upload the source ZIP as a single file. Do not upload the parent test-pack folder or your working application's `node_modules`, `dist`, or `test-results`.
4. Enter a commit message such as **Publish District Study Deck 0.1**, and commit directly to **main**.
5. Check the repository root shows `package.json`, `vite.config.ts`, and `src/` directly. Open `.github/workflows/deploy.yml` to confirm it exists. There must not be an extra `district-study-deck/` or `District_Study_Deck_GitHub_Upload/` wrapper inside the repository.
6. If the hidden workflow folder did not upload, use **Add file → Create new file**, name it `.github/workflows/deploy.yml`, paste the exact contents of that file from the prepared folder, and commit it to `main`.

To regenerate the clean folder and source archive after approved source changes, run `pnpm prepare:github` from the working `district-study-deck` application folder. The script copies an explicit list of files and refuses unexpected files or links in its output folder. It does not copy your private test pack.

## 4. Enable GitHub Pages — you do this in repository settings

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**. You do not need to select a Jekyll template or create a second workflow.
3. Open the **Actions** tab. If GitHub asks you to enable Actions for this repository, enable them.
4. Choose **Deploy application shell to GitHub Pages → Run workflow → main → Run workflow**. If an earlier automatic run failed before Pages was enabled, rerun it after completing these settings.
5. Wait for both **build** and **deploy** jobs to finish successfully. If one fails, open its failed step and share the error text or run URL so it can be fixed; a failed run does not mean the site is published.

The workflow installs Node 24 and locked pnpm dependencies, runs the unit tests, reads the repository's Pages base path, builds the application, checks the output file allowlist, and uploads **only `dist/`**. It declares the Pages permissions in the workflow. You do not need to create a personal access token or broadly change repository workflow permissions for this browser-based setup.

The app URL, icons, manifest identity/start URL, worker scope, and offline navigation all use the same Pages path. For this repository name, that path is `/district-study-deck/`. A root/custom-domain site uses `/`. The workflow reads the path automatically, following [Vite's Pages guidance](https://vite.dev/guide/static-deploy) and [GitHub's custom workflow instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## 5. Verify the live site — do this with your assistant before calling deployment complete

1. After the green deployment, open **Settings → Pages → Visit site**, or use the URL in the deployment job.
2. The expected address format is `https://YOUR-USERNAME.github.io/district-study-deck/`. This is a template, not a verified live URL.
3. Open the address in Chrome. Confirm the app starts empty, loads without missing assets, and reaches **Ready for offline**.
4. Share the repository URL and exact website URL with your assistant. The assistant can check the live HTTPS response, manifest, icons, worker scope, and import/quiz behavior in a fresh browser context, then switch that context offline and reload. No successful live verification is claimed until those checks pass.
5. A real iPhone installation and Airplane Mode check still require your device. Complete the next section even if automated Chrome tests pass.

The app can be tested against its live address from the working application folder:

```bash
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
LIVE_URL="https://YOUR-USERNAME.github.io/district-study-deck/" CHROME_PATH=/usr/bin/google-chrome pnpm test:e2e --grep "private import"
```

Use the actual deployed URL with its final `/`. Keep the private workbook and four JPGs in the original parent test-pack folder for this test. It runs in a fresh test browser profile; file import is processed inside the browser and does not upload study records to GitHub. The separate simulated-update test intentionally runs locally rather than modifying a deployed site.

## 6. Install on your iPhone through Safari — you do this

1. Copy **District_Study_Deck_Fictional_Private.zip** to the iPhone's **Files** app, using your preferred private transfer method. Store it under **On My iPhone**, or ensure the file is downloaded before testing offline. This is the ZIP with the Excel workbook and four portraits; it is different from the public source ZIP. Do not upload it to GitHub.
2. While online, open the **verified HTTPS website URL** in **Safari** on the iPhone.
3. Tap **Share → Add to Home Screen**. Enable **Open as Web App** if offered, then tap **Add**. See [Apple's installation instructions](https://support.apple.com/en-az/guide/iphone/iphea86e5236/26/ios/26).
4. Launch Study Deck using its new Home Screen icon. Import inside this installed app even if you previously imported in a Safari tab.
5. Open **Study data → Choose ZIP file → Browse**, choose the private study ZIP from Files, check the preview shows four fictional people and their portraits, and tap **Import and save deck**.
6. Wait for **Ready for offline**. Confirm the directory shows all four portraits and try each of the four quiz modes.
7. Answer a question, then close the app. Enable **Airplane Mode** and explicitly turn Wi-Fi off. Reopen the app from its Home Screen icon.
8. Check the directory and photographs, use **Resume practice** to confirm the saved question/feedback, and continue answering. Close and reopen once more to confirm **My progress** still reflects your answers. These observations verify offline operation on your actual iPhone.

Your laptop's `localhost` data and progress do not transfer to the GitHub Pages site or iPhone. Import the private ZIP separately on each device. No app account, cloud data store, or synchronization is added.

## 7. Publish future updates while retaining local data

1. Change the source in the existing repository and commit to **main**. The same workflow redeploys automatically. Use the clean preparation script for future manual uploads; do not upload your working folder wholesale.
2. Keep the same GitHub account, repository name, domain, and app URL. Moving to another origin or repository path changes the browser storage context or installed-app identity; existing data does not automatically migrate there.
3. Open the installed app while online. It checks for updates on registration and when brought back into focus or reconnected. When **An app update is ready** appears, finish any current action and tap **Update app**.
4. Application updates replace cached application files, while the existing `district-study-deck-v1` IndexedDB database is retained. The update button waits for in-progress import/answer operations to finish. No database deletion or automatic deck reimport occurs during an app update.
5. Verify the directory and saved progress, then repeat the offline check. Future changes to the database structure must use a preserving migration and pass the retention test before deployment.

Replacing a study deck through **Replace deck & reset progress**, removing local data, clearing browser/site data, or uninstalling with data removal can erase progress. Keep the original private ZIP as a study-data backup. The ZIP does not back up quiz progress, and browser storage may still be removed by the operating system under storage pressure.
