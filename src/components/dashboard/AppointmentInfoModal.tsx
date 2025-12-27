import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, User, Scissors, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useExtraChargeReasons } from '@/hooks/useExtraChargeReasons';

interface AppointmentInfo {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  notes: string | null;
  guest_name: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  price?: number | null;
  buffer_before?: number | null;
  buffer_after?: number | null;
  image_url?: string | null;
  service?: {
    name: string;
    duration_minutes: number;
    price: number;
  } | null;
  /**
   * Reference to an associated customer profile. When present, we can fetch
   * additional information about the customer (e.g. birthdate) to show
   * contextual details in the modal.
   */
  customer_profile_id?: string | null;

  /**
   * Human-readable appointment number unique per salon. Used for searching and invoices.
   */
  appointment_number?: string | null;

  /**
   * ID of the salon this appointment belongs to. Required for fetching
   * salon‑specific settings like extra charge reasons.
   */
  salon_id: string;
}

interface AppointmentInfoModalProps {
  appointment: AppointmentInfo | null;
  open: boolean;
  onClose: () => void;
  /** Whether the current user can reschedule this appointment. */
  canReschedule?: boolean;
  /** Whether the current user can reassign this appointment to a different stylist (admin only). */
  canReassign?: boolean;
  /** List of employees available for reassignment. Only used when canReassign is true. */
  employees?: { id: string; display_name: string }[];
  /** Callback to update the appointment. Required when rescheduling is enabled. */
  onUpdate?: (id: string, updates: Partial<AppointmentInfo>) => Promise<any>;

  /**
   * Whether the current user can mark the appointment as completed. When true,
   * the modal will show controls to apply extra charges and generate an invoice.
   */
  canComplete?: boolean;
  /**
   * Callback fired when an appointment is completed. It receives the
   * appointment id, the final price (after extras and manual adjustments) and
   * a list of applied extras with their respective amounts.
   */
  onComplete?: (id: string, finalPrice: number, extras: { id: string; amount: number }[]) => Promise<any>;
}

/**
 * Displays detailed information about an appointment. This modal is used
 * throughout the dashboard views when clicking on an appointment entry.
 */
export function AppointmentInfoModal({ appointment, open, onClose, canReschedule = false, canReassign = false, employees = [], onUpdate,
  canComplete = false,
  onComplete,
}: AppointmentInfoModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;

  // Local state for fetching customer details when a customer_profile_id is provided.
  // We store the birthdate and the salon-specific customer number (if available)
  // to display contextual information in the modal.
  const [customerBirthdate, setCustomerBirthdate] = useState<Date | null>(null);
  const [customerNumber, setCustomerNumber] = useState<string | null>(null);

  // Editing state for rescheduling. When true, show editing form.
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editEmployee, setEditEmployee] = useState('');

  // Completion state. When true, the UI will show controls to apply
  // extra charges and finalise the appointment.
  const [completing, setCompleting] = useState(false);
  // Store the selection state and amounts for extra charge reasons
  const [selectedExtras, setSelectedExtras] = useState<{ [id: string]: { selected: boolean; amount: number } }>({});
  // Manual price adjustment applied in addition to extras (may be negative)
  const [manualAdjustment, setManualAdjustment] = useState<number>(0);

  // Fetch extra charge reasons for the current appointment's salon. If
  // appointment is undefined, no reasons will be loaded.
  const { reasons } = useExtraChargeReasons(appointment?.salon_id);

  // Initialise extra charge selections whenever the reasons list changes.
  useEffect(() => {
    const initial: { [id: string]: { selected: boolean; amount: number } } = {};
    (reasons || []).forEach((r) => {
      initial[r.id] = { selected: false, amount: r.default_amount ?? 0 };
    });
    setSelectedExtras(initial);
  }, [reasons]);

  useEffect(() => {
    async function fetchCustomer() {
      if (appointment?.customer_profile_id) {
        const { data, error } = await supabase
          .from('customer_profiles')
          .select('birthdate, customer_number')
          .eq('id', appointment.customer_profile_id)
          .maybeSingle();
        if (!error && data) {
          if (data.birthdate) {
            setCustomerBirthdate(new Date(data.birthdate));
          } else {
            setCustomerBirthdate(null);
          }
          setCustomerNumber((data as any).customer_number ?? null);
        } else {
          setCustomerBirthdate(null);
          setCustomerNumber(null);
        }
      } else {
        setCustomerBirthdate(null);
        setCustomerNumber(null);
      }
    }
    fetchCustomer();
  }, [appointment?.customer_profile_id]);

  if (!appointment) return null;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-sage text-sage-foreground">{t('appointments.confirmed')}</Badge>;
      case 'pending':
        return <Badge className="bg-gold text-gold-foreground">{t('appointments.pending')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-rose text-rose-foreground">{t('appointments.cancelled')}</Badge>;
      case 'completed':
        return <Badge variant="secondary">{t('appointments.completed')}</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const price = appointment.price ?? appointment.service?.price ?? 0;
  const bufferBefore = appointment.buffer_before ?? 0;
  const bufferAfter = appointment.buffer_after ?? 0;

  // Determine whether the associated customer (if any) has a birthday today or later this month.
  const todayDate = new Date();
  const isBirthdayToday =
    !!customerBirthdate &&
    customerBirthdate.getDate() === todayDate.getDate() &&
    customerBirthdate.getMonth() === todayDate.getMonth();
  const isBirthdayMonth =
    !!customerBirthdate &&
    customerBirthdate.getMonth() === todayDate.getMonth() &&
    customerBirthdate.getDate() !== todayDate.getDate();

    return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      {/*
        Set a max height on the dialog content and enable vertical scrolling
        so that longer rescheduling or completion forms remain accessible on small screens.
      */}
      <DialogContent className="max-w-md overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('appointments.details')}</span>
            {getStatusBadge(appointment.status)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Date & Time */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                {format(parseISO(appointment.start_time), 'EEEE, d. MMMM yyyy', { locale })}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(appointment.start_time), 'HH:mm')} - {format(parseISO(appointment.end_time), 'HH:mm')}
              </p>
            </div>
          </div>

          {/* Service & Price */}
          {appointment.service && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Scissors className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{appointment.service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.service.duration_minutes} {t('time.minutes')}
                </p>
              </div>
              <span className="font-semibold text-foreground">
                €{price.toFixed(2)}
              </span>
            </div>
          )}

          {/* Buffer Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t('appointments.bufferBefore') || t('services.bufferBefore')}</p>
              <p className="font-medium text-foreground">{bufferBefore} {t('time.minutes')}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t('appointments.bufferAfter') || t('services.bufferAfter')}</p>
              <p className="font-medium text-foreground">{bufferAfter} {t('time.minutes')}</p>
            </div>
          </div>

          {/* Appointment number */}
          {appointment.appointment_number && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{t('appointments.appointmentNumber', 'Terminnummer')}</p>
              <p className="font-medium text-foreground">{appointment.appointment_number}</p>
            </div>
          )}

          {/* Customer Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {appointment.guest_name || t('dashboard.anonymousCustomer')}
              </span>
          {/* Birthday badge if applicable */}
          {isBirthdayToday && (
            <Badge className="ml-2 bg-sage text-sage-foreground">
              {t('customersPage.todayBirthdays')}
            </Badge>
          )}
          {!isBirthdayToday && isBirthdayMonth && (
            <Badge className="ml-2 bg-gold text-gold-foreground">
              {t('customersPage.monthBirthdays')}
            </Badge>
          )}
            </div>
            {appointment.guest_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{appointment.guest_email}</span>
              </div>
            )}
            {appointment.guest_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{appointment.guest_phone}</span>
              </div>
            )}
            {/* Customer number (from customer profile) */}
            {customerNumber && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">
                  {t('customersPage.customerNumber', 'Kundennummer')}:
                </span>
                <span className="font-medium break-all">{customerNumber}</span>
              </div>
            )}
          </div>

          {/* Image */}
          {appointment.image_url && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('appointments.image')}</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={appointment.image_url}
                alt={t('appointments.image')}
                className="w-full rounded-lg max-h-60 object-cover"
              />
            </div>
          )}

          {/* Customer notes provided during booking */}
          {appointment.notes && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('appointments.customerNotes')}</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {appointment.notes}
              </p>
            </div>
          )}

          {/* Stylist/Admin notes placeholder */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('appointments.stylistNotes')}</span>
            </div>
            <p className="text-sm text-muted-foreground italic">
              {t('appointments.noStylistNotes')}
            </p>
          </div>

          {/* Reschedule controls */}
          {canReschedule && (
            <div className="mt-4">
              {!editing ? (
                <Button onClick={() => {
                  if (!appointment) return;
                  // Pre-fill form values with current appointment data
                  setEditDate(appointment.start_time.split('T')[0]);
                  setEditTime(format(parseISO(appointment.start_time), 'HH:mm'));
                  // For reassigning, default to current employee id (if provided)
                  setEditEmployee((appointment as any).employee_id || '');
                  setEditing(true);
                }}>
                  {t('appointments.reschedule', 'Termin verschieben')}
                </Button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium" htmlFor="editDate">{t('appointments.newDate', 'Neues Datum')}</label>
                    <input
                      id="editDate"
                      type="date"
                      className="border border-input rounded px-2 py-1"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                    <label className="text-sm font-medium" htmlFor="editTime">{t('appointments.newTime', 'Neue Zeit')}</label>
                    <input
                      id="editTime"
                      type="time"
                      className="border border-input rounded px-2 py-1"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                    />
                    {canReassign && employees.length > 0 && (
                      <>
                        <label className="text-sm font-medium" htmlFor="editEmployee">{t('appointments.newStylist', 'Neuer Stylist')}</label>
                        <select
                          id="editEmployee"
                          className="border border-input rounded px-2 py-1"
                          value={editEmployee}
                          onChange={(e) => setEditEmployee(e.target.value)}
                        >
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.display_name}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={async () => {
                        if (!onUpdate || !appointment) return;
                        // Compute new start and end times
                        const newStart = new Date(`${editDate}T${editTime}`);
                        const duration = appointment.service?.duration_minutes ?? 30;
                        const newEnd = new Date(newStart.getTime() + duration * 60000);
                        const updates: any = {
                          start_time: newStart.toISOString(),
                          end_time: newEnd.toISOString(),
                        };
                        if (canReassign) {
                          updates.employee_id = editEmployee || null;
                        }
                        try {
                          await onUpdate(appointment.id, updates);
                          setEditing(false);
                          // Close modal as we have updated data in the parent lists
                          onClose();
                        } catch (err) {
                          console.error('Failed to update appointment', err);
                        }
                      }}
                    >
                      {t('common.save', 'Speichern')}
                    </Button>
                    <Button variant="secondary" onClick={() => setEditing(false)}>
                      {t('common.cancel', 'Abbrechen')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Complete appointment controls */}
          {canComplete && !editing && (
            <div className="mt-4">
              {!completing ? (
                <Button onClick={() => setCompleting(true)}>
                  {t('appointments.complete', 'Termin abschließen')}
                </Button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                  {/* List of extra charges */}
                  {reasons && reasons.length > 0 ? (
                    reasons.map((reason) => (
                      <div key={reason.id} className="flex items-center gap-2">
                        <input
                          id={`extra-${reason.id}`}
                          type="checkbox"
                          className="h-4 w-4 border border-input rounded"
                          checked={selectedExtras[reason.id]?.selected || false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedExtras((prev) => ({
                              ...prev,
                              [reason.id]: {
                                selected: checked,
                                amount: prev[reason.id]?.amount ?? reason.default_amount ?? 0,
                              },
                            }));
                          }}
                        />
                        <label htmlFor={`extra-${reason.id}`} className="flex-1 text-sm">
                          {reason.name}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-24 border border-input rounded px-2 py-1 text-sm"
                          value={selectedExtras[reason.id]?.amount ?? reason.default_amount ?? 0}
                          disabled={!selectedExtras[reason.id]?.selected}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setSelectedExtras((prev) => ({
                              ...prev,
                              [reason.id]: {
                                selected: prev[reason.id]?.selected ?? true,
                                amount: isNaN(value) ? 0 : value,
                              },
                            }));
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('appointments.noExtraReasons', 'Keine Zusatzgründe definiert')}
                    </p>
                  )}
                  {/* Manual adjustment */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium" htmlFor="manualAdjustment">
                      {t('appointments.manualAdjustment', 'Manueller Aufschlag')}
                    </label>
                    <input
                      id="manualAdjustment"
                      type="number"
                      step="0.01"
                      className="w-24 border border-input rounded px-2 py-1 text-sm"
                      value={manualAdjustment}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setManualAdjustment(isNaN(val) ? 0 : val);
                      }}
                    />
                  </div>
                  {/* Final price summary */}
                  <div className="font-medium">
                    {t('appointments.finalPrice', 'Gesamtpreis')}: €
                    {(() => {
                      const base = price || 0;
                      let extraTotal = 0;
                      Object.entries(selectedExtras).forEach(([id, sel]) => {
                        if (sel.selected) extraTotal += sel.amount;
                      });
                      const total = base + extraTotal + (manualAdjustment || 0);
                      return total.toFixed(2);
                    })()}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={async () => {
                        if (!appointment || !onComplete) return;
                        // Compute final price and extras list
                        let extraList: { id: string; amount: number }[] = [];
                        Object.entries(selectedExtras).forEach(([id, sel]) => {
                          if (sel.selected) {
                            extraList.push({ id, amount: sel.amount });
                          }
                        });
                        const base = price || 0;
                        let extraTotal = 0;
                        extraList.forEach((item) => {
                          extraTotal += item.amount;
                        });
                        const finalPrice = base + extraTotal + (manualAdjustment || 0);
                        try {
                          await onComplete(appointment.id, finalPrice, extraList);
                          setCompleting(false);
                          setManualAdjustment(0);
                          onClose();
                        } catch (err) {
                          console.error('Failed to complete appointment', err);
                        }
                      }}
                    >
                      {t('appointments.completeConfirm', 'Abschließen')}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCompleting(false);
                        setManualAdjustment(0);
                      }}
                    >
                      {t('common.cancel', 'Abbrechen')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AppointmentInfoModal;