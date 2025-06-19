import React, { useState, useEffect } from 'react';
import { Text, View, Image, FlatList, ActivityIndicator, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { rentalAPI, vehicleAPI, authAPI } from '@/api';
import { Ionicons } from '@expo/vector-icons';
import { VehicleData } from '@/types/carData';
import CustomButton from '@/components/CustomButton';

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
}

const VehicleRentals = () => {
  const params = useLocalSearchParams();
  const { vehicleId } = params;
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [renters, setRenters] = useState<Record<number, { nickname: string; avatar: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!vehicleId) {
        setError('Vehicle ID is missing');
        setLoading(false);
        return;
      }

      try {
        const [rentalsResponse, vehicleResponse] = await Promise.all([
          rentalAPI.getAllRentalsOfVehicle(parseInt(vehicleId as string)),
          vehicleAPI.getVehicleById(parseInt(vehicleId as string)),
        ]);

        if (vehicleResponse.data.status === 200) {
          setVehicle(vehicleResponse.data.data);
        } else {
          throw new Error('Failed to fetch vehicle details');
        }

        if (rentalsResponse.data.status === 200) {
          const rentalsData = rentalsResponse.data.data.rentals;
          setRentals(rentalsData);
          const renterIds = [...new Set(rentalsData.map((r: Rental) => r.renterId))];
          const rentersData = await Promise.all(
            renterIds.map(async (id) => {
              try {
                const response = await authAPI.getUserPublicInfo(id);
                if (response.data.status === 200) {
                  return { id, nickname: response.data.data.nickname, avatar: response.data.data.avatar };
                }
              } catch (err) {
                console.error(`Error fetching user ${id}:`, err);
              }
              return { id, nickname: 'Unknown', avatar: null };
            })
          );
          const rentersMap = Object.fromEntries(rentersData.map(user => [user.id, { nickname: user.nickname, avatar: user.avatar }]));
          setRenters(rentersMap);
        } else {
          throw new Error(rentalsResponse.data.message || 'Failed to fetch rentals');
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.errorCode === 3001
            ? 'Vehicle ID is not provided.'
            : err.response?.data?.errorCode === 2007
            ? 'Vehicle not found.'
            : err.response?.data?.errorCode === 2008
            ? 'You are not the owner of the vehicle.'
            : err.response?.data?.errorCode === 4107
            ? 'Failed to get all rentals of a vehicle.'
            : err.message || 'Could not load data';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vehicleId]);

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
      pathname: '/rental-details',
      params: { rentalId: rentalId.toString() },
    });
  };

  const handleToggleVisibility = async () => {
    if (!vehicle) return;
    try {
      const newHiddenStatus = !vehicle.isHidden;
      const apiCall = newHiddenStatus ? vehicleAPI.hideVehicle : vehicleAPI.unhideVehicle;
      const response = await apiCall(vehicle.id);
      if (response.data.status === 200) {
        setVehicle({ ...vehicle, isHidden: newHiddenStatus });
        Alert.alert('Success', `Vehicle ${newHiddenStatus ? 'hidden' : 'unhidden'} successfully.`);
      } else {
        throw new Error(response.data.message || 'Failed to update visibility');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update vehicle visibility');
    }
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
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-[#2563EB] font-RobotoMedium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-2 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-RobotoBold ml-2">Vehicle Rentals</Text>
      </View>
      {vehicle && (
        <View className="px-4 mt-2">
          <TouchableOpacity onPress={() => router.push({ pathname: '/car-details', params: { id: vehicleId } })}>
            <Image
              source={{ uri: vehicle.imageFront }}
              className="w-full h-40 rounded-lg"
              resizeMode="cover"
            />
          </TouchableOpacity>
          <Text className="text-xl font-RobotoBold mt-2">{vehicle.title}</Text>
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-base font-RobotoMedium">
              Visibility: {vehicle.isHidden ? 'Hidden' : 'Visible'}
            </Text>
            <Switch
              value={!vehicle.isHidden}
              onValueChange={handleToggleVisibility}
            />
          </View>
        </View>
      )}
      <FlatList
        data={rentals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleRentalPress(item.id)}
            className="p-4 bg-gray-100 rounded-lg mx-4 my-2"
          >
            <Text className="text-sm text-gray-500">Rental ID: {item.id}</Text>
            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center">
                <Image
                  source={{ uri: renters[item.renterId]?.avatar || 'https://via.placeholder.com/40' }}
                  className="w-10 h-10 rounded-full mr-2"
                />
                <Text className="text-base font-RobotoMedium">
                  {renters[item.renterId]?.nickname || 'Unknown'}
                </Text>
              </View>
              <Text className="text-base font-RobotoBold">
                {item.totalPrice.toLocaleString()} VND
              </Text>
            </View>
            <View className="mt-2">
              <Text className="text-sm">Start: {new Date(item.startDateTime).toLocaleString()}</Text>
              <Text className="text-sm">End: {new Date(item.endDateTime).toLocaleString()}</Text>
            </View>
            <Text style={{ color: getStatusColor(item.status) }} className="text-sm mt-2">
              Status: {item.status}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center mt-4">
            <Text className="text-base text-gray-500">No rentals found for this vehicle</Text>
          </View>
        )}
      />
      {vehicle && (
        <View className="px-4 py-4">
          <CustomButton
            title="Update Vehicle"
            onPress={() =>
              router.push({
                pathname: '/edit-vehicle',
                params: { vehicleId: vehicle.id.toString() },
              })
            }
            className="w-full"
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default VehicleRentals;