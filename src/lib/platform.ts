export function isNativeApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const capacitor = (window as unknown as { Capacitor?: { isNativePlatform: () => boolean } }).Capacitor;
  const isCapacitorNative = Boolean(
    capacitor && typeof capacitor.isNativePlatform === "function" && capacitor.isNativePlatform()
  );

  const isLocalOrigin =
    window.location.origin === "https://localhost" ||
    window.location.origin === "capacitor://localhost";

  return isCapacitorNative || isLocalOrigin;
}
