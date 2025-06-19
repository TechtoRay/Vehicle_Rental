import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { authAPI, chatAPI } from '@/api';
import { socketService } from '@/services/socketService';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const users = [
  { id: 1, nickname: 'User 1' },
  { id: 2, nickname: 'User 2' },
  { id: 3, nickname: 'User 3' },
];

const NewChat = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSelectUser = async (receiverId: number) => {
    setLoading(true);
    try {
      const userResponse = await authAPI.getUser(); // Fetch current user ID
      if (userResponse.status === 200 && userResponse.data?.data) {
        const senderId = userResponse.data.data.id;
        const response = await chatAPI.createChatSession(receiverId);
        console.log('status:', response.data.status);
        console.log('Create chat session response:', response.data.data);
        if (response.data.status === 201) {
          const sessionId = response.data.data.id;
          
          // Connect to WebSocket for this session
          const accessToken = await AsyncStorage.getItem('accessToken');
          await socketService.connect(senderId, accessToken);
          await socketService.joinChat(sessionId);
          router.push({ pathname: '/chat-detail', params: { sessionId: sessionId.toString() } });
        } else {
          if (response.data.status === 400) {
            Alert.alert('Error', 'Chat session already exists with this user');
            router.push({ pathname: '/chat-detail', params: { sessionId: response.data.data.id.toString() } });
          }
          Alert.alert('Error', response.data.message || 'Failed to create chat session');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create chat session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      <FlatList
        data={users}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="p-4 border-b border-gray-200"
            onPress={() => handleSelectUser(item.id)}
            disabled={loading}
          >
            <Text className="text-lg">{item.nickname}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

export default NewChat;