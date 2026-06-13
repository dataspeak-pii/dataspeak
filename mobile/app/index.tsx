import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

// Para trocar a logo: altere o require abaixo
const LOGO = require('../assets/images/logo.png');

// Para alterar o tempo: mude este valor (em milissegundos)
const SPLASH_DURATION_MS = 2500;

export default function SplashScreen() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (done) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.container}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0E0C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 260,
    height: 130,
  },
});
