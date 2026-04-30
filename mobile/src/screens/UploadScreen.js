import React, { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../lib/api";

export default function UploadScreen() {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo library permission is required.");
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!selection.canceled && selection.assets?.[0]) {
      setImage(selection.assets[0]);
      setResult(null);
      setError("");
    }
  };

  const upload = async () => {
    if (!image) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", {
        uri: image.uri,
        name: image.fileName || "upload.jpg",
        type: image.mimeType || "image/jpeg"
      });
      const res = await fetch(`${API_BASE_URL}/vision/analyse`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Choose Image</Text>
      </TouchableOpacity>
      {image ? <Image source={{ uri: image.uri }} style={styles.image} /> : <Text style={styles.meta}>No image selected</Text>}
      <TouchableOpacity style={styles.button} onPress={upload} disabled={!image || loading}>
        <Text style={styles.buttonText}>{loading ? "Uploading..." : "Upload and Analyse"}</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator color="#34d399" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {result ? <Text style={styles.meta}>Result received from backend.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 12 },
  button: { backgroundColor: "#13283f", borderWidth: 1, borderColor: "#60a5fa", padding: 12, borderRadius: 8 },
  buttonText: { color: "#60a5fa", textAlign: "center", fontWeight: "600" },
  image: { width: "100%", height: 220, borderRadius: 8, resizeMode: "cover" },
  meta: { color: "#94a3b8" },
  error: { color: "#f87171" }
});
