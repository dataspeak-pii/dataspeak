import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Para trocar a logo: altere o require abaixo para o caminho da nova imagem
const LOGO = require('../assets/images/logo-white.png');

// Cor de fundo da splash (sincronizada com app.json e com a cor primária do tema)
const BACKGROUND_COLOR = '#0a7ea4';

export function AppSplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image source={LOGO} style={styles.logo} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 280,
    height: 140,
  },
});
