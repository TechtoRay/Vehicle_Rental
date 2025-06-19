import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, SafeAreaView, StatusBar, Alert } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { images } from '@/constants';
import { authAPI } from '@/api';

interface UserData {
  avatar?: string;
  nickname: string;
  level?: number;
}

const Profile = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.getUser();
        const user = response.data.data;
        if (response.data.status === 200) {
          setUserData({
            avatar: user.avatar,
            nickname: user.nickname,
            level: user.accountLevel || 1,
          });
          setError(null);
        } else {
          throw new Error(response.data.message || 'User data not found');
        }
      } catch (err: any) {
        console.error('Error fetching user:', err);
        setError(err.message === 'Session expired. Please sign in again.' ? err.message : 'Could not load user data.');
        if (err.message === 'Session expired. Please sign in again.') {
          router.replace('/(auth)/sign-in');
        } else {
          Alert.alert('Error', 'Could not load user data.');
        }
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
              router.replace('/(auth)/sign-in');
            } catch (err) {
              Alert.alert('Error', 'Could not log out. Please try again.');
              console.error('Error during logout:', err);
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    { id: 1, title: 'My Account', icon: <Ionicons name="person-outline" size={22} color="#333" /> },
    { id: 2, title: 'My Vehicles', icon: <FontAwesome5 name="car" size={20} color="#333" /> },
    { id: 3, title: 'Favorite Vehicles', icon: <Ionicons name="heart-outline" size={22} color="#333" /> },
    { id: 6, title: 'Contracts', icon: <Ionicons name="document-text-outline" size={22} color="#333" /> },
    { id: 7, title: 'Gifts', icon: <Ionicons name="gift-outline" size={22} color="#333" /> },
    { id: 8, title: 'Refer a Friend', icon: <Feather name="share-2" size={22} color="#333" /> },
    { id: 9, title: 'Change Password', icon: <Ionicons name="lock-closed-outline" size={22} color="#333" /> },
    { id: 10, title: 'Request Account Deletion', icon: <Feather name="trash-2" size={22} color="#333" /> },
    { id: 11, title: 'Logout', icon: <Ionicons name="log-out-outline" size={22} color="#333" /> },
  ];

  const renderMenuItem = (item: { id: number; title: string; icon: React.ReactNode }) => (
    <TouchableOpacity
      key={item.id}
      className="flex-row items-center justify-between bg-white py-4 px-5 border-b border-gray-100"
      onPress={() => {
        if (item.title === 'Contracts') {
          router.push('/(screens)/contracts');
        } else if (item.title === 'My Vehicles') {
          router.push('/(screens)/my-vehicles');
        } else if (item.title === 'My Account') {
          router.push('/(screens)/my-account');
        } else if (item.title === 'Logout') {
          handleLogout();
        } else {
          console.log(`Pressed: ${item.title}`);
        }
      }}
    >
      <View className="flex-row items-center">
        {item.icon}
        <Text className="text-base font-RobotoMedium text-gray-800 ml-4">{item.title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar backgroundColor="#e8f4f1" barStyle="dark-content" />
      <View className="bg-green-50 pt-5 pb-5 items-center">
        <View className="mt-8 items-center">
          <Image
            source={userData?.avatar ? { uri: userData.avatar } : images.avatar}
            className="w-24 h-24 rounded-full mb-2"
            resizeMode="cover"
          />
          <Text className="text-lg font-RobotoMedium text-gray-800">{userData?.nickname || 'User'}</Text>
          <View className="mt-1 px-3 py-1 bg-[#2563EB] rounded-full">
            <Text className="text-sm font-RobotoMedium text-white">
              Level {userData?.level || 1}
            </Text>
          </View>
        </View>
      </View>
      <ScrollView className="flex-1 bg-gray-100">
        {error ? (
          <Text className="text-center text-red-500 font-RobotoMedium mt-4">{error}</Text>
        ) : (
          menuItems.map(item => renderMenuItem(item))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;