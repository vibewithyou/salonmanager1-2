import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface LeaveRequestFormProps {
  onSubmit: (data: {
    leave_type: string;
    start_date: string;
    end_date: string;
    reason?: string;
  }) => Promise<any>;
}

export function LeaveRequestForm({ onSubmit }: LeaveRequestFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const leaveTypes = [
    { value: 'vacation', label: t('dashboard.leaveTypes.vacation') },
    { value: 'sick', label: t('dashboard.leaveTypes.sick') },
    { value: 'personal', label: t('dashboard.leaveTypes.personal') },
    { value: 'other', label: t('dashboard.leaveTypes.other') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveType || !startDate || !endDate) {
      toast({
        title: t('common.error'),
        description: t('dashboard.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit({
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason || undefined,
    });

    if (result?.error) {
      toast({
        title: t('common.error'),
        description: result.error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('dashboard.leaveRequestSubmitted'),
      });
      // Reset form
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <Calendar className="w-5 h-5 text-primary" />
          {t('dashboard.requestLeave')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leaveType">{t('dashboard.leaveType')}</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger>
                <SelectValue placeholder={t('dashboard.selectLeaveType')} />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('dashboard.startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t('dashboard.endDate')}</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{t('dashboard.reason')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('dashboard.reasonPlaceholder')}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {t('dashboard.submitRequest')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
