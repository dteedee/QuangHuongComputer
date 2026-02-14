import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import DOMPurify from 'dompurify';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Heading1,
  Heading2,
  Quote
} from 'lucide-react';

// Configure DOMPurify to allow safe HTML elements for rich text editing
const sanitizeConfig: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'strike', 's',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'div', 'span'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'style'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

// Sanitize HTML content to prevent XSS attacks
const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, sanitizeConfig);
};

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  error?: string;
}

export interface RichTextEditorRef {
  focus: () => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Write your content here...',
  minHeight = '300px',
  error,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus();
    }
  }));

  useEffect(() => {
    if (editorRef.current) {
      // Sanitize incoming HTML to prevent XSS attacks
      const sanitizedValue = sanitizeHtml(value);
      if (editorRef.current.innerHTML !== sanitizedValue) {
        editorRef.current.innerHTML = sanitizedValue;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (!isComposingRef.current && editorRef.current) {
      // Sanitize output HTML before passing to parent
      const sanitizedContent = sanitizeHtml(editorRef.current.innerHTML);
      onChange(sanitizedContent);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertImage = () => {
    const url = prompt('Enter Image URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const toolbarButtons = [
    { icon: Bold, command: 'bold', title: 'Bold (Ctrl+B)' },
    { icon: Italic, command: 'italic', title: 'Italic (Ctrl+I)' },
    { icon: Underline, command: 'underline', title: 'Underline (Ctrl+U)' },
    { icon: Heading1, command: 'formatBlock', value: '<h1>', title: 'Heading 1' },
    { icon: Heading2, command: 'formatBlock', value: '<h2>', title: 'Heading 2' },
    { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
    { icon: Quote, command: 'formatBlock', value: '<blockquote>', title: 'Quote' },
    { icon: Code, command: 'formatBlock', value: '<pre>', title: 'Code Block' },
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        {toolbarButtons.map((btn, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => execCommand(btn.command, btn.value)}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title={btn.title}
          >
            <btn.icon size={18} />
          </button>
        ))}
        <button
          type="button"
          onClick={insertLink}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Insert Link"
        >
          <LinkIcon size={18} />
        </button>
        <button
          type="button"
          onClick={insertImage}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Insert Image"
        >
          <ImageIcon size={18} />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={() => {
          isComposingRef.current = false;
          handleInput();
        }}
        className="p-4 focus:outline-none prose max-w-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}

      <style>
        {`
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #9CA3AF;
            pointer-events: none;
            display: block;
          }
          .prose h1 {
            font-size: 2em;
            font-weight: bold;
            margin: 0.67em 0;
          }
          .prose h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.75em 0;
          }
          .prose blockquote {
            border-left: 4px solid #E5E7EB;
            padding-left: 1rem;
            margin: 1rem 0;
            color: #6B7280;
          }
          .prose pre {
            background-color: #F3F4F6;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            font-family: monospace;
          }
          .prose ul, .prose ol {
            padding-left: 2rem;
            margin: 1rem 0;
          }
          .prose li {
            margin: 0.5rem 0;
          }
          .prose a {
            color: #3B82F6;
            text-decoration: underline;
          }
          .prose img {
            max-width: 100%;
            height: auto;
            margin: 1rem 0;
          }
        `}
      </style>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
