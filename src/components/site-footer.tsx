export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-border/60 bg-background/60">
      <div className="mx-auto flex w-full max-w-[85rem] flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="max-w-xl text-balance">
          Open-weight Gemma via Ollama. Only package names leave your machine, to the public
          npm registry.
        </p>
        <p className="text-xs text-muted-foreground/70">
          <a
            className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:text-foreground"
            href="https://github.com/nutlope/hallmark"
            rel="noreferrer"
            target="_blank"
          >
            design system
          </a>{" "}
          <span aria-hidden>·</span>{" "}
          <a
            className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:text-foreground"
            href="https://registry.npmjs.org"
            rel="noreferrer"
            target="_blank"
          >
            npm registry
          </a>
        </p>
      </div>
    </footer>
  );
}
