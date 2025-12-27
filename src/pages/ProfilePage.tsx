import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Scissors, User, LogOut, ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';
import ConsentSettings from '@/components/ConsentSettings';

/**
 * A dedicated profile page which allows authenticated users to update their
 * basic profile information and change their password.  This page
 * fetches the current user's profile from the `profiles` table and
 * passes it into the reusable `ProfileSettings` component.  All roles
 * (customer, employee, admin) can access this page via the `/profile`
 * route.  If the user is unauthenticated, they will be redirected
 * to the login page.
 */
const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect unauthenticated users to the login page
  if (!authLoading && !user) {
    navigate('/login');
    return null;
  }

  // Fetch the current user's profile data.  We only select the fields
  // needed by the ProfileSettings component.  The query is enabled
  // once the user object is available.
  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, avatar_url')
        .eq('user_id', user.id)
        .single();
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold text-foreground">
              Salon<span className="text-primary">Manager</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            {/* Profile link; active page still shows link for consistency */}
            <Link to="/profile" className="flex items-center gap-2 text-sm hover:underline">
              <User className="w-4 h-4" />
              {t('nav.profile', 'Profil')}
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back button to return to the previous page. We use navigate(-1) so that the user
           returns to the appropriate dashboard (admin, employee, etc.). */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.back')}
          </Button>
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">
          {t('profile.settings', 'Profil')}
        </h1>
        {/* Display loading indicator while fetching profile */}
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ProfileSettings profile={profile} onUpdate={refetch} />
        )}
        {/* Consent settings allow users to adjust their cookie, privacy and terms consent */}
        <div className="mt-8">
          <ConsentSettings />
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;