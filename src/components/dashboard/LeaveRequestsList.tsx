import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
}

interface LeaveRequestsListProps {
  leaveRequests: LeaveRequest[];
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function LeaveRequestsList({ 
  leaveRequests, 
  showActions = false,
  onApprove,
  onReject 
}: LeaveRequestsListProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-sage-light text-sage';
      case 'pending':
        return 'bg-gold-light text-gold';
      case 'rejected':
        return 'bg-rose-light text-rose';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return t('dashboard.leaveStatus.approved');
      case 'pending':
        return t('dashboard.leaveStatus.pending');
      case 'rejected':
        return t('dashboard.leaveStatus.rejected');
      default:
        return status;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'vacation':
        return t('dashboard.leaveTypes.vacation');
      case 'sick':
        return t('dashboard.leaveTypes.sick');
      case 'personal':
        return t('dashboard.leaveTypes.personal');
      case 'other':
        return t('dashboard.leaveTypes.other');
      default:
        return type;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <Calendar className="w-5 h-5 text-primary" />
          {t('dashboard.leaveRequests')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaveRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('dashboard.noLeaveRequests')}
          </div>
        ) : (
          <div className="space-y-3">
            {leaveRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 bg-muted/50 rounded-xl"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {getLeaveTypeLabel(request.leave_type)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.start_date), 'dd.MM.yyyy', { locale })} - {format(new Date(request.end_date), 'dd.MM.yyyy', { locale })}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(request.status || 'pending')}`}>
                    {getStatusLabel(request.status || 'pending')}
                  </span>
                </div>
                {request.reason && (
                  <p className="text-sm text-muted-foreground mb-2">{request.reason}</p>
                )}
                {showActions && request.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-sage border-sage hover:bg-sage/10"
                      onClick={() => onApprove?.(request.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {t('common.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-rose border-rose hover:bg-rose/10"
                      onClick={() => onReject?.(request.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      {t('common.reject')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
