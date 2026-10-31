import { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

import { parseStudioQrValue } from "../../services/qr/qr-scanner.service";

interface StudioQrScannerProps {
  onTokenScanned: (token: string) => void;
  onClose?: () => void;
}

export function StudioQrScanner({
  onTokenScanned,
  onClose,
}: StudioQrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) {
        return;
      }

      const result = parseStudioQrValue(data);

      if (!result.valid || !result.token) {
        return;
      }

      setScanned(true);
      onTokenScanned(result.token);
    },
    [onTokenScanned, scanned],
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission loading...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera Access Required</Text>

        <Text style={styles.text}>
          Allow camera access to scan your studio QR code.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>

        {onClose ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onClose}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={
          scanned ? undefined : handleBarcodeScanned
        }
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <Text style={styles.heading}>Scan Studio QR</Text>

          {onClose ? (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.scanArea}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <Text style={styles.instruction}>
          Point your camera at the studio QR code
        </Text>

        {scanned ? (
          <Text style={styles.success}>
            QR detected
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 64,
    paddingBottom: 80,
  },

  topBar: {
    width: "100%",
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heading: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  closeText: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 32,
  },

  scanArea: {
    width: 270,
    height: 270,
    position: "relative",
  },

  corner: {
    position: "absolute",
    width: 42,
    height: 42,
    borderColor: "#fff",
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },

  instruction: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 32,
  },

  success: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },

  text: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },

  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#0A3F61",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    marginTop: 14,
    padding: 12,
  },

  secondaryText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
