*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine](https://dev.to/challenges/hacktoberfest-week4-2026-10-26)*

## What I Built

**Kabristan** turns a `package.json` into a field of headstones.

Paste a manifest, press **Raise the dead**, and every dependency rises as an SVG headstone. Each stone is carved with the package name, the version you asked for, the real latest publish date from the npm registry, and how many years it has been resting. The stones are coloured by fate:

- **alive**, published within the last year, emerald
- **restless**, one to two years, brass
- **haunted**, the registry returns a deprecation notice, spirit violet with a slow ghost glow
- **dead**, more than two years since the last publish, stone grey with cracks and moss
- **unknown**, a 404 or an unreachable registry, cold slate with a dashed outline

A summary band counts the five fates and computes a **Haunting Score** from 0 to 100. Click a stone and a local Gemma model, served through Ollama, writes a two-sentence epitaph and a one-sentence maintenance warning from five registry facts. The whole field exports as a Markdown report.

![Kabristan: seven headstones in a dark emerald mist, with version, last publish and years since publish carved into each stone](https://raw.githubusercontent.com/mannubaveja007/kabristan/main/docs/screenshots/headstones.png)

My reading of **Ghost in the Machine** is literal: the machine is the dependency tree, and the ghosts are the packages nobody maintains any more. A `package.json` is a register we keep adding names to. Kabristan makes that register visible, and lets a local model speak for the forgotten.

It felt right to ship it on Halloween, the night before Día de los Muertos.

## Demo

There is no hosted demo, and that is deliberate: the model runs on your machine, not mine.

```bash
git clone https://github.com/mannubaveja007/kabristan.git
cd kabristan
npm install
ollama pull gemma3:4b
ollama serve
npm run dev
```

Open `http://localhost:3000`, press **Load sample**, then **Raise the dead**. The sample includes `request`, `node-sass`, `left-pad`, `moment`, `express`, `react` and `typescript`, enough to fill the field with three haunted stones and four living ones.

> [!TIP]
> Already running a bigger Gemma? Set `OLLAMA_MODEL` in `.env.local` and skip the pull. A 12B model works, but 3–4B responds far faster.

![The landing page: a package.json textarea, a Load sample button and a Raise the dead button](https://raw.githubusercontent.com/mannubaveja007/kabristan/main/docs/screenshots/landing.png)

![The centered epitaph dialog: the coffin cam GIF above a Gemma-written epitaph and a maintenance warning](https://raw.githubusercontent.com/mannubaveja007/kabristan/main/docs/screenshots/panel.png)

## Code

The repository is public and self-contained:

**https://github.com/mannubaveja007/kabristan**

{% embed https://github.com/mannubaveja007/kabristan %}

The app is Next.js 16 on the App Router, with TypeScript, Tailwind CSS 4, and shadcn/ui primitives. The interesting parts are small and readable:

- `src/lib/npm.ts` parses the manifest, fetches each package in parallel with a 5-second timeout, and maps deprecation notices and publish age onto the five fates.
- `src/lib/epitaph.ts` builds the Ollama request, validates the JSON, caches answers per `name@version`, and falls back to a deterministic template.
- `src/components/tombstone.tsx` draws the slab, cracks, moss and ghost glow as inline SVG.

Run the checks yourself:

```bash
npm test          # 52 tests
npm run typecheck
npm run build
```

## Architecture

Kabristan is one Next.js app with three route handlers. The browser only renders; the registry and the model are both called server-side.

```text
┌──────────────────────────────────────────────────────────────────┐
│ Browser — Next.js 16 client                                      │
│ paste package.json → Raise the dead → headstones                 │
└──────────────────────────────┬───────────────────────────────────┘
                               │ POST /api/scan
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ Next.js route handlers (App Router, RSC)                         │
│ POST /api/scan · POST /api/epitaph · GET /api/health             │
└──────────────────────────────┬───────────────────────────────────┘
                               │ Promise.all
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ registry.npmjs.org — one GET per package                         │
│ 5s timeout · latest · time[latest] · deprecated                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ statuses → headstones → click a stone
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│ Ollama — local Gemma, format:"json", think:false                 │
│ validate → memory cache → template fallback                      │
└──────────────────────────────┬───────────────────────────────────┘
                               ▼
                      Epitaph dialog · Markdown report
```

**The order of one scan:**

1. `POST /api/scan` parses `dependencies` and `devDependencies`, dedupes them, and stops at 40 packages.
2. Every package is fetched from `registry.npmjs.org` in parallel, with a 5-second timeout each.
3. Each result becomes a fate: `alive`, `restless`, `haunted`, `dead` or `unknown`.
4. The summary counts the fates and computes the Haunting Score.
5. The browser paints the headstones; clicking one opens the epitaph dialog.
6. The template epitaph renders at once; Gemma's answer replaces it when it arrives.
7. **Export Kabristan report** builds the Markdown file in the browser.

| Method | Route | Responsibility |
| --- | --- | --- |
| `POST` | `/api/scan` | Validate the manifest, resolve every package, return `{ packages, summary }` |
| `POST` | `/api/epitaph` | Take five facts, call Ollama, validate JSON, cache, fall back. `template: true` returns the deterministic version immediately |
| `GET` | `/api/health` | Probe Ollama for the header dot |

The project is deliberately small and ordered by responsibility:

```text
Kabristan/
├── src/
│   ├── app/
│   │   ├── api/                    # scan, epitaph, health
│   │   ├── globals.css             # tokens, fog, headstone styles
│   │   ├── layout.tsx              # fonts and shell
│   │   └── page.tsx                # landing and field states
│   ├── components/
│   │   ├── tombstone.tsx           # SVG slab, cracks, moss, ghost mark
│   │   ├── tombstone-grid.tsx      # responsive grid
│   │   ├── summary-bar.tsx         # counts and Haunting Score
│   │   ├── epitaph-panel.tsx       # centered dialog, cache, fallback
│   │   └── loading-kabristan.tsx   # skeletons
│   └── lib/
│       ├── npm.ts                  # parse, fetch, statuses, score
│       ├── epitaph.ts              # prompt, cache, template
│       ├── coffin-song.ts          # original Web Audio loop
│       └── report.ts               # Markdown export
├── public/
│   ├── memes/coffin-dance.gif      # the coffin cam
│   └── audio/coffin.mp3            # coffin cam audio
└── docs/screenshots/               # README and post images
```

## How I Built It

### The AI

The only model in the loop is **Gemma, running locally through Ollama**. There is no hosted LLM, no API key, and no account.

When you click a stone, the browser posts exactly five facts to `/api/epitaph`: name, version, last publish, years since publish, and the deprecation message. Nothing else. The route sends those facts to Ollama with `stream: false`, `format: "json"` and `think: false`, under this system prompt:

> You are a gravedigger poet. Using ONLY the facts given, write a 2-sentence epitaph and a 1-sentence maintenance warning. Never invent dates, versions, CVEs or package names. Name a replacement only if the deprecation message names one; otherwise write 'successor unknown'. Return JSON {epitaph, warning}.

The response is parsed as JSON and rejected unless both fields are non-empty strings. Successful answers are cached in memory per package. Anything else, a closed port, a timeout, a malformed answer, falls back to a template that repeats only the facts it was given.

The UX does not wait for the model. The deterministic template is rendered the moment the dialog opens, and Gemma's epitaph replaces it in place a few seconds later. The panel says **Ghost offline: template epitaph** only when the model really is unavailable, so the failure is visible instead of hidden.

The big performance find was that Gemma was **thinking**. A two-sentence answer was taking 90 seconds and generating between 777 and 2,278 tokens, almost all of it hidden reasoning. Disabling thinking and capping output at 220 tokens took the same call from **90 seconds to 3.6 seconds**; in the browser, the template appears in 126 ms and the model version lands at about 6 seconds.

### The design

The interface is built with the open-source **Hallmark** design skill, vendored in the repository. Kabristan is a quiet field of stone at dusk: green-black `#0a0d0b`, marble ivory `#ece5d4`, an emerald signal `#86d6a8`, brass for the restless, and spirit violet kept only for haunted stones. Cormorant Garamond for display, Geist for text, JetBrains Mono for carved data.

The stones are inline SVG so they can decay with the data: cracks and moss appear only on dead packages, a slow ghost glow only on haunted ones, and hover raises a candlelight wash at the base of the stone. Haunted and dead stones also open the **coffin cam**: a GIF above the epitaph, with an audio loop and a mute control, all inside the centered dialog. Everything collapses under `prefers-reduced-motion`.

I ran Hallmark's `sloplint` render sweep from 320 to 1920 pixels. It reports **0 FAIL, 0 WARN**, with the scrim and the wrapping stone metadata recorded as dismissals.

### The agents

I built Kabristan with three parallel subagents in the DeepSeek Harness, each in its own git worktree:

- one for the API routes and the registry logic
- one for the headstone UI
- one for the Markdown report and documentation

The work landed on three branches (`feat/api-core`, `feat/kabristan-ui`, `feat/report-docs`), each merged into `main` with a `--no-ff` merge commit. The history is conventional commits: `feat(scan)`, `fix(ui)`, `docs`, one logical change per commit.

That workflow paid for itself. When the machine got slow I could stop all three, see exactly what each had written, and resume them without losing work.

### What broke

Four things, all fixed and committed:

1. **Thinking tokens.** The 12B model spent 90 seconds reasoning about a two-sentence epitaph. `think: false` plus a token cap fixed it.
2. **Turbopack flattened CSS modules.** The headstone styles loaded as global CSS while the component's class names came back empty, so the stones rendered as black shapes with raw text below them. I moved the styles into the global stylesheet with prefixed class names.
3. **A browser extension injected dozens of `data-*` attributes** onto `<html>` before hydration, making React report a mismatch. I reproduced it by injecting the same attributes at document start in headless Chrome, then fixed it with `suppressHydrationWarning` on the document elements.
4. **The dialog was clipped by the sticky header.** It rendered inside `<main>`, which has its own stacking context, so the header sat above the overlay and cut the epitaph off. I portaled it to `document.body` and made the scroll area shrink properly.

## Why Does Open Innovation Matter?

Kabristan is possible because the model is a file on my disk, not a service.

That changes the privacy story completely. Dependency names are the most sensitive part of a private codebase: they reveal what you build, which vendors you depend on, and where you are behind. With a hosted model, every click on a stone would ship that list to someone else's server. With Ollama, the names go to the public npm registry, which already has them, and the five facts go to a model running on the same laptop. My footer says exactly that, and it is true.

It also changes who can build this. There is no key to provision, no free-tier limit, no bill at the end of the month. A student on a five-year-old laptop can run a 3B model and get the whole experience. When the model is missing or too slow, the app still works, because the deterministic template does not depend on anyone's API being healthy.

And it changes what the app can be. A closed API couples the product to one vendor's model, prompt format and failure modes. Here, `OLLAMA_MODEL` is one environment variable. Swap in a smaller Gemma, a bigger one, or a different open-weight model, and the field still works. The design skill, the harness, and the code are all in the repository, so the whole thing can be read, forked and argued with.

## My Agent Session

The session lives in the git history rather than a recording. The three feature branches, their individual commits, and the merge commits that joined them to `main` are public, and they show the actual sequence: scaffold, design system, API core, headstone UI, report and docs, and the fixes that came after testing against a real registry and a real local model.

The harness also kept the work honest. Every agent had to run `tsc` and Vitest before committing, and the final integration had to survive a production build plus the Hallmark render sweep.

## The Spirit of It

The moment that landed for me was `left-pad`.

This is a package that was famously unpublished in 2016 and broke builds across the internet. A decade later it is deprecated, eight and a half years past its last release, and the model wrote this:

> left-pad sleeps after 8.6 years. Its final publication was 2018-04-09.

And this warning:

> Use String.prototype.padStart() as the successor.

It is not profound. It is just accurate, plain, and a little sad, which is exactly what a Kabristan is for. A local model, given nothing but five facts, looked at a package that once took down half the JavaScript ecosystem and quietly noted that `padStart` won.

That is the ghost in the machine for me. Not a haunted chatbot, just the machine remembering what we buried, one dependency at a time.

The Kabristan is open. Bring your `package.json`.
