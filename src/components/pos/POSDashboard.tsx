import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePOSData } from '@/hooks/usePOSData';
import { POSTerminal } from './POSTerminal';
import { TransactionHistory } from './TransactionHistory';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShoppingCart,
  History,
  TrendingUp,
  Euro,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface POSDashboardProps {
  salonId: string;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration_minutes: number;
    category: string | null;
  }>;
  products?: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    quantity: number | null;
  }>;
}

export function POSDashboard({ salonId, services, products = [] }: POSDashboardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'de' ? de : enUS;
  const [activeTab, setActiveTab] = useState('terminal');
  
  const {
    transactions,
    todayTransactions,
    loading,
    createInvoice,
    processRefund,
    refetch,
  } = usePOSData(salonId);

  // Calculate today's stats
  const todayRevenue = todayTransactions
    .filter(tx => tx.payment_status === 'completed')
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  const todayTransactionCount = todayTransactions.filter(
    tx => tx.payment_status === 'completed'
  ).length;

  const cashTransactions = todayTransactions.filter(
    tx => tx.payment_method === 'cash' && tx.payment_status === 'completed'
  );
  const cardTransactions = todayTransactions.filter(
    tx => ['stripe', 'card', 'paypal', 'apple_pay', 'google_pay'].includes(tx.payment_method) && tx.payment_status === 'completed'
  );

  const cashTotal = cashTransactions.reduce((sum, tx) => sum + tx.total_amount, 0);
  const cardTotal = cardTransactions.reduce((sum, tx) => sum + tx.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Euro className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  €{todayRevenue.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">{t('pos.todayRevenue')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-sage" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {todayTransactionCount}
                </p>
                <p className="text-sm text-muted-foreground">{t('pos.todayTransactions')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-gold" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  €{cashTotal.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">{t('pos.cashTotal')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-rose" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  €{cardTotal.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">{t('pos.cardTotal')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="terminal" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            {t('pos.terminal')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            {t('pos.history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terminal" className="mt-6">
          <POSTerminal
            salonId={salonId}
            services={services}
            products={products}
            onTransactionComplete={refetch}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <TransactionHistory
            transactions={transactions}
            loading={loading}
            onRefetch={refetch}
            onCreateInvoice={createInvoice}
            onRefund={processRefund}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
