// Lightweight, dependency-free code tokenizer for a VS Code "Dark+"-ish look.
// Not a full parser — regex-based, good enough for chat-bubble code blocks.

export type Token = { text: string; color: string };

export const CODE_COLORS = {
  keyword: '#569CD6',
  string: '#CE9178',
  comment: '#6A9955',
  number: '#B5CEA8',
  function: '#DCDCAA',
  default: '#D4D4D4',
};

const KEYWORDS = [
  // python
  'if', 'else', 'elif', 'for', 'while', 'def', 'return', 'import', 'from', 'as', 'class',
  'try', 'except', 'finally', 'with', 'in', 'is', 'not', 'and', 'or', 'None', 'True', 'False',
  'none', 'true', 'false', 'break', 'continue', 'pass', 'lambda', 'yield', 'global', 'nonlocal',
  'assert', 'raise', 'async', 'await', 'self',
  // js/ts
  'function', 'var', 'let', 'const', 'extends', 'new', 'this', 'typeof', 'instanceof', 'null',
  'undefined', 'export', 'default', 'of', 'switch', 'case', 'throw', 'catch', 'interface', 'type',
  'implements', 'super',
  // c/c++/java
  'int', 'float', 'double', 'char', 'void', 'bool', 'struct', 'public', 'private', 'protected',
  'static', 'include', 'define', 'namespace', 'using', 'template', 'typename', 'virtual',
  'override', 'sizeof', 'nullptr', 'long', 'short', 'unsigned', 'signed', 'enum', 'union',
];

const KEYWORD_ALT = KEYWORDS.join('|');

const MASTER_RE = new RegExp(
  [
    '(#.*)',
    '(//.*)',
    '(/\\*[\\s\\S]*?\\*/)',
    '("(?:[^"\\\\]|\\\\.)*")',
    "('(?:[^'\\\\]|\\\\.)*')",
    '(`(?:[^`\\\\]|\\\\.)*`)',
    `\\b(${KEYWORD_ALT})\\b`,
    '\\b(\\d+\\.?\\d*)\\b',
    '\\b([A-Za-z_]\\w*)\\s*(?=\\()',
  ].join('|'),
  'g',
);

export function tokenizeCode(code: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  MASTER_RE.lastIndex = 0;

  while ((m = MASTER_RE.exec(code)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, m.index), color: CODE_COLORS.default });
    }
    let color = CODE_COLORS.default;
    if (m[1] || m[2] || m[3]) color = CODE_COLORS.comment;
    else if (m[4] || m[5] || m[6]) color = CODE_COLORS.string;
    else if (m[7]) color = CODE_COLORS.keyword;
    else if (m[8]) color = CODE_COLORS.number;
    else if (m[9]) color = CODE_COLORS.function;
    tokens.push({ text: m[0], color });
    lastIndex = MASTER_RE.lastIndex;
  }
  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), color: CODE_COLORS.default });
  }
  return tokens;
}

const LANG_LABELS: Record<string, string> = {
  python: 'Python', py: 'Python',
  javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript',
  jsx: 'JSX', tsx: 'TSX',
  cpp: 'C++', 'c++': 'C++',
  c: 'C',
  java: 'Java',
  bash: 'Bash', sh: 'Shell', shell: 'Shell',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  ruby: 'Ruby',
  yaml: 'YAML', yml: 'YAML',
};

export function formatLangLabel(lang?: string): string | null {
  if (!lang) return null;
  const key = lang.toLowerCase();
  if (LANG_LABELS[key]) return LANG_LABELS[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}