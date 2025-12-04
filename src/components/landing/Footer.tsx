import { Scissors, Instagram, Facebook, Twitter, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const footerLinks = {
    product: [
      { name: "Funktionen", href: "#features" },
      { name: "Preise", href: "#pricing" },
      { name: "Integrationen", href: "#integrations" },
      { name: "Updates", href: "#updates" },
    ],
    company: [
      { name: "Über uns", href: "#about" },
      { name: "Karriere", href: "#careers" },
      { name: "Blog", href: "#blog" },
      { name: "Presse", href: "#press" },
    ],
    resources: [
      { name: "Dokumentation", href: "#docs" },
      { name: "Hilfe-Center", href: "#help" },
      { name: "API", href: "#api" },
      { name: "Status", href: "#status" },
    ],
    legal: [
      { name: "Datenschutz", href: "#privacy" },
      { name: "AGB", href: "#terms" },
      { name: "Impressum", href: "#imprint" },
      { name: "Cookies", href: "#cookies" },
    ],
  };

  const socialLinks = [
    { icon: Instagram, href: "#instagram" },
    { icon: Facebook, href: "#facebook" },
    { icon: Twitter, href: "#twitter" },
    { icon: Linkedin, href: "#linkedin" },
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold text-foreground">
                Salon<span className="text-primary">Manager</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Die moderne Lösung für Salonmanagement. Termine, Mitarbeiter und Kunden – alles in einer App.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Produkt</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Unternehmen</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Ressourcen</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Rechtliches</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SalonManager. Alle Rechte vorbehalten.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ❤️ in Deutschland
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
