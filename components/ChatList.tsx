import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatAPI, authAPI } from '@/api';
import { useRouter, useFocusEffect } from 'expo-router';
import { images, icons } from '@/constants';
import { socketService } from '@/services/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatSession {
  id: number;
  senderId: number;
  receiverId: number;
  message: ChatMessage[];
  createdAt: string;
}

interface ChatMessage {
  type: string;
  content: string;
  senderId: number;
  createdAt: string;
  receiverId: number;
}

const ChatList = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [userData, setUserData] = useState<{ id: string; nickname: string; avatar?: string } | null>(null);
  const [userCache, setUserCache] = useState<Record<number, { nickname: string; avatar?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchUserData = async () => {
    try {
      const userResponse = await authAPI.getUser();
      if (userResponse.status === 200 && userResponse.data?.data) {
        const { id, nickname, avatar } = userResponse.data.data;
        setUserData({ id: id.toString(), nickname, avatar });
        setUserCache((prev) => ({ ...prev, [id]: { nickname, avatar } }));
        const accessToken = await AsyncStorage.getItem('accessToken');
        await socketService.connect(id, accessToken);
        return id;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Could not load user data');
    }
    return null;
  };

  const fetchSessions = async () => {
    try {
      const response = await chatAPI.getAllMessages();
      if (response.data.status === 200) {
        setSessions(response.data.data.sessions);
        const uniqueUserIds = [
          ...new Set(
            response.data.data.sessions.flatMap((session: ChatSession) => [session.senderId, session.receiverId])
          ),
        ].filter((id) => !userCache[id]); // Only fetch uncached IDs
        if (uniqueUserIds.length > 0) {
          await fetchUserInfo(uniqueUserIds);
        }
      } else {
        throw new Error('Failed to fetch chat sessions');
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      setError('Could not load chat sessions');
    }
  };

  const fetchUserInfo = async (userIds: number[]) => {
    try {
      const promises = userIds.map((id) => authAPI.getUserPublicInfo(id));
      const responses = await Promise.allSettled(promises);
      const newUserInfo = responses.reduce((acc, result, index) => {
        if (result.status === 'fulfilled' && result.value.data?.status === 200 && result.value.data?.data) {
          const { id, nickname, avatar } = result.value.data.data;
          acc[id] = { nickname: nickname || `User ${id}`, avatar };
        } else {
          const id = userIds[index];
          acc[id] = { nickname: `User ${id}`, avatar: undefined };
        }
        return acc;
      }, {} as Record<number, { nickname: string; avatar?: string }>);
      setUserCache((prev) => ({ ...prev, ...newUserInfo }));
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchNewSession = async (sessionId: number, preview: ChatMessage) => {
    try {
      const response = await chatAPI.getMessagesInSession(sessionId);
      if (response.data.status === 200) {
        const newSession = {
          id: sessionId,
          senderId: preview.senderId,
          receiverId: preview.receiverId,
          message: response.data.data,
          createdAt: new Date().toISOString(),
        };
        setSessions((prev) =>
          [...prev, newSession].sort(
            (a, b) =>
              new Date(b.message[b.message.length - 1].createdAt).getTime() -
              new Date(a.message[a.message.length - 1].createdAt).getTime()
          )
        );
        if (!userCache[preview.senderId] || !userCache[preview.receiverId]) {
          await fetchUserInfo([preview.senderId, preview.receiverId]);
        }
      }
    } catch (error) {
      console.error('Error fetching new session:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const initialize = async () => {
        setLoading(true);
        const userId = await fetchUserData();
        if (isActive && userId) {
          await fetchSessions();
          socketService.onSessionUpdated((data) => {
            const { sessionId, preview } = data;
            setSessions((prevSessions) => {
              const sessionExists = prevSessions.some((session) => session.id === sessionId);
              if (sessionExists) {
                return prevSessions
                  .map((session) =>
                    session.id === sessionId
                      ? { ...session, message: [...session.message, { ...preview, receiverId: session.receiverId }] }
                      : session
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.message[b.message.length - 1].createdAt).getTime() -
                      new Date(a.message[a.message.length - 1].createdAt).getTime()
                  );
              } else {
                fetchNewSession(sessionId, preview);
                return prevSessions;
              }
            });
            if (!userCache[preview.senderId] || !userCache[preview.receiverId]) {
              fetchUserInfo([preview.senderId, preview.receiverId]);
            }
          });
        }
        setLoading(false);
      };

      initialize();

      return () => {
        isActive = false;
        socketService.off('sessionUpdated');
      };
    }, [])
  );

  const renderSession = ({ item }: { item: ChatSession }) => {
    const otherUserId = item.senderId === Number(userData?.id) ? item.receiverId : item.senderId;
    const otherUser = userCache[otherUserId] || { nickname: `User ${otherUserId}`, avatar: undefined };
    const latestMessage = item.message[item.message.length - 1];

    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/chat-detail', params: { sessionId: item.id, receiverId: otherUserId } })}
        className="p-4 bg-gray-100 rounded-lg mb-4"
      >
        <View className="flex-row items-center">
          <Image
            source={otherUser.avatar ? { uri: otherUser.avatar } : images.avatar}
            className="w-16 h-16 rounded-full mr-4"
            resizeMode="cover"
          />
          <View className="flex-1">
            <Text className="text-lg font-RobotoBold text-gray-800">{otherUser.nickname}</Text>
            {latestMessage && (
              <Text className="text-base text-gray-500 mt-1">
                {latestMessage.content.length > 30 ? latestMessage.content.substring(0, 30) + '...' : latestMessage.content}
              </Text>
            )}
            {latestMessage && (
              <Text className="text-sm text-gray-400 mt-1">
                {new Date(latestMessage.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white p-5 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white p-5 justify-center items-center">
        <Text className="text-red-500 font-RobotoMedium">{error}</Text>
      </SafeAreaView>
    );
  }

  if (sessions.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white p-5">
        <Text className="text-2xl font-JakartaBold">Chats</Text>
        <View className="flex-1 justify-center items-center">
          <Image
            source={images.noResult}
            className="w-full h-80"
            resizeMode="contain"
          />
          <Text className="text-3xl font-JakartaBold mt-3">No Chats Found</Text>
          <Text className="text-base mt-2 text-center px-7">Your conversations will appear here!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white p-5">
      <Text className="text-2xl font-JakartaBold">Chats</Text>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id.toString()}
        contentContainerClassName="pb-20"
      />
    </SafeAreaView>
  );
};

export default ChatList;