import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Scissors, Building2, Clock, MapPin, Phone, Mail, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

interface OpeningHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

const defaultOpeningHours: OpeningHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '14:00', closed: false },
  sunday: { open: '09:00', close: '18:00', closed: true },
};

const SalonSetup = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
  });

  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultOpeningHours);

  const dayNames = i18n.language === 'de' 
    ? ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpeningHoursChange = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setOpeningHours({
      ...openingHours,
      [day]: { ...openingHours[day], [field]: value },
    });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Use the secure RPC function to create salon and upgrade role
      const { data: salonId, error } = await supabase.rpc('create_salon_with_owner', {
        p_name: formData.name,
        p_description: formData.description || null,
        p_address: formData.address || null,
        p_city: formData.city || null,
        p_postal_code: formData.postal_code || null,
        p_phone: formData.phone || null,
        p_email: formData.email || null,
        p_opening_hours: openingHours,
      });

      if (error) throw error;

      toast.success(t('salonSetup.success', 'Salon erfolgreich erstellt!'));
      navigate('/admin');
    } catch (error: any) {
      console.error('Error creating salon:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = formData.name.trim().length > 0;
  const isStep2Valid = formData.address.trim().length > 0 && formData.city.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold text-foreground">
              Salon<span className="text-primary">Manager</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-1 rounded ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('salonSetup.step1Title', 'Salon Grunddaten')}</CardTitle>
              <CardDescription>{t('salonSetup.step1Description', 'Geben Sie die grundlegenden Informationen zu Ihrem Salon ein.')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">{t('salonSetup.salonName', 'Salonname')} *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('salonSetup.salonNamePlaceholder', 'z.B. Hair Studio Berlin')}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">{t('salonSetup.description', 'Beschreibung')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('salonSetup.descriptionPlaceholder', 'Kurze Beschreibung Ihres Salons...')}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone"><Phone className="w-4 h-4 inline mr-1" />{t('auth.phone')}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+49 30 12345678"
                  />
                </div>
                <div>
                  <Label htmlFor="email"><Mail className="w-4 h-4 inline mr-1" />{t('auth.email')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="kontakt@salon.de"
                  />
                </div>
              </div>
              <Button 
                onClick={() => setStep(2)} 
                className="w-full" 
                disabled={!isStep1Valid}
              >
                {t('common.next')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Address */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('salonSetup.step2Title', 'Adresse')}</CardTitle>
              <CardDescription>{t('salonSetup.step2Description', 'Wo befindet sich Ihr Salon?')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">{t('salonSetup.street', 'Straße & Hausnummer')} *</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder={t('salonSetup.streetPlaceholder', 'Musterstraße 123')}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postal_code">{t('salonSetup.postalCode', 'PLZ')} *</Label>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    placeholder="10115"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">{t('salonSetup.city', 'Stadt')} *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Berlin"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  className="flex-1" 
                  disabled={!isStep2Valid}
                >
                  {t('common.next')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Opening Hours */}
        {step === 3 && (
          <Card className="animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('salonSetup.step3Title', 'Öffnungszeiten')}</CardTitle>
              <CardDescription>{t('salonSetup.step3Description', 'Wann ist Ihr Salon geöffnet?')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dayKeys.map((day, index) => (
                <div key={day} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-24 font-medium text-sm">{dayNames[index]}</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!openingHours[day].closed}
                      onChange={(e) => handleOpeningHoursChange(day, 'closed', !e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-muted-foreground">
                      {t('salonSetup.open', 'Geöffnet')}
                    </span>
                  </label>
                  {!openingHours[day].closed && (
                    <>
                      <Input
                        type="time"
                        value={openingHours[day].open}
                        onChange={(e) => handleOpeningHoursChange(day, 'open', e.target.value)}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={openingHours[day].close}
                        onChange={(e) => handleOpeningHoursChange(day, 'close', e.target.value)}
                        className="w-28"
                      />
                    </>
                  )}
                  {openingHours[day].closed && (
                    <span className="text-sm text-muted-foreground italic">
                      {t('salonSetup.closed', 'Geschlossen')}
                    </span>
                  )}
                </div>
              ))}
              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="flex-1" 
                  disabled={loading}
                >
                  {loading ? t('common.loading') : t('salonSetup.createSalon', 'Salon erstellen')}
                  <Check className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SalonSetup;
