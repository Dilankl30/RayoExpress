import { getSupabase, isSupabaseReady } from '../../../integrations/supabase/client';
import type { Chat, Message } from '../domain/chat.types';

const mockChats: Record<string, Chat> = {};
const mockMessages: Record<string, Message[]> = {};

function ensureMockChat(orderId: string, customerId: string, storeId: string) {
  if (!mockChats[orderId]) {
    const chat: Chat = {
      id: `chat-${orderId}`,
      order_id: orderId,
      customer_id: customerId,
      store_id: storeId,
      driver_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockChats[orderId] = chat;
    mockMessages[chat.id] = [];
  }
  return mockChats[orderId];
}

export async function getOrCreateChat(orderId: string, customerId: string, storeId: string): Promise<Chat> {
  if (!isSupabaseReady) return ensureMockChat(orderId, customerId, storeId);
  const supabase = getSupabase();
  const { data: existing } = await supabase.from('chats').select('*').eq('order_id', orderId).maybeSingle();
  if (existing) return existing as Chat;
  const { data, error } = await supabase.from('chats').insert({ order_id: orderId, customer_id: customerId, store_id: storeId }).select().single();
  if (error) throw error;
  return data as Chat;
}

export async function getMessages(chatId: string): Promise<Message[]> {
  if (!isSupabaseReady) return mockMessages[chatId] || [];
  const supabase = getSupabase();
  const { data, error } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(chatId: string, senderId: string, senderRole: Message['sender_role'], content: string): Promise<Message> {
  if (!isSupabaseReady) {
    const msg: Message = {
      id: `msg-${Date.now()}`,
      chat_id: chatId,
      sender_id: senderId,
      sender_role: senderRole,
      content,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    if (!mockMessages[chatId]) mockMessages[chatId] = [];
    mockMessages[chatId].push(msg);
    return msg;
  }
  const supabase = getSupabase();
  const { data, error } = await supabase.from('messages').insert({ chat_id: chatId, sender_id: senderId, sender_role: senderRole, content }).select().single();
  if (error) throw error;
  return data as Message;
}

export async function markMessagesAsRead(chatId: string, userId: string) {
  if (!isSupabaseReady) return;
  const supabase = getSupabase();
  const { error } = await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('chat_id', chatId).neq('sender_id', userId).is('read_at', null);
  if (error) throw error;
}
