import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth';
import { colors } from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import SearchScreen from './src/screens/SearchScreen';
import ShowScreen from './src/screens/ShowScreen';
import AddShowScreen from './src/screens/AddShowScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';
import MyShowsScreen from './src/screens/MyShowsScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.card, text: colors.text, primary: colors.accent, border: colors.border } };
const icon = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;

function Home() {
  return (
    <Tabs.Navigator>
      <Tabs.Screen name="Buscar" component={SearchScreen} options={{ tabBarIcon: icon('🔍') }} />
      <Tabs.Screen name="Para ti" component={RecommendationsScreen} options={{ tabBarIcon: icon('✨') }} />
      <Tabs.Screen name="Mis series" component={MyShowsScreen} options={{ tabBarIcon: icon('📺') }} />
    </Tabs.Navigator>
  );
}

function Root() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
            <Stack.Screen name="Show" component={ShowScreen} options={{ title: 'Serie' }} />
            <Stack.Screen name="AddShow" component={AddShowScreen} options={{ title: 'Añadir serie' }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider><Root /></AuthProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
