import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  modelName: string;
  onModelPress: () => void;
  onSettingsPress: () => void;
};

export default function ChatHeader({ modelName, onModelPress, onSettingsPress }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.modelBtn} onPress={onModelPress}>
        <Text style={styles.modelText} numberOfLines={1}>{modelName}</Text>
        <Ionicons name="chevron-down" size={16} color="#8e8ea0" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onSettingsPress} style={styles.iconBtn}>
        <Ionicons name="settings-outline" size={22} color="#ececf1" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  modelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 12 },
  modelText: { color: '#ececf1', fontSize: 17, fontWeight: '700', fontFamily: 'Inter-SemiBold' },
  iconBtn: { padding: 6 },
});