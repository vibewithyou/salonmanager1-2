import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePOSData, CartItem } from '@/hooks/usePOSData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ShoppingCart,
  CreditCard,
  Banknote,
  Percent,
  Tag,
  User,
  Trash2,
  Plus,
  Minus,
  Receipt,
  Package,
  Scissors,
} from 'lucide-react';

interface POSTerminalProps {
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
  onTransactionComplete?: () => void;
}

export function POSTerminal({ salonId, services, products = [], onTransactionComplete }: POSTerminalProps) {
  const { t } = useTranslation();
  const {
    posState,
    processing,
    addToCart,
    removeFromCart,
    updateQuantity,
    setDiscount,
    setTip,
    setCustomerInfo,
    clearCart,
    processPayment,
  } = usePOSData(salonId);

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'stripe' | 'paypal' | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [discountTypeInput, setDiscountTypeInput] = useState<'percentage' | 'fixed'>('percentage');
  const [tipInput, setTipInput] = useState('');

  const handleAddService = (service: typeof services[0]) => {
    addToCart({
      type: 'service',
      service_id: service.id,
      name: service.name,
      description: service.description || undefined,
      quantity: 1,
      unit_price: service.price,
    });
  };

  const handleAddProduct = (product: NonNullable<typeof products>[0]) => {
    if (!product.price) return;
    addToCart({
      type: 'product',
      inventory_id: product.id,
      name: product.name,
      description: product.description || undefined,
      quantity: 1,
      unit_price: product.price,
    });
  };

  const handleApplyDiscount = () => {
    const value = parseFloat(discountInput);
    if (!isNaN(value) && value > 0) {
      setDiscount(discountTypeInput, value);
    }
    setDiscountInput('');
  };

  const handleApplyTip = () => {
    const value = parseFloat(tipInput);
    if (!isNaN(value) && value >= 0) {
      setTip(value);
    }
    setTipInput('');
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod) return;
    
    const result = await processPayment(selectedPaymentMethod);
    
    if (result) {
      setShowPaymentDialog(false);
      setSelectedPaymentMethod(null);
      setCashReceived('');
      onTransactionComplete?.();
    }
  };

  const changeAmount = selectedPaymentMethod === 'cash' && cashReceived 
    ? parseFloat(cashReceived) - posState.totalAmount 
    : 0;

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.category || t('pos.uncategorized');
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Panel - Item Selection */}
      <div className="lg:col-span-2">
        <Card className="h-full border-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              {t('pos.selectItems')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="services">
              <TabsList className="mb-4">
                <TabsTrigger value="services" className="gap-2">
                  <Scissors className="w-4 h-4" />
                  {t('pos.services')}
                </TabsTrigger>
                <TabsTrigger value="products" className="gap-2">
                  <Package className="w-4 h-4" />
                  {t('pos.products')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="services">
                <ScrollArea className="h-[400px] pr-4">
                  {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                    <div key={category} className="mb-6">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {categoryServices.map((service) => (
                          <Button
                            key={service.id}
                            variant="outline"
                            className="h-auto py-3 px-4 flex flex-col items-start justify-start text-left hover:bg-primary/5 hover:border-primary"
                            onClick={() => handleAddService(service)}
                          >
                            <span className="font-medium text-foreground">{service.name}</span>
                            <span className="text-sm text-primary font-semibold">
                              €{service.price.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {service.duration_minutes} min
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="products">
                <ScrollArea className="h-[400px] pr-4">
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('pos.noProducts')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {products.filter(p => p.price && (p.quantity ?? 0) > 0).map((product) => (
                        <Button
                          key={product.id}
                          variant="outline"
                          className="h-auto py-3 px-4 flex flex-col items-start justify-start text-left hover:bg-primary/5 hover:border-primary"
                          onClick={() => handleAddProduct(product)}
                        >
                          <span className="font-medium text-foreground">{product.name}</span>
                          <span className="text-sm text-primary font-semibold">
                            €{product.price?.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t('pos.inStock')}: {product.quantity}
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="space-y-4">
        {/* Cart */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {t('pos.cart')}
              </span>
              {posState.cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {posState.cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('pos.emptyCart')}
              </div>
            ) : (
              <ScrollArea className="h-[200px] pr-2">
                <div className="space-y-3">
                  {posState.cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          €{item.unit_price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="w-16 text-right font-semibold text-sm">
                          €{item.total_price.toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Discount & Tip */}
        <Card className="border-border">
          <CardContent className="pt-4 space-y-3">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-2">
                <Input
                  type="number"
                  placeholder={t('pos.discountValue')}
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={discountTypeInput}
                  onChange={(e) => setDiscountTypeInput(e.target.value as 'percentage' | 'fixed')}
                  className="px-2 border border-border rounded-md bg-background text-sm"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">€</option>
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={handleApplyDiscount}>
                <Percent className="w-4 h-4" />
              </Button>
            </div>

            {/* Tip */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder={t('pos.tipAmount')}
                value={tipInput}
                onChange={(e) => setTipInput(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleApplyTip}>
                <Tag className="w-4 h-4" />
              </Button>
            </div>

            {/* Customer Info */}
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">{t('pos.customerName')}</Label>
              <Input
                placeholder={t('pos.customerNamePlaceholder')}
                value={posState.customerName}
                onChange={(e) => setCustomerInfo(e.target.value, posState.customerEmail, posState.customerPhone)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Totals & Checkout */}
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('pos.subtotal')}</span>
                <span>€{posState.subtotal.toFixed(2)}</span>
              </div>
              {posState.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('pos.discount')}</span>
                  <span>-€{posState.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('pos.tax')} ({posState.taxRate}%)</span>
                <span>€{posState.taxAmount.toFixed(2)}</span>
              </div>
              {posState.tipAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('pos.tip')}</span>
                  <span>€{posState.tipAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>{t('pos.total')}</span>
                <span className="text-primary">€{posState.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              size="lg"
              disabled={posState.cart.length === 0 || processing}
              onClick={() => setShowPaymentDialog(true)}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {t('pos.proceedToPayment')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pos.selectPaymentMethod')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">€{posState.totalAmount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">{t('pos.totalToPay')}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={selectedPaymentMethod === 'cash' ? 'default' : 'outline'}
                className="h-24 flex flex-col gap-2"
                onClick={() => setSelectedPaymentMethod('cash')}
              >
                <Banknote className="w-8 h-8" />
                <span>{t('pos.cash')}</span>
              </Button>
              <Button
                variant={selectedPaymentMethod === 'stripe' ? 'default' : 'outline'}
                className="h-24 flex flex-col gap-2"
                onClick={() => setSelectedPaymentMethod('stripe')}
              >
                <CreditCard className="w-8 h-8" />
                <span>{t('pos.card')}</span>
              </Button>
              <Button
                variant={selectedPaymentMethod === 'paypal' ? 'default' : 'outline'}
                className="h-24 flex flex-col gap-2"
                onClick={() => setSelectedPaymentMethod('paypal')}
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.48 4.608-1.024 7.22-5.55 7.22h-2.19c-1.05 0-1.95.75-2.11 1.78l-1.12 7.11a.641.641 0 0 0 .633.74h4.07c.474 0 .88-.34.96-.8l.79-4.83c.06-.33.38-.58.72-.58h1.48c3.53 0 6.29-1.43 7.1-5.57.3-1.52.2-2.77-.6-3.53z" />
                </svg>
                <span>PayPal</span>
              </Button>
            </div>

            {selectedPaymentMethod === 'cash' && (
              <div className="space-y-3">
                <div>
                  <Label>{t('pos.cashReceived')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 text-lg text-center"
                  />
                </div>
                {changeAmount > 0 && (
                  <div className="bg-green-500/10 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-600">{t('pos.changeToGive')}</p>
                    <p className="text-2xl font-bold text-green-600">€{changeAmount.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!selectedPaymentMethod || processing}
              onClick={handlePayment}
            >
              {processing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <Receipt className="w-5 h-5 mr-2" />
                  {t('pos.completePayment')}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
