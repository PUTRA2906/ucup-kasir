import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ucupkasir.app',
  appName: 'Tagih Kios',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  // Samakan dengan gradient splash animasi (index.html) agar WebView tidak
  // sempat berkedip putih sebelum halaman pertama dilukis.
  backgroundColor: '#1E3A8A',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  }
};

export default config;
