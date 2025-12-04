import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  Check, 
  X, 
  MessageSquare,
  Phone,
  Mail
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  notes: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  price: number | null;
  service?: {
    name: string;
    duration_minutes: number;
    price: number;
  } | null;
}

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string, reason?: string) => Promise<void>;
  onSuggestNewTime?: (id: string, newTime: string) => Promise<void>;
  canApprove?: boolean;
}

export function AppointmentDetailModal({
  appointment,
  open,
  onClose,
  onApprove,
  onReject,
  onSuggestNewTime,
  canApprove = false,
}: AppointmentDetailModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestTime, setShowSuggestTime] = useState(false);
  const [suggestedDate, setSuggestedDate] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  if (!appointment) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    await onApprove?.(appointment.id);
    setIsProcessing(false);
    onClose();
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onReject?.(appointment.id, rejectReason);
    setIsProcessing(false);
    onClose();
  };

  const handleSuggestNewTime = async () => {
    if (!suggestedDate || !suggestedTime) return;
    setIsProcessing(true);
    const newDateTime = `${suggestedDate}T${suggestedTime}:00`;
    await onSuggestNewTime?.(appointment.id, newDateTime);
    setIsProcessing(false);
    setShowSuggestTime(false);
    onClose();
  };

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('appointments.details')}</span>
            {getStatusBadge(appointment.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

          {/* Customer */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{appointment.guest_name || t('dashboard.anonymousCustomer')}</span>
            </div>
            {appointment.guest_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{appointment.guest_email}</span>
              </div>
            )}
            {appointment.guest_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{appointment.guest_phone}</span>
              </div>
            )}
          </div>

          {/* Service */}
          {appointment.service && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Scissors className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{appointment.service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.service.duration_minutes} min
                </p>
              </div>
              <span className="font-semibold text-foreground">
                €{(appointment.price || appointment.service.price || 0).toFixed(2)}
              </span>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('appointments.notes')}</span>
              </div>
              <p className="text-sm text-muted-foreground">{appointment.notes}</p>
            </div>
          )}

          {/* Suggest New Time Form */}
          {showSuggestTime && (
            <div className="space-y-3 p-3 rounded-lg border border-border">
              <p className="font-medium text-sm">{t('calendar.suggestNewTime')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('dashboard.startDate')}</Label>
                  <Input
                    type="date"
                    value={suggestedDate}
                    onChange={(e) => setSuggestedDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('time.hours')}</Label>
                  <Input
                    type="time"
                    value={suggestedTime}
                    onChange={(e) => setSuggestedTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSuggestNewTime} disabled={isProcessing}>
                  {t('common.submit')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSuggestTime(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}

          {/* Reject Reason */}
          {appointment.status === 'pending' && canApprove && !showSuggestTime && (
            <div className="space-y-2">
              <Label>{t('calendar.rejectReason')}</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('calendar.rejectReasonPlaceholder')}
                rows={2}
              />
            </div>
          )}

          {/* Actions */}
          {appointment.status === 'pending' && canApprove && (
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={handleApprove}
                disabled={isProcessing}
              >
                <Check className="w-4 h-4 mr-2" />
                {t('calendar.approve')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSuggestTime(true)}
                disabled={isProcessing || showSuggestTime}
              >
                <Clock className="w-4 h-4 mr-2" />
                {t('calendar.suggestTime')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing}
              >
                <X className="w-4 h-4 mr-2" />
                {t('calendar.reject')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
