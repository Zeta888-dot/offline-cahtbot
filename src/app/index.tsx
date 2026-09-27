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
import { loadModel, generateResponse, stopGeneration } from '../../utils/llmEngine';
import { findLocalModels } from '../../utils/modelScanner';
import {
  getAvailableModels,
  downloadModel,
  deleteDownloadedModel,
  ModelOption,
  DownloadHandle,
} from '../../utils/modelDownloader';

type Feedback = 'up' | 'down' | null;
type Message = { id: string; text: string; role: 'user' | 'assistant'; feedback?: Feedback };

const MODELS = getAvailableModels();
const SYSTEM_PROMPT = { role: 'system', content: 'You are Zahi, an AI assistant built by Zahid. Keep answers helpful and concise.' };

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [modelName, setModelName] = useState<string | null>(null);
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const downloadRef = useRef<{ handle: DownloadHandle; model: ModelOption } | null>(null);
  const flatListRef = useRef<FlatList>(null);

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
    const result = await loadModel(modelPath);
    setIsLoadingModel(false);
    if (result.ok) {
      setModelLoaded(true);
      return true;
    }
    console.log('[ensureModelLoaded] failed -', result.error);
    Alert.alert('Model load nahi hua', result.error || 'Wajah pata nahi chali, logs check karo');
    return false;
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

  // Shared generation runner used by both a fresh send and a retry.
  const runGeneration = async (historyForModel: Array<{ role: string; content: string }>, aiId: string) => {
    setIsGenerating(true);
    setGeneratingId(aiId);
    try {
      await generateResponse(
        [SYSTEM_PROMPT, ...historyForModel],
        (token) => {
          setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, text: m.text + token } : m)));
        },
      );
    } catch (e: any) {
      const message = e?.message || String(e);
      console.log('[runGeneration] failed -', message);
      setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, text: `Error: ${message}` } : m)));
    } finally {
      setIsGenerating(false);
      setGeneratingId(null);
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
    const nextMessages = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg, { id: aiId, text: '', role: 'assistant' }]);
    setInput('');
    const history = nextMessages.map(m => ({ role: m.role, content: m.text }));
    await runGeneration(history, aiId);
  };

  const handleStop = async () => {
    await stopGeneration();
  };

  const handleRetry = async (assistantId: string) => {
    if (isGenerating) return;
    const idx = messages.findIndex(m => m.id === assistantId);
    if (idx <= 0) return;
    const historyMessages = messages.slice(0, idx); // everything up to (not including) this AI reply
    const ready = await ensureModelLoaded();
    if (!ready) return;
    setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, text: '', feedback: null } : m)));
    const history = historyMessages.map(m => ({ role: m.role, content: m.text }));
    await runGeneration(history, assistantId);
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, feedback: m.feedback === type ? null : type } : m)));
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ChatHeader
          modelName={isLoadingModel ? 'Model load ho raha hai...' : modelName ?? 'Zahi'}
          onModelPress={() => setSheetVisible(true)}
          onSettingsPress={() => {}}
        />

        {messages.length === 0 ? (
          <EmptyState onSelect={(t) => setInput(t)} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatContainer}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) =>
              item.role === 'assistant' && item.text === '' ? (
                <ThinkingOrbs />
              ) : (
                <MessageBubble
                  text={item.text}
                  role={item.role}
                  feedback={item.feedback}
                  showActions={item.role === 'assistant' && generatingId !== item.id}
                  onRetry={() => handleRetry(item.id)}
                  onFeedback={(type) => handleFeedback(item.id, type)}
                />
              )
            }
          />
        )}

        <ChatComposer
          text={input}
          onChangeText={setInput}
          onSend={handleSend}
          onPlusPress={() => setSheetVisible(true)}
          isGenerating={isGenerating}
          onStop={handleStop}
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