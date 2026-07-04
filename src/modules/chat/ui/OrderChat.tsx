import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { getOrCreateChat, getMessages, sendMessage, markMessagesAsRead } from '../application/chat.service';
import { isSupabaseReady, getSupabase } from '../../../integrations/supabase/client';
import type { Message } from '../domain/chat.types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Props {
  orderId: string;
  storeId: string;
  storeName: string;
  storeEmoji: string;
  onClose?: () => void;
}

export function OrderChat({ orderId, storeId, storeName, storeEmoji, onClose }: Props) {
  const { user } = useAuth();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const chat = await getOrCreateChat(orderId, user.id, storeId);
        setChatId(chat.id);
        const msgs = await getMessages(chat.id);
        setMessages(msgs);
        if (msgs.length > 0) await markMessagesAsRead(chat.id, user.id);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [orderId, user, storeId]);

  useEffect(() => {
    if (!chatId || !isSupabaseReady) return;
    let channel: ReturnType<ReturnType<typeof getSupabase>['channel']>;
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel(`chat-${chatId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
          (payload: RealtimePostgresChangesPayload<Message>) => {
            const newMsg = payload.new as Message;
            if (newMsg) setMessages((prev) => [...prev, newMsg]);
          }
        )
        .subscribe();
    } catch { /* noop */ }
    return () => { try { channel?.unsubscribe(); } catch { /* noop */ } };
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!chatId || !user || !input.trim()) return;
    const text = input.trim();
    setInput('');
    if (!isSupabaseReady) {
      const mockMsg = await sendMessage(chatId, user.id, user.role, text);
      setMessages((prev) => [...prev, mockMsg]);
      return;
    }
    sendMessage(chatId, user.id, user.role, text).catch(() => {});
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={() => onClose?.()} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl sm:mx-4 max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(160deg, #6D28D9, #4C1D95)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 20 }}>{storeEmoji}</span>
            <p className="text-white font-medium text-sm">{storeName}</p>
          </div>
          <button onClick={() => onClose?.()} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <X size={14} className="text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Inicia la conversación</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl ${isMine ? 'text-white' : 'bg-white text-gray-800 shadow-sm border border-gray-100'}`}
                    style={isMine ? { backgroundColor: '#6D28D9' } : {}}
                  >
                    <p className="text-xs opacity-70 mb-0.5">
                      {msg.sender_role === 'customer' ? 'Tú' : msg.sender_role === 'driver' ? 'Repartidor' : msg.sender_role === 'store' ? 'Tienda' : 'Admin'}
                    </p>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-[10px] mt-0.5 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                      {timeAgo(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ backgroundColor: '#6D28D9' }}
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
