import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { AuthProvider, useAuth } from './src/auth';
import { colors } from './src/theme';
import { PhoneFrame } from './src/components/PhoneFrame';
import { TabBar } from './src/components/TabBar';
import AuthScreen from './src/screens/AuthScreen';
import ForgotScreen from './src/screens/ForgotScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import ShowScreen from './src/screens/ShowScreen';
import AddShowScreen from './src/screens/AddShowScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';
import MyShowsScreen from './src/screens/MyShowsScreen';
import UsersScreen from './src/screens/UsersScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, primary: colors.accent, border: colors.hairline },
};

function Home() {
  const { user } = useAuth();
  return (
    <Tabs.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="Buscar" component={DiscoverScreen} />
      <Tabs.Screen name="Para ti" component={RecommendationsScreen} />
      <Tabs.Screen name="Mis series" component={MyShowsScreen} />
      {user?.admin && <Tabs.Screen name="Usuarios" component={UsersScreen} />}
    </Tabs.Navigator>
  );
}

function Root() {
  const { user, ready } = useAuth();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Show" component={ShowScreen} />
            <Stack.Screen name="AddShow" component={AddShowScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Forgot" component={ForgotScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [loaded] = useFonts({ Outfit_600SemiBold, Outfit_700Bold, Geist_400Regular, Geist_500Medium, Geist_600SemiBold });
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {loaded ? (
        <PhoneFrame>
          <AuthProvider><Root /></AuthProvider>
        </PhoneFrame>
      ) : <View style={{ flex: 1, backgroundColor: '#06060A' }} />}
    </SafeAreaProvider>
  );
}
