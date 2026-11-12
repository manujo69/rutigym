import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'rutigym',
  webDir: 'dist/rutigym/browser',
  plugins: {
    // The plugin defaults to encryption on Android and fails while building its
    // master key, which leaves every database call rejecting. We open the
    // connection with `no-encryption`, so the plugin must not encrypt either.
    CapacitorSQLite: {
      androidIsEncryption: false
    }
  }
};

export default config;
