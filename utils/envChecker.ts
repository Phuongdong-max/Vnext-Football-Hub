
export interface EnvironmentCheckResult {
  isSupported: boolean;
  message?: string;
}

export const checkFirebaseEnvironment = (): EnvironmentCheckResult => {
  const protocol = window.location.protocol;
  const isSupportedProtocol = ['http:', 'https:', 'chrome-extension:'].includes(protocol);

  if (!isSupportedProtocol) {
    return {
      isSupported: false,
      message: `Firebase Auth operations require the app to be served over http, https, or chrome-extension protocol. Current protocol: ${protocol}. Please use a local web server.`,
    };
  }

  try {
    // Check if localStorage is accessible and usable
    const testKey = '__firebase_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
  } catch (e) {
    return {
      isSupported: false,
      message: 'Web storage (localStorage) appears to be disabled or unavailable. Firebase Auth requires web storage to function correctly.',
    };
  }

  return { isSupported: true };
};
