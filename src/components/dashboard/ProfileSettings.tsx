import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Loader2, User, Save, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileSettingsProps {
  profile: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    phone: string | null;
  } | null;
  onUpdate: () => void;
}

export const ProfileSettings = ({ profile, onUpdate }: ProfileSettingsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
  });

  const initials = `${formData.first_name?.[0] || ''}${formData.last_name?.[0] || ''}`.toUpperCase() || 'U';

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.invalidFileType'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.fileTooLarge'));
      return;
    }

    setUploading(true);

    try {
      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success(t('profile.avatarUpdated'));
      onUpdate();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(t('profile.avatarError'));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('profile.profileUpdated'));
      onUpdate();
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle a password change for the currently authenticated user.  Supabase
   * requires that the user is signed in to update their password.  We ask
   * the user for their current password (to re‑authenticate) and then for
   * a new password and its confirmation.  The current password is verified
   * by attempting a sign‑in with it; if that succeeds we call
   * `updateUser({ password })` on the Supabase client.  See the docs on
   * password‑based auth for details【352934996388639†L276-L283】.
   */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      toast.error(t('auth.passwordsDoNotMatch', { defaultValue: 'Die Passwörter stimmen nicht überein.' }));
      return;
    }
    setChangingPassword(true);
    try {
      // Re‑authenticate by signing in with the current password.  If this
      // fails, Supabase will return an error.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });
      if (signInError) {
        toast.error(t('auth.invalidCurrentPassword', { defaultValue: 'Aktuelles Passwort ist ungültig.' }));
        setChangingPassword(false);
        return;
      }
      // Update the password for the current session.  This call requires
      // a valid session and will sign out other active sessions.  Supabase
      // automatically refreshes the session after updating the password【352934996388639†L276-L283】.
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        toast.error(updateError.message);
        setChangingPassword(false);
        return;
      }
      // Clear input fields and notify the user.
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('auth.passwordUpdated', { defaultValue: 'Passwort erfolgreich gespeichert.' }));
    } catch (err: any) {
      console.error('Change password error:', err);
      toast.error(t('auth.updatePasswordError', { defaultValue: 'Fehler beim Aktualisieren des Passworts.' }));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <User className="w-5 h-5 text-primary" />
          {t('profile.settings')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-24 h-24 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleAvatarClick}>
              <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{t('profile.clickToUpload')}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Profile Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t('profile.firstName')}</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder={t('profile.firstName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t('profile.lastName')}</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder={t('profile.lastName')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('profile.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder={t('profile.phone')}
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t('profile.save')}
          </Button>
        </div>

        {/* Change Password Form */}
        <div className="space-y-4 border-t pt-6 mt-6">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            {t('auth.changePasswordTitle', { defaultValue: 'Passwort ändern' })}
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">{t('auth.currentPassword', { defaultValue: 'Aktuelles Passwort' })}</Label>
              <Input
                id="current_password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">{t('auth.newPassword', { defaultValue: 'Neues Passwort' })}</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_new_password">{t('auth.confirmPassword', { defaultValue: 'Passwort bestätigen' })}</Label>
              <Input
                id="confirm_new_password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" disabled={changingPassword} className="w-full">
              {changingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {t('auth.changePassword', { defaultValue: 'Passwort ändern' })}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
