import { InputFieldProps } from "@/types/type";
import { Text, View, Image, TextInput } from "react-native";

const InputField = ({
  label,
  labelStyle,
  icon,
  secureTextEntry = false,
  containerStyle,
  inputStyle,
  iconStyle,
  className,
  rightElement,
  value,
  isRequired = false,
  error,
  ...props
}: InputFieldProps) => (
  <View className="my-2 w-full">
    <View className="flex-row items-center">
      <Text className={`text-lg font-JakartaSemiBold mb-3 ${labelStyle}`}>
        {label}
      </Text>
      {isRequired && <Text className="text-red-500 text-lg ml-1">*</Text>}
    </View>
    <View className={`flex flex-row justify-start items-center relative bg-neutral-100 rounded-lg border border-general-100 focus:border-primary-500 h-14 ${containerStyle}`}>
      {icon && (
        <Image source={icon} className={`w-6 h-6 ml-4 ${iconStyle}`} />
      )}
      <TextInput
        className={`rounded-full p-4 font-JakartaSemiBold text-[15px] flex-1 ${value ? '' : 'opacity-50'} ${inputStyle} text-left`}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="#999"
        value={value}
        {...props}
      />
      <View className="ml-2">
        {rightElement}
      </View>
    </View>
    {error && (
      <Text className="text-red-500 text-sm font-JakartaMedium mt-1 ml-4">{error}</Text>
    )}
  </View>
);

export default InputField;