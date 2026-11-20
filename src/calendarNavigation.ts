export type CalendarView='year'|'month'|'week'|'day'
const min=new Date(1901,0,1,12),max=new Date(2100,11,31,12)
export function shiftView(date:Date,view:CalendarView,delta:number){
 const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12)
 if(view==='day'||view==='week')d.setDate(d.getDate()+delta*(view==='week'?7:1))
 else {const day=d.getDate();d.setDate(1);if(view==='year')d.setFullYear(d.getFullYear()+delta);else d.setMonth(d.getMonth()+delta);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()))}
 return new Date(Math.max(min.getTime(),Math.min(max.getTime(),d.getTime())))
}
