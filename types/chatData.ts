export interface ChatMessage {
  id: string;
  fromUserId: number;
  toUserId: number;
  message: string;
  createdAt: string;
}

export interface ChatNotification {
  from: number;
  message: string; // Message ID
  snippet: string;
  createdAt: string;
}

export interface RentalNotification {
  id: string;
  message: string;
  createdAt: string;
}

export interface Conversation {
  userId: number;
  nickname: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}