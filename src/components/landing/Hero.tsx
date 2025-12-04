import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 gradient-warm" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-rose-light rounded-full blur-3xl opacity-60 animate-float" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-gold-light rounded-full blur-3xl opacity-40 animate-float" style={{ animationDelay: "1s" }} />
      
      <div className="container relative z-10 px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-border">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-muted-foreground">Die All-in-One Salon-Lösung</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight">
              Salon
              <span className="text-gradient">Manager</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Verwalten Sie Termine, Mitarbeiter und Kunden in einer eleganten Plattform. 
              Entwickelt für moderne Friseursalons.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/booking">Termin buchen</Link>
              </Button>
              <Button variant="glass" size="xl" asChild>
                <Link to="/register">Salon registrieren</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-8 border-t border-border">
              <div className="space-y-1">
                <p className="text-3xl font-display font-bold text-foreground">500+</p>
                <p className="text-sm text-muted-foreground">Aktive Salons</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-display font-bold text-foreground">50k+</p>
                <p className="text-sm text-muted-foreground">Termine/Monat</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-display font-bold text-foreground">98%</p>
                <p className="text-sm text-muted-foreground">Zufriedenheit</p>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="relative bg-card rounded-2xl shadow-lg border border-border p-6 transform rotate-1 hover:rotate-0 transition-transform duration-500">
              {/* Mini Dashboard Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Heute</p>
                    <p className="text-sm text-muted-foreground">12 Termine</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-full bg-sage" />
                  <div className="w-3 h-3 rounded-full bg-gold" />
                  <div className="w-3 h-3 rounded-full bg-rose" />
                </div>
              </div>

              {/* Mini Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                      i === 3
                        ? "gradient-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent text-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Appointment Preview */}
              <div className="space-y-3">
                {[
                  { time: "09:00", name: "Maria S.", service: "Haarschnitt", color: "bg-rose" },
                  { time: "10:30", name: "Lisa M.", service: "Färbung", color: "bg-gold" },
                  { time: "13:00", name: "Anna K.", service: "Styling", color: "bg-sage" },
                ].map((apt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className={`w-1 h-10 rounded-full ${apt.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{apt.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{apt.name} • {apt.service}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Users className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -left-4 bg-card p-4 rounded-xl shadow-lg border border-border animate-float" style={{ animationDelay: "0.5s" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sage-light rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-sage" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">8 Mitarbeiter</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 bg-card p-4 rounded-xl shadow-lg border border-border animate-float" style={{ animationDelay: "1.5s" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gold-light rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">+24%</p>
                  <p className="text-xs text-muted-foreground">Buchungen</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
