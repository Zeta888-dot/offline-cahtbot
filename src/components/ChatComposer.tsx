import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  text: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  onPlusPress: () => void;
  isGenerating?: boolean;
  onStop?: () => void;
};

export default function ChatComposer({ text, onChangeText, onSend, onPlusPress, isGenerating, onStop }: Props) {
  const canSend = text.trim().length > 0;
  return (
    <View style={styles.area}>
      <View style={styles.wrapper}>
        <TouchableOpacity style={styles.plusBtn} onPress={onPlusPress}>
          <Ionicons name="add" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Message Zahi..."
          placeholderTextColor="#6b7280"
          value={text}
          onChangeText={onChangeText}
          multiline
          maxLength={2000}
        />
        {isGenerating ? (
          <TouchableOpacity style={styles.sendBtn} onPress={onStop}>
            <Ionicons name="stop" size={16} color="#0a0a0a" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={!canSend}
          >
            <Ionicons name="arrow-up" size={18} color="#0a0a0a" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { padding: 12, paddingBottom: 16 },
  wrapper: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#1f1f1f', borderRadius: 26, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#2e2e2e' },
  plusBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
  input: { flex: 1, color: '#ececf1', fontSize: 16, maxHeight: 120, paddingHorizontal: 8, paddingVertical: 7, fontFamily: 'Inter-Regular' },
  sendBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#84cc16', justifyContent: 'center', alignItems: 'center', marginRight: 2 },
  sendBtnDisabled: { backgroundColor: '#3a3a3a' },
});