import { Logo } from "@/components/brand/Logo";

export function FooterMinimal() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 bg-stryk-navyDeep border-t border-stryk-gold/10">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="light" size="sm" />
          <p className="text-xs text-stryk-silver/50">
            © {currentYear} STRYK. Hecho para academias que quieren orden.
          </p>
        </div>
      </div>
    </footer>
  );
}
