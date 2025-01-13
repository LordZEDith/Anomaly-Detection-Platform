export const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

export const PLATFORM_NAME = getEnvVar('VITE_PLATFORM_NAME') || 'Anomaly Detection Platform'; 