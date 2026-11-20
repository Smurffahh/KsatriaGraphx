package id.ksatriagraphx.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        ),
        @Permission(
            alias = "bluetoothConnect",
            strings = {
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            }
        )
    }
)
public class ThermalPrinterPlugin extends Plugin {

    // Standard Bluetooth Serial Port Profile (SPP) UUID for ESC/POS Thermal Printers
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @PluginMethod
    public void listPairedPrinters(PluginCall call) {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            call.reject("Perangkat ini tidak memiliki adapter Bluetooth.");
            return;
        }

        if (!adapter.isEnabled()) {
            call.reject("Bluetooth tidak aktif. Silakan aktifkan Bluetooth terlebih dahulu.");
            return;
        }

        // Check runtime permission for Android 12+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("bluetoothConnect", call, "checkBluetoothPermissionCallback");
                return;
            }
        }

        try {
            Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
            JSArray devicesArray = new JSArray();

            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject devObj = new JSObject();
                    String name = device.getName();
                    if (name == null || name.isEmpty()) {
                        name = "Thermal Printer (" + device.getAddress() + ")";
                    }
                    devObj.put("name", name);
                    devObj.put("address", device.getAddress());
                    devicesArray.put(devObj);
                }
            }

            JSObject ret = new JSObject();
            ret.put("devices", devicesArray);
            call.resolve(ret);
        } catch (SecurityException se) {
            call.reject("Izin akses Bluetooth ditolak oleh sistem Android: " + se.getMessage());
        } catch (Exception e) {
            call.reject("Gagal memuat daftar printer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void printBytes(PluginCall call) {
        String address = call.getString("address");
        String base64Data = call.getString("base64Data");

        if (address == null || address.isEmpty()) {
            call.reject("Parameter address printer wajib disertakan.");
            return;
        }

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Data byte cetak nota tidak boleh kosong.");
            return;
        }

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth tidak aktif atau tidak tersedia.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                call.reject("Izin BLUETOOTH_CONNECT belum diberikan.");
                return;
            }
        }

        // Run socket connection in background thread to avoid blocking Android UI thread
        new Thread(() -> {
            BluetoothSocket socket = null;
            OutputStream outputStream = null;
            try {
                BluetoothDevice device = adapter.getRemoteDevice(address);
                if (adapter.isDiscovering()) {
                    adapter.cancelDiscovery();
                }

                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                outputStream = socket.getOutputStream();

                byte[] rawBytes = Base64.decode(base64Data, Base64.DEFAULT);

                // Chunked write (128 bytes) to prevent buffer overflow on low-cost thermal hardware
                int offset = 0;
                int chunkSize = 128;
                while (offset < rawBytes.length) {
                    int length = Math.min(chunkSize, rawBytes.length - offset);
                    outputStream.write(rawBytes, offset, length);
                    outputStream.flush();
                    offset += length;
                    try {
                        Thread.sleep(15);
                    } catch (InterruptedException ignored) {}
                }

                outputStream.flush();

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("message", "Nota berhasil dicetak.");
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Gagal mencetak ke printer (" + address + "): " + e.getMessage());
            } finally {
                try {
                    if (outputStream != null) outputStream.close();
                } catch (Exception ignored) {}
                try {
                    if (socket != null) socket.close();
                } catch (Exception ignored) {}
            }
        }).start();
    }
}
