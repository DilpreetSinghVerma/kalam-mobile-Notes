import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../src/firebase';

// Configure Google Sign-In outside the component
GoogleSignin.configure({
  webClientId: '1066929757932-bqees2g2chjma2upgfbd3aok892jhuda.apps.googleusercontent.com',
});

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      const idToken = response.data?.idToken || response.idToken;
      if (!idToken) {
        if (response.type === 'cancelled' || response.type === 'dismiss') {
          return; // User cancelled
        }
        throw new Error('No ID token found in response');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      router.back();
    } catch (e) {
      console.log('Google Sign-In Error:', e);
      setError(e.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.back();
    } catch (e) {
      setError(e.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Kalam Sync</Text>
        <Text style={styles.subtitle}>Sign in with your email to sync notes.</Text>
        
        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        <TextInput 
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#6b7280"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput 
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b7280"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isRegistering ? 'Register' : 'Sign In'}</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)} style={{marginTop: 16, marginBottom: 24}}>
          <Text style={{color: '#eab308', textAlign: 'center', fontWeight: '500'}}>
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </Text>
        </TouchableOpacity>

        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 24}}>
          <View style={{flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)'}} />
          <Text style={{color: '#94a3b8', marginHorizontal: 16}}>OR</Text>
          <View style={{flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)'}} />
        </View>

        <TouchableOpacity 
          style={[styles.btn, {backgroundColor: '#fff'}]} 
          onPress={handleGoogleLogin} 
          disabled={loading}
        >
          <Text style={[styles.btnText, {color: '#000'}]}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  header: { padding: 16, alignItems: 'flex-end' },
  iconBtn: { padding: 8 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#e2e8f0', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#1a1d24', color: '#e2e8f0', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  btn: { backgroundColor: '#eab308', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  error: { color: '#ef4444', textAlign: 'center', marginBottom: 16 },
  notice: { color: '#6b7280', textAlign: 'center', marginTop: 24, fontSize: 12, paddingHorizontal: 20 }
});
