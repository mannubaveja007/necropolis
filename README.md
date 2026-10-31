# Necropolis

Necropolis is a Next.js 16 app that turns a `package.json` into a graveyard. Paste one in and every dependency rises as a tombstone with its latest publish date, how many years it has been resting, and one of five fates: alive, restless, haunted, dead, or unknown. Click a tombstone and a local Gemma model, served through Ollama, writes an epitaph from five registry facts. When the model is unavailable, a template keeps the graveyard open. The whole yard exports as a Markdown report.

## Quickstart

```bash
npm install
ollama pull gemma3:4b
ollama serve
npm run dev
```

Open <http://localhost:3000>.

Requires Node.js 20.9 or newer, plus [Ollama](https://ollama.com/) running locally.

> If another Gemma model is already installed (for example `gemma4:12b`), skip `ollama pull` and set `OLLAMA_MODEL` to that tag in `.env.local`.

## Environment variables

Both variables are optional. Copy `.env.example` to `.env.local` to override the defaults, then restart the dev server.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Full Ollama generate endpoint used for the health check and epitaph requests. Point it at a remote Ollama host if needed. |
| `OLLAMA_MODEL` | `gemma3:4b` | Gemma model tag passed to Ollama. Use any tag already listed by `ollama list`. |
| `OLLAMA_TIMEOUT_MS` | `180000` | How long to wait for one local generation before the template epitaph is used. A 12B model on CPU can take a minute or more. |

## How it works

1. **Scan.** Paste a `package.json` into the page. The client sends it to `POST /api/scan`, which reads `dependencies` and `devDependencies` — up to **40 packages** — and fetches each package's metadata from the public npm registry in parallel. Every request has a **5-second timeout**.
2. **Classify.** Each package becomes a tombstone with a status:

   | Status | Meaning |
   | --- | --- |
   | `alive` | Latest publish is less than 1 year ago. |
   | `restless` | Latest publish is 1–2 years ago. |
   | `haunted` | The registry returns a deprecation message. |
   | `dead` | Latest publish is more than 2 years ago. |
   | `unknown` | The package was not found (404) or the registry could not be reached. |

   The registry's deprecation message is what marks a package as haunted.

3. **Summon an epitaph.** Clicking a tombstone calls `POST /api/epitaph` with only five facts: name, version, last publish date, years since publish, and deprecation message. The server asks Ollama for JSON with `stream: false` and `format: "json"`. Successful epitaphs are kept in an in-memory cache for the life of the server process.
4. **Fall back gracefully.** If Ollama is offline or the request fails, the API returns a template epitaph with `source: "template"`, and the UI shows the banner **"Ghost offline: template epitaph"**. When the model succeeds, the source is `ollama`.
5. **Export.** The graveyard can be exported as a Markdown report: title, UTC generation timestamp, a totals line with the Haunting Score, a status table, and one epitaph section per package that has one. Missing values are rendered as em dashes, and packages keep their original input order.

## API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/scan` | `POST` | Accepts the pasted `package.json` contents, scans up to 40 dependencies, and returns `{ packages, summary }`. |
| `/api/epitaph` | `POST` | Accepts the five facts for one package (`name`, `version`, `lastPublish`, `yearsSince`, `deprecatedMessage`) and returns `{ name, version, epitaph, warning, source }`. |
| `/api/health` | `GET` | Returns `{ ollama, model, url, latencyMs }`. The site header polls it every 30 seconds to show whether Ollama is online. |

## Haunting Score

The Haunting Score is a 0–100 measure of decay across the scanned graveyard. Each package contributes a weight based on its status; the mean weight is scaled to 100, so a graveyard of only dead dependencies scores 100, while one of only alive dependencies scores 5.

| Status | Weight |
| --- | --- |
| `dead` | 1 |
| `haunted` | 0.8 |
| `unknown` | 0.65 |
| `restless` | 0.45 |
| `alive` | 0.05 |

## Project structure

```text
src/
├── app/
│   ├── api/                 # /api/scan, /api/epitaph, /api/health route handlers
│   ├── globals.css          # Tailwind v4 tokens, fog, display/carved type
│   ├── layout.tsx           # fonts, header and footer shell
│   └── page.tsx             # graveyard UI
├── components/
│   ├── site-header.tsx      # Ollama status indicator
│   ├── site-footer.tsx      # privacy note
│   └── ui/                  # shadcn primitives
└── lib/
    ├── report.ts            # Markdown report builder
    ├── report.test.ts       # report tests
    ├── sample.ts            # sample package.json and 40-package cap
    ├── types.ts             # shared request/response types
    └── utils.ts             # class-name merge helper
```

## Privacy

> Open-weight Gemma via Ollama. Only package names leave your machine, to the public npm registry.

Scanning sends package names to the public npm registry to read publish dates and deprecation messages. Epitaph generation sends only the five facts above to your Ollama instance. Your `package.json` itself is not sent anywhere else.

## Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `next dev` | Start the development server at <http://localhost:3000>. |
| `build` | `next build` | Create a production build. |
| `start` | `next start` | Serve the production build. |
| `lint` | `eslint` | Lint the project. |
| `test` | `vitest run` | Run the test suite once. |
| `typecheck` | `tsc --noEmit` | Type-check without emitting files. |

## Troubleshooting

### Ollama is offline

The header shows "Ollama offline" and epitaphs fall back to templates with the "Ghost offline: template epitaph" banner. Confirm the server is running with `ollama serve`, then check `GET /api/health` at <http://localhost:3000/api/health>. If Ollama runs somewhere other than the default host, set `OLLAMA_URL` to the full `/api/generate` endpoint in `.env.local` and restart `npm run dev`.

### Model not pulled

Ollama returns an error when `OLLAMA_MODEL` names a tag that is not installed. Run `ollama list` to see available models, then either `ollama pull gemma3:4b` or set `OLLAMA_MODEL` to an installed Gemma tag.

### npm registry rate limits

Scans use the public npm registry without authentication, so very large or repeated scans can be throttled or time out. Every registry request has a 5-second timeout, and timed-out or failed lookups appear as `unknown` packages. Wait and retry, or scan a smaller `package.json`.

### 40-package cap

`/api/scan` looks at a maximum of 40 packages across `dependencies` and `devDependencies`. Anything beyond that is not scanned. Split unusually large projects into smaller `package.json` files to see every dependency.

## Design system

The UI vendors the [Hallmark](https://github.com/nutlope/hallmark) design skill (MIT, v2.0.0) at `.agents/skills/hallmark`, symlinked into `.claude/skills/hallmark` and pinned in `skills-lock.json`.

Reinstall or update:

```bash
npx skills add nutlope/hallmark@hallmark
npx skills update
```

Lint a page with the skill's linter:

```bash
node .agents/skills/hallmark/scripts/sloplint.mjs <file> --render
```

## Commit conventions

Every commit follows [Conventional Commits](https://www.conventionalcommits.org/) and
carries exactly one logical change:

- **Format:** `type(scope): summary` — imperative mood, 72 characters max, no trailing period.
- **Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `style`.
- **Scope:** optional; the area touched (e.g. `feat(hero): ...`).
- **Body:** explain *why*, not *what*, when the reason is not obvious.
- **Atomic:** stage only what belongs to the change; never mix refactors with behaviour changes.
- **Clean history:** no `wip`/`fixup` commits on `main`; work in small commits that each stand alone.
- **Verified:** the tree builds and lints before each commit; amend locally, never rewrite pushed history.
