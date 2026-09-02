/**
 * JS fallback for expo-application when the Dev Client binary has not been
 * rebuilt with the native module yet. Prefer NativeModules when present.
 */
import { NativeModules } from 'react-native';

type ExpoApplicationNative = {
  nativeApplicationVersion?: string | null;
  nativeBuildVersion?: string | null;
};

const native = NativeModules.ExpoApplication as
  | ExpoApplicationNative
  | undefined;

export const nativeApplicationVersion = native?.nativeApplicationVersion ?? null;
export const nativeBuildVersion = native?.nativeBuildVersion ?? null;
