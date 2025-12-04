import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Transaction } from '@/hooks/usePOSData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  History,
  Search,
  Receipt,
  RefreshCw,
  CreditCard,
  Banknote,
  FileText,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading: boolean;
  onRefetch: () => void;
  onCreateInvoice: (transactionId: string, type: 'invoice' | 'receipt') => Promise<any>;
  onRefund?: (transactionId: string, amount: number, reason?: string) => Promise<any>;
}

export function TransactionHistory({
  transactions,
  loading,
  onRefetch,
  onCreateInvoice,
  onRefund,
}: TransactionHistoryProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const filteredTransactions = transactions.filter(tx => {
    const query = searchQuery.toLowerCase();
    return (
      tx.guest_name?.toLowerCase().includes(query) ||
      tx.guest_email?.toLowerCase().includes(query) ||
      tx.id.toLowerCase().includes(query) ||
      tx.payment_method.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600',
      completed: 'bg-green-500/10 text-green-600',
      failed: 'bg-red-500/10 text-red-600',
      refunded: 'bg-purple-500/10 text-purple-600',
      partially_refunded: 'bg-orange-500/10 text-orange-600',
    };
    return <Badge className={styles[status] || 'bg-muted'}>{t(`pos.status.${status}`)}</Badge>;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      case 'stripe':
      case 'card':
      case 'apple_pay':
      case 'google_pay':
        return <CreditCard className="w-4 h-4" />;
      case 'paypal':
        return (
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
          </svg>
        );
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  const handleCreateInvoice = async (type: 'invoice' | 'receipt') => {
    if (!selectedTransaction) return;
    setProcessingAction(true);
    await onCreateInvoice(selectedTransaction.id, type);
    setProcessingAction(false);
  };

  const handleRefund = async () => {
    if (!selectedTransaction || !onRefund) return;
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedTransaction.total_amount) return;
    
    setProcessingAction(true);
    await onRefund(selectedTransaction.id, amount, refundReason || undefined);
    setProcessingAction(false);
    setShowRefundDialog(false);
    setRefundAmount('');
    setRefundReason('');
  };

  return (
    <>
      <Card className="border-border h-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {t('pos.transactionHistory')}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onRefetch} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('pos.searchTransactions')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('pos.noTransactions')}
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTransaction(tx)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {getPaymentMethodIcon(tx.payment_method)}
                      </div>
                      <div>
                        <p className="font-medium">
                          {tx.guest_name || t('pos.anonymous')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(tx.created_at), 'dd.MM.yyyy HH:mm', { locale })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">€{tx.total_amount.toFixed(2)}</p>
                      {getStatusBadge(tx.payment_status)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('pos.transactionDetails')}</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('pos.transactionId')}</p>
                  <p className="font-mono text-xs">{selectedTransaction.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('pos.date')}</p>
                  <p>{format(new Date(selectedTransaction.created_at), 'dd.MM.yyyy HH:mm', { locale })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('pos.paymentMethod')}</p>
                  <p className="capitalize">{selectedTransaction.payment_method}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('pos.status')}</p>
                  {getStatusBadge(selectedTransaction.payment_status)}
                </div>
                {selectedTransaction.guest_name && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">{t('pos.customer')}</p>
                    <p>{selectedTransaction.guest_name}</p>
                    {selectedTransaction.guest_email && (
                      <p className="text-xs text-muted-foreground">{selectedTransaction.guest_email}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pos.subtotal')}</span>
                  <span>€{selectedTransaction.subtotal.toFixed(2)}</span>
                </div>
                {selectedTransaction.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t('pos.discount')}</span>
                    <span>-€{selectedTransaction.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pos.tax')} ({selectedTransaction.tax_rate}%)</span>
                  <span>€{selectedTransaction.tax_amount.toFixed(2)}</span>
                </div>
                {selectedTransaction.tip_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('pos.tip')}</span>
                    <span>€{selectedTransaction.tip_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                  <span>{t('pos.total')}</span>
                  <span className="text-primary">€{selectedTransaction.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleCreateInvoice('receipt')}
                  disabled={processingAction}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  {t('pos.createReceipt')}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleCreateInvoice('invoice')}
                  disabled={processingAction}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {t('pos.createInvoice')}
                </Button>
              </div>

              {selectedTransaction.payment_status === 'completed' && onRefund && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowRefundDialog(true)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('pos.refund')}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pos.processRefund')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {t('pos.maxRefundAmount')}: €{selectedTransaction?.total_amount.toFixed(2)}
              </p>
              <Input
                type="number"
                step="0.01"
                placeholder={t('pos.refundAmount')}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder={t('pos.refundReason')}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              variant="destructive"
              onClick={handleRefund}
              disabled={processingAction || !refundAmount}
            >
              {processingAction ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('pos.confirmRefund')}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
