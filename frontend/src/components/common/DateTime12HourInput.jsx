import { parseLocal12, fromLocal12 } from '../../utils/time12'
import { formatDateTime } from '../../utils/format'
const hours=Array.from({length:12},(_,i)=>i+1)
const minutes=Array.from({length:60},(_,i)=>String(i).padStart(2,'0'))
export default function DateTime12HourInput({value='',onChange,...inputProps}) {
 const parts=parseLocal12(value);
 const change=(key,v)=>onChange(fromLocal12({...parts,[key]:v}));
 return <div className="space-y-2">
  <div className="flex flex-wrap items-center gap-2">
   <input {...inputProps} type="date" className="input min-w-[150px] flex-1" value={parts.date} onChange={e=>change('date',e.target.value)} aria-label="Date"/>
   <select aria-label="Hour (12-hour clock)" className="input w-[68px] px-2" value={parts.hour} onChange={e=>change('hour',Number(e.target.value))}>{hours.map(h=><option key={h} value={h}>{h}</option>)}</select>
   <span aria-hidden="true" className="text-lg">:</span>
   <select aria-label="Minute" className="input w-[75px] px-2" value={parts.minute} onChange={e=>change('minute',e.target.value)}>{minutes.map(m=><option key={m} value={m}>{m}</option>)}</select>
   <select aria-label="AM or PM" className="input w-[78px] px-2" value={parts.period} onChange={e=>change('period',e.target.value)}><option value="AM">AM</option><option value="PM">PM</option></select>
  </div>
  <p className="text-xs text-slate-400" aria-live="polite">{value?`Selected: ${formatDateTime(value)} (your device's local time)`:'Select a date and 12-hour time.'}</p>
 </div>;
}
