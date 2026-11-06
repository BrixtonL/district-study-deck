# Version 0.1 verification

Verified November 6, 2026 using the provided fictional workbook and four original JPGs. No additional people were added.

| Check | Result |
| --- | --- |
| TypeScript strict type check | Passed |
| Unit / IndexedDB / actual-workbook integration tests | 13 passed, none skipped in local verification |
| Production build at `/` | Passed |
| Production build at `/district-study-deck/` | Passed |
| Chromium browser suite at `/` | Passed |
| Chromium browser suite at `/district-study-deck/` | Passed |
| Phone-width directory layout (390 × 844) | Passed, no horizontal overflow |
| Deployment privacy check | Passed on both builds |
| Independent scan for all four imported names in production files | None found |
| JPG portraits in production files | None present |

The browser suite imports the real private ZIP, checks four decoded portraits, searches the directory, switches the browser offline, reloads the application, answers questions in all four modes, verifies saved feedback after reload, advances questions, checks accumulated progress, imports again while offline, and verifies local data removal. The subpath suite exercises the same behavior with a scoped service worker and repository-style asset URLs.

Core tests also verify all 16 custom questions, supporting geography/organization records, exact photo bytes after IndexedDB storage, four unique choices with one correct answer, randomization across sessions, prevention of duplicate attempts, full quiz completion, reset on reimport, inactive-question exclusion, sparse/shared/rich-string XML values, original namespace compatibility, duplicate and unknown IDs, missing photographs, repeated choices, wrapping ZIP folders, oversized input, traversal paths, DTD rejection, and external worksheet rejection.

The supplied `dist/` has been restored to the default root path for local preview. GitHub Actions builds the correct deployment base from the Pages configuration. Only the static app shell is uploaded.

Physical iPhone Safari, Windows installation, OS storage eviction, were not tested in this environment. Chromium at phone width verifies responsive layout and offline behavior; it does not substitute for an actual iPhone installation. Follow the README's device checklist for that final check.

Private-fixture integration tests skip explicitly when the workbook and portraits are absent (for example in a clean public source checkout). The basic validation/IndexedDB/XML tests still run in GitHub Actions. End-to-end tests require the private fixture and are intentionally run locally, not against a publicly bundled dataset.

## GitHub Pages preparation and update retention

The public repository is `BrixtonL/district-study-deck`; Pages is configured to use GitHub Actions. GitHub Actions build and deployment succeeded. The live site at https://brixtonl.github.io/district-study-deck/ passed the complete Chrome offline/import/quiz suite on November 6, 2026.

The production suite now verifies the manifest identity, start URL, scope, worker scope, and first ZIP import after disconnecting the browser before the importer is loaded. The separate update test installs an actual changed worker and changed HTML shell, accepts the update through the app button, and compares the saved deck ID, SHA-256 hashes of all four portrait blobs, complete quiz session, and progress before and after activation and another offline reload. These checks pass under `/district-study-deck/`.

The deployment guard also rejects unexpected files (including notes, SQLite databases, and additional PNGs), symlinks, and embedded JPEG data. Source packaging uses an explicit allowlist and excludes private fixtures and screenshots. Browser tests use isolated profiles and test port 4175, not the user’s manual preview port.

## Verified live deployment

- Website: https://brixtonl.github.io/district-study-deck/
- Repository: https://github.com/BrixtonL/district-study-deck
- Initial successful deployment: https://github.com/BrixtonL/district-study-deck/actions/runs/42303072669
- Live Chrome suite: 1 passed, including manifest/worker scope, offline first ZIP import, all four quiz modes, restored progress, photographs, narrow-screen layout, and removal of test-only local records.
- Final local root-path suite: 2 passed, including actual worker activation and unchanged portrait hashes, complete quiz session, and progress after the accepted update and offline reload.
- Only the 30 explicitly approved source files were published to the repository; only allowlisted dist assets are deployed. No study workbook, portrait JPGs, private ZIP, quiz progress, or test screenshots are included.
- User confirmed laptop operation on Linux Mint with Chrome. Physical iPhone installation and Airplane Mode verification still require the user’s device.
