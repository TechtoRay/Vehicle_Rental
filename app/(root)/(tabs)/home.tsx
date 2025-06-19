import React, { useEffect, useState, useCallback } from 'react';
import {  Text, View, Image, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, TextInput, Modal, ScrollView,} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { icons, images } from '@/constants';
import { MaterialIcons } from '@expo/vector-icons';
import Cards from '@/components/Cards';
import Filters from '@/components/Filters';
import { vehicleAPI, authAPI } from '@/api';
import { UserData, VehicleData } from '@/types/carData';

interface UserPublicInfo {
  nickname: string;
  avatar?: string;
}

interface PaginationData {
  vehicles: VehicleData[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface VehicleConstants {
  vehicleType: string[];
  carBrand: string[];
  motorcycleBrand: string[];
  color: string[];
}

const Home = () => {
  const { filter = 'newest' } = useLocalSearchParams<{ filter?: string }>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [searchTitle, setSearchTitle] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    vehicleType: 'car',
    brand: '',
    model: '',
    color: '',
  });
  const [constants, setConstants] = useState<VehicleConstants>({
    vehicleType: ['car', 'motorcycle'],
    carBrand: [],
    motorcycleBrand: [],
    color: [],
  });
  const [models, setModels] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [userCache, setUserCache] = useState<Record<number, UserPublicInfo>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    vehicles: [],
    total: 0,
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const fetchConstants = useCallback(async () => {
    try {
      const response = await vehicleAPI.getVehicleConstants();
      if (response.status === 200 && response.data?.data) {
        setConstants(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching constants:', err);
    }
  }, []);

  const fetchModels = useCallback(async (vehicleType: string, brand: string) => {
    if (!vehicleType || !brand) {
      setModels([]);
      return;
    }
    try {
      const response = await vehicleAPI.getModelByBrand(vehicleType, brand);
      if (response.status === 200 && response.data?.data) {
        setModels(response.data.data);
      } else {
        setModels([]);
      }
    } catch (err: any) {
      console.error('Error fetching models:', err);
      setModels([]);
      if (err.response?.data?.errorCode === 2001 || err.response?.data?.errorCode === 2002) {
        setError('Invalid vehicle type or brand.');
      }
    }
  }, []);

  const fetchVehicles = useCallback(
    async (page: number = 1, limit: number = 10, isRefresh: boolean = false) => {
      try {
        setLoading(!isRefresh);
        if (isRefresh) setRefreshing(true);
        let response;
        if (filter === 'most_viewed_30_days') {
          response = await vehicleAPI.getMostViewedVehicles30Days({ page, limit });
        } else if (filter === 'most_viewed_all_time') {
          response = await vehicleAPI.getMostViewedVehicles({ page, limit });
        } else if (filter === 'random') {
          response = await vehicleAPI.getRandomApprovedVehicles({ page, limit });
        } else {
          response = await vehicleAPI.getRecentApprovedVehicles({ page, limit });
        }

        if (response.status === 200 && response.data?.data) {
          const { vehicles: rawVehicles, total, currentPage, totalPages, hasNextPage, hasPreviousPage } =
            response.data.data;

          const normalizedVehicles: VehicleData[] = rawVehicles.map((item: any) => ({
            ...item.vehicle,
            last30daysViews: item.last30daysViews || 0,
            totalViews: item.totalViews || 0,
          }));

          setVehicles(normalizedVehicles);
          setPagination({
            vehicles: normalizedVehicles,
            total,
            currentPage,
            totalPages,
            hasNextPage,
            hasPreviousPage,
          });
          setError(null);

          const uniqueUserIds = [...new Set(normalizedVehicles.map((vehicle) => vehicle.userId))];
          const userPromises = uniqueUserIds.map(async (userId) => {
            if (!userCache[userId]) {
              const userResponse = await authAPI.getUserPublicInfo(userId);
              if (userResponse.status === 200 && userResponse.data?.data) {
                setUserCache((prev) => ({
                  ...prev,
                  [userId]: userResponse.data.data,
                }));
              } else {
                setUserCache((prev) => ({
                  ...prev,
                  [userId]: { nickname: 'Unknown' },
                }));
              }
            }
          });
          await Promise.all(userPromises);
        } else {
          throw new Error('Could not load vehicles');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Could not load vehicles';
        console.error('Error fetching vehicles:', err);
        setError(errorMessage);
        if (errorMessage.includes('sign in again')) {
          router.replace('/(auth)/sign-in');
        }
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [filter, userCache]
  );

  const fetchUser = async () => {
    try {
      const response = await authAPI.getUser();
      if (response.status === 200 && response.data?.data) {
        const { id, nickname, avatar, accountLevel } = response.data.data;
        setUserData({
          id: id.toString(),
          nickname: nickname || 'User',
          avatar: avatar || '',
          level: accountLevel || 1,
        });
        setError(null);
      } else {
        throw new Error('User data not found');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errorCode === 1012
          ? 'Token not provided. Please sign in again.'
          : err.response?.data?.errorCode === 1111
          ? 'Failed to get user info.'
          : err.message || 'Could not load user data.';
      console.error('Error fetching user:', err);
      setError(errorMessage);
      if (errorMessage.includes('sign in again')) {
        router.replace('/(auth)/sign-in');
      }
    }
  };

  const onRefresh = useCallback(() => {
    setVehicles([]);
    setUserCache({});
    fetchUser();
    fetchVehicles(1, 10, true);
  }, [fetchVehicles]);

  useEffect(() => {
    fetchUser();
    fetchVehicles();
    fetchConstants();
  }, [fetchVehicles, fetchConstants]);

  useEffect(() => {
    fetchVehicles(1);
  }, [filter, fetchVehicles]);

  useEffect(() => {
    fetchModels(filters.vehicleType, filters.brand);
  }, [filters.vehicleType, filters.brand, fetchModels]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages && !loading) {
      fetchVehicles(page);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleSearch = () => {
    router.push({
      pathname: '/(root)/(screens)/car-listing',
      params: {
        title: searchTitle,
        vehicleType: filters.vehicleType,
        brand: filters.brand,
        model: filters.model,
        color: filters.color,
      },
    });
  };

  const resetFilters = () => {
    setFilters({
      vehicleType: 'car',
      brand: '',
      model: '',
      color: '',
    });
    setModels([]);
  };

  const renderHeader = () => (
    <>
      <View className="flex-row justify-between items-center px-4 py-2 bg-white">
        <View className="flex-row items-center">
          <Image
            source={userData?.avatar ? { uri: userData.avatar } : images.avatar}
            className="size-12 rounded-full"
          />
          <View className="flex flex-col items-start ml-2 justify-center">
            <Text className="text-sm font-Roboto font-medium text-black">{getGreeting()}</Text>
            <Text className="font-Roboto font-medium">{userData?.nickname || 'User'}</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity className="bg-gray-200 rounded-full p-2">
            <Image source={icons.bell} className="size-6" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="mx-4 mt-4 bg-white rounded-lg shadow-sm overflow-hidden p-4">
        <View className="flex-row items-center mb-4">
          <TextInput
            className="flex-1 border border-gray-300 rounded-md p-2 mr-2 text-sm font-Roboto font-medium text-black"
            value={searchTitle}
            onChangeText={setSearchTitle}
            placeholder="Search"
          />
          <TouchableOpacity onPress={() => setShowFilterModal(true)}>
            <MaterialIcons name="filter-list" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          className="bg-[#2563EB] py-3 rounded-md items-center"
          onPress={handleSearch}
        >
          <Text className="text-white font-Roboto font-medium text-base">Search</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-Roboto font-medium">Discovers</Text>
        </View>
        <Filters />
      </View>
    </>
  );

  const renderFooter = () => (
    <View className="py-4 px-4 flex-row items-center justify-between">
      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <>
          <TouchableOpacity
            className={`py-3 px-6 rounded-md ${pagination.hasPreviousPage ? 'bg-[#2563EB]' : 'bg-gray-300'}`}
            onPress={() => goToPage(pagination.currentPage - 1)}
          >
            <Text
              className={`text-base font-Roboto font-medium ${
                pagination.hasPreviousPage ? 'text-white' : 'text-gray-500'
              }`}
            >
              Previous
            </Text>
          </TouchableOpacity>
          <Text className="text-base font-Roboto font-medium text-black">
            Page {pagination.currentPage} of {pagination.totalPages}
          </Text>
          <TouchableOpacity
            className={`py-3 px-6 rounded-md ${pagination.hasNextPage ? 'bg-[#2563EB]' : 'bg-gray-300'}`}
            onPress={() => goToPage(pagination.currentPage + 1)}
          >
            <Text
              className={`text-base font-Roboto font-medium ${
                pagination.hasNextPage ? 'text-white' : 'text-gray-500'
              }`}
            >
              Next
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-100">
      <FlatList
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        data={vehicles}
        renderItem={({ item }) => (
          <Cards
            vehicle={item}
            user={{
              id: item.userId.toString(),
              nickname: userCache[item.userId]?.nickname || 'Unknown User',
              avatar: userCache[item.userId]?.avatar || '',
              level: 1,
            }}
            views={filter === 'most_viewed_30_days' ? item.last30daysViews : item.totalViews}
            onPress={() =>
              router.push({
                pathname: '/car-details',
                params: { id: item.id },
              })
            }
          />
        )}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        numColumns={2}
        columnWrapperClassName="flex gap-3 px-5"
        contentContainerClassName="pb-32"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        ListEmptyComponent={
          loading && pagination.currentPage === 1 ? (
            <ActivityIndicator size="large" color="#2563EB" />
          ) : (
            <Text className="text-center text-gray-500 font-Roboto font-medium mt-4">
              {error || 'No vehicles available'}
            </Text>
          )
        }
      />
      <Modal visible={showFilterModal} animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <MaterialIcons name="close" size={24} color="black" />
            </TouchableOpacity>
            <Text className="text-lg font-Roboto font-medium">Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text className="text-[#2563EB] font-Roboto font-medium">Reset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="p-4">
            <View className="mb-4">
              <Text className="text-sm font-Roboto font-medium text-gray-500 mb-1">Vehicle Type</Text>
              <View className="border border-gray-300 rounded-md">
                <Picker
                  selectedValue={filters.vehicleType}
                  onValueChange={(value) => setFilters({ ...filters, vehicleType: value, brand: '', model: '' })}
                  style={{ height: 50 }}
                >
                  {constants.vehicleType.map((type) => (
                    <Picker.Item
                      key={type}
                      label={type.charAt(0).toUpperCase() + type.slice(1)}
                      value={type}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-sm font-Roboto font-medium text-gray-500 mb-1">Brand</Text>
              <View className="border border-gray-300 rounded-md">
                <Picker
                  selectedValue={filters.brand}
                  onValueChange={(value) => setFilters({ ...filters, brand: value, model: '' })}
                  style={{ height: 50 }}
                  enabled={filters.vehicleType !== ''}
                >
                  <Picker.Item label="Select a brand" value="" />
                  {(filters.vehicleType === 'car' ? constants.carBrand : constants.motorcycleBrand).map((brand) => (
                    <Picker.Item key={brand} label={brand} value={brand} />
                  ))}
                </Picker>
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-sm font-Roboto font-medium text-gray-500 mb-1">Model</Text>
              <View className="border border-gray-300 rounded-md">
                <Picker
                  selectedValue={filters.model}
                  onValueChange={(value) => setFilters({ ...filters, model: value })}
                  style={{ height: 50 }}
                  enabled={filters.brand !== ''}
                >
                  <Picker.Item label="Select a model" value="" />
                  {models.map((model) => (
                    <Picker.Item key={model} label={model} value={model} />
                  ))}
                </Picker>
              </View>
            </View>
            <View className="mb-4">
              <Text className="text-sm font-Roboto font-medium text-gray-500 mb-1">Color</Text>
              <View className="border border-gray-300 rounded-md">
                <Picker
                  selectedValue={filters.color}
                  onValueChange={(value) => setFilters({ ...filters, color: value })}
                  style={{ height: 50 }}
                >
                  <Picker.Item label="Select a color" value="" />
                  {constants.color.map((color) => (
                    <Picker.Item key={color} label={color} value={color} />
                  ))}
                </Picker>
              </View>
            </View>
            <TouchableOpacity
              className="bg-[#2563EB] py-3 rounded-md items-center mt-4"
              onPress={() => setShowFilterModal(false)}
            >
              <Text className="text-white font-Roboto font-medium text-base">Apply</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default Home;