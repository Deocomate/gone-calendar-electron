declare module 'ical.js' {
  export function parse(input: string): any[]

  export class Component {
    constructor(jCal: any[] | string, parent?: Component)
    name: string
    addSubcomponent(component: Component): Component
    addPropertyWithValue(name: string, value: any): Property
    getFirstSubcomponent(name: string): Component | null
    getAllSubcomponents(name: string): Component[]
    getFirstPropertyValue<T = any>(name: string): T | null
    getFirstProperty(name: string): Property | null
    getAllProperties(name: string): Property[]
    toString(): string
  }

  export class Property {
    constructor(jCal: any[] | string, parent?: Component)
    name: string
    type: string
    getFirstValue<T = any>(): T
    getValues<T = any>(): T[]
    getParameter(name: string): string | null
    setParameter(name: string, value: string): void
  }

  export class Time {
    static fromJSDate(date: Date, isUtc?: boolean): Time
    static fromISOString(isoString: string): Time
    static fromString(str: string): Time
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
    isDate: boolean
    timezone: string
    toJSDate(): Date
    toString(): string
  }

  export class Event {
    constructor(component?: Component)
    uid: string
    summary: string
    description: string
    location: string
    startDate: Time
    endDate: Time
    duration: any
    isRecurring(): boolean
    component: Component
  }
}
