import React, { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getJson } from "../lib/api";

export default function TransactionsScreen() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  const loadTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getJson("/finance/transactions");
      setRows(Array.isArray(data?.transactions) ? data.transactions : []);
    } catch (e) {
      setError(e.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.button} onPress={loadTransactions} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Loading..." : "Fetch Transactions"}</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator color="#fbbf24" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.vendor}>{item.vendor || "Unknown vendor"}</Text>
            <Text style={styles.meta}>{item.date || ""}</Text>
            <Text style={styles.meta}>{item.category || "uncategorized"}</Text>
            <Text style={styles.amount}>${Number(item.amount || 0).toFixed(2)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, gap: 10 },
  button: { backgroundColor: "#332701", borderWidth: 1, borderColor: "#fbbf24", padding: 12, borderRadius: 8 },
  buttonText: { color: "#fbbf24", textAlign: "center", fontWeight: "600" },
  error: { color: "#f87171" },
  row: { borderWidth: 1, borderColor: "#1f2937", backgroundColor: "#111827", borderRadius: 8, padding: 10, marginBottom: 8 },
  vendor: { color: "#e2e8f0", fontWeight: "700" },
  meta: { color: "#94a3b8", fontSize: 12 },
  amount: { color: "#f8fafc", marginTop: 4, fontWeight: "700" }
});
