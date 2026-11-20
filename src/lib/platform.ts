export function isNativeApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const capacitor = (window as unknown as { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor;
  return Boolean(capacitor && typeof capacitor.isNativePlatform === "function" && capacitor.isNativePlatform());
}
