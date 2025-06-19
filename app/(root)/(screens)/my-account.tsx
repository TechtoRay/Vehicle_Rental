// my-account.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StatusBar, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { authAPI } from '@/api';
import { images } from '@/constants';
import { UserData } from '@/types/carData';

interface UserProfileData {
  email: string;
  firstName: string | null;
  lastName: string | null;
  idCardNumber: string | null;
  driverLicense: string | null;
  status: string;
  phoneNumber: string | null; // Added phoneNumber
}

const MyAccount = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNickname, setEditedNickname] = useState('');
  const [editedAvatar, setEditedAvatar] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authAPI.getUser();
        const user = response.data.data;
        if (response.data.status === 200) {
          setUserData({
            id: String(user.id || 'unknown'),
            nickname: user.nickname || 'User',
            avatar: user.avatar ? user.avatar : undefined,
            level: user.accountLevel || 1,
          });
          setProfileData({
            email: user.email || '',
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            idCardNumber: user.idCardNumber || null,
            driverLicense: user.driverLicense || null,
            status: user.status || 'UNKNOWN',
            phoneNumber: user.phoneNumber || null, // Added phoneNumber
          });
          setEditedNickname(user.nickname || '');
          setEditedAvatar(user.avatar || null);
          setError(null);
        } else {
          throw new Error(response.data.message || 'User data not found');
        }
      } catch (err: any) {
        console.error('Error fetching user:', err);
        setError(err.message === 'Session expired. Please sign in again.' ? err.message : 'Could not load user details');
        if (err.message === 'Session expired. Please sign in again.') {
          router.replace('/(auth)/sign-in');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedNickname(userData?.nickname || '');
      setEditedAvatar(userData?.avatar || null);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      if (isEditing && !editedNickname.trim()) {
        Alert.alert('Error', 'Nickname cannot be empty');
        return;
      }

      const updateData: { nickname?: string; avatar?: string } = {};
      if (editedNickname && editedNickname !== userData?.nickname) {
        updateData.nickname = editedNickname;
      }
      if (editedAvatar !== null && editedAvatar !== userData?.avatar) {
        updateData.avatar = editedAvatar;
      }

      if (Object.keys(updateData).length === 0) {
        setIsEditing(false);
        return;
      }
      const response = await authAPI.updateUser(updateData);
      if (response.data.status === 200) {
        setUserData((prev) =>
          prev
            ? {
                ...prev,
                nickname: editedNickname || prev.nickname,
                avatar: editedAvatar ?? prev.avatar,
              }
            : null
        );
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      Alert.alert(
        'Error',
        err.message === 'Session expired. Please sign in again.' ? 'Session expired. Please sign in again.' : 'Failed to update profile'
      );
      if (err.message === 'Session expired. Please sign in again.') {
        router.replace('/(auth)/sign-in');
      }
    }
  };

  const handleAvatarPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setEditedAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleUpdateToLevel2 = () => {
    router.push('/update-to-level-2');
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (error || !userData || !profileData) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-red-500 font-Roboto font-medium">{error || 'User data not found'}</Text>
      </SafeAreaView>
    );
  }

  const fullName = [profileData.firstName, profileData.lastName]
    .filter((name) => name)
    .join(' ') || 'N/A';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-100">
      <StatusBar backgroundColor="#f3f4f6" barStyle="dark-content" />
      <View className="bg-white pt-5 pb-5">
        <View className="flex-row items-center px-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View className="items-center mt-4">
          <TouchableOpacity onPress={isEditing ? handleAvatarPick : undefined} disabled={!isEditing}>
            <Image
              source={
                editedAvatar
                  ? { uri: editedAvatar }
                  : userData.avatar
                  ? { uri: userData.avatar }
                  : images.avatar
              }
              className="w-24 h-24 rounded-full mb-2"
              resizeMode="cover"
            />
            {isEditing && (
              <View className="absolute bottom-0 right-0 bg-[#2563EB] rounded-full p-1">
                <Ionicons name="camera" size={16} color="white" />
              </View>
            )}
          </TouchableOpacity>
          {isEditing ? (
            <TextInput
              className="text-sm text-gray-500 border-b border-gray-300 mt-1 px-2"
              value={editedNickname}
              onChangeText={setEditedNickname}
              placeholder="Enter nickname"
            />
          ) : (
            <Text className="text-xl font-Roboto font-medium text-gray-800">{userData.nickname}</Text>
          )}
          <Text className="text-sm text-gray-500 font-Roboto font-medium">{profileData.email}</Text>
        </View>
      </View>

      <View className="px-5 mt-5">
        <View className="bg-white rounded-lg p-5">
          <Text className="text-base font-Roboto font-medium text-gray-800 mb-4">Account Information</Text>
          <View className="mb-4">
            <Text className="text-sm font-Roboto font-medium text-gray-500">Email</Text>
            <Text className="text-base font-Roboto font-medium text-gray-800">{profileData.email}</Text>
          </View>
          <View className="mb-4">
            <Text className="text-sm font-Roboto font-medium text-gray-500">Full Name</Text>
            <Text className="text-base font-Roboto font-medium text-gray-800">{fullName}</Text>
          </View>
          <View className="mb-4">
            <Text className="text-sm font-Roboto font-medium text-gray-500">Phone Number</Text>
            <Text className="text-base font-Roboto font-medium text-gray-800">
              {profileData.phoneNumber || 'N/A'}
            </Text>
          </View>
          <View className="mb-4">
            <Text className="text-sm font-Roboto font-medium text-gray-500">Nickname</Text>
            <Text className="text-base font-Roboto font-medium text-gray-800">@{userData.nickname}</Text>
          </View>
          <View className="mb-4">
            <Text className="text-sm font-Roboto font-medium text-gray-500">Account Level</Text>
            <Text className="text-base font-Roboto font-medium text-gray-800">Level {userData.level}</Text>
          </View>
          <View className="mb-4">
            <Text className="text-sm font-Roboto font-medium text-gray-500">ID Card Number</Text>
            <Text className="text-base font-Roboto font-medium text-gray-800">
              {profileData.idCardNumber || 'N/A'}
            </Text>
          </View>
          <View className="mb-4">
            <Text className="text-sm font-Roboto font-medium text-gray-500">Driver's License</Text>
            <Text className="text-base font-Roboto font-medium text-gray-800">
              {profileData.driverLicense || 'N/A'}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mt-5">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-md mr-2 ${isEditing ? 'bg-gray-300' : 'bg-[#2563EB]'}`}
            onPress={handleEditToggle}
            disabled={isEditing}
          >
            <Text
              className={`text-center font-Roboto font-medium text-base ${
                isEditing ? 'text-gray-500' : 'text-white'
              }`}
            >
              Edit Profile
            </Text>
          </TouchableOpacity>
          {isEditing ? (
            <>
              <TouchableOpacity
                className="flex-1 py-3 rounded-md mr-2 bg-red-500"
                onPress={handleEditToggle}
              >
                <Text className="text-white text-center font-Roboto font-medium text-base">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-3 rounded-md bg-[#2563EB]"
                onPress={handleSave}
              >
                <Text className="text-white text-center font-Roboto font-medium text-base">Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              className={`flex-1 py-3 rounded-md ${userData.level >= 2 ? 'bg-gray-200' : 'bg-[#2563EB]'}`}
              onPress={handleUpdateToLevel2}
              disabled={userData.level >= 2}
            >
              <Text
                className={`text-center font-Roboto font-medium text-base ${
                  userData.level >= 2 ? 'text-gray-500' : 'text-white'
                }`}
              >
                Update to Level 2
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default MyAccount;