import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, CheckCircle, X } from 'lucide-react';

interface Props {
  onSubmit: (file: File, notes: string) => Promise<void>;
  onClose: () => void;
}

export function DeliveryEvidenceModal({ onSubmit, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await onSubmit(file, notes);
      setDone(true);
      setTimeout(() => onClose(), 1500);
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-end z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card w-full rounded-t-3xl p-5 pb-8 max-w-md mx-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="py-8 text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
            <p className="text-text-primary font-bold">Pago y entrega confirmados</p>
            <p className="text-sm text-text-secondary mt-1">El pedido quedo marcado como entregado</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-text-primary font-bold">Pago y evidencia de entrega</p>
              <button onClick={onClose} className="text-text-secondary"><X size={20} /></button>
            </div>

            {preview ? (
              <div className="relative bg-surface rounded-2xl overflow-hidden mb-4">
                <img src={preview} alt="Evidencia" className="w-full h-48 object-cover" />
                <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 w-7 h-7 bg-card rounded-full shadow flex items-center justify-center">
                  <X size={14} className="text-text-secondary" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full py-10 rounded-2xl border-2 border-dashed border-border flex flex-col items-center gap-2 hover:border-purple-300 transition-colors mb-4"
              >
                <Camera size={28} className="text-text-secondary" />
                <span className="text-sm text-text-secondary">Foto del recibo o comprobante</span>
                <span className="text-xs text-text-secondary">Confirma el pago al entregar el pedido</span>
              </button>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales (opcional)"
              rows={2}
              className="w-full bg-surface rounded-xl px-4 py-3 text-sm outline-none resize-none mb-4"
            />

            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--success)' }}
            >
              {uploading ? 'Guardando...' : 'Confirmar pago y entrega'}
            </button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
          }}
        />
      </motion.div>
    </motion.div>
  );
}
