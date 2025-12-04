import { 
  Calendar, 
  Users, 
  Clock, 
  BarChart3, 
  Bell, 
  Shield,
  Smartphone,
  Palette
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Intelligente Terminplanung",
    description: "Kunden buchen online, Stylisten bestätigen. Automatische Pufferzeiten und Konflikterkennung.",
    color: "bg-rose-light text-rose",
  },
  {
    icon: Users,
    title: "Mitarbeiterverwaltung",
    description: "Dienstpläne, Urlaub, Krankmeldungen und Zeiterfassung per NFC/QR-Code an einem Ort.",
    color: "bg-gold-light text-gold",
  },
  {
    icon: Clock,
    title: "Zeiterfassung",
    description: "Check-in/Check-out mit NFC oder QR. Automatische Pausenerkennung und Stundenkonten.",
    color: "bg-sage-light text-sage",
  },
  {
    icon: BarChart3,
    title: "Berichte & Analysen",
    description: "Auslastung, Umsatz pro Dienstleistung und Mitarbeiterperformance auf einen Blick.",
    color: "bg-rose-light text-rose",
  },
  {
    icon: Bell,
    title: "Benachrichtigungen",
    description: "Automatische Terminerinnerungen per E-Mail und Push. Keine vergessenen Termine mehr.",
    color: "bg-gold-light text-gold",
  },
  {
    icon: Shield,
    title: "Datenschutz",
    description: "DSGVO-konform. Sichere Speicherung aller Kunden- und Mitarbeiterdaten.",
    color: "bg-sage-light text-sage",
  },
  {
    icon: Smartphone,
    title: "Multi-Plattform",
    description: "Web-App für Admin, mobile Apps für Stylisten und Kunden. Überall verfügbar.",
    color: "bg-rose-light text-rose",
  },
  {
    icon: Palette,
    title: "Multi-Salon Support",
    description: "Verwalten Sie mehrere Standorte zentral. Individuelle Einstellungen pro Salon.",
    color: "bg-gold-light text-gold",
  },
];

const Features = () => {
  return (
    <section className="py-24 bg-card">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block text-sm font-medium text-primary mb-4">
            Funktionen
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Alles was Ihr Salon braucht
          </h2>
          <p className="text-lg text-muted-foreground">
            Von der Terminbuchung bis zur Lagerverwaltung – SalonManager vereint alle 
            wichtigen Funktionen in einer eleganten Lösung.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-6 bg-background rounded-2xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
