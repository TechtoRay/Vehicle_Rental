import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { vehicleAPI } from '@/api';
import InputField from '@/components/InputField';

interface VehicleData {
  vehicleId: number;
  title: string;
  description?: string;
  engine: string;
  transmission: string;
  fuelType: string;
  color: string;
  seatingCapacity: number;
  airConditioning: boolean;
  gps: boolean;
  bluetooth: boolean;
  map: boolean;
  dashCamera: boolean;
  cameraBack: boolean;
  collisionSensors: boolean;
  ETC: boolean;
  safetyAirBag: boolean;
  price: number;
  city: string;
  district: string;
  ward: string;
  address: string;
  timePickupStart: string;
  timePickupEnd: string;
  timeReturnStart: string;
  timeReturnEnd: string;
}

const EditVehicle = () => {
  const { vehicleId } = useLocalSearchParams();
  const [formData, setFormData] = useState<VehicleData>({
    vehicleId: vehicleId ? parseInt(vehicleId as string) : 0,
    title: '',
    description: '',
    engine: '',
    transmission: '',
    fuelType: '',
    color: '',
    seatingCapacity: 0,
    airConditioning: false,
    gps: false,
    bluetooth: false,
    map: false,
    dashCamera: false,
    cameraBack: false,
    collisionSensors: false,
    ETC: false,
    safetyAirBag: false,
    price: 0,
    city: '',
    district: '',
    ward: '',
    address: '',
    timePickupStart: '',
    timePickupEnd: '',
    timeReturnStart: '',
    timeReturnEnd: '',
  });
  const [selectedTransmission, setSelectedTransmission] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicleData = async () => {
      if (!vehicleId) {
        setError('Vehicle ID is missing');
        setLoading(false);
        return;
      }

      try {
        const response = await vehicleAPI.getVehicleById(parseInt(vehicleId as string));
        if (response.data.status === 200) {
          const vehicle = response.data.data;
          setFormData({
            vehicleId: vehicle.id,
            title: vehicle.title || '',
            description: vehicle.description || '',
            engine: vehicle.engine || '',
            transmission: vehicle.transmission || '',
            fuelType: vehicle.fuelType || '',
            color: vehicle.color || '',
            seatingCapacity: vehicle.seatingCapacity || 0,
            airConditioning: vehicle.airConditioning || false,
            gps: vehicle.gps || false,
            bluetooth: vehicle.bluetooth || false,
            map: vehicle.map || false,
            dashCamera: vehicle.dashCamera || false,
            cameraBack: vehicle.cameraBack || false,
            collisionSensors: vehicle.collisionSensors || false,
            ETC: vehicle.ETC || false,
            safetyAirBag: vehicle.safetyAirBag || false,
            price: vehicle.price || 0,
            city: vehicle.city || '',
            district: vehicle.district || '',
            ward: vehicle.ward || '',
            address: vehicle.address || '',
            timePickupStart: vehicle.timePickupStart || '',
            timePickupEnd: vehicle.timePickupEnd || '',
            timeReturnStart: vehicle.timeReturnStart || '',
            timeReturnEnd: vehicle.timeReturnEnd || '',
          });
          setSelectedTransmission(vehicle.transmission || null);
        } else {
          throw new Error('Failed to fetch vehicle data');
        }
      } catch (err: any) {
        setError(err.message || 'Could not load vehicle data');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleData();
  }, [vehicleId]);

  const handleSubmit = async () => {
    const timeFormat = /^\d{2}:\d{2}:\d{2}$/;
    const times = [formData.timePickupStart, formData.timePickupEnd, formData.timeReturnStart, formData.timeReturnEnd];
    if (!times.every(time => timeFormat.test(time))) {
      Alert.alert('Error', 'All time fields must be in HH:MM:SS format.');
      return;
    }

    const toSeconds = (time: string) => {
      const [h, m, s] = time.split(':').map(Number);
      return h * 3600 + m * 60 + s;
    };

    const pickupStartSec = toSeconds(formData.timePickupStart);
    const pickupEndSec = toSeconds(formData.timePickupEnd);
    const returnStartSec = toSeconds(formData.timeReturnStart);
    const returnEndSec = toSeconds(formData.timeReturnEnd);

    if (pickupEndSec - pickupStartSec < 2 * 3600 || returnEndSec - returnStartSec < 2 * 3600) {
      Alert.alert('Error', 'Pickup and return time ranges must be at least 2 hours apart.');
      return;
    }

    setLoading(true);
    try {
      const response = await vehicleAPI.updateVehicle(formData.vehicleId.toString(), {
        vehicleId: formData.vehicleId,
        title: formData.title,
        description: formData.description,
        engine: formData.engine,
        transmission: formData.transmission,
        fuelType: formData.fuelType,
        color: formData.color,
        seatingCapacity: formData.seatingCapacity,
        airConditioning: formData.airConditioning,
        gps: formData.gps,
        bluetooth: formData.bluetooth,
        map: formData.map,
        dashCamera: formData.dashCamera,
        cameraBack: formData.cameraBack,
        collisionSensors: formData.collisionSensors,
        ETC: formData.ETC,
        safetyAirBag: formData.safetyAirBag,
        price: formData.price,
        city: formData.city,
        district: formData.district,
        ward: formData.ward,
        address: formData.address,
        timePickupStart: formData.timePickupStart,
        timePickupEnd: formData.timePickupEnd,
        timeReturnStart: formData.timeReturnStart,
        timeReturnEnd: formData.timeReturnEnd,
      });
      if (response.data.status === 200) {
        Alert.alert('Success', 'Vehicle information updated successfully.');
        router.back();
      } else {
        throw new Error(response.data.message || 'Failed to update vehicle');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 2002
          ? 'Vehicle not found.'
          : err.response?.data?.errorCode === 2005
          ? 'You are not the owner of the vehicle.'
          : err.response?.data?.errorCode === 2004
          ? 'Vehicle is not approved.'
          : err.response?.data?.errorCode === 2106
          ? 'Failed to update vehicle.'
          : err.message || 'Could not update vehicle';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
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
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="flex-row items-center justify-between px-4 py-2 bg-white">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-bold">Edit Vehicle</Text>
          <View className="w-6" />
        </View>

        <View className="px-4 py-2 bg-yellow-100 mt-2">
          <Text className="text-sm text-gray-600">
            Only the fields below can be changed. Images and vehicle registration cannot be updated.
          </Text>
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-bold mb-2">Basic Information</Text>
          <InputField
            label="Title"
            placeholder="Enter vehicle title"
            value={formData.title}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, title: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Description"
            placeholder="Enter vehicle description (optional)"
            value={formData.description}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, description: text }))}
            containerStyle="mb-4"
            multiline
          />
          <InputField
            label="Engine"
            placeholder="Enter vehicle engine"
            value={formData.engine}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, engine: text }))}
            containerStyle="mb-4"
          />
          <Text className="text-sm mb-1">Transmission</Text>
          <View className="flex-row mb-4">
            <TouchableOpacity
              className={`border border-gray-300 rounded-md p-2 mr-2 ${selectedTransmission === 'Automatic' ? 'bg-green-500 text-white' : ''}`}
              onPress={() => {
                setSelectedTransmission('Automatic');
                setFormData(prev => ({ ...prev, transmission: 'Automatic' }));
              }}
            >
              <Text className={selectedTransmission === 'Automatic' ? 'text-white' : 'text-black'}>
                Automatic
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`border border-gray-300 rounded-md p-2 ${selectedTransmission === 'Manual' ? 'bg-green-500 text-white' : ''}`}
              onPress={() => {
                setSelectedTransmission('Manual');
                setFormData(prev => ({ ...prev, transmission: 'Manual' }));
              }}
            >
              <Text className={selectedTransmission === 'Manual' ? 'text-white' : 'text-black'}>
                Manual
              </Text>
            </TouchableOpacity>
          </View>
          <InputField
            label="Fuel Type"
            placeholder="Enter fuel type"
            value={formData.fuelType}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, fuelType: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Color"
            placeholder="Enter vehicle color"
            value={formData.color}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, color: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Number of Seats"
            placeholder="Enter number of seats"
            value={formData.seatingCapacity.toString()}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, seatingCapacity: parseInt(text) || 0 }))}
            containerStyle="mb-4"
            keyboardType="numeric"
          />
          <InputField
            label="Price"
            placeholder="Enter price per day"
            value={formData.price.toString()}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, price: parseFloat(text) || 0 }))}
            containerStyle="mb-4"
            keyboardType="numeric"
          />
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-bold mb-2">Features</Text>
          {[
            { label: 'Air Conditioning', key: 'airConditioning' },
            { label: 'GPS', key: 'gps' },
            { label: 'Bluetooth', key: 'bluetooth' },
            { label: 'In-car Map', key: 'map' },
            { label: 'Dash Camera', key: 'dashCamera' },
            { label: 'Rear Camera', key: 'cameraBack' },
            { label: 'Collision Sensors', key: 'collisionSensors' },
            { label: 'Electronic Toll Collection', key: 'ETC' },
            { label: 'Safety Airbags', key: 'safetyAirBag' },
          ].map(({ label, key }) => (
            <View key={key} className="flex-row items-center mb-2">
              <TouchableOpacity
                className={`border border-gray-300 rounded-md p-2 mr-2 ${formData[key as keyof VehicleData] ? 'bg-green-500' : ''}`}
                onPress={() => setFormData(prev => ({ ...prev, [key]: !prev[key as keyof VehicleData] }))}
              >
                <Text className={formData[key as keyof VehicleData] ? 'text-white' : 'text-black'}>
                  {label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-bold mb-2">Location Information</Text>
          <InputField
            label="City"
            placeholder="Enter city"
            value={formData.city}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, city: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="District"
            placeholder="Enter district"
            value={formData.district}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, district: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Ward"
            placeholder="Enter ward"
            value={formData.ward}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, ward: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Address"
            placeholder="Enter street address"
            value={formData.address}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, address: text }))}
            containerStyle="mb-4"
          />
        </View>

        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-bold mb-2">Pickup and Return Times</Text>
          <InputField
            label="Pickup Start Time (HH:MM:SS)"
            placeholder="e.g., 08:00:00"
            value={formData.timePickupStart}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, timePickupStart: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Pickup End Time (HH:MM:SS)"
            placeholder="e.g., 10:00:00"
            value={formData.timePickupEnd}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, timePickupEnd: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Return Start Time (HH:MM:SS)"
            placeholder="e.g., 08:00:00"
            value={formData.timeReturnStart}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, timeReturnStart: text }))}
            containerStyle="mb-4"
          />
          <InputField
            label="Return End Time (HH:MM:SS)"
            placeholder="e.g., 10:00:00"
            value={formData.timeReturnEnd}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, timeReturnEnd: text }))}
            containerStyle="mb-4"
          />
        </View>

        <View className="px-4 py-4 bg-white border-t border-gray-200">
          <TouchableOpacity
            className="bg-blue-500 py-3 rounded-full"
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="text-white text-center font-bold text-base">
              {loading ? 'Submitting...' : 'Update Vehicle'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditVehicle;