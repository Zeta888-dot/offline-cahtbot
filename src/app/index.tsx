import { useState, useEffect, useRef } from 'react';
import { StyleSheet, FlatList, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import ChatHeader from '../components/ChatHeader';
import MessageBubble from '../components/MessageBubble';
import ChatComposer from '../components/ChatComposer';
import EmptyState from '../components/EmptyState';
import ThinkingOrbs from '../components/ThinkingOrbs';
import ModelPickerSheet from '../components/ModelPickerSheet';
import { loadModel, generateResponse } from '../../utils/llmEngine';
import { findLocalModels } from '../../utils/modelScanner';
import {
  getAvailableModels,
  downloadModel,
  deleteDownloadedModel,
  ModelOption,
  DownloadHandle,
} from '../../utils/modelDownloader';

type Message = { id: string; text: string; role: 'user' | 'assistant' };

const MODELS = getAvailableModels();

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [modelName, setModelName] = useState<string | null>(null);
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const downloadRef = useRef<{ handle: DownloadHandle; model: ModelOption } | null>(null);

  useEffect(() => {
    (async () => {
      const local = await findLocalModels();
      setDownloadedModels(local.map((m) => m.name));
      if (local.length > 0) {
        setModelPath(local[0].uri);
        setModelName(local[0].name);
      }
    })();
  }, []);

  const ensureModelLoaded = async (): Promise<boolean> => {
    if (modelLoaded) return true;
    if (!modelPath) return false;
    setIsLoadingModel(true);
    const ok = await loadModel(modelPath);
    setIsLoadingModel(false);
    if (ok) setModelLoaded(true);
    return ok;
  };

  const handleDownload = async (model: ModelOption) => {
    setDownloadingModelId(model.id);
    setDownloadPercent(0);
    const handle = downloadModel(model, (p) => setDownloadPercent(p.percent));
    downloadRef.current = { handle, model };
    try {
      const uri = await handle.promise;
      setModelPath(uri);
      setModelName(model.fileName);
      setDownloadedModels((prev) => [...prev, model.fileName]);
      setModelLoaded(false);
      setSheetVisible(false);
    } catch (e: any) {
      await deleteDownloadedModel(model.fileName);
      setDownloadedModels((prev) => prev.filter((f) => f !== model.fileName));
      if (e?.message !== 'Download cancelled') {
        // Log the real error so it shows up in `npx expo start` / adb logcat,
        // and surface the ACTUAL reason to the user instead of a hardcoded
        // generic message that was hiding what modelDownloader.ts threw.
        console.log('[handleDownload] failed for', model.id, '-', e?.message);
        Alert.alert('Download failed', e?.message || 'Kuch ghalat ho gaya, dobara try karo');
      }
    } finally {
      setDownloadingModelId(null);
      downloadRef.current = null;
    }
  };

  const handleCancelDownload = async () => {
    const current = downloadRef.current;
    if (!current) return;
    current.handle.cancel();
    await deleteDownloadedModel(current.model.fileName);
    setDownloadedModels((prev) => prev.filter((f) => f !== current.model.fileName));
    setDownloadingModelId(null);
    downloadRef.current = null;
  };

  const handleDeleteModel = async (fileName: string) => {
    await deleteDownloadedModel(fileName);
    setDownloadedModels((prev) => prev.filter((f) => f !== fileName));
    if (modelName === fileName) {
      setModelName(null);
      setModelPath(null);
      setModelLoaded(false);
    }
  };

  const handlePickModel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.assets || result.assets.length === 0) return;
      const file = result.assets[0];
      if (!file.name.endsWith('.gguf')) {
        Alert.alert('Error', 'Sirf .gguf file select karo');
        return;
      }
      setSheetVisible(false);
      setModelPath(file.uri);
      setModelName(file.name);
      setModelLoaded(false);
      setDownloadedModels((prev) => [...prev, file.name]);
    } catch (e) {
      Alert.alert('Error', 'File pick nahi hui');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    const ready = await ensureModelLoaded();
    if (!ready) {
      setSheetVisible(true);
      return;
    }
    const userMsg: Message = { id: Date.now().toString(), text: input, role: 'user' };
    const aiId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, userMsg, { id: aiId, text: '', role: 'assistant' }]);
    setInput('');
    setIsGenerating(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.text }));
      await generateResponse(
        [{ role: 'system', content: 'You are Chitral AI, a helpful assistant.' }, ...history],
        (token) => {
          setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, text: m.text + token } : m)));
        },
      );
    } catch (e) {
      setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, text: 'Error: response generate nahi hua' } : m)));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ChatHeader
          modelName={isLoadingModel ? 'Model load ho raha hai...' : modelName ?? 'Chitral AI'}
          onModelPress={() => setSheetVisible(true)}
          onSettingsPress={() => {}}
        />

        {messages.length === 0 ? (
          <EmptyState onSelect={(t) => setInput(t)} />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatContainer}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) =>
              item.role === 'assistant' && item.text === '' ? (
                <ThinkingOrbs />
              ) : (
                <MessageBubble text={item.text} role={item.role} />
              )
            }
          />
        )}

        <ChatComposer
          text={input}
          onChangeText={setInput}
          onSend={handleSend}
          onPlusPress={() => setSheetVisible(true)}
        />

        <ModelPickerSheet
          visible={sheetVisible}
          currentModelName={modelName}
          downloadedModels={downloadedModels}
          downloadingModelId={downloadingModelId}
          downloadPercent={downloadPercent}
          models={MODELS}
          onClose={() => setSheetVisible(false)}
          onPickModel={handlePickModel}
          onDownload={handleDownload}
          onCancelDownload={handleCancelDownload}
          onDeleteModel={handleDeleteModel}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  chatContainer: { padding: 16, gap: 8 },
});