import React, { useState } from 'react';
import { Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import PendingRequests from '@/components/PendingRequests';
import VehicleList from '@/components/VehicleList';
import CustomButton from '@/components/CustomButton';
import { router } from 'expo-router';

const MyVehicles = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'vehicles'>('vehicles');

  return (
    <SafeAreaView className="flex-1 bg-white p-5">
      {/* Tab Navigation */}
      <View className="flex-row justify-between mb-4">
        <TouchableOpacity
          className={`flex-1 p-3 rounded-lg ${activeTab === 'pending' ? 'bg-primary-500' : 'bg-gray-200'}`}
          onPress={() => setActiveTab('pending')}
        >
          <Text className={`text-center font-JakartaBold ${activeTab === 'pending' ? 'text-white' : 'text-black'}`}>
            Pending Requests
          </Text>
        </TouchableOpacity>
        <View className="w-2" />
        <TouchableOpacity
          className={`flex-1 p-3 rounded-lg ${activeTab === 'vehicles' ? 'bg-primary-500' : 'bg-gray-200'}`}
          onPress={() => setActiveTab('vehicles')}
        >
          <Text className={`text-center font-JakartaBold ${activeTab === 'vehicles' ? 'text-white' : 'text-black'}`}>
            Rental Details
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'pending' ? <PendingRequests /> : <VehicleList />}

      {/* Add Vehicle Button */}
      <CustomButton
        title="Add Vehicle"
        onPress={() => router.replace('/(root)/(tabs)/addpost')}
        className="mt-5 w-full"
      />
    </SafeAreaView>
  );
};

export default MyVehicles;