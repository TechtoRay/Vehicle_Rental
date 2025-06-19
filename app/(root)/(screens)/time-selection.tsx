import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TimeSelection = () => {
  const [currentMonth, setCurrentMonth] = useState(4); // 4 = May (0-based index)
  const [currentYear, setCurrentYear] = useState(2025);
  const [pickUpDate, setPickUpDate] = useState<Date | null>(new Date(2025, 4, 6));
  const [dropOffDate, setDropOffDate] = useState<Date | null>(new Date(2025, 4, 17));
  const [pickUpTime, setPickUpTime] = useState('09:00');
  const [dropOffTime, setDropOffTime] = useState('20:00');
  const [showPickUpModal, setShowPickUpModal] = useState(false);
  const [showDropOffModal, setShowDropOffModal] = useState(false);

  const pickUpTimeOptions = ['08:30', '09:00', '09:30'];
  const dropOffTimeOptions = ['19:30', '20:00', '20:30'];

  const months = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust for T2 (Monday) start
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: adjustedFirstDay }, (_, i) => i);

  const onDayPress = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    if (!pickUpDate || (pickUpDate && dropOffDate)) {
      setPickUpDate(selectedDate);
      setDropOffDate(null);
    } else if (pickUpDate && !dropOffDate && selectedDate > pickUpDate) {
      setDropOffDate(selectedDate);
    }
  };

  const isDateInRange = (day: number) => {
    if (!pickUpDate || !dropOffDate) return false;
    const currentDate = new Date(currentYear, currentMonth, day);
    return currentDate > pickUpDate && currentDate < dropOffDate;
  };

  const isSelectedDate = (day: number, type: 'pickUp' | 'dropOff') => {
    const dateToCompare = type === 'pickUp' ? pickUpDate : dropOffDate;
    if (!dateToCompare) return false;
    return (
      dateToCompare.getDate() === day &&
      dateToCompare.getMonth() === currentMonth &&
      dateToCompare.getFullYear() === currentYear
    );
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNext = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-4 py-2 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-bold ml-2">Thời gian</Text>
        </View>

        {/* Custom Calendar */}
        <View className="p-4">
          <View className="flex-row justify-between items-center mb-2">
            <TouchableOpacity onPress={handlePreviousMonth}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-lg font-bold">{months[currentMonth]}</Text>
            <TouchableOpacity onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <View className="flex-row justify-around mt-2">
            <Text>T2</Text>
            <Text>T3</Text>
            <Text>T4</Text>
            <Text>T5</Text>
            <Text>T6</Text>
            <Text>T7</Text>
            <Text>CN</Text>
          </View>
          <View className="flex-row flex-wrap justify-around mt-2">
            {emptyDays.map((_, index) => (
              <View key={`empty-${index}`} className="w-10 h-10" />
            ))}
            {daysArray.map((day) => {
              const isPickUp = isSelectedDate(day, 'pickUp');
              const isDropOff = isSelectedDate(day, 'dropOff');
              const inRange = isDateInRange(day);
              return (
                <TouchableOpacity
                  key={day}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isPickUp || isDropOff ? 'bg-green-200' : inRange ? 'bg-cyan-100' : ''
                  }`}
                  onPress={() => onDayPress(day)}
                >
                  <Text>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time Selection */}
        <View className="px-4 mt-4 flex-row justify-between">
          <TouchableOpacity
            className="border border-gray-300 p-2 rounded-lg w-1/2 mr-2"
            onPress={() => setShowPickUpModal(true)}
          >
            <Text className="text-gray-500">Nhận xe</Text>
            <Text className="text-lg font-bold">{pickUpTime}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="border border-gray-300 p-2 rounded-lg w-1/2 ml-2"
            onPress={() => setShowDropOffModal(true)}
          >
            <Text className="text-gray-500">Trả xe</Text>
            <Text className="text-lg font-bold">{dropOffTime}</Text>
          </TouchableOpacity>
        </View>

        {/* Time Details */}
        <View className="px-4 mt-4">
          <Text>Thời gian nhận xe</Text>
          <Text className="text-gray-500">06:00 - 09:00</Text>
          <Text>Thời gian trả xe</Text>
          <Text className="text-gray-500">18:00 - 22:00</Text>
        </View>

        {/* Modals for Time Selection */}
        <Modal
          visible={showPickUpModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPickUpModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white p-4 rounded-lg w-3/4">
              {pickUpTimeOptions.map((time) => (
                <TouchableOpacity
                  key={time}
                  className="p-2 border-b border-gray-200"
                  onPress={() => {
                    setPickUpTime(time);
                    setShowPickUpModal(false);
                  }}
                >
                  <Text className="text-center text-lg">{time}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                className="mt-4"
                onPress={() => setShowPickUpModal(false)}
              >
                <Text className="text-center text-red-500">Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showDropOffModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDropOffModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white p-4 rounded-lg w-3/4">
              {dropOffTimeOptions.map((time) => (
                <TouchableOpacity
                  key={time}
                  className="p-2 border-b border-gray-200"
                  onPress={() => {
                    setDropOffTime(time);
                    setShowDropOffModal(false);
                  }}
                >
                  <Text className="text-center text-lg">{time}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                className="mt-4"
                onPress={() => setShowDropOffModal(false)}
              >
                <Text className="text-center text-red-500">Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Summary and Next Button */}
      <View className="p-4 bg-white border-t border-gray-200">
        <Text className="text-center">
          {pickUpTime}, {formatDate(pickUpDate)} - {dropOffTime}, {formatDate(dropOffDate)}
        </Text>
        <Text className="text-center text-gray-500">
          Số ngày thuê: {pickUpDate && dropOffDate ? Math.ceil((dropOffDate.getTime() - pickUpDate.getTime()) / (1000 * 60 * 60 * 24)) : 0} ngày
        </Text>
        <TouchableOpacity
          className="bg-green-500 p-3 rounded-lg flex items-center mt-2"
          onPress={handleNext}
        >
          <Text className="text-white font-bold text-lg">Tiếp theo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default TimeSelection;