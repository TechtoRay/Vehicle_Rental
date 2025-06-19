import React, { useState, useEffect } from 'react';
import { Text, View, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { rentalAPI } from '@/api';

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

const PendingRequests = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingRentals = async () => {
      try {
        const response = await rentalAPI.getOwnerPendingRentals();
        if (response.data.status === 200) {
          setRentals(response.data.data.rentals);
        } else {
          throw new Error('Failed to fetch pending rentals');
        }
      } catch (err: any) {
        setError(err.message || 'Could not load pending rentals');
      } finally {
        setLoading(false);
      }
    };

    fetchPendingRentals();
  }, []);

  const handleRentalDecision = async (rentalId: number, status: boolean) => {
    try {
      const response = await rentalAPI.ownerRentalDecision(rentalId, status);
      if (response.data.status === 200) {
        Alert.alert('Success', `Rental ${status ? 'confirmed' : 'rejected'} successfully.`);
        // Remove the rental from the list after decision
        setRentals((prev) => prev.filter((rental) => rental.id !== rentalId));
      } else {
        throw new Error(response.data.message || 'Failed to make decision');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not process rental decision');
    }
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

  if (rentals.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-2xl font-JakartaBold">Pending Requests</Text>
        <Text className="text-base text-gray-500 mt-4">No pending rental requests found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Text className="text-2xl font-JakartaBold">Pending Requests</Text>
      <FlatList
        data={rentals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View className="p-4 bg-gray-100 rounded-lg mb-4">
            <Text className="text-lg font-RobotoBold">Rental ID: {item.id}</Text>
            <Text>Vehicle ID: {item.vehicleId}</Text>
            <Text>Renter ID: {item.renterId}</Text>
            <Text>Start: {new Date(item.startDateTime).toLocaleString()}</Text>
            <Text>End: {new Date(item.endDateTime).toLocaleString()}</Text>
            <Text>Total Price: {item.totalPrice.toLocaleString()} VND</Text>
            <Text>Status: {item.status}</Text>
            <View className="flex-row mt-2">
              <TouchableOpacity
                className="bg-green-500 py-2 px-4 rounded-lg mr-2"
                onPress={() => handleRentalDecision(item.id, true)}
              >
                <Text className="text-white font-JakartaBold">Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-red-500 py-2 px-4 rounded-lg"
                onPress={() => handleRentalDecision(item.id, false)}
              >
                <Text className="text-white font-JakartaBold">Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center">
            <Text className="text-base text-gray-500">No pending rentals found</Text>
          </View>
        )}
      />
    </View>
  );
};

export default PendingRequests;