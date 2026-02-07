import { Facebook, Instagram } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function FooterMinimal() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 bg-stryk-navyDeep border-t border-stryk-gold/10">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="light" size="sm" />
          <div className="flex items-center gap-4">
            <a
              href="https://www.facebook.com/share/1RfV3uK5BU/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stryk-silver/50 hover:text-stryk-gold transition-colors duration-300"
              aria-label="Facebook"
            >
              <Facebook size={20} />
            </a>
            <a
              href="https://www.instagram.com/whitelions.fc?igsh=MWlzdHltbnloeHFqYQ=="
              target="_blank"
              rel="noopener noreferrer"
              className="text-stryk-silver/50 hover:text-stryk-gold transition-colors duration-300"
              aria-label="Instagram"
            >
              <Instagram size={20} />
            </a>
          </div>
          <p className="text-xs text-stryk-silver/50">
            © {currentYear} STRYK. Hecho para academias que quieren orden.
          </p>
        </div>
      </div>
    </footer>
  );
}
