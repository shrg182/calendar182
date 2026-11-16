declare module 'lunar-javascript' {
  interface LunarDate {
    getMonth(): number
    getDay(): number
    getDayInChinese(): string
    getJieQi(): string
  }
  interface SolarDate {
    getLunar(): LunarDate
    next(days: number): SolarDate
  }
  const calendar: { Solar: { fromYmd(year: number,month: number,day: number): SolarDate } }
  export default calendar
}
