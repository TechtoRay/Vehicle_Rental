import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vehicleAPI, authAPI, rentalAPI } from '@/api';
import { VehicleData, UserData } from '@/types/carData';
import { images, icons } from '@/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';

const CarDetails = () => {
  const { id } = useLocalSearchParams();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ nickname: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectingStartDate, setSelectingStartDate] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>('07:45');
  const [endTime, setEndTime] = useState<string>('07:45');

  useEffect(() => {
    const fetchVehicleAndUser = async () => {
      try {
        if (!id || typeof id !== 'string') {
          throw new Error('Invalid vehicle ID');
        }
        const vehicleResponse = await vehicleAPI.getVehicleById(parseInt(id));
        if (vehicleResponse.status === 200 && vehicleResponse.data?.data) {
          const vehicleData = vehicleResponse.data.data;
          setVehicle(vehicleData);
          setStartTime(vehicleData.timePickupStart || '07:45');
          setEndTime(vehicleData.timeReturnStart || '07:45');
          setError(null);

          if (vehicleData.userId) {
            const userPublicResponse = await authAPI.getUserPublicInfo(vehicleData.userId);
            if (userPublicResponse.status === 200 && userPublicResponse.data?.data) {
              const userData: UserData = userPublicResponse.data.data;
              setOwnerInfo({
                nickname: userData.nickname || 'Unknown',
                avatar: userData.avatar,
              });
            } else {
              setOwnerInfo({ nickname: 'Unknown' });
            }
          }
        } else {
          throw new Error(vehicleResponse.data?.message || 'Failed to fetch vehicle data');
        }

        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          const userResponse = await authAPI.getUser();
          if (userResponse.status === 200 && userResponse.data?.data) {
            setUserId(userResponse.data.data.id.toString());
          } else {
            throw new Error(userResponse.data?.message || 'User data not found');
          }
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.errorCode === 2112
            ? 'Failed to get vehicle by ID.'
            : err.response?.data?.message || 'Could not load vehicle or user details';
        setError(errorMessage);
        console.error('Error fetching vehicle or user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleAndUser();
  }, [id]);

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
    if (!vehicle?.id || !startDate || !endDate) return false;
    try {
      const monthsToCheck = getMonthsToCheck(startDate, endDate);
      const allBookings = [];
      for (const { month, year } of monthsToCheck) {
        const response = await rentalAPI.checkVehicleAvailability({
          vehicleId: vehicle.id,
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
      return !isBooked;
    } catch (err: any) {
      console.error('Error checking availability:', err);
      Alert.alert('Error', 'Could not check vehicle availability.');
      return false;
    }
  };

  const validateTime = (time: string, startWindow: string, endWindow: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const [startHours, startMinutes] = startWindow.split(':').map(Number);
    const [endHours, endMinutes] = endWindow.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startInMinutes = startHours * 60 + startMinutes;
    const endInMinutes = endHours * 60 + endMinutes;
    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
  };

  const handleBookNow = async () => {
    if (!vehicle || !startDate || !endDate) {
      Alert.alert('Error', 'Please select valid rental dates.');
      return;
    }
    if (endDate <= startDate) {
      Alert.alert('Error', 'End date must be after start date.');
      return;
    }
    if (!validateTime(startTime, vehicle.timePickupStart, vehicle.timePickupEnd)) {
      Alert.alert('Error', `Pickup time must be between ${vehicle.timePickupStart} and ${vehicle.timePickupEnd}.`);
      return;
    }
    if (!validateTime(endTime, vehicle.timeReturnStart, vehicle.timeReturnEnd)) {
      Alert.alert('Error', `Return time must be between ${vehicle.timeReturnStart} and ${vehicle.timeReturnEnd}.`);
      return;
    }

    const isAvailable = await checkAvailability();
    console.log('Vehicle availability:', isAvailable);
    // Changed the condition here - if isAvailable is true, we should proceed
    if (isAvailable) { // Remove the ! operator
      router.push({
        pathname: '/rental-confirmation',
        params: {
          vehicleId: vehicle.id.toString(),
          title: vehicle.title,
          price: vehicle.price.toString(),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          imageFront: vehicle.imageFront,
          owner: ownerInfo?.nickname || 'Unknown',
        },
      });
    } else {
      Alert.alert('Error', 'Vehicle is not available for the selected dates.');
    }
  };

  const handleDeleteVehicle = async () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this vehicle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (vehicle && vehicle.id) {
              try {
                const response = await vehicleAPI.deleteVehicle(vehicle.id.toString());
                if (response.data.message === 'Vehicle deleted successfully') {
                  Alert.alert('Success', 'Vehicle deleted successfully');
                  router.back();
                } else {
                  throw new Error(response.data?.message || 'Failed to delete vehicle');
                }
              } catch (err: any) {
                const errorMessage =
                  err.response?.data?.errorCode === 2114
                    ? 'Failed to delete vehicle.'
                    : err.response?.data?.message || 'Could not delete vehicle';
                Alert.alert('Error', errorMessage);
                console.error('Error deleting vehicle:', err);
              }
            }
          },
        },
      ]
    );
  };

  const handleChooseTime = () => {
    setShowDatePicker(true);
    setSelectingStartDate(true);
    setSelectedDay(null);
    setCurrentMonth(new Date().getMonth());
    setCurrentYear(new Date().getFullYear());
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const totalPrice = vehicle ? (vehicle.price * calculateDays() + 2500) : 0;

  const mockLocation = {
    latitude: 10.7769,
    longitude: 106.7009,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const daysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  };

  const generateTimeOptions = (startTime: string, endTime: string) => {
    const options: string[] = [];
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    let currentHours = start.hours;
    let currentMinutes = start.minutes;

    while (
      currentHours < end.hours ||
      (currentHours === end.hours && currentMinutes <= end.minutes)
    ) {
      options.push(
        `${currentHours.toString().padStart(2, '0')}:${currentMinutes
          .toString()
          .padStart(2, '0')}`
      );
      currentMinutes += 30;
      if (currentMinutes >= 60) {
        currentMinutes = 0;
        currentHours += 1;
      }
    }
    return options;
  };

  const handleDayPress = (day: number) => {
    const time = selectingStartDate ? parseTime(startTime) : parseTime(endTime);
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:00+07:00`;
    const selectedDate = new Date(dateStr);
    if (selectingStartDate) {
      setStartDate(selectedDate);
      setSelectingStartDate(false);
      setSelectedDay(day);
    } else {
      if (selectedDate <= startDate!) {
        Alert.alert('Error', 'End date must be after start date.');
        return;
      }
      setEndDate(selectedDate);
      setSelectedDay(day);
      setShowDatePicker(false);
    }
  };

  const renderCalendar = () => {
    const days = daysInMonth(currentMonth, currentYear);
    const firstDay = firstDayOfMonth(currentMonth, currentYear);
    const weeks: JSX.Element[] = [];
    let dayCounter = 1;
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const totalSlots = Math.ceil((days + firstDay) / 7) * 7;
    let currentWeek: JSX.Element[] = [];

    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(<View key={`empty-${i}`} className="w-10 h-10" />);
    }

    while (dayCounter <= days) {
      const day = dayCounter;
      currentWeek.push(
        <Pressable
          key={day}
          onPress={() => handleDayPress(day)}
          className={`w-10 h-10 justify-center items-center rounded-full ${
            selectedDay === day ? 'bg-[#2563EB]' : ''
          }`}
        >
          <Text className={selectedDay === day ? 'text-white' : 'text-black'}>
            {day}
          </Text>
        </Pressable>
      );

      if (currentWeek.length === 7) {
        weeks.push(
          <View key={`week-${weeks.length}`} className="flex-row justify-between">
            {currentWeek}
          </View>
        );
        currentWeek = [];
      }
      dayCounter++;
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(
          <View key={`empty-end-${dayCounter++}`} className="w-10 h-10" />
        );
      }
      weeks.push(
        <View key={`week-${weeks.length}`} className="flex-row justify-between">
          {currentWeek}
        </View>
      );
    }

    const timeOptions = selectingStartDate
      ? generateTimeOptions(
          vehicle?.timePickupStart || '07:45',
          vehicle?.timePickupEnd || '17:45'
        )
      : generateTimeOptions(
          vehicle?.timeReturnStart || '07:45',
          vehicle?.timeReturnEnd || '17:45'
        );

    return (
      <View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm font-Roboto font-medium">Date:</Text>
          <View className="flex-row items-center">
            <Pressable onPress={handlePrevMonth}>
              <Text className="text-[#2563EB] text-lg">{'<'}</Text>
            </Pressable>
            <Text className="text-base font-Roboto font-medium mx-2">
              {new Date(currentYear, currentMonth).toLocaleString('en-US', {
                month: 'long',
              })}{' '}
              {currentYear}
            </Text>
            <Pressable onPress={handleNextMonth}>
              <Text className="text-[#2563EB] text-lg">{'>'}</Text>
            </Pressable>
          </View>
        </View>
        <View className="flex-row justify-between mb-2">
          {daysOfWeek.map((day, index) => (
            <Text
              key={index}
              className="w-10 text-center text-sm font-Roboto font-bold"
            >
              {day}
            </Text>
          ))}
        </View>
        {weeks}
        <View className="mt-4">
          <Text className="text-sm font-Roboto font-medium mb-1">
            {selectingStartDate ? 'Pickup Time' : 'Return Time'}
          </Text>
          <View className="border border-gray-300 rounded-md">
            <Picker
              selectedValue={selectingStartDate ? startTime : endTime}
              onValueChange={(value) =>
                selectingStartDate ? setStartTime(value) : setEndTime(value)
              }
              style={{ height: 50 }}
            >
              {timeOptions.map((time) => (
                <Picker.Item key={time} label={time} value={time} />
              ))}
            </Picker>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (error || !vehicle) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <Text className="text-red-500 font-Roboto font-medium">
          {error || 'Vehicle not found'}
        </Text>
      </SafeAreaView>
    );
  }

  const vehicleImages = [
    vehicle.imageFront,
    vehicle.imageEnd,
    vehicle.imageRearRight,
    vehicle.imageRearLeft,
    vehicle.imagePic1,
    vehicle.imagePic2,
    vehicle.imagePic3,
    vehicle.imagePic4,
    vehicle.imagePic5,
  ].filter((img): img is string => !!img);

  const showDeleteButton = userId && vehicle.userId.toString() === userId;

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView>
        <View className="flex-row items-center px-4 py-2 bg-white">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-Roboto font-bold ml-2">{vehicle.title}</Text>
          {showDeleteButton && (
            <TouchableOpacity className="ml-auto" onPress={handleDeleteVehicle}>
              <Text className="text-red-500 text-sm font-Roboto font-bold">
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="px-4 mt-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            {vehicleImages.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                className="w-80 h-80 rounded-lg mr-3"
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-xl font-Roboto font-bold">{vehicle.title}</Text>
          <View className="flex-row items-center mt-1">
            <Image
              source={{ uri: ownerInfo?.avatar || images.avatar }}
              className="w-6 h-6 rounded-full mr-2"
              resizeMode="cover"
            />
            <Text className="text-sm text-gray-500 font-Roboto font-medium">
              {ownerInfo?.nickname || 'Unknown'}
            </Text>
          </View>
          <View className="flex-row items-center mt-2">
            <Image source={icons.star} className="w-4 h-4" />
            <Text className="text-xs font-Roboto font-bold text-[#2563EB] ml-1">
              4.5
            </Text>
            <TouchableOpacity className="ml-2" onPress={handleChooseTime}>
              <Text className="text-[#2563EB] text-sm font-Roboto font-medium">
                Choose Time
              </Text>
            </TouchableOpacity>
          </View>
          <Text className="text-lg font-Roboto font-bold text-[#2563EB] mt-2">
            {vehicle.price.toLocaleString()} VND / Day
          </Text>
        </View>

        {vehicle.description && (
          <View className="px-4 mt-4 bg-white rounded-lg p-4">
            <Text className="text-base font-Roboto font-medium">Description</Text>
            <Text className="text-sm text-gray-600 font-Roboto font-medium mt-2">
              {vehicle.description}
            </Text>
          </View>
        )}

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-Roboto font-medium">Characteristics</Text>
          <View className="flex-row flex-wrap justify-between mt-2">
            <View className="w-1/3 flex-column items-center mb-3">
              <Ionicons name="car" size={20} color="#2563EB" />
              <Text className="text-sm text-gray-600 font-Roboto font-medium">
                Brand
              </Text>
              <Text className="text-base font-Roboto font-bold">
                {vehicle.brand}
              </Text>
            </View>
            <View className="w-1/3 flex-column items-center mb-3">
              <Ionicons name="construct" size={20} color="#2563EB" />
              <Text className="text-sm text-gray-600 font-Roboto font-medium">
                Model
              </Text>
              <Text className="text-base font-Roboto font-bold">
                {vehicle.model}
              </Text>
            </View>
            <View className="w-1/3 flex-column items-center mb-3">
              <Ionicons name="calendar" size={20} color="#2563EB" />
              <Text className="text-sm text-gray-600 font-Roboto font-medium">
                Year
              </Text>
              <Text className="text-base font-Roboto font-bold">{vehicle.year}</Text>
            </View>
            <View className="w-1/3 flex-column items-center mb-3">
              <Ionicons name="car-sport" size={20} color="#2563EB" />
              <Text className="text-sm text-gray-600 font-Roboto font-medium">
                Type
              </Text>
              <Text className="text-base font-Roboto font-bold">
                {vehicle.vehicleType}
              </Text>
            </View>
            <View className="w-1/3 flex-column items-center mb-3">
              <Ionicons name="cog" size={20} color="#2563EB" />
              <Text className="text-sm text-gray-600 font-Roboto font-medium">
                Engine
              </Text>
              <Text className="text-base font-Roboto font-bold">
                {vehicle.engine}
              </Text>
            </View>
            <View className="w-1/3 flex-column items-center mb-3">
              <Ionicons name="color-palette" size={20} color="#2563EB" />
              <Text className="text-sm text-gray-600 font-Roboto font-medium">
                Color
              </Text>
              <Text className="text-base font-Roboto font-bold">
                {vehicle.color}
              </Text>
            </View>
            <View className="w-1/3 flex-column items-center mb-3">
              <Ionicons name="speedometer" size={20} color="#2563EB" />
              <Text className="text-sm text-gray-600 font-Roboto font-medium">
                Transmission
              </Text>
              <Text className="text-base font-Roboto font-bold">
                {vehicle.transmission}
              </Text>
            </View>
            <View className="w-1/3 flex-column items-center mb-3">
              <Ionicons name="people" size={20} color="#2563EB" />
              <Text className="text-sm text-gray-600 font-Roboto font-medium">
                Seating
              </Text>
              <Text className="text-base font-Roboto font-bold">
                {vehicle.seatingCapacity}
              </Text>
            </View>
            <View className="w-1/3 flex-column items-center mb-3">
              <Ionicons name="battery-charging" size={20} color="#2563EB" />
              <Text className="text-sm text-gray-600 font-Roboto font-medium">
                Fuel Type
              </Text>
              <Text className="text-base font-Roboto font-bold">
                {vehicle.fuelType}
              </Text>
            </View>
            <View className="w-1/3 flex-column items-center mb-3">
              <Ionicons name="document-text" size={20} color="#2563EB" />
              <Text className="text-sm text-gray-600 font-Roboto font-medium">
                Registration ID
              </Text>
              <Text className="text-base font-Roboto font-bold">
                {vehicle.vehicleRegistrationId}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-Roboto font-medium">Vehicle Features</Text>
          <View className="mt-2 flex-row flex-wrap">
            {vehicle.airConditioning && (
              <View className="w-1/2 flex-row items-center mb-2">
                <Ionicons name="snow" size={20} color="#000" className="mr-2" />
                <Text className="text-sm font-Roboto font-medium">
                  Air Conditioning
                </Text>
              </View>
            )}
            {vehicle.gps && (
              <View className="w-1/2 flex-row items-center mb-2">
                <Ionicons
                  name="navigate"
                  size={20}
                  color="#000"
                  className="mr-2"
                />
                <Text className="text-sm font-Roboto font-medium">
                  GPS Navigation
                </Text>
              </View>
            )}
            {vehicle.bluetooth && (
              <View className="w-1/2 flex-row items-center mb-2">
                <Ionicons
                  name="bluetooth"
                  size={20}
                  color="#000"
                  className="mr-2"
                />
                <Text className="text-sm font-Roboto font-medium">Bluetooth</Text>
              </View>
            )}
            {vehicle.map && (
              <View className="w-1/2 flex-row items-center mb-2">
                <Ionicons name="map" size={20} color="#000" className="mr-2" />
                <Text className="text-sm font-Roboto font-medium">In-car Map</Text>
              </View>
            )}
            {vehicle.dashCamera && (
              <View className="w-1/2 flex-row items-center mb-2">
                <Ionicons
                  name="videocam"
                  size={20}
                  color="#000"
                  className="mr-2"
                />
                <Text className="text-sm font-Roboto font-medium">Dash Camera</Text>
              </View>
            )}
            {vehicle.cameraBack && (
              <View className="w-1/2 flex-row items-center mb-2">
                <Ionicons
                  name="camera-reverse"
                  size={20}
                  color="#000"
                  className="mr-2"
                />
                <Text className="text-sm font-Roboto font-medium">Rear Camera</Text>
              </View>
            )}
            {vehicle.collisionSensors && (
              <View className="w-1/2 flex-row items-center mb-2">
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color="#000"
                  className="mr-2"
                />
                <Text className="text-sm font-Roboto font-medium">
                  Collision Sensors
                </Text>
              </View>
            )}
            {vehicle.ETC && (
              <View className="w-1/2 flex-row items-center mb-2">
                <Ionicons name="card" size={20} color="#000" className="mr-2" />
                <Text className="text-sm font-Roboto font-medium">
                  Electronic Toll Collection
                </Text>
              </View>
            )}
            {vehicle.safetyAirBag && (
              <View className="w-1/2 flex-row items-center mb-2">
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color="#000"
                  className="mr-2"
                />
                <Text className="text-sm font-Roboto font-medium">
                  Safety Airbags
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-Roboto font-medium">Location</Text>
          <Text className="text-sm text-gray-600 font-Roboto font-medium mt-2">
            {`${vehicle.ward}, ${vehicle.district}, ${vehicle.city}`}
          </Text>
          <MapView style={{ width: '100%', height: 200 }} region={mockLocation}>
            <Marker
              coordinate={mockLocation}
              title={vehicle.title}
              description={`${vehicle.address}, ${vehicle.ward}, ${vehicle.district}, ${vehicle.city}`}
            />
          </MapView>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-Roboto font-medium">
            Pickup and Return Times
          </Text>
          <View className="mt-2">
            <Text className="text-sm text-gray-600 font-Roboto font-medium">
              Pickup: {vehicle.timePickupStart} - {vehicle.timePickupEnd}
            </Text>
            <Text className="text-sm text-gray-600 font-Roboto font-medium mt-1">
              Return: {vehicle.timeReturnStart} - {vehicle.timeReturnEnd}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="bg-white p-4 flex-row items-center justify-between border-t border-gray-200">
        <View>
          <Text className="text-sm text-gray-500 font-Roboto font-medium">
            Total Cost
          </Text>
          <Text className="text-lg font-Roboto font-bold text-[#2563EB]">
            {totalPrice.toLocaleString()} VND
          </Text>
          <Text className="text-xs text-gray-500 font-Roboto font-medium">
            Duration: {calculateDays()} days
          </Text>
        </View>
        <TouchableOpacity
          className="bg-primary-500 py-3 px-6 rounded-md"
          onPress={handleBookNow}
        >
          <Text className="text-white font-Roboto font-bold text-base">
            Book Now
          </Text>
        </TouchableOpacity>
      </View>

      <Modal transparent={true} visible={showDatePicker} animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-5 rounded-lg w-11/12">
            <Text className="text-lg font-Roboto font-bold mb-4">
              {selectingStartDate ? 'Select Start Date' : 'Select End Date'}
            </Text>
            {renderCalendar()}
            <View className="flex-row justify-between mt-4">
              <Pressable onPress={() => setShowDatePicker(false)}>
                <Text className="text-[#2563EB] text-base font-Roboto font-medium">
                  CANCEL
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (selectingStartDate) {
                    setSelectingStartDate(false);
                  } else {
                    setShowDatePicker(false);
                  }
                }}
              >
                <Text className="text-[#2563EB] text-base font-Roboto font-medium">
                  OK
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CarDetails;