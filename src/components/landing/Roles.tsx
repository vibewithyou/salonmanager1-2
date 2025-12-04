import { Button } from "@/components/ui/button";
import { 
  Crown, 
  Scissors, 
  User,
  ChevronRight,
  Check
} from "lucide-react";

const roles = [
  {
    icon: Crown,
    title: "Saloninhaber",
    subtitle: "Volle Kontrolle",
    description: "Verwalten Sie alle Aspekte Ihres Salons von einem Dashboard aus.",
    features: [
      "Mitarbeiter & Dienstpläne verwalten",
      "Öffnungszeiten & Feiertage festlegen",
      "Berichte & Umsatzanalysen",
      "Lagerverwaltung & Bestellungen",
      "Kundendaten & Historie",
    ],
    gradient: "from-rose to-primary",
    bgLight: "bg-rose-light",
  },
  {
    icon: Scissors,
    title: "Stylisten",
    subtitle: "Effizient arbeiten",
    description: "Alle wichtigen Informationen auf einen Blick für den perfekten Arbeitstag.",
    features: [
      "Persönlicher Terminkalender",
      "Kundendetails & Notizen",
      "Zeiterfassung per NFC/QR",
      "Urlaub & Abwesenheiten beantragen",
      "Push-Benachrichtigungen",
    ],
    gradient: "from-gold to-primary",
    bgLight: "bg-gold-light",
  },
  {
    icon: User,
    title: "Kunden",
    subtitle: "Einfach buchen",
    description: "Termine buchen war noch nie so einfach und komfortabel.",
    features: [
      "Online Terminbuchung 24/7",
      "Stylisten & Service auswählen",
      "Bilder & Wünsche teilen",
      "Terminerinnerungen erhalten",
      "Buchungshistorie einsehen",
    ],
    gradient: "from-sage to-primary",
    bgLight: "bg-sage-light",
  },
];

const Roles = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block text-sm font-medium text-primary mb-4">
            Für jeden Nutzer
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Maßgeschneiderte Erfahrung
          </h2>
          <p className="text-lg text-muted-foreground">
            Jede Rolle hat ihre eigene, optimierte Oberfläche – perfekt abgestimmt auf die jeweiligen Bedürfnisse.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <div
                key={index}
                className="group relative bg-card rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-all duration-500 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Header */}
                <div className={`bg-gradient-to-r ${role.gradient} p-8 text-primary-foreground`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-primary-foreground/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-display font-bold">{role.title}</h3>
                      <p className="text-primary-foreground/80 text-sm">{role.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-primary-foreground/90">{role.description}</p>
                </div>

                {/* Features */}
                <div className="p-8">
                  <ul className="space-y-4">
                    {role.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full ${role.bgLight} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Check className="w-3 h-3 text-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button variant="ghost" className="w-full mt-6 group-hover:bg-secondary transition-colors">
                    Mehr erfahren
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Roles;
