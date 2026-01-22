import { Logo } from "@/components/brand/Logo";

export function FooterMinimal() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 bg-background border-t border-border">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="dark" size="sm" />
          <p className="text-xs text-muted-foreground">
            © {currentYear} STRYK. Hecho para academias que quieren orden.
          </p>
        </div>
      </div>
    </footer>
  );
}
