import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main App Screens
import HomeScreen from '../screens/main/HomeScreen';
import CasesScreen from '../screens/cases/CasesScreen';
import CaseDetailScreen from '../screens/cases/CaseDetailScreen';
import SimulationScreen from '../screens/simulation/SimulationScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import DiscussionsScreen from '../screens/discussions/DiscussionsScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';

// Loading Screen
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack Navigator
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#2E86AB',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="Login" 
      component={LoginScreen}
      options={{ title: 'Medical Case Simulator' }}
    />
    <Stack.Screen 
      name="Register" 
      component={RegisterScreen}
      options={{ title: 'Create Account' }}
    />
    <Stack.Screen 
      name="ForgotPassword" 
      component={ForgotPasswordScreen}
      options={{ title: 'Reset Password' }}
    />
  </Stack.Navigator>
);

// Cases Stack Navigator
const CasesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#2E86AB',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="CasesList" 
      component={CasesScreen}
      options={{ title: 'Medical Cases' }}
    />
    <Stack.Screen 
      name="CaseDetail" 
      component={CaseDetailScreen}
      options={{ title: 'Case Details' }}
    />
    <Stack.Screen 
      name="Simulation" 
      component={SimulationScreen}
      options={{ title: 'Simulation' }}
    />
  </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'Home':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'Cases':
            iconName = focused ? 'medical' : 'medical-outline';
            break;
          case 'Discussions':
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            break;
          case 'Analytics':
            iconName = focused ? 'analytics' : 'analytics-outline';
            break;
          case 'Profile':
            iconName = focused ? 'person' : 'person-outline';
            break;
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#2E86AB',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
      },
      headerStyle: {
        backgroundColor: '#2E86AB',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    })}
  >
    <Tab.Screen 
      name="Home" 
      component={HomeScreen}
      options={{ title: 'Dashboard' }}
    />
    <Tab.Screen 
      name="Cases" 
      component={CasesStack}
      options={{ headerShown: false }}
    />
    <Tab.Screen 
      name="Discussions" 
      component={DiscussionsScreen}
      options={{ title: 'Discussions' }}
    />
    <Tab.Screen 
      name="Analytics" 
      component={AnalyticsScreen}
      options={{ title: 'My Progress' }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </Tab.Navigator>
);

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;