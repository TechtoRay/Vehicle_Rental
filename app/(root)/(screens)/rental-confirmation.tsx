import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { rentalAPI, authAPI } from '@/api';
import { icons } from '@/constants';

const RentalConfirmation = () => {
  const params = useLocalSearchParams();
  const {
    vehicleId,
    title,
    price,
    startDate: startDateStr,
    endDate: endDateStr,
    imageFront,
    owner,
  } = params;

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const startDate = startDateStr ? new Date(startDateStr as string) : null;
  const endDate = endDateStr ? new Date(endDateStr as string) : null;
  const parsedPrice = price ? parseFloat(price as string) : 0;

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const days = calculateDays();
  const appFee = 2500;
  const totalPrice = parsedPrice * days + appFee;

  const getMonthsToCheck = (startDate: Date, endDate: Date) => {
    const months = new Set<string>();
    let current = new Date(startDate);
    while (current <= endDate) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();
      months.add(`${year}-${month}`);
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return Array.from(months).map((m) => {
      const [year, month] = m.split('-').map(Number);
      return { month, year };
    });
  };

  const checkAvailability = async () => {
    if (!vehicleId || !startDate || !endDate) return;
    try {
      const monthsToCheck = getMonthsToCheck(startDate, endDate);
      const allBookings = [];
      for (const { month, year } of monthsToCheck) {
        const response = await rentalAPI.checkVehicleAvailability({
          vehicleId: parseInt(vehicleId as string),
          month,
          year,
        });
        if (response.status === 200 && Array.isArray(response.data?.data)) {
          allBookings.push(...response.data.data);
        } else {
          throw new Error('Failed to check availability for ' + month + '/' + year);
        }
      }
      const isBooked = allBookings.some((booking: any) => {
        const bookingStart = new Date(booking.startDateTime);
        const bookingEnd = new Date(booking.endDateTime);
        return startDate < bookingEnd && endDate > bookingStart;
      });
      setIsAvailable(!isBooked);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 4101
          ? 'Failed to check vehicle availability.'
          : err.response?.data?.errorCode === 4012
          ? 'Invalid dates.'
          : err.response?.data?.message || 'Could not check availability.';
      Alert.alert('Error', errorMessage);
      setIsAvailable(false);
    }
  };

  const confirmRental = async () => {
    if (!vehicleId || !startDate || !endDate) return;
    try {
      const response = await rentalAPI.createRentalConfirmation({
        vehicleId: parseInt(vehicleId as string),
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
      });
      if (response.data.status === 200) {
        setConfirmationData(response.data.data);
      } else {
        throw new Error('Failed to create rental confirmation');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 2007
          ? 'Vehicle not found.'
          : err.response?.data?.errorCode === 4012
          ? 'End date is less than start date.'
          : err.response?.data?.errorCode === 4001
          ? 'Vehicle is not available.'
          : err.response?.data?.errorCode === 4102
          ? 'Failed to create rental confirmation.'
          : err.response?.data?.message || 'Could not confirm rental.';
      Alert.alert('Error', errorMessage);
      setIsAvailable(false);
    }
  };

  const handleCreateRental = async () => {
    if (!vehicleId || !startDate || !endDate) {
      Alert.alert('Error', 'Please provide all required information.');
      return;
    }
    try {
      const userResponse = await authAPI.getUser();
      if (userResponse.data.status === 200) {
        const phoneNumber = userResponse.data.data.phoneNumber;
        if (!phoneNumber) {
          Alert.alert('Error', 'Phone number is missing. Please update your profile.');
          return;
        }
        const response = await rentalAPI.createNewRental({
          vehicleId: parseInt(vehicleId as string),
          renterPhoneNumber: phoneNumber,
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
        });
        if (response.data.status === 200 && response.data?.data) {
          const rentalId = response.data.data.id;
          const depositPrice = response.data.data.depositPrice;
          router.push({
            pathname: '/payment',
            params: { rentalId: rentalId.toString(), depositPrice: depositPrice.toString() }
          });
        } else {
          throw new Error('Failed to create rental');
        }
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 2007
          ? 'Vehicle not found.'
          : err.response?.data?.errorCode === 4002
          ? 'Owner cannot rent their own vehicle.'
          : err.response?.data?.errorCode === 4012
          ? 'End date is less than start date.'
          : err.response?.data?.errorCode === 4001
          ? 'Vehicle is not available.'
          : err.response?.data?.errorCode === 4103
          ? 'Failed to create rental.'
          : err.response?.data?.message || 'Could not create rental.';
      Alert.alert('Error', errorMessage);
    }
  };

  useEffect(() => {
    if (vehicleId && startDate && endDate) {
      checkAvailability().then(() => confirmRental().finally(() => setLoading(false)));
    } else {
      setLoading(false);
    }
  }, [vehicleId, startDateStr, endDateStr]);

  if (!vehicleId || !title || !price || !startDateStr || !endDateStr || !imageFront || !owner) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-red-500 font-Roboto font-medium">Missing rental information</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="font-Roboto font-medium">Checking availability...</Text>
      </SafeAreaView>
    );
  }

  if (isAvailable === false) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-red-500 font-Roboto font-medium">Vehicle is not available for the selected dates.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-[#2563EB] font-Roboto font-medium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView>
        <View className="flex-row items-center px-4 py-2 bg-white">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-Roboto font-bold ml-2">Confirm Rental</Text>
        </View>

        <View className="px-4 bg-white rounded-lg p-4">
          <Image source={{ uri: imageFront as string }} className="w-full h-80 rounded-lg" />
          <Text className="text-xl font-Roboto font-bold mt-2">{title as string}</Text>
          <Text className="text-sm text-gray-500 font-Roboto font-medium mt-1">Vehicle ID: {vehicleId}</Text>
          <View className="flex-row items-center mt-2">
            <Image source={icons.star} className="w-4 h-4" />
            <Text className="text-sm font-Roboto font-bold text-yellow-500 ml-1">5.0</Text>
            <Text className="text-sm text-gray-500 font-Roboto font-medium ml-2">21 trips</Text>
          </View>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-Roboto font-bold">Rental Insurance</Text>
          <Text className="text-sm text-gray-500 font-Roboto font-medium mt-1">
            The trip includes insurance. The renter is liable for a maximum of 2,000,000 VND in case of unforeseen incidents.
          </Text>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-Roboto font-bold">Rental Period</Text>
          <View className="flex-row justify-between mt-2">
            <View>
              <Text className="text-sm text-gray-500 font-Roboto font-medium">Pickup Date</Text>
              <Text className="text-sm font-Roboto font-medium">
                {startDate?.toLocaleString('en-US', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View>
              <Text className="text-sm text-gray-500 font-Roboto font-medium">Return Date</Text>
              <Text className="text-sm font-Roboto font-medium">
                {endDate?.toLocaleString('en-US', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
          <View className="mt-2">
            <Text className="text-sm text-gray-500 font-Roboto font-medium">Pickup Location</Text>
            <Text className="text-sm font-Roboto font-medium">District 2, Ho Chi Minh City</Text>
          </View>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-Roboto font-bold">Owner</Text>
          <View className="flex-row items-center mt-2">
            <Image source={{ uri: 'https://via.placeholder.com/40' }} className="w-10 h-10 rounded-full mr-2" />
            <View>
              <Text className="text-sm font-Roboto font-bold">{owner as string}</Text>
              <View className="flex-row items-center">
                <Image source={icons.star} className="w-3 h-3" />
                <Text className="text-sm text-yellow-500 font-Roboto font-bold ml-1">5.0</Text>
                <Text className="text-sm text-gray-500 font-Roboto font-medium ml-2">21 trips</Text>
              </View>
            </View>
          </View>
          <Text className="text-sm text-gray-500 font-Roboto font-medium mt-1">
            Personal information is kept confidential. App will send the owner rental details after the customer completes full payment.
          </Text>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-Roboto font-bold">Price Breakdown</Text>
          <View className="mt-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500 font-Roboto font-medium">Rental Rate</Text>
              <Text className="text-sm font-Roboto font-medium">{parsedPrice.toLocaleString()} đ/day</Text>
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-sm text-gray-500 font-Roboto font-medium">Number of Days</Text>
              <Text className="text-sm font-Roboto font-medium">{days} days</Text>
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-sm text-gray-500 font-Roboto font-medium">App Fee</Text>
              <Text className="text-sm font-Roboto font-medium">{appFee.toLocaleString()} đ</Text>
            </View>
            {confirmationData && (
              <>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-sm text-gray-500 font-Roboto font-medium">Deposit</Text>
                  <Text className="text-sm font-Roboto font-medium">
                    {confirmationData.depositPrice.toLocaleString()} đ
                  </Text>
                </View>
                <View className="flex-row justify-between mt-4">
                  <Text className="text-base font-Roboto font-bold">Total</Text>
                  <Text className="text-base font-Roboto font-bold">
                    {confirmationData.totalPrice.toLocaleString()} đ
                  </Text>
                </View>
              </>
            )}
            {!confirmationData && (
              <View className="flex-row justify-between mt-4">
                <Text className="text-base font-Roboto font-bold">Total (Estimated)</Text>
                <Text className="text-base font-Roboto font-bold">{totalPrice.toLocaleString()} đ</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View className="px-4 mt-4 bg-white rounded-lg p-4">
        <View className="flex-row items-center">
          <Ionicons name="checkmark-circle" size={20} color="blue" />
          <Text className="text-sm font-Roboto font-medium ml-2">I agree to the rental policy of the App.</Text>
        </View>
      </View>

      <View className="px-4 py-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          className="bg-primary-500 py-3 rounded-md"
          onPress={handleCreateRental}
        >
          <Text className="text-white text-center font-Roboto font-bold text-base">Submit Rental Request</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default RentalConfirmation;