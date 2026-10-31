# necropolis

Project repository for **necropolis**.

## Hallmark design skill

This project vendors the [Hallmark](https://github.com/nutlope/hallmark) design skill
(MIT, v2.0.0), which steers agent-built pages away from generic "AI-looking" defaults.

- Source: `nutlope/hallmark` (`skills/hallmark`)
- Installed at `.agents/skills/hallmark`, symlinked into `.claude/skills/hallmark`
- Version pinned in `skills-lock.json`

Reinstall or update:

```bash
npx skills add nutlope/hallmark@hallmark
npx skills update
```

Run the skill's linter against a page:

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
