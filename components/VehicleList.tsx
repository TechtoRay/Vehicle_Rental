import React, { useState, useEffect } from 'react';
import { Text, View, Image, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { vehicleAPI } from '@/api';
import { images } from '@/constants';
import { router } from 'expo-router';

interface Vehicle {
  id: string;
  title: string;
  imageFront: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  status: string;
}

const VehicleList = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await vehicleAPI.getUserVehicles();
        if (response.data.status === 200) {
          setVehicles(response.data.data.vehicles);
        } else {
          throw new Error('Failed to fetch vehicles');
        }
      } catch (err: any) {
        setError(err.message || 'Could not load vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const handleVehiclePress = (vehicleId: string) => {
    router.push({
      pathname: '/vehicle-rentals',
      params: { vehicleId },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-red-500 font-RobotoMedium">{error}</Text>
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Text className="text-2xl font-JakartaBold">Rental Details</Text>
        <View className="flex-1 h-fit flex justify-center items-center">
          <Image
            source={images.noResult}
            alt="message"
            className="w-full h-80"
            resizeMode="contain"
          />
          <Text className="text-3xl font-JakartaBold mt-3">No Car found</Text>
          <Text className="text-base mt-2 text-center px-7">
            Add your first car to start tracking your vehicle's history and performance.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="flex-1">
      <Text className="text-2xl font-JakartaBold">Rental Details</Text>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleVehiclePress(item.id)}
            className="p-4 bg-gray-100 rounded-lg mb-4"
          >
            <Image
              source={{ uri: item.imageFront }}
              className="w-full h-40 rounded-lg mb-2"
              resizeMode="cover"
            />
            <Text className="text-lg font-RobotoBold">{item.title}</Text>
            <Text>{item.brand} {item.model} ({item.year})</Text>
            <Text>Price: {item.price.toLocaleString()} VND/day</Text>
            <Text>Status: {item.status}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center">
            <Text className="text-base text-gray-500">No vehicles found</Text>
          </View>
        )}
      />
    </View>
  );
};

export default VehicleList;