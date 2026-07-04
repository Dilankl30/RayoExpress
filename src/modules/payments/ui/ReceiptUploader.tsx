import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, X } from 'lucide-react';

interface Props {
  onUpload: (file: File) => Promise<void>;
}

export function ReceiptUploader({ onUpload }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setDone(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
      setDone(true);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setDone(false);
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-700 font-medium mb-3">Comprobante de pago</p>

      {done ? (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">Comprobante subido</span>
        </div>
      ) : preview ? (
        <div className="space-y-3">
          <div className="relative bg-gray-50 rounded-xl overflow-hidden">
            {preview.match(/\.(pdf)$/i) ? (
              <div className="flex items-center gap-3 px-4 py-6">
                <FileText size={24} className="text-gray-400" />
                <span className="text-sm text-gray-600">{file?.name}</span>
              </div>
            ) : (
              <img src={preview} alt="Comprobante" className="w-full h-40 object-contain" />
            )}
            <button onClick={reset} className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center">
              <X size={14} className="text-gray-500" />
            </button>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#6D28D9' }}
          >
            {uploading ? 'Subiendo...' : 'Subir comprobante'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-6 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center gap-2 hover:border-purple-300 transition-colors"
        >
          <Upload size={20} className="text-gray-400" />
          <span className="text-sm text-gray-500">Toca para seleccionar comprobante</span>
          <span className="text-xs text-gray-400">PDF o imagen</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSelect(f); }}
      />
    </div>
  );
}
