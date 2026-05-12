import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <Stack screenOptions={{ 
        headerStyle: { backgroundColor: '#0f1115' }, 
        headerTintColor: '#eab308', 
        headerTitleStyle: { fontWeight: 'bold', color: '#e2e8f0' } 
      }}>
        <Stack.Screen name="index" options={{ title: 'Kalam Notes', headerShadowVisible: false }} />
        <Stack.Screen name="editor" options={{ title: 'Editor', headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="dictionary" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
