# CyberPod Demo

Browser simulation of the Kali desktop, terminal and Nirs Central Bank training lab.

## Run in Chrome

Install Node.js 20.19+ (or 22.12+), then run from this repository:

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:3000 and unlock with **bisha / bisha**.

1. In Terminal, run `nmap 10.8.0.22`.
2. Open Firefox ESR and inspect the bank login.
3. Run the Hydra command shown by `help` or Lab Notes.
4. Sign in to the bank using the recovered training credentials.
5. Copy the treasury token and submit it in the task panel. Completing all tasks earns 100 points.
6. Use **Pause**, **Resume**, **Restart lab**, or **End lab**. Restart generates a new flag; refreshing the page preserves the current attempt.

The terminal simulates supported commands against `10.8.0.22` / `bank.nirs.lab`; it does not execute Linux programs or contact external targets. Demo state and attempt secrets are stored in this tab's session storage, so this mode is not a trusted authentication or scoring service.

## Connect cyberpod-integration

Start the backend using that repository's README, then:

```bash
npm run dev:live
```

Open the same http://127.0.0.1:3000 URL. For the backend's local `--demo` mode, sign in with **demo@cyberpod.local / CyberPodDemo123!**. This mode exercises server login, lab selection, session lifecycle, score and flag APIs. Its simulated backend explicitly reports that it has no real desktop. A real desktop requires the runtime, validator and gateway adapters described in `cyberpod-integration`.

Vite proxies `/api` and `/desktop` to `http://127.0.0.1:8000`, keeping cookies, CSRF and browser security policy on one origin. To change the backend address, set `CYBERPOD_API_PROXY` in `.env.local`. `VITE_API_BASE` remains supported; `/` selects the same-origin API. Cross-origin hosting also requires an explicit deployment CSP/CORS/cookie configuration.

For an authorized tunnel to the development server, set `CYBERPOD_ALLOWED_HOSTS` to the exact tunnel hostname in `.env.local` and restart Vite. The upstream server must remain running.

## Build and check

```bash
npm test
npm run build
npm run preview
```

For the API version's production assets: `npm run build:live`, then `npm run preview` while the backend runs. A production web server must serve the assets and proxy `/api` and `/desktop`, including WebSockets.

Chrome regression tests:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

The committed lockfile fixes the dependency resolution used by `npm ci`. GitHub Actions runs unit tests, production build and the browser journey.
