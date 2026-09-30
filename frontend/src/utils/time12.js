// Browser-native datetime-local pickers can show 24-hour clocks depending
// on operating system settings. These helpers power explicit 12-hour inputs.
export function parseLocal12(value='') {
 const m = String(value).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
 if(!m)return {date:'',hour:9,minute:'00',period:'AM'};
 const h=Number(m[2]);
 return {date:m[1],hour:h%12||12,minute:m[3],period:h>=12?'PM':'AM'};
}
export function fromLocal12({date,hour,minute,period}) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return '';
 const h=Number(hour),m=Number(minute);
 if(!Number.isInteger(h)||h<1||h>12||!Number.isInteger(m)||m<0||m>59||!['AM','PM'].includes(period))throw Error('Invalid time selection');
 const hh=(h%12)+(period==='PM'?12:0);
 return `${date}T${String(hh).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
