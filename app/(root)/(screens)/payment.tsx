import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { rentalAPI } from '@/api';

const Payment = () => {
  const params = useLocalSearchParams();
  const { rentalId, depositPrice } = params;
  const [loading, setLoading] = useState(false);

  if (!rentalId || !depositPrice) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-red-500 font-Roboto font-medium">Missing payment information</Text>
      </SafeAreaView>
    );
  }

  const depositPriceNum = parseFloat(depositPrice as string);
  const formattedPrice = depositPriceNum.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

  const handlePayNow = async () => {
    setLoading(true);
    try {
      const response = await rentalAPI.payDeposit(parseInt(rentalId as string));
      if (response.data.status === 200) {
        Alert.alert('Success', 'Payment successful');
        router.push('/history');
      } else {
        throw new Error(response.data.message || 'Failed to make payment');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 8004
          ? 'Rental not found.'
          : err.response?.data?.errorCode === 8005
          ? 'Rental is cancelled.'
          : err.response?.data?.errorCode === 8006
          ? 'Rental is not deposit pending.'
          : err.response?.data?.errorCode === 8106
          ? 'Failed to deposit payment.'
          : err.response?.data?.message || 'Could not make payment.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
      <View className="p-5">
        <Text className="text-xl font-Roboto font-bold mb-4">Payment</Text>
        <Text className="text-base mb-4">
          Please pay {formattedPrice} to confirm your rental.
        </Text>
        <Text className="text-sm text-gray-500 mb-4">
          You have 15 minutes to complete the payment.
        </Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <TouchableOpacity
            className="bg-primary-500 py-3 px-6 rounded-md"
            onPress={handlePayNow}
          >
            <Text className="text-white font-Roboto font-bold text-base">Pay Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Payment;