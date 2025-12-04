import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrCode, Keyboard, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QRCheckInProps {
  employeeId: string;
  onCheckIn: () => void;
  onCheckOut: () => void;
  isCheckedIn: boolean;
}

export function QRCheckIn({ employeeId, onCheckIn, onCheckOut, isCheckedIn }: QRCheckInProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'qr' | 'pin'>('qr');
  const [pin, setPin] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Generate a unique QR code value for this employee
  const expectedQRCode = `salon-checkin-${employeeId}`;

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error(t('dashboard.cameraError', 'Could not access camera'));
      setMode('pin');
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handlePinSubmit = async () => {
    // Simple PIN validation - in production, this would check against stored PIN
    const validPin = '1234'; // Default PIN for demo
    
    if (pin === validPin) {
      if (isCheckedIn) {
        onCheckOut();
      } else {
        onCheckIn();
      }
      setPin('');
    } else {
      toast.error(t('dashboard.invalidPin', 'Invalid PIN'));
    }
  };

  const handleQRScan = (scannedValue: string) => {
    if (scannedValue === expectedQRCode) {
      stopScanner();
      if (isCheckedIn) {
        onCheckOut();
      } else {
        onCheckIn();
      }
    } else {
      toast.error(t('dashboard.invalidQR', 'Invalid QR Code'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="h-5 w-5" />
          {t('dashboard.quickCheckIn', 'Quick Check-in')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === 'qr' ? 'default' : 'outline'}
            onClick={() => setMode('qr')}
            className="flex-1"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR-Code
          </Button>
          <Button
            variant={mode === 'pin' ? 'default' : 'outline'}
            onClick={() => {
              setMode('pin');
              stopScanner();
            }}
            className="flex-1"
          >
            <Keyboard className="h-4 w-4 mr-2" />
            PIN
          </Button>
        </div>

        {mode === 'qr' && (
          <div className="space-y-4">
            {scanning ? (
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-primary rounded-lg" />
                </div>
                <Button
                  variant="secondary"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2"
                  onClick={stopScanner}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            ) : (
              <Button
                className="w-full h-24"
                onClick={startScanner}
              >
                <div className="flex flex-col items-center gap-2">
                  <QrCode className="h-8 w-8" />
                  <span>{t('dashboard.scanQR', 'Scan QR Code')}</span>
                </div>
              </Button>
            )}
            
            {/* Demo: Show QR code for testing */}
            <div className="text-center text-sm text-muted-foreground">
              <p>{t('dashboard.demoQR', 'Demo QR Value')}:</p>
              <code className="bg-muted px-2 py-1 rounded text-xs">{expectedQRCode}</code>
            </div>
          </div>
        )}

        {mode === 'pin' && (
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={4}
              className="text-center text-2xl tracking-widest"
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            />
            <Button
              className="w-full"
              onClick={handlePinSubmit}
              disabled={pin.length < 4}
            >
              {isCheckedIn ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('dashboard.checkOut')}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('dashboard.checkIn')}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t('dashboard.demoPIN', 'Demo PIN')}: 1234
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
