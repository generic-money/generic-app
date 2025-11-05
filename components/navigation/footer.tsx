export function Footer() {
  return (
    <footer className="border-t border-border bg-card text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row md:px-8">
        <span className="font-medium text-foreground">Generic Money</span>
        <nav className="flex items-center gap-6">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Github
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            X.com
          </a>
          <a
            href="mailto:hello@example.com"
            className="transition-colors hover:text-foreground"
          >
            Reach out
          </a>
        </nav>
      </div>
    </footer>
  );
}
