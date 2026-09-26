import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModelOption } from '../../utils/modelDownloader';

type Props = {
  visible: boolean;
  currentModelName: string | null;
  downloadedModels: string[];
  downloadingModelId: string | null;
  downloadPercent: number;
  models: ModelOption[];
  onClose: () => void;
  onPickModel: () => void;
  onDownload: (model: ModelOption) => void;
  onCancelDownload: () => void;
  onDeleteModel: (fileName: string) => void;
};

export default function ModelPickerSheet({
  visible,
  currentModelName,
  downloadedModels,
  downloadingModelId,
  downloadPercent,
  models,
  onClose,
  onPickModel,
  onDownload,
  onCancelDownload,
  onDeleteModel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Model Selection</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View style={styles.current}>
            <Ionicons name="cube-outline" size={20} color="#84cc16" />
            <Text style={styles.currentText} numberOfLines={1}>
              {currentModelName ?? 'Koi model load nahi'}
            </Text>
          </View>

          <ScrollView style={styles.modelList} showsVerticalScrollIndicator={false}>
            {models.map((model) => {
              const isDownloaded = downloadedModels.some(
                (f) => f.toLowerCase().includes(model.id)
              );
              const isDownloading = downloadingModelId === model.id;

              return (
                <View key={model.id} style={styles.modelCard}>
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelName}>{model.name}</Text>
                    <Text style={styles.modelMeta}>
                      {model.family} • {model.size}
                    </Text>
                  </View>

                  {isDownloading ? (
                    <View style={styles.downloadStatus}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressBar, { width: `${downloadPercent}%` }]} />
                      </View>
                      <Text style={styles.percentText}>{downloadPercent}%</Text>
                      <TouchableOpacity style={styles.cancelBtn} onPress={onCancelDownload}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : isDownloaded ? (
                    <TouchableOpacity
                      style={styles.installedBadge}
                      onPress={() => onDeleteModel(model.fileName)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#84cc16" />
                      <Text style={styles.installedText}>Installed</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.downloadBtn}
                      onPress={() => onDownload(model)}
                    >
                      <Ionicons name="download-outline" size={18} color="#84cc16" />
                      <Text style={styles.downloadText}>Download</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.pickBtn} onPress={onPickModel}>
            <Ionicons name="folder-open-outline" size={20} color="#0a0a0a" />
            <Text style={styles.pickText}>Select .gguf file manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3a3a3a',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { color: '#ececf1', fontSize: 18, fontWeight: '700', fontFamily: 'Inter-SemiBold' },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1f1f1f',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  currentText: { color: '#d1d5db', fontSize: 14, flex: 1, fontFamily: 'Inter-Regular' },
  modelList: { maxHeight: 300, marginBottom: 14 },
  modelCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f1f1f',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  modelInfo: { flex: 1, marginRight: 12 },
  modelName: { color: '#ececf1', fontSize: 14, fontWeight: '600', fontFamily: 'Inter-SemiBold' },
  modelMeta: { color: '#9ca3af', fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  downloadStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#2e2e2e', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: '#84cc16', borderRadius: 3 },
  percentText: { color: '#9ca3af', fontSize: 12, width: 36 },
  cancelBtn: { padding: 4 },
  installedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  installedText: { color: '#84cc16', fontSize: 12, fontFamily: 'Inter-Regular' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2e2e2e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  downloadText: { color: '#84cc16', fontSize: 12, fontWeight: '600', fontFamily: 'Inter-SemiBold' },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#84cc16',
    borderRadius: 14,
    padding: 14,
  },
  pickText: { color: '#0a0a0a', fontSize: 15, fontWeight: '700', fontFamily: 'Inter-SemiBold' },
});