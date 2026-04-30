import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getJson } from "../lib/api";

export default function DashboardScreen() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const runAudit = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getJson("/audit/summary", { method: "POST" });
      setSummary(data);
    } catch (e) {
      setError(e.message || "Failed to run audit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <TouchableOpacity style={styles.button} onPress={runAudit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Running..." : "Run Audit"}</Text>
      </TouchableOpacity>
      {loading && <ActivityIndicator color="#34d399" />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {summary ? (
        <View style={styles.card}>
          <Text style={styles.title}>Status: {summary.overall_status || "N/A"}</Text>
          <Text style={styles.text}>Confidence: {summary?.summary?.average_confidence ?? "N/A"}</Text>
          <Text style={styles.text}>Flagged Txns: {summary?.summary?.flagged_transactions ?? "N/A"}</Text>
          <Text style={styles.text}>Stock Issues: {summary?.summary?.stock_discrepancies ?? "N/A"}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  button: { backgroundColor: "#0f2f27", borderWidth: 1, borderColor: "#34d399", padding: 12, borderRadius: 8 },
  buttonText: { color: "#34d399", textAlign: "center", fontWeight: "600" },
  error: { color: "#f87171" },
  card: { backgroundColor: "#111827", borderWidth: 1, borderColor: "#1f2937", borderRadius: 8, padding: 12, gap: 6 },
  title: { color: "#e2e8f0", fontSize: 16, fontWeight: "700" },
  text: { color: "#94a3b8" }
});
