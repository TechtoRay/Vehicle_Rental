import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { chatAPI, authAPI } from '@/api';
import { socketService } from '@/services/socketService';
import { images, icons } from '@/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatMessage {
  type: string;
  content: string;
  senderId: number;
  createdAt: string;
  receiverId: number;
}

interface UserInfo {
  nickname: string;
  avatar?: string;
}

const ChatDetail = () => {
  const { sessionId, receiverId } = useLocalSearchParams();
  const sessionIdNum = Number(sessionId);
  const receiverIdNum = Number(receiverId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [senderInfo, setSenderInfo] = useState<UserInfo>({ nickname: 'You', avatar: undefined });
  const [receiverInfo, setReceiverInfo] = useState<UserInfo>({ nickname: `User ${receiverIdNum}`, avatar: undefined });
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userResponse = await authAPI.getUser();
        if (userResponse.status === 200 && userResponse.data?.data) {
          const { id, nickname, avatar } = userResponse.data.data;
          setUserId(id);
          setSenderInfo({ nickname: nickname || 'You', avatar });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    const fetchReceiverInfo = async () => {
      try {
        const response = await authAPI.getUserPublicInfo(receiverIdNum);
        if (response.data?.status === 200 && response.data?.data) {
          const { nickname, avatar } = response.data.data;
          setReceiverInfo({ nickname: nickname || `User ${receiverIdNum}`, avatar });
        } else {
          setReceiverInfo({ nickname: `User ${receiverIdNum}`, avatar: undefined });
        }
      } catch (error) {
        console.error('Error fetching receiver info:', error);
        setReceiverInfo({ nickname: `User ${receiverIdNum}`, avatar: undefined });
      }
    };

    const fetchMessages = async () => {
      try {
        const response = await chatAPI.getMessagesInSession(sessionIdNum);
        if (response.data.status === 200) {
          setMessages(response.data.data);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } else {
          console.error('Failed to fetch messages');
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    const initialize = async () => {
      setLoading(true);
      await Promise.all([fetchUserData(), fetchReceiverInfo(), fetchMessages()]);
      setLoading(false);
    };

    initialize();

    const connectSocket = async () => {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (userId && accessToken) {
        await socketService.connect(userId, accessToken);
        await socketService.joinChat(sessionIdNum);
        socketService.onMessage((data) => {
          if (data.sessionId === sessionIdNum) {
            setMessages((prev) => [...prev, data.message]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        });
      }
    };

    if (userId) {
      connectSocket();
    }

    return () => {
      socketService.off('messageHandler');
    };
  }, [sessionIdNum, userId, receiverIdNum]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userId) return;
    try {
      const message: ChatMessage = {
        type: 'text',
        content: newMessage,
        senderId: userId,
        createdAt: new Date().toISOString(),
        receiverId: receiverIdNum,
      };
      await socketService.sendChat(sessionIdNum, receiverIdNum, 'text', newMessage);
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isSent = item.senderId === userId;
    return (
      <View className={`flex-row items-end mb-4 mx-4 ${isSent ? 'justify-end' : 'justify-start'}`}>
        {!isSent && (
          <Image
            source={receiverInfo.avatar ? { uri: receiverInfo.avatar } : images.avatar}
            className="w-8 h-8 rounded-full mr-2"
            resizeMode="cover"
          />
        )}
        <View className={`max-w-[70%] p-3 rounded-2xl ${isSent ? 'bg-[#2563EB]' : 'bg-gray-100'}`}>
          <Text className={isSent ? 'text-white' : 'text-black'}>{item.content}</Text>
          <Text className={`text-xs ${isSent ? 'text-white/70' : 'text-gray-500'} mt-1 text-right`}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {isSent && (
          <Image
            source={senderInfo.avatar ? { uri: senderInfo.avatar } : images.avatar}
            className="w-8 h-8 rounded-full ml-2"
            resizeMode="cover"
          />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white p-5 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white p-5">
      <Text className="text-2xl font-JakartaBold mb-4">
        Chat with {receiverInfo.nickname}
      </Text>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
        contentContainerClassName="pb-4"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />
      <View className="flex-row items-center p-3 bg-white border-t border-gray-200">
        <TextInput
          className="flex-1 bg-gray-200 rounded-full px-3 py-2 text-black"
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#6b7280"
        />
        <TouchableOpacity onPress={handleSendMessage} className="ml-2">
          <Image source={icons.to} className="w-8 h-8" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ChatDetail;