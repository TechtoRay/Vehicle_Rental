import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, ChatNotification, RentalNotification } from '@/types/chatData';

const BASE_URL = 'http://192.168.100.132:3000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, (data: any) => void> = new Map();

  async connect(userId: number, accessToken: string | null): Promise<void> {
    const token = accessToken || (await AsyncStorage.getItem('accessToken'));
    if (!token) {
      throw new Error('No access token available');
    }

    this.disconnect();
    this.socket = io(BASE_URL, {
      auth: { accessToken: token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.socket?.emit('joinRoom', { userId });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.forEach((_, event) => this.off(event));
    }
  }

  joinChat = (sessionId: number) => {
    if (this.socket) {
      this.socket.emit('joinChat', sessionId);
    }
  };

  sendChat = (sessionId: number, receiverId: number, type: 'text' | 'image', content: string) => {
    if (this.socket) {
      this.socket.emit('sendMessage', { sessionId, receiverId, type, content });
    }
  };

  onChatHistory(callback: (messages: ChatMessage[]) => void): void {
    if (this.socket) {
      this.listeners.set('chatHistory', callback);
      this.socket.on('chatHistory', callback);
    }
  }

  onChatMessage = (callback: (message: ChatMessage) => void) => {
    if (this.socket) {
      this.listeners.set('newMessage', callback);
      this.socket.on('newMessage', callback);
    }
  };

  onMessage = (callback: (data: { sessionId: number; message: ChatMessage }) => void) => {
    if (this.socket) {
      const handler = (data: { sessionId: number; message: ChatMessage }) => callback(data);
      this.socket.on('newMessage', handler);
      this.socket.on('chatMessage', handler);
      this.listeners.set('messageHandler', handler);
    }
  };

  onSessionUpdated = (callback: (data: { sessionId: number; preview: ChatMessage }) => void) => {
    if (this.socket) {
      const handler = (data: { sessionId: number; preview: ChatMessage }) => callback(data);
      this.socket.on('sessionUpdated', handler);
      this.listeners.set('sessionUpdated', handler);
    }
  };

  onChatNotification(callback: (notification: ChatNotification) => void): void {
    if (this.socket) {
      this.listeners.set('Chat Notification', callback);
      this.socket.on('Chat Notification', callback);
    }
  }

  onRentalNotification(callback: (notification: RentalNotification) => void): void {
    if (this.socket) {
      this.listeners.set('Rental Notification', callback);
      this.socket.on('Rental Notification', callback);
    }
  }

  off(event: string): void {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
      this.listeners.delete(event);
    }
  }
}

export const socketService = new SocketService();