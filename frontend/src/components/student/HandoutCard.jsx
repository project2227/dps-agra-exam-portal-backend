import api from '../../services/api'
import { Download, File, FileArchive, FileImage, FileText, Presentation, Trash2 } from 'lucide-react'
import { formatBytes, formatDate } from '../../utils/format'

const ICONS = {
  pdf: [FileText, 'text-red-300 bg-red-500/10'],
  doc: [FileText, 'text-sky-300 bg-sky-500/10'],
  ppt: [Presentation, 'text-orange-300 bg-dps-orange/10'],
  zip: [FileArchive, 'text-dps-gold bg-dps-gold/10'],
  image: [FileImage, 'text-dps-neon bg-dps-green/10'],
}

export default function HandoutCard({ handout, onDelete }) {
  const download = async () => {
    try {
      const url = await api.downloadHandout(handout.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) { window.alert(err.message) }
  }
  const [Icon, cls] = ICONS[handout.type] || [File, 'text-slate-300 bg-white/5']
  return (
    <div className="glass flex items-center gap-4 p-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${cls}`}><Icon size={20} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">{handout.title}</p>
        <p className="truncate text-xs text-slate-400">
          {handout.fileName} | {formatBytes(handout.size)} | Class {handout.class}
          {handout.sections?.length && !handout.sections.includes('All') ? ` (${handout.sections.join(', ')})` : ''} | {formatDate(handout.uploadedAt)}
        </p>
      </div>
      <button type="button" onClick={download} className="btn btn-ghost btn-sm" aria-label={`Download ${handout.title}`}>
        <Download size={14} aria-hidden="true" /><span className="hidden sm:inline">Download</span>
      </button>
      {onDelete && (
        <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(handout)} aria-label={`Delete ${handout.title}`}><Trash2 size={14} /></button>
      )}
    </div>
  )
}
