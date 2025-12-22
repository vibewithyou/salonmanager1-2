import React from 'react';
import QRCode from 'react-qr-code';

interface BookingQRCodeProps {
  value: string;
  /**
   * Optional size of the QR code in pixels. Defaults to 160.
   */
  size?: number;
  /**
   * Optional ref to the container element around the QR code. This is
   * used by parent components to extract the generated SVG for
   * download purposes. If provided, the ref will be attached to the
   * wrapping div.
   */
  svgRef?: React.RefObject<HTMLDivElement>;
}

/**
 * Displays a QR code for the provided booking link. When the value is empty
 * or undefined, nothing is rendered. This component wraps the
 * react-qr-code library and sets sensible defaults for our app. You can
 * override the size if you need a larger or smaller code.
 */
const BookingQRCode: React.FC<BookingQRCodeProps> = ({ value, size = 160, svgRef }) => {
  if (!value) return null;
  return (
    <div ref={svgRef} className="flex justify-center mt-2">
      {/*
        The react-qr-code component renders an <svg> element that
        contains the QR code. By attaching the provided ref to the
        parent div, consumers can access the underlying SVG via
        `ref.current.querySelector('svg')` to serialize and
        download it. If no ref is provided, nothing extra happens.
      */}
      <QRCode value={value} size={size} />
    </div>
  );
};

export default BookingQRCode;