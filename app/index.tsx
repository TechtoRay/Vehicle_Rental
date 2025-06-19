// import { Redirect } from 'expo-router';
// import { Text, View } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';


// const Home = () => {
//   return <Redirect href="/(auth)/welcome" />;
// }

// export default Home;

// import { useEffect, useState } from "react";
// import { Redirect } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// const Page = () => {
//   const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

//   useEffect(() => {
//     const checkAuthStatus = async () => {
//       try {
//         // Check if the user is signed in by retrieving a token or flag from AsyncStorage
//         const token = await AsyncStorage.getItem("authToken");
//         setIsSignedIn(!!token); // If a token exists, the user is signed in
//       } catch (error) {
//         console.error("Error checking auth status:", error);
//         setIsSignedIn(false);
//       }
//     };

//     checkAuthStatus();
//   }, []);

//   if (isSignedIn === null) {
//     // Show a loading screen while checking the auth status
//     return null;
//   }

//   if (isSignedIn) {
//     return <Redirect href="/(root)/(tabs)/home" />;
//   }

//   return <Redirect href="/(auth)/welcome" />;
// };

// export default Page;

import { Redirect } from "expo-router";

const Page = () => {
  // const { isSignedIn } = useAuth();

  // if (isSignedIn) return <Redirect href="/(root)/(tabs)/home" />;

  return <Redirect href="/(auth)/sign-in" />;
  // return <Redirect href="/(root)/(tabs)/home" />;
};

export default Page;