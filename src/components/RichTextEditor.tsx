import { useRef } from 'react'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Image as ImageIcon,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Digite aqui o conteúdo do laudo...',
  minHeight = '360px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleInsertImage = () => {
    const url = prompt('Cole o endereço (URL) da imagem médica a inserir:')
    if (url) {
      executeCommand('insertImage', url)
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  return (
    <div className="border border-[#E5E9E7] rounded-xl overflow-hidden bg-white shadow-sm flex flex-col focus-within:ring-2 focus-within:ring-[#0C6B58]/20 focus-within:border-[#0C6B58] transition">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-[#F7F9F8] border-b border-[#E5E9E7] text-[#5F6E69]">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Negrito (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Itálico (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Sublinhado (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#E5E9E7] mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h1>')}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Título 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h2>')}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Título 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h3>')}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Título 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#E5E9E7] mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Lista com marcadores"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Lista numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#E5E9E7] mx-1" />

        <button
          type="button"
          onClick={handleInsertImage}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Inserir imagem por URL"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#E5E9E7] mx-1" />

        <button
          type="button"
          onClick={() => executeCommand('undo')}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('redo')}
          className="p-1.5 hover:bg-white hover:text-[#1F2A27] rounded transition"
          title="Refazer (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: value }}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className="p-4 outline-none text-[#1F2A27] font-serif-report text-base leading-relaxed prose max-w-none focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#8A9691] empty:before:font-sans"
      />
    </div>
  )
}
