import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const SUGGESTIONS = [
  'Explain quantum computing in simple words',
  'Draft a polite email to my boss',
  'Give me ideas for a weekend trips',
];

export default function EmptyState({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How can I help you today?</Text>
      <View style={styles.chips}>
        {SUGGESTIONS.map(s => (
          <TouchableOpacity key={s} style={styles.chip} onPress={() => onSelect(s)}>
            <Text style={styles.chipText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 28 },
  title: { color: '#ececf1', fontSize: 24, fontWeight: '700', textAlign: 'center', fontFamily: 'Inter-SemiBold' },
  chips: { gap: 10, width: '100%' },
  chip: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#262626', borderRadius: 16, padding: 14 },
  chipText: { color: '#a1a1a1', fontSize: 14, fontFamily: 'Inter-Regular' },
});