import lunarCalendar from 'lunar-javascript'
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
// Pass civil components, never the device-local instant, to the UTC+8 calendar.
const lunarHolidays: Record<string,string> = {
  '1-1':'春节', '1-15':'元宵节', '5-5':'端午节', '7-7':'七夕',
  '7-15':'中元节', '8-15':'中秋节', '9-9':'重阳节', '12-8':'腊八节',
}
const solarHolidays: Record<string,string> = {
  '1-1':'元旦', '2-14':'情人节', '5-1':'劳动节', '6-1':'儿童节',
  '10-1':'国庆节', '12-25':'圣诞节',
}
const months = ['正','二','三','四','五','六','七','八','九','十','十一','十二']
export function dateLabels(date: Date) {
  const solar = lunarCalendar.Solar.fromYmd(date.getFullYear(),date.getMonth()+1,date.getDate())
  const lunar = solar.getLunar()
  const month = lunar.getMonth()
  const monthName = `${month<0?'闰':''}${months[Math.abs(month)-1]}月`
  const dayName = lunar.getDayInChinese()
  const holidays = [solarHolidays[`${date.getMonth()+1}-${date.getDate()}`]]
  if(month>0) holidays.push(lunarHolidays[`${month}-${lunar.getDay()}`])
  const tomorrow = solar.next(1).getLunar()
  if(tomorrow.getMonth()===1 && tomorrow.getDay()===1) holidays.push('除夕')
  const special = [...new Set(holidays.filter((value):value is string=>Boolean(value)))]
  const term = lunar.getJieQi()
  if(term && !special.includes(term)) special.push(term)
  return {
    month, day:lunar.getDay(), monthName, dayName, term,
    lunar: `${monthName}${dayName}`,
    compact: special.length ? special.join(' · ') : lunar.getDay()===1 ? monthName : dayName,
    special,
  }
}
export function lunarLabel(date: Date): string { return dateLabels(date).lunar }
