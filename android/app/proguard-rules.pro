# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserve Capacitor & Plugin Native Interfaces
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# Preserve Secure Storage & Crypto classes
-keep class javax.crypto.** { *; }
-keep class java.security.** { *; }
