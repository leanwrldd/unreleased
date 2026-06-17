import { useStore } from '../store/useStore'
import { ChevronLeft } from 'lucide-react'

export default function EditorPage(): JSX.Element {
  const { setActiveView } = useStore()

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-5 pt-5 pb-3 shrink-0 flex items-center gap-3">
        <button
          onClick={() => setActiveView('api-tracker')}
          className="p-1.5 rounded-lg hover:bg-surface-overlay transition-colors text-text-muted hover:text-text-primary"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-text-primary text-xl font-bold">Become an Editor</h1>
      </div>
    </div>
  )
}
