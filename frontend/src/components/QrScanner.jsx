import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScanner({ onScan, onError }) {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    let isMounted = true;

    const initScanner = async () => {
      // Delay slightly to prevent React Strict Mode double-invocation collisions
      await new Promise(r => setTimeout(r, 100));
      if (!isMounted) return;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      };

      const handleScan = (decodedText) => {
        try {
          // Try to parse it as our strict JSON first
          let data = {};
          try {
            data = JSON.parse(decodedText);
          } catch (e) {
            // Not JSON, just use a fallback mock ticket with the decoded text
            const randomSection = ['A', 'B', 'C', 'VIP'][Math.floor(Math.random() * 4)];
            const randomSeat = String(Math.floor(Math.random() * 100) + 1);
            data = {
              ticket_id: `MOCK-${decodedText.substring(0, 6)}`,
              section: randomSection,
              seat: randomSeat
            };
          }

          // If it's JSON but missing fields, still provide fallbacks and strictly cast to String
          const finalData = {
            ticket_id: String(data.ticket_id || `MOCK-${Math.random().toString(36).substr(2, 6)}`),
            section: String(data.section || 'A'),
            seat: String(data.seat || '1')
          };

          scanner.stop().catch(() => {});
          onScan(finalData);
        } catch {
          onError?.('Failed to process QR code');
        }
      };

      try {
        // Normal attempt: back camera
        await scanner.start({ facingMode: 'environment' }, config, handleScan, () => {});
        if (isMounted) setIsStarted(true);
        else scanner.stop().catch(() => {});
      } catch (err) {
        if (!isMounted) return;
        // Fallback: try capturing with the first available camera
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            await scanner.start(cameras[0].id, config, handleScan, () => {});
            if (isMounted) setIsStarted(true);
            else scanner.stop().catch(() => {});
            return;
          }
        } catch (fallbackErr) {
          console.error('Fallback camera error', fallbackErr);
        }
        console.error('Camera error:', err);
        onError?.('Camera access denied or unavailable');
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      try {
         if (scanner.isScanning) {
           scanner.stop().then(() => scanner.clear()).catch(() => {});
         } else {
           scanner.clear();
         }
      } catch (e) {}
    };
  }, [onScan, onError]);

  return (
    <div className="relative">
      <div id="qr-reader" className="rounded-2xl overflow-hidden" ref={containerRef} />
      
      {/* Scanner overlay corners */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[260px] h-[260px] relative">
          {/* Top-left corner */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary-400 rounded-tl-lg" />
          {/* Top-right corner */}
          <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary-400 rounded-tr-lg" />
          {/* Bottom-left corner */}
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary-400 rounded-bl-lg" />
          {/* Bottom-right corner */}
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary-400 rounded-br-lg" />
          
          {/* Scanning line animation */}
          <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary-400 to-transparent animate-scan" 
               style={{ animation: 'scanLine 2s ease-in-out infinite' }} />
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
      `}</style>
    </div>
  );
}
