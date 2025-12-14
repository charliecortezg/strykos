import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="py-12 bg-background border-t border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo variant="dark" size="sm" />
          
          <nav className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Producto
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Precios
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contacto
            </a>
          </nav>

          <p className="text-sm text-muted-foreground">
            © 2024 STRYK™. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
