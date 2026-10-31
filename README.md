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
