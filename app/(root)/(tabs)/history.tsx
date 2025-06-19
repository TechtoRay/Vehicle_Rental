import React, { useState, useEffect } from 'react';
import { Text, View, Image, ScrollView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rentalAPI, vehicleAPI } from '@/api';
import { images } from '@/constants';
import { router } from 'expo-router';

interface Rental {
  id: number;
  vehicleId: number;
  renterId: number;
  startDateTime: string;
  endDateTime: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  vehicle?: {
    imageFront: string;
  };
}

const History = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [statusConstants, setStatusConstants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRentalsAndConstants = async () => {
      try {
        const [rentalsResponse, constantsResponse] = await Promise.all([
          rentalAPI.getAllRentals(),
          rentalAPI.getRentalStatusConstants(),
        ]);

        if (rentalsResponse.data.status === 200) {
          const rentalsData = rentalsResponse.data.data.rentals;
          const updatedRentals = await Promise.all(
            rentalsData.map(async (rental: Rental) => {
              const vehicleResponse = await vehicleAPI.getVehicleById(rental.vehicleId);
              if (vehicleResponse.data.status === 200) {
                return { ...rental, vehicle: { imageFront: vehicleResponse.data.data.imageFront } };
              }
              return rental;
            })
          );
          setRentals(updatedRentals);
        } else {
          throw new Error('Failed to fetch rentals');
        }

        if (constantsResponse.data.status === 200) {
          setStatusConstants(constantsResponse.data.data);
        } else {
          throw new Error('Failed to fetch status constants');
        }
      } catch (err: any) {
        setError(err.message || 'Could not load rental history');
      } finally {
        setLoading(false);
      }
    };

    fetchRentalsAndConstants();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DEPOSIT PENDING':
      case 'DEPOSIT PAID':
        return 'orange';
      case 'OWNER PENDING':
      case 'OWNER APPROVED':
        return 'blue';
      case 'CONTRACT PENDING':
      case 'CONTRACT SIGNED':
        return 'purple';
      case 'REMAINING PAYMENT PAID':
      case 'RENTER RECEIVED':
      case 'RENTER RETURNED':
        return 'green';
      case 'COMPLETED':
        return 'teal';
      case 'CANCELLED':
        return 'red';
      case 'DEPOSIT REFUNDED':
        return 'gray';
      default:
        return 'black';
    }
  };

  const handleRentalPress = (rentalId: number) => {
    router.push({
      pathname: '/(screens)/rental-details',
      params: { rentalId: rentalId.toString() },
    });
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

  if (rentals.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white p-5">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Text className="text-2xl font-JakartaBold">History</Text>
          <View className="flex-1 h-fit flex justify-center items-center">
            <Image
              source={images.noResult}
              alt="message"
              className="w-full h-80"
              resizeMode="contain"
            />
            <Text className="text-3xl font-JakartaBold mt-3">
              No History found
            </Text>
            <Text className="text-base mt-2 text-center px-7">
              Your recently rent appear here!
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white p-5">
      <Text className="text-2xl font-JakartaBold">History</Text>
      <FlatList
        data={rentals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleRentalPress(item.id)}
            className="p-4 bg-gray-100 rounded-lg mb-4"
          >
            {item.vehicle && (
              <Image
                source={{ uri: item.vehicle.imageFront }}
                className="w-full h-40 rounded-lg mb-2"
                resizeMode="cover"
              />
            )}
            <Text className="text-lg font-RobotoBold">Rental ID: {item.id}</Text>
            <Text>Vehicle ID: {item.vehicleId}</Text>
            <Text>Start: {new Date(item.startDateTime).toLocaleString()}</Text>
            <Text>End: {new Date(item.endDateTime).toLocaleString()}</Text>
            <Text>Total Price: {item.totalPrice.toLocaleString()} VND</Text>
            <Text style={{ color: getStatusColor(item.status) }}>Status: {item.status}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center">
            <Text className="text-base text-gray-500">No rentals found</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default History;