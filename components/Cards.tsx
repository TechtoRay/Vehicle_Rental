import { icons, images } from "@/constants"
import { UserData, VehicleData } from "@/types/carData"
import { Ionicons } from "@expo/vector-icons"
import { View, Text, TouchableOpacity, Image } from "react-native"


interface Props {
  onPress?: () => void
  vehicle: VehicleData
  user: UserData
  views?: number
}
const Cards = ({ onPress, vehicle, user}: Props) => {
  return (
    <TouchableOpacity onPress={onPress} className="flex-1 w-full mt-4 px-3 py-4 rounded-lg bg-white shadow-lg">
      <View className="flex flex-row items-center absolute px-2 top-5 right-5 bg-white/90 p-1 rounded-full z-50">
        <Image source={icons.star} className="w-4 h-4" />
        <Text className="text-xs font-Roboto font-medium text-primary-500 ml-0.5">4.5</Text>
      </View>

      <Image source={{ uri: vehicle.imageFront }} className="w-full h-40 rounded-lg" resizeMode="cover" />

      <View className="flex flex-col mt-2">
        <Text className="font-Roboto font-medium">{vehicle.title}</Text>
        <Text className="font-Roboto font-semilight text-sm">{user?.nickname || 'Unknown User'}</Text>
        <View className="flex flex-row items-center justify-between mt-2">
          <Text className="font-Roboto font-medium text-primary-500">
            {(vehicle.price || 0).toLocaleString()} VND / Day
          </Text>
          <Ionicons
            name={'heart-outline'}
            size={24}
            color={'black'}
          />
        </View>
      </View>
    </TouchableOpacity>
  )
}
export default Cards