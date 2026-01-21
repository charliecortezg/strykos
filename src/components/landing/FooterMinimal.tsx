import { Logo } from "@/components/brand/Logo";

export function FooterMinimal() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 bg-stryk-black border-t border-stryk-graphite">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="light" size="sm" />
          <p className="text-sm text-stryk-grey">
            © {currentYear} STRYK. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
