import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { ExternalLink, Copy, Check, Download, Printer } from 'lucide-react';

interface QrCodeCardProps {
  sourceUrl: string;
}

export const QrCodeCard: React.FC<QrCodeCardProps> = ({ sourceUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!sourceUrl || !canvasRef.current) return;

    // Generate high resolution black & white QR code with quiet zone margin (margin: 4)
    QRCode.toCanvas(
      canvasRef.current,
      sourceUrl,
      {
        width: 256,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) {
          console.error('QR code generation error:', error);
        } else if (canvasRef.current) {
          try {
            setQrDataUrl(canvasRef.current.toDataURL('image/png'));
          } catch (e) {
            console.error('Failed to get QR data URL:', e);
          }
        }
      }
    );
  }, [sourceUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sourceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleDownloadPng = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `video-qr-code-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download QR code error:', err);
    }
  };

  const handlePrintQr = () => {
    if (!qrDataUrl) return;
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; margin: 0; }
            img { width: 280px; height: 280px; image-rendering: pixelated; }
            h2 { font-size: 18px; margin-top: 16px; color: #111; }
            p { font-size: 13px; color: #555; word-break: break-all; max-width: 450px; margin: 8px auto 0; }
          </style>
        </head>
        <body>
          <img src="${qrDataUrl}" alt="Video QR Code" />
          <h2>Scan to open the original video</h2>
          <p>${sourceUrl}</p>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      id="qrcode-section"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors scroll-mt-20"
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* QR Code Canvas */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <canvas ref={canvasRef} className="w-44 h-44 sm:w-48 sm:h-48 block" />
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2.5 text-center">
            Scan to open the original video.
          </p>
        </div>

        {/* QR Code Actions & Link details */}
        <div className="flex-1 space-y-3.5 text-center sm:text-left w-full">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SECTION 6 — QR CODE
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Encoded directly from the validated source URL. Scan with your mobile device camera to open the original video directly.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono break-all text-slate-700 dark:text-slate-300">
            {sourceUrl}
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 no-print">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Original Video</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrintQr}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print QR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
