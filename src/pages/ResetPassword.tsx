import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/**
 * Page for users to reset their password after clicking the reset link in the
 * email sent by supabase.auth.resetPasswordForEmail().  When the user clicks
 * the link, Supabase automatically signs them in using the provided token
 * (implicit flow).  We then allow them to choose a new password and call
 * updateUser() to store it【352934996388639†L276-L283】.  Once updated the user is
 * redirected to the login page.  If no session exists we instruct the user
 * to restart the reset flow.
 */
const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      // Ensure the user is signed in via the reset link.  If not, we cannot
      // update the password and should ask the user to start over.
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        toast.error(
          t("auth.noResetUser", { defaultValue: "Keine gültige Session für Passwort-Reset gefunden. Bitte erneut versuchen." })
        );
        setLoading(false);
        return;
      }
      setLoading(false);
    };
    checkSession();
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updating) return;
    if (password !== confirmPassword) {
      toast.error(
        t("auth.passwordsDoNotMatch", { defaultValue: "Die Passwörter stimmen nicht überein." })
      );
      return;
    }
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setUpdating(false);
      return;
    }
    toast.success(
      t("auth.passwordUpdated", { defaultValue: "Passwort erfolgreich gespeichert." })
    );
    setUpdating(false);
    // After a password reset we sign the user out to prevent confusion and
    // redirect them to login.
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">
          {t("common.loading", { defaultValue: "Lädt…" })}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {t("auth.resetPasswordTitle", { defaultValue: "Neues Passwort wählen" })}
          </h1>
          <p className="text-muted-foreground">
            {t("auth.resetPasswordSubtitle", { defaultValue: "Bitte geben Sie Ihr neues Passwort ein." })}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.newPassword", { defaultValue: "Neues Passwort" })}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("auth.confirmPassword", { defaultValue: "Passwort bestätigen" })}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </div>
          <Button type="submit" variant="hero" className="w-full" size="lg" disabled={updating}>
            {updating
              ? t("common.loading", { defaultValue: "Lädt…" })
              : t("auth.savePassword", { defaultValue: "Passwort speichern" })}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;