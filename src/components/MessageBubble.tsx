import { View, Text, StyleSheet } from 'react-native';

type Props = {
  text: string;
  role: 'user' | 'assistant';
};

export default function MessageBubble({ text, role }: Props) {
  const isUser = role === 'user';
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={isUser ? styles.userBubble : styles.aiBubble}>
        <Text style={[styles.text, !isUser && styles.aiText]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 6 },
  rowUser: { justifyContent: 'flex-end' },
  userBubble: { backgroundColor: '#262626', padding: 12, borderRadius: 20, borderBottomRightRadius: 6, maxWidth: '85%' },
  aiBubble: { padding: 12, maxWidth: '90%' },
  text: { color: '#ececf1', fontSize: 16, lineHeight: 24, fontFamily: 'Inter-Regular' },
  aiText: { color: '#d1d5db' },
});