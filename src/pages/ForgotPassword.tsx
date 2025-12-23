import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";

/**
 * A simple forgot‑password form.  Users can enter their email address and
 * receive a password reset link via Supabase.  The reset link will
 * redirect back to this application on the `#/reset-password` route.  If the
 * email is unknown, Supabase will still return success for security
 * reasons; we show a generic success message regardless.  See Supabase
 * password documentation for details【352934996388639†L276-L283】.
 */
const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/#/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(
          t("auth.resetPasswordSent", {
            defaultValue: "Ein Link zum Zurücksetzen wurde an Ihre E-Mail gesendet.",
          })
        );
      }
    } catch (err: any) {
      console.error("Forgot password error:", err);
      toast.error(t("auth.resetPasswordError", { defaultValue: "Fehler beim Senden des Zurücksetz-Links." }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {t("auth.forgotPasswordTitle", { defaultValue: "Passwort vergessen" })}
          </h1>
          <p className="text-muted-foreground">
            {t("auth.forgotPasswordSubtitle", { defaultValue: "Geben Sie Ihre E-Mail-Adresse ein, um einen Reset-Link zu erhalten." })}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ihre@email.de"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading} variant="hero" size="lg">
            {loading
              ? t("common.loading", { defaultValue: "Lädt…" })
              : t("auth.sendResetLink", { defaultValue: "Reset-Link senden" })}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary font-medium hover:underline">
            {t("auth.backToLogin", { defaultValue: "Zurück zum Login" })}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;