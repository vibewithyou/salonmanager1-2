import React from 'react';
import QRCode from 'react-qr-code';

interface BookingQRCodeProps {
  value: string;
  /**
   * Optional size of the QR code in pixels. Defaults to 160.
   */
  size?: number;
}

/**
 * Displays a QR code for the provided booking link. When the value is empty
 * or undefined, nothing is rendered. This component wraps the
 * react-qr-code library and sets sensible defaults for our app. You can
 * override the size if you need a larger or smaller code.
 */
const BookingQRCode: React.FC<BookingQRCodeProps> = ({ value, size = 160 }) => {
  if (!value) return null;
  return (
    <div className="flex justify-center mt-2">
      <QRCode value={value} size={size} />
    </div>
  );
};

export default BookingQRCode;