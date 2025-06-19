import React from 'react';
import { View, Text } from 'react-native';
import ChatList from '@/components/ChatList';

const Chat = () => {
  return (
    <View className="flex-1 bg-gray-100">
      <ChatList />
    </View>
  );
};

export default Chat;