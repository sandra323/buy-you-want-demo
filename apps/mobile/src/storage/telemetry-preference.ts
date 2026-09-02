import AsyncStorage from '@react-native-async-storage/async-storage';

export const TELEMETRY_OPT_OUT_KEY = 'telemetry_opt_out';

export async function readTelemetryOptOut(): Promise<boolean> {
  const value = await AsyncStorage.getItem(TELEMETRY_OPT_OUT_KEY);
  if (value === null || value === '0') {
    return false;
  }
  if (value === '1') {
    return true;
  }
  throw new Error('Invalid telemetry preference');
}

export async function writeTelemetryOptOut(optedOut: boolean): Promise<void> {
  await AsyncStorage.setItem(TELEMETRY_OPT_OUT_KEY, optedOut ? '1' : '0');
}
