export const PLATFORMS = {
  IOS: 'ios',
  ANDROID: 'android',
  WEB: 'web',
} as const;

export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];
export const PLATFORM_VALUES = Object.values(PLATFORMS) as string[];