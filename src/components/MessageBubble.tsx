import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { tokenizeCode, formatLangLabel, CODE_COLORS } from '../../utils/syntaxHighlight';

type Feedback = 'up' | 'down' | null;

type Props = {
  text: string;
  role: 'user' | 'assistant';
  feedback?: Feedback;
  showActions?: boolean;
  onRetry?: () => void;
  onFeedback?: (type: 'up' | 'down') => void;
};

type Segment =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; lang?: string };

function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  const fenceRe = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRe.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: raw.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'code', lang: match[1], content: match[2].replace(/\n$/, '') });
    lastIndex = fenceRe.lastIndex;
  }
  if (lastIndex < raw.length) {
    segments.push({ type: 'text', content: raw.slice(lastIndex) });
  }
  return segments;
}

function InlineText({ content, isUser }: { content: string; isUser: boolean }) {
  const parts = content.split(/(`[^`]+`)/g).filter((p) => p.length > 0);
  return (
    <Text selectable style={[styles.text, !isUser && styles.aiText]}>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
          <Text key={i} style={styles.inlineCode}>
            {part.slice(1, -1)}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

function CodeBlock({ content, lang }: { content: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = tokenizeCode(content);
  const label = formatLangLabel(lang);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLang}>{label || 'Code'}</Text>
        <TouchableOpacity style={styles.codeCopyBtn} onPress={handleCopy} hitSlop={8}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? '#84cc16' : '#9ca3af'} />
          <Text style={[styles.codeCopyText, copied && { color: '#84cc16' }]}>{copied ? 'Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text selectable style={styles.codeText}>
          {tokens.map((t, i) => (
            <Text key={i} style={{ color: t.color }}>
              {t.text}
            </Text>
          ))}
        </Text>
      </ScrollView>
    </View>
  );
}

export default function MessageBubble({ text, role, feedback, showActions, onRetry, onFeedback }: Props) {
  const isUser = role === 'user';
  const segments = parseSegments(text);
  const bubbleStyle = isUser ? styles.userBubble : styles.aiBubble;
  const [justCopied, setJustCopied] = useState(false);

  const handleCopyAll = async () => {
    await Clipboard.setStringAsync(text);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1500);
  };

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={{ maxWidth: '92%' }}>
        <View style={bubbleStyle}>
          {segments.map((seg, i) =>
            seg.type === 'code' ? (
              <CodeBlock key={i} content={seg.content} lang={seg.lang} />
            ) : seg.content.trim().length > 0 || segments.length === 1 ? (
              <InlineText key={i} content={seg.content} isUser={isUser} />
            ) : null,
          )}
        </View>

        {!isUser && showActions && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCopyAll} hitSlop={8}>
              <Ionicons name={justCopied ? 'checkmark' : 'copy-outline'} size={16} color={justCopied ? '#84cc16' : '#9ca3af'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onFeedback?.('up')} hitSlop={8}>
              <Ionicons name={feedback === 'up' ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={feedback === 'up' ? '#84cc16' : '#9ca3af'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onFeedback?.('down')} hitSlop={8}>
              <Ionicons name={feedback === 'down' ? 'thumbs-down' : 'thumbs-down-outline'} size={16} color={feedback === 'down' ? '#ef4444' : '#9ca3af'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onRetry} hitSlop={8}>
              <Ionicons name="refresh-outline" size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const monoFont = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 6 },
  rowUser: { justifyContent: 'flex-end' },
  userBubble: { backgroundColor: '#262626', padding: 12, borderRadius: 20, borderBottomRightRadius: 6 },
  aiBubble: { padding: 12 },
  text: { color: '#ececf1', fontSize: 16, lineHeight: 24, fontFamily: 'Inter-Regular' },
  aiText: { color: '#d1d5db' },
  inlineCode: {
    fontFamily: monoFont,
    fontSize: 14,
    backgroundColor: '#1f1f1f',
    color: '#84cc16',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  codeBlock: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    marginVertical: 6,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#252526',
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e2e',
  },
  codeLang: { color: '#9ca3af', fontSize: 11, fontFamily: monoFont },
  codeCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  codeCopyText: { color: '#9ca3af', fontSize: 11, fontFamily: monoFont },
  codeText: {
    fontFamily: monoFont,
    fontSize: 13,
    lineHeight: 19,
    padding: 10,
  },
  actionRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 12, marginTop: 2 },
  actionBtn: { padding: 2 },
});