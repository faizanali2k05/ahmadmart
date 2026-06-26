// Frontend client for the in-app buyer ↔ seller chat.
import { getToken } from "./auth";

export interface ChatMessage {
  id: number;
  productId?: number;
  buyerId: number;
  sellerId: number;
  senderId: number;
  body: string;
  read: boolean;
  createdAt: number;
}
export interface Conversation {
  productId: number;
  buyerId: number;
  sellerId: number;
  productName: string;
  productImage: string;
  buyerName: string;
  sellerStore: string;
  lastBody: string;
  lastSenderId: number;
  lastAt: number;
  unread: number;
}

async function call(url: string, method = "GET", body?: unknown) {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }
  if (res.status === 404) throw new Error("Messaging is unavailable. The app must be deployed with the database connected.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data;
}

export async function sendMessage(m: { productId: number; buyerId: number; sellerId: number; body: string }): Promise<ChatMessage> {
  return (await call("/api/messages", "POST", m)).message as ChatMessage;
}
export async function getConversations(): Promise<Conversation[]> {
  return (await call("/api/messages")).conversations as Conversation[];
}
export async function getThread(productId: number, buyerId: number, sellerId: number): Promise<ChatMessage[]> {
  return (await call(`/api/messages?productId=${productId}&buyerId=${buyerId}&sellerId=${sellerId}`)).messages as ChatMessage[];
}
export async function getUnreadCount(): Promise<number> {
  try {
    return (await call("/api/messages?unread=1")).unread as number;
  } catch {
    return 0;
  }
}
