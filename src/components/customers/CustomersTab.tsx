import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerProfile, useCustomers } from '@/hooks/useCustomers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  User as UserIcon,
  Search as SearchIcon,
  Calendar as CalendarIcon,
  PlusCircle,
  Cake as CakeIcon,
  Image as ImageIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  MapPin as MapPinIcon,
  MessageSquare,
} from 'lucide-react';
import AppointmentInfoModal from '@/components/dashboard/AppointmentInfoModal';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface CustomersTabProps {
  /**
   * ID of the salon whose customer profiles should be displayed. When null
   * (e.g. while data is still loading) the component renders an empty list.
   */
  salonId: string | null;
}

/**
 * Tab for viewing and managing salon customers. This component handles
 * listing, searching, creating, editing and viewing detailed information
 * about customer profiles. It also highlights birthdays and lists past
 * appointments when viewing a customer in detail.
 */
const CustomersTab: React.FC<CustomersTabProps> = ({ salonId }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;

  const {
    customers,
    loading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerAppointments,
  } = useCustomers(salonId ?? undefined);

  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);

  // Load past appointments whenever a customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      getCustomerAppointments(selectedCustomer.id)
        .then((data) => setAppointments(data))
        .catch((err) => {
          console.error('Failed to fetch appointments for customer', err);
          setAppointments([]);
        });
    } else {
      setAppointments([]);
    }
  }, [selectedCustomer, getCustomerAppointments]);

  // Filter customers by search term
  const filteredCustomers = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter((c) => {
      const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
      const phone = (c.phone ?? '').toLowerCase();
      const email = (c.email ?? '').toLowerCase();
      const customerNumber = (c.customer_number ?? '').toLowerCase();
      // Structured address fields
      const addressString = [c.street, c.house_number, c.postal_code, c.city]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        fullName.includes(term) ||
        phone.includes(term) ||
        email.includes(term) ||
        customerNumber.includes(term) ||
        addressString.includes(term)
      );
    });
  }, [customers, search]);

  // Compute birthday reminders
  const today = new Date();
  const currentMonth = today.getMonth();
  const birthdaysToday = customers.filter(
    (c) =>
      c.birthdate &&
      new Date(c.birthdate).getDate() === today.getDate() &&
      new Date(c.birthdate).getMonth() === currentMonth
  );
  const birthdaysThisMonth = customers.filter(
    (c) =>
      c.birthdate &&
      new Date(c.birthdate).getMonth() === currentMonth &&
      new Date(c.birthdate).getDate() !== today.getDate()
  );

  // Handle form save callback
  const handleFormSave = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  // Render a single customer row
  const renderCustomerRow = (customer: CustomerProfile) => {
    const hasBirthdayToday = customer.birthdate &&
      new Date(customer.birthdate).getDate() === today.getDate() &&
      new Date(customer.birthdate).getMonth() === currentMonth;
    const hasBirthdayMonth = customer.birthdate &&
      new Date(customer.birthdate).getMonth() === currentMonth &&
      new Date(customer.birthdate).getDate() !== today.getDate();
    return (
      <div
        key={customer.id}
        className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors cursor-pointer"
        onClick={() => setSelectedCustomer(customer)}
      >
        <div className="flex-1">
          <p className="font-medium text-foreground">
            {customer.first_name} {customer.last_name}
          </p>
          <p className="text-sm text-muted-foreground">
            {customer.email || customer.phone || '-'}
          </p>
        </div>
        {/* Birthday indicator */}
        {(hasBirthdayToday || hasBirthdayMonth) && (
          <div className="flex items-center gap-1 text-xs text-sage">
            <CakeIcon className="w-4 h-4" />
            {hasBirthdayToday
              ? t('customersPage.todayBirthdays')
              : t('customersPage.monthBirthdays')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">
          {t('customersPage.title')}
        </h2>
        <Button onClick={() => setShowForm(true)}>
          <PlusCircle className="w-4 h-4 mr-2" />
          {t('customersPage.addCustomer')}
        </Button>
      </div>
      {/* Search input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('customersPage.searchPlaceholder', 'Search...')}
          className="pl-8"
        />
      </div>
      {/* Birthday reminders */}
      <div>
        <h3 className="text-lg font-display font-medium mb-2 flex items-center gap-2">
          <CakeIcon className="w-5 h-5 text-primary" /> {t('customersPage.birthdays')}
        </h3>
        {birthdaysToday.length === 0 && birthdaysThisMonth.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('customersPage.noBirthdays')}</p>
        ) : (
          <div className="space-y-2">
            {birthdaysToday.length > 0 && (
              <div>
                <p className="font-medium text-foreground mb-1">
                  {t('customersPage.todayBirthdays')}
                </p>
                <div className="space-y-1">
                  {birthdaysToday.map((c) => (
                    <span key={c.id} className="block text-sm text-muted-foreground">
                      {c.first_name} {c.last_name} – {format(parseISO(c.birthdate as string), 'dd.MM.', { locale })}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {birthdaysThisMonth.length > 0 && (
              <div>
                <p className="font-medium text-foreground mb-1">
                  {t('customersPage.monthBirthdays')}
                </p>
                <div className="space-y-1">
                  {birthdaysThisMonth.map((c) => (
                    <span key={c.id} className="block text-sm text-muted-foreground">
                      {c.first_name} {c.last_name} – {format(parseISO(c.birthdate as string), 'dd.MM.', { locale })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Customers List */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <UserIcon className="w-5 h-5 text-primary" /> {t('nav.customers')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">{t('common.loading')}</p>
          ) : filteredCustomers.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t('customersPage.noCustomers')}</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredCustomers.map((c) => renderCustomerRow(c))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer detail modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          appointments={appointments}
          open={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onEdit={(cust) => {
            // Close the detail modal and open the form pre-filled for editing
            setSelectedCustomer(null);
            setEditingCustomer(cust);
            setShowForm(true);
          }}
          onDelete={async (cust) => {
            // Ask for confirmation before deletion
            if (window.confirm(t('customersPage.confirmDelete', 'Are you sure you want to delete this customer?'))) {
              try {
                await deleteCustomer(cust.id);
                setSelectedCustomer(null);
              } catch (err) {
                console.error('Failed to delete customer', err);
              }
            }
          }}
        />
      )}

      {/* Customer form modal */}
      {showForm && (
        <CustomerForm
          salonId={salonId || ''}
          initialCustomer={editingCustomer}
          onCancel={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
          onSave={handleFormSave}
          createCustomer={createCustomer}
          updateCustomer={updateCustomer}
        />
      )}
    </div>
  );
};

export default CustomersTab;

// -----------------------------------------------------------------------------
// CustomerForm Component
// -----------------------------------------------------------------------------

interface CustomerFormProps {
  salonId: string;
  initialCustomer: CustomerProfile | null;
  onCancel: () => void;
  onSave: () => void;
  createCustomer: (profile: Omit<CustomerProfile, 'id' | 'created_at' | 'updated_at'>) => Promise<CustomerProfile>;
  updateCustomer: (id: string, updates: Partial<CustomerProfile>) => Promise<CustomerProfile>;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  salonId,
  initialCustomer,
  onCancel,
  onSave,
  createCustomer,
  updateCustomer,
}) => {
  const { t } = useTranslation();
  // Local form state
  const [firstName, setFirstName] = useState(initialCustomer?.first_name ?? '');
  const [lastName, setLastName] = useState(initialCustomer?.last_name ?? '');
  const [birthdate, setBirthdate] = useState(initialCustomer?.birthdate ?? '');
  const [phone, setPhone] = useState(initialCustomer?.phone ?? '');
  const [email, setEmail] = useState(initialCustomer?.email ?? '');
  // Structured address fields. Use separate state variables for street, house number, postal code and city.
  const [street, setStreet] = useState(initialCustomer?.street ?? '');
  const [houseNumber, setHouseNumber] = useState(initialCustomer?.house_number ?? '');
  const [postalCode, setPostalCode] = useState(initialCustomer?.postal_code ?? '');
  const [city, setCity] = useState(initialCustomer?.city ?? '');
  const [notes, setNotes] = useState(initialCustomer?.notes ?? '');
  const [imageUrls, setImageUrls] = useState<string[]>(initialCustomer?.image_urls ?? []);
  const [uploading, setUploading] = useState(false);

  // Handle file input change – converts selected images to data URIs and stores
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const maxImages = 5;
    const selected: string[] = [];
    const total = Math.min(files.length, maxImages);
    for (let i = 0; i < total; i++) {
      const file = files[i];
      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const dataUri = await promise;
      selected.push(dataUri);
    }
    setImageUrls(selected);
  };

  // Submit handler
  const handleSubmit = async () => {
    const payload = {
      salon_id: salonId,
      user_id: initialCustomer?.user_id ?? null,
      first_name: firstName,
      last_name: lastName,
      birthdate: birthdate || null,
      phone: phone || null,
      email: email || null,
      // Use structured address fields instead of the deprecated single address field
      street: street || null,
      house_number: houseNumber || null,
      postal_code: postalCode || null,
      city: city || null,
      // Keep the legacy address field null by default. This may be used for backwards compatibility.
      address: null,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      notes: notes || null,
    } as Omit<CustomerProfile, 'id' | 'created_at' | 'updated_at'>;
    try {
      if (initialCustomer) {
        await updateCustomer(initialCustomer.id, payload);
      } else {
        await createCustomer(payload);
      }
      onSave();
    } catch (err) {
      console.error('Failed to save customer', err);
    }
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {initialCustomer ? t('customersPage.editCustomer') : t('customersPage.addCustomer')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="first-name">
                {t('customersPage.firstName')}
              </label>
              <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="last-name">
                {t('customersPage.lastName')}
              </label>
              <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="birthdate">
                {t('customersPage.birthdate')}
              </label>
              <Input
                id="birthdate"
                type="date"
                value={birthdate || ''}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="phone">
                {t('customersPage.phone')}
              </label>
              <Input id="phone" value={phone || ''} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                {t('customersPage.email')}
              </label>
              <Input id="email" type="email" value={email || ''} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="street">
                {t('customersPage.street', 'Straße')}
              </label>
              <Input id="street" value={street || ''} onChange={(e) => setStreet(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="house-number">
                {t('customersPage.houseNumber', 'Hausnummer')}
              </label>
              <Input id="house-number" value={houseNumber || ''} onChange={(e) => setHouseNumber(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="postal-code">
                {t('customersPage.postalCode', 'PLZ')}
              </label>
              <Input id="postal-code" value={postalCode || ''} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="city">
                {t('customersPage.city', 'Ort')}
              </label>
              <Input id="city" value={city || ''} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="notes">
              {t('customersPage.notes')}
            </label>
            <Textarea id="notes" value={notes || ''} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="images">
              {t('customersPage.images')}
            </label>
            <Input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
            />
            {imageUrls && imageUrls.length > 0 && (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {imageUrls.map((url, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={idx} src={url} alt="Customer" className="w-full h-20 object-cover rounded-md" />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!firstName || !lastName || uploading}>
              {initialCustomer ? t('customersPage.updateCustomer') : t('customersPage.createCustomer')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// -----------------------------------------------------------------------------
// CustomerDetailModal Component
// -----------------------------------------------------------------------------

interface CustomerDetailModalProps {
  customer: CustomerProfile;
  appointments: any[];
  open: boolean;
  onClose: () => void;
  /** Called when the user wants to edit the customer. */
  onEdit?: (customer: CustomerProfile) => void;
  /** Called when the user wants to delete the customer. */
  onDelete?: (customer: CustomerProfile) => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, appointments, open, onClose, onEdit, onDelete }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;
  const birthday = customer.birthdate ? new Date(customer.birthdate) : null;
  const today = new Date();
  const isBirthdayToday = birthday && birthday.getDate() === today.getDate() && birthday.getMonth() === today.getMonth();
  const isBirthdayMonth = birthday && birthday.getMonth() === today.getMonth() && birthday.getDate() !== today.getDate();

  // Navigate hook for opening the new appointment page
  const navigate = useNavigate();

  // Local state to manage the selected appointment for detailed view
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-semibold flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary" />
            {customer.first_name} {customer.last_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Personal details */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{t('customersPage.birthdate')}:</span>
              <span className="text-muted-foreground break-all">
                {birthday ? format(birthday, 'dd.MM.yyyy', { locale }) : '-'}
              </span>
              {isBirthdayToday && (
                <Badge className="bg-sage text-sage-foreground">
                  {t('customersPage.todayBirthdays')}
                </Badge>
              )}
              {!isBirthdayToday && isBirthdayMonth && (
                <Badge className="bg-gold text-gold-foreground">
                  {t('customersPage.monthBirthdays')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <PhoneIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{t('customersPage.phone')}:</span>
              <span className="text-muted-foreground break-all">{customer.phone || '-'}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <MailIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{t('customersPage.email')}:</span>
              <span className="text-muted-foreground break-all">{customer.email || '-'}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <MapPinIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{t('customersPage.address')}:</span>
              <span className="text-muted-foreground break-all">
                {customer.street || customer.house_number || customer.postal_code || customer.city
                  ? [customer.street, customer.house_number, customer.postal_code, customer.city]
                      .filter(Boolean)
                      .join(' ')
                  : customer.address || '-'}</span>
            </div>
            {/* Customer number */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{t('customersPage.customerNumber', 'Kundennummer')}:</span>
              <span className="text-muted-foreground break-all">{customer.customer_number ?? '-'}</span>
            </div>
          </div>
          {/* Images */}
          {customer.image_urls && customer.image_urls.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('customersPage.images')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {customer.image_urls.slice(0, 5).map((url, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={idx} src={url} alt="Customer" className="w-full h-24 object-cover rounded-md" />
                ))}
              </div>
            </div>
          )}
          {/* Notes */}
          {customer.notes && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('customersPage.notes')}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{customer.notes}</p>
            </div>
          )}
          {/* Past Appointments */}
          <div>
            <h4 className="text-lg font-display font-medium mb-2 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" /> {t('customersPage.appointments')}
            </h4>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('customersPage.noAppointments')}</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                    onClick={() => setSelectedAppointment(apt)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {format(new Date(apt.start_time), 'dd.MM.yyyy', { locale })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(apt.start_time), 'HH:mm', { locale })} – {format(new Date(apt.end_time), 'HH:mm', { locale })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          €{(apt.price ?? apt.service?.price ?? 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apt.service?.name || '-'}
                        </p>
                      </div>
                    </div>
                    {apt.notes && (
                      <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line">
                        {apt.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Action button to create a new appointment for this customer */}
          <div className="mt-4">
            <Button onClick={() => navigate(`/new-appointment/${customer.id}`)}>
              {t('customersPage.addAppointment', 'Neuen Termin anlegen')}
            </Button>
          </div>
        {/* Action buttons for editing and deleting the customer */}
        <div className="flex justify-end gap-2 pt-4">
          {onDelete && (
            <Button variant="destructive" onClick={() => onDelete(customer)}>
              {t('customersPage.deleteCustomer', 'Delete Customer')}
            </Button>
          )}
          {onEdit && (
            <Button onClick={() => onEdit(customer)}>
              {t('customersPage.editCustomer', 'Edit Customer')}
            </Button>
          )}
        </div>
        {/* Appointment details modal for selected appointment */}
        <AppointmentInfoModal
          appointment={selectedAppointment ? { ...selectedAppointment, customer_profile_id: customer.id } : null}
          open={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
        </div>
      </DialogContent>
    </Dialog>
  );
};
