# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserve Capacitor & Plugin Native Interfaces
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
    @com.getcapacitor.annotation.PluginMethod public *;
}
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# Preserve Official & Third-Party Capacitor Plugins
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.aparajita.capacitor.** { *; }
-keep class com.aparajita.capacitor.securestorage.** { *; }

# Preserve Secure Storage & Crypto classes
-keep class javax.crypto.** { *; }
-keep class java.security.** { *; }
-keep class androidx.security.crypto.** { *; }

# Preserve Application & Custom Native Plugins
-keep class id.ksatriagraphx.app.** { *; }
-keep class id.ksatriagraphx.app.ThermalPrinterPlugin { *; }
