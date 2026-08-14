import { useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ChevronDown, Indent, Outdent
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = "120px" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync value from prop only if it differs from current innerHTML
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (!isInternalChange.current) {
        editorRef.current.innerHTML = value || '';
      }
      isInternalChange.current = false;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const colors = [
    { name: 'Negro', value: '#0f172a' },
    { name: 'Gris', value: '#64748b' },
    { name: 'Rojo', value: '#dc2626' },
    { name: 'Azul', value: '#2563eb' },
    { name: 'Verde', value: '#16a34a' },
    { name: 'Naranja', value: '#ea580c' },
    { name: 'Púrpura', value: '#9333ea' }
  ];

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 select-none">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Negrita"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Cursiva"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Subrayado"
        >
          <Underline size={14} />
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('justifyLeft')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Alinear a la izquierda"
        >
          <AlignLeft size={14} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyCenter')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Centrado"
        >
          <AlignCenter size={14} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyRight')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Alinear a la derecha"
        >
          <AlignRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('justifyFull')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Justificado"
        >
          <AlignJustify size={14} />
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Lista con viñetas"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Lista numerada"
        >
          <ListOrdered size={14} />
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('outdent')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Disminuir sangría"
        >
          <Outdent size={14} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('indent')}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors cursor-pointer"
          title="Aumentar sangría"
        >
          <Indent size={14} />
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        {/* Color picker dropdown */}
        <div className="relative group">
          <button
            type="button"
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors flex items-center gap-1 cursor-pointer"
            title="Color de texto"
          >
            <div className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: 'currentColor' }} />
            <ChevronDown size={10} />
          </button>
          <div className="absolute left-0 mt-1 hidden group-hover:flex bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 gap-1 z-50 min-w-[120px]">
            {colors.map(color => (
              <button
                key={color.value}
                type="button"
                onClick={() => executeCommand('foreColor', color.value)}
                className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .rich-text-content blockquote {
          margin-left: 2rem !important;
          border-left: 2px solid #cbd5e1;
          padding-left: 0.5rem;
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
        .rich-text-content ul { list-style-type: disc !important; padding-left: 1.25rem !important; margin-bottom: 0.5rem; }
        .rich-text-content ol { list-style-type: decimal !important; padding-left: 1.25rem !important; margin-bottom: 0.5rem; }
      `}</style>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            // Insert 4 non-breaking spaces representing a tab
            document.execCommand('insertText', false, '\u00a0\u00a0\u00a0\u00a0');
            handleInput();
          }
        }}
        className="w-full px-4 py-3 outline-none text-sm text-gray-800 bg-white min-h-[100px] overflow-y-auto rich-text-content"
        style={{ minHeight }}
        placeholder={placeholder}
      />
    </div>
  );
}
