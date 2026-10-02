import { AlertTriangle, CheckCircle2, Circle, Clock, FileEdit, WifiOff, XCircle, Radio, ShieldAlert, Info } from 'lucide-react'
import Badge from './Badge'
const MAP = {
  live: ['Live','success',Radio,true], active: ['Active','success',Radio,true],
  upcoming: ['Upcoming','info',Clock], ended: ['Ended','neutral',Circle], draft: ['Draft','neutral',FileEdit],
  submitted: ['Submitted','info',CheckCircle2], reviewed: ['Reviewed','success',CheckCircle2], 'auto-checked': ['Auto-checked','info',CheckCircle2],
  idle: ['Idle','neutral',Clock], disconnected: ['Offline','warning',WifiOff], flagged: ['Flagged','danger',ShieldAlert],
  high: ['High','danger',AlertTriangle], medium: ['Medium','warning',AlertTriangle], low: ['Low','neutral',Info], info: ['Info','info',Info],
  passed: ['Passed','success',CheckCircle2], failed: ['Failed','danger',XCircle], connecting: ['Connecting','info',Radio],
}
export default function StatusBadge({status,label,className=''}) {
  const [text,tone,icon,live] = MAP[status] || [status,'neutral',Circle]
  return <Badge tone={tone} icon={icon} live={live} className={className}>{label || text}</Badge>
}
