import { useState } from 'react';
import { Copy, Check, FileText, Truck } from 'lucide-react';
import { generateWhatsAppMessageForOrder, generateWhatsAppMessageForDriver } from '../application/admin-orders.service';

interface MessageGeneratorProps {
  trackingCode: string;
  orderDescription: string;
  productTotal: number;
  serviceFee: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
}

export function MessageGenerator({
  trackingCode,
  orderDescription,
  productTotal,
  serviceFee,
  total,
  customerName,
  customerPhone,
  deliveryAddress,
}: MessageGeneratorProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const messageClient = generateWhatsAppMessageForOrder(trackingCode, orderDescription, productTotal, serviceFee, total);
  const messageDriver = generateWhatsAppMessageForDriver(trackingCode, orderDescription, productTotal, serviceFee, total, customerName || 'Cliente', customerPhone || '', deliveryAddress || '');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} style={{ color: 'var(--brand)' }} />
          <h4 className="font-bold text-text-primary text-sm">Mensaje para el Cliente</h4>
        </div>
        <pre className="bg-surface rounded-xl p-3 text-xs text-text-primary whitespace-pre-wrap font-mono max-h-64 overflow-y-auto border border-border-light">
          {messageClient}
        </pre>
        <button
          type="button"
          onClick={() => copyToClipboard(messageClient, 'client')}
          className="mt-2 w-full py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          {copied === 'client' ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> COPIAR MENSAJE CLIENTE</>}
        </button>
      </div>

      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border-light">
        <div className="flex items-center gap-2 mb-3">
          <Truck size={18} style={{ color: '#22C55E' }} />
          <h4 className="font-bold text-text-primary text-sm">Mensaje para el Repartidor</h4>
        </div>
        <pre className="bg-surface rounded-xl p-3 text-xs text-text-primary whitespace-pre-wrap font-mono max-h-64 overflow-y-auto border border-border-light">
          {messageDriver}
        </pre>
        <button
          type="button"
          onClick={() => copyToClipboard(messageDriver, 'driver')}
          className="mt-2 w-full py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: '#22C55E' }}
        >
          {copied === 'driver' ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> COPIAR MENSAJE REPARTIDOR</>}
        </button>
      </div>
    </div>
  );
}
