import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { vehicleAPI, authAPI } from '@/api';
import InputField from '@/components/InputField';
import { VehicleData } from '@/types/carData';

const VehicleRegistration = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<VehicleData>({
    title: '',
    brand: '',
    model: '',
    year: 0,
    vehicleType: 'car',
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
    vehicleRegistrationId: '',
    city: '',
    district: '',
    ward: '',
    address: '',
    timePickupStart: '',
    timePickupEnd: '',
    timeReturnStart: '',
    timeReturnEnd: '',
    imageFront: '',
    imageEnd: '',
    imageRearRight: '',
    imageRearLeft: '',
    vehicleRegistrationFront: '',
    vehicleRegistrationBack: '',
    imagePic1: '',
    imagePic2: '',
    imagePic3: '',
    imagePic4: '',
    imagePic5: '',
  });
  const [fileNames, setFileNames] = useState({
    imageFront: '',
    imageEnd: '',
    imageRearRight: '',
    imageRearLeft: '',
    vehicleRegistrationFront: '',
    vehicleRegistrationBack: '',
    imagePic1: '',
    imagePic2: '',
    imagePic3: '',
    imagePic4: '',
    imagePic5: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedTransmission, setSelectedTransmission] = useState<string | null>(null);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need media library permissions to make this work!');
      }
    };
    requestPermissions();
  }, []);

  const pickImage = async (field: keyof typeof fileNames) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const fileName = uri.split('/').pop() || `image_${field}.jpg`;
      setFileNames(prev => ({ ...prev, [field]: fileName }));
      setFormData(prev => ({ ...prev, [field]: uri }));
    }
  };

  const handleSubmit = async () => {
    const requiredFields = [
      formData.title,
      formData.brand,
      formData.model,
      formData.year.toString(),
      formData.vehicleType,
      formData.engine,
      formData.transmission,
      formData.fuelType,
      formData.color,
      formData.seatingCapacity.toString(),
      formData.vehicleRegistrationId,
      formData.city,
      formData.district,
      formData.ward,
      formData.address,
      formData.timePickupStart,
      formData.timePickupEnd,
      formData.timeReturnStart,
      formData.timeReturnEnd,
      formData.imageFront,
      formData.imageEnd,
      formData.imageRearRight,
      formData.imageRearLeft,
      formData.vehicleRegistrationFront,
      formData.vehicleRegistrationBack,
    ];

    if (requiredFields.some(field => !field)) {
      Alert.alert('Error', 'Please fill out all required fields.');
      return;
    }

    // Validate time format (HH:MM:SS) and ensure 2-hour gap between start and end times
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
      const apiFormData = new FormData();
      apiFormData.append('title', formData.title);
      apiFormData.append('brand', formData.brand);
      apiFormData.append('model', formData.model);
      apiFormData.append('year', formData.year.toString());
      apiFormData.append('vehicleType', formData.vehicleType);
      apiFormData.append('description', formData.description || '');
      apiFormData.append('engine', formData.engine);
      apiFormData.append('transmission', formData.transmission);
      apiFormData.append('fuelType', formData.fuelType);
      apiFormData.append('color', formData.color);
      apiFormData.append('seatingCapacity', formData.seatingCapacity.toString());
      apiFormData.append('airConditioning', formData.airConditioning.toString());
      apiFormData.append('gps', formData.gps.toString());
      apiFormData.append('bluetooth', formData.bluetooth.toString());
      apiFormData.append('map', formData.map.toString());
      apiFormData.append('dashCamera', formData.dashCamera.toString());
      apiFormData.append('cameraBack', formData.cameraBack.toString());
      apiFormData.append('collisionSensors', formData.collisionSensors.toString());
      apiFormData.append('ETC', formData.ETC.toString());
      apiFormData.append('safetyAirBag', formData.safetyAirBag.toString());
      apiFormData.append('price', formData.price.toString());
      apiFormData.append('vehicleRegistrationId', formData.vehicleRegistrationId);
      apiFormData.append('city', formData.city);
      apiFormData.append('district', formData.district);
      apiFormData.append('ward', formData.ward);
      apiFormData.append('address', formData.address);
      apiFormData.append('timePickupStart', formData.timePickupStart);
      apiFormData.append('timePickupEnd', formData.timePickupEnd);
      apiFormData.append('timeReturnStart', formData.timeReturnStart);
      apiFormData.append('timeReturnEnd', formData.timeReturnEnd);

      const imageFields: (keyof typeof formData)[] = [
        'imageFront',
        'imageEnd',
        'imageRearRight',
        'imageRearLeft',
        'vehicleRegistrationFront',
        'vehicleRegistrationBack',
        'imagePic1',
        'imagePic2',
        'imagePic3',
        'imagePic4',
        'imagePic5',
      ];

      for (const field of imageFields) {
        if (formData[field]) {
          const fileUri = formData[field];
          const fileName = fileNames[field as keyof typeof fileNames] || `${field}.jpg`;
          const fileType = 'image/jpeg';
          const formattedUri = Platform.OS === 'android' && !fileUri.startsWith('file://') ? `file://${fileUri}` : fileUri;
          apiFormData.append(field, {
            uri: formattedUri,
            name: fileName,
            type: fileType,
          } as any);
        }
      }

      const response = await vehicleAPI.uploadNewVehicle(apiFormData);
      if (response.data.message === 'Request to upload new vehicle successfully.') {
        Alert.alert('Success', 'Vehicle registration request submitted successfully.');
        router.push('/profile');
      } else {
        throw new Error('Failed to store vehicle: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err: any) {
      let errorMessage = 'Could not register vehicle';
      const code = err.response?.data?.errorCode;
      if (code) {
        errorMessage = err.response?.data?.message || errorMessage;
      } else {
        errorMessage = err.response?.data?.message || errorMessage;
      }
      Alert.alert('Error', errorMessage);
      console.error('Error storing vehicle:', err);
      if (err.response) {
        console.error('Server response:', err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView className="flex-1 mt-7">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2 bg-white">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-bold">Add Vehicle</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Warning */}
        <View className="px-4 py-2 bg-red-100 mt-2">
          <Text className="text-sm text-red-600">
            All required fields must be filled. You cannot change this information after registration.
          </Text>
        </View>

        {/* Basic Info Form */}
        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-bold mb-2">Basic Information</Text>
          <InputField
            label="Title"
            placeholder="Enter vehicle title"
            value={formData.title}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, title: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Brand"
            placeholder="Enter vehicle brand"
            value={formData.brand}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, brand: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Model"
            placeholder="Enter vehicle model"
            value={formData.model}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, model: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Year"
            placeholder="Enter manufacturing year"
            value={formData.year.toString()}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, year: parseInt(text) || 0 }))}
            containerStyle="mb-4"
            keyboardType="numeric"
            isRequired
          />
          <InputField
            label="Vehicle Color"
            placeholder="Enter vehicle color"
            value={formData.color}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, color: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Vehicle Engine"
            placeholder="Enter vehicle engine"
            value={formData.engine}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, engine: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Number of Seats"
            placeholder="Enter number of seats"
            value={formData.seatingCapacity.toString()}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, seatingCapacity: parseInt(text) || 0 }))}
            containerStyle="mb-4"
            keyboardType="numeric"
            isRequired
          />
          <Text className="text font-Roboto font-medium mb-1">Transmission *</Text>
          <View className="flex-row mb-4">
            <TouchableOpacity
              className={`border border-gray-300 rounded-md p-2 mr-2 ${selectedTransmission === 'Automatic' ? 'bg-primary-500 text-white' : ''}`}
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
              className={`border border-gray-300 rounded-md p-2 ${selectedTransmission === 'Manual' ? 'bg-primary-500 text-white' : ''}`}
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
          {/* TODO Input fields for fuel type change into 3 option: Petrol, Diesel, Electric */}
          <InputField
            label="Fuel Type"
            placeholder="Enter fuel type"
            value={formData.fuelType}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, fuelType: text }))}
            containerStyle="mb-4"
            isRequired
          />
          {/* TODO price automatically have comma for each 000*/}
          <InputField
            label="Price"
            placeholder="Enter price per day"
            value={formData.price.toString()}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, price: parseFloat(text) || 0 }))}
            containerStyle="mb-4"
            keyboardType="numeric"
            isRequired
          />
          <InputField
            label="Vehicle Plate ID"
            placeholder="Enter vehicle plate ID"
            value={formData.vehicleRegistrationId}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, vehicleRegistrationId: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Description"
            placeholder="Enter vehicle description (optional)"
            value={formData.description}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, description: text }))}
            containerStyle="mb-4"
            multiline
          />
        </View>

        {/* Features */}
        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-Roboto mb-2">Features</Text>
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
                className={`border border-gray-300 rounded-md p-2 mr-2 ${formData[key as keyof VehicleData] ? 'bg-primary-500' : ''}`}
                onPress={() => setFormData(prev => ({ ...prev, [key]: !prev[key as keyof VehicleData] }))}
              >
                <Text className={formData[key as keyof VehicleData] ? 'text-white' : 'text-black'}>
                  {label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Location Info */}
        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-bold mb-2">Vehicle Location Information</Text>
          {/* TODO Input fields for location information to choose */}
          <InputField
            label="City"
            placeholder="Enter city"
            value={formData.city}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, city: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="District"
            placeholder="Enter district"
            value={formData.district}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, district: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Ward"
            placeholder="Enter ward"
            value={formData.ward}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, ward: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Address"
            placeholder="Enter street address"
            value={formData.address}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, address: text }))}
            containerStyle="mb-4"
            isRequired
          />
        </View>

        {/* Time Info */}
        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-base font-bold mb-2">Pickup and Return Times</Text>
          <InputField
            label="Pickup Start Time (HH:MM:SS)"
            placeholder="e.g., 08:00:00"
            value={formData.timePickupStart}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, timePickupStart: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Pickup End Time (HH:MM:SS)"
            placeholder="e.g., 10:00:00"
            value={formData.timePickupEnd}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, timePickupEnd: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Return Start Time (HH:MM:SS)"
            placeholder="e.g., 08:00:00"
            value={formData.timeReturnStart}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, timeReturnStart: text }))}
            containerStyle="mb-4"
            isRequired
          />
          <InputField
            label="Return End Time (HH:MM:SS)"
            placeholder="e.g., 10:00:00"
            value={formData.timeReturnEnd}
            onChangeText={(text: string) => setFormData(prev => ({ ...prev, timeReturnEnd: text }))}
            containerStyle="mb-4"
            isRequired
          />
        </View>

        {/* Image Upload */}
        <View className="px-4 mt-4 bg-white rounded-lg p-4">
          <Text className="text-lg font-Roboto mb-2">Images</Text>
          {[
            { field: 'imageFront', label: 'Front Image', required: true },
            { field: 'imageEnd', label: 'Rear Image', required: true },
            { field: 'imageRearRight', label: 'Right Side Image', required: true },
            { field: 'imageRearLeft', label: 'Left Side Image', required: true },
            { field: 'vehicleRegistrationFront', label: 'Registration Front', required: true },
            { field: 'vehicleRegistrationBack', label: 'Registration Back', required: true },
            { field: 'imagePic1', label: 'Additional Image 1', required: false },
            { field: 'imagePic2', label: 'Additional Image 2', required: false },
            { field: 'imagePic3', label: 'Additional Image 3', required: false },
            { field: 'imagePic4', label: 'Additional Image 4', required: false },
            { field: 'imagePic5', label: 'Additional Image 5', required: false },
          ].map(({ field, label, required }) => (
            <View key={field} className="mb-2">
              <View className="flex-row items-center">
                <Text className="text-sm font-JakartaSemiBold mb-1">{label}</Text>
                {required && <Text className="text-red-500 text-sm ml-1">*</Text>}
              </View>
              <TouchableOpacity
                className="flex-row my-2 h-16 justify-start items-center relative bg-neutral-100 rounded-lg border border-general-100 focus:border-primary-500"
                onPress={() => pickImage(field as keyof typeof fileNames)}
              >
                <Text className="text-sm font-Roboto font-medium ml-4">{fileNames[field as keyof typeof fileNames] || `Select ${label}`}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View className="px-4 py-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          className="bg-primary-500 py-3 rounded-full"
          onPress={handleSubmit}
          disabled={loading}
        >
          {/* TODO add loading indicator */}
          <Text className="text-white text-center font-bold text-base">
            {loading ? 'Submitting...' : 'Submit Vehicle Registration'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default VehicleRegistration;