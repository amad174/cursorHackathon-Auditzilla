import React, { useMemo, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DashboardScreen from "./src/screens/DashboardScreen";
import UploadScreen from "./src/screens/UploadScreen";
import TransactionsScreen from "./src/screens/TransactionsScreen";

function TabButton({ active, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");

  const content = useMemo(() => {
    if (tab === "upload") return <UploadScreen />;
    if (tab === "transactions") return <TransactionsScreen />;
    return <DashboardScreen />;
  }, [tab]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.brand}>AUDIT-AI</Text>
      </View>
      <View style={styles.tabs}>
        <TabButton active={tab === "dashboard"} label="Dashboard" onPress={() => setTab("dashboard")} />
        <TabButton active={tab === "upload"} label="Upload" onPress={() => setTab("upload")} />
        <TabButton active={tab === "transactions"} label="Transactions" onPress={() => setTab("transactions")} />
      </View>
      <View style={styles.content}>{content}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1020" },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1f2937" },
  brand: { color: "#34d399", fontSize: 16, fontWeight: "700", letterSpacing: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1f2937" },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: "#34d399" },
  tabText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#34d399" },
  content: { flex: 1 }
});
