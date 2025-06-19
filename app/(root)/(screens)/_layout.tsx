import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="car-listing" />
      <Stack.Screen name="car-details" />
      <Stack.Screen name="rental-confirmation" />
      <Stack.Screen name="time-selection" />
      <Stack.Screen name="my-vehicles" />
      <Stack.Screen name="my-account" />
      <Stack.Screen name="update-to-level-2" />
      <Stack.Screen name="payment" />
    </Stack>
  );
}