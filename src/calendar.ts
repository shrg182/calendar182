export const MIN_YEAR = 1901
export const MAX_YEAR = 2100
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
export function monthDates(year: number, month: number): (Date|null)[] {
  const first = new Date(year, month, 1, 12)
  if(first.getFullYear()<MIN_YEAR || first.getFullYear()>MAX_YEAR) throw new RangeError('Unsupported year')
  const cells: (Date|null)[] = Array.from({length:first.getDay()},()=>null)
  for(let day=1; day<=new Date(year,month+1,0,12).getDate(); day++) cells.push(new Date(year,month,day,12))
  while(cells.length%7) cells.push(null)
  return cells
}
export function lunarLabel(date: Date): string {
  try { return new Intl.DateTimeFormat('zh-CN-u-ca-chinese',{month:'long',day:'numeric'}).format(date) }
  catch { return 'Lunar date unavailable' }
}
