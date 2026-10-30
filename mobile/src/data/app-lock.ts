// App-Sperre über Face ID bzw. den Gerätecode. In Expo Go fragt iOS den Gerätecode ab; Face ID
// funktioniert erst im Development Build.

import * as LocalAuthentication from 'expo-local-authentication';

/** Nur möglich, wenn auf dem Gerät mindestens ein Code eingerichtet ist. */
export async function canLock(): Promise<boolean> {
  return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
}

export async function unlock(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  return result.success;
}
