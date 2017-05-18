export interface Agency {

}


export interface Calendar {

}


export interface CalendarDates {

}


export interface FareAttributes {

}


export interface FareRules {

}


export interface FeedInfo {

}


export interface Frequency {

}


export interface Route {

}


export interface Shape {

}


export interface Stop {

}


export interface StopTime {

}


export interface Transfer {

}


export enum WheelchairAccessiblity {
	NoInfo = 0,
	Accessible = 1,
	Inaccessible = 2,
}

export interface Trip {
	route_id: string
	service_id: string
	trip_id: string
	trip_headsign?: string
	trip_short_name?: string
	direction_id?: boolean
	block_id?: string
	shape_id?: string
	wheelchair_accessible?: WheelchairAccessiblity
}
