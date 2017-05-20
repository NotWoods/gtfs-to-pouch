export interface Agency {
	_id: string
	agency_id?: string
	agency_name: string
	agency_url: string
	agency_timezone: string
	agency_lang?: string
	agency_phone?: string
	agency_fare_url?: string
	agency_email?: string
}


export type DateString = string;

export interface Calendar {
	_id: string
	service_id: string
	monday: boolean
	tuesday: boolean
	wednesday: boolean
	thursday: boolean
	friday: boolean
	saturday: boolean
	sunday: boolean
	start_date: DateString
	end_date: DateString
}


export enum ExceptionType {
	Added = 1,
	Removed = 2
}

export interface CalendarDate {
	_id: string
	service_id: string
	date: DateString
	exception_type: ExceptionType
}


export enum PaymentMethod {
	OnBoard = 0,
	BeforeBoarding = 1
}

export enum Transfers {
	None = 0,
	Once = 1,
	Twice = 2,
}

export interface FareAttribute {
	_id: string
	fare_id: string
	price: string
	currency_type: string
	payment_method: PaymentMethod
	transfers: Transfers | undefined
	transfer_duration?: number
}


export interface FareRule {
	_id: string
	fare_id: string
	route_id?: string
	origin_id?: string
	destination_id?: string
	contains_id?: string
}


export interface FeedInfo {
	_id: string
	feed_publisher_nane: string
	feed_publisher_url: string
	feed_lang: string
	feed_start_date?: DateString
	feed_end_date?: DateString
	feed_version?: string
}


export type TimeString = string;

export interface Frequency {
	_id: string
	trip_id: string
	start_time: TimeString
	end_time: TimeString
	headway_secs: number
	exact_times?: boolean
}


export enum RouteType {
	Tram = 0,
	Subway = 1,
	Rail = 2,
	Bus = 3,
	Ferry = 4,
	CableCar = 5,
	Gondola = 6,
	Funicular = 7
}

export type HexCode = string

export interface Route {
	_id: string
	route_id: string
	agency_id?: string
	route_short_name: string
	route_long_name: string
	route_desc?: string
	route_type: RouteType
	route_url?: string
	route_color?: HexCode
	route_text_color?: HexCode
}


export interface Shape {
	_id: string
	shape_id: string
	shape_pt_lat: number
	shape_pt_lon: number
	shape_pt_sequence: number
	shape_dist_traveled?: number
}


export enum LocationType {
	Stop = 0,
	Station = 1
}

export enum Avaliable {
	NoInfo = 0,
	Yes = 1,
	No = 2,
}

export interface Stop {
	_id: string
	stop_id: string
	stop_code?: string
	stop_name: string
	stop_desc?: string
	stop_lat: number
	stop_lon: number
	zone_id?: string
	stop_url?: string
	location_type?: LocationType | undefined
	parent_station?: string
	stop_timezone?: string
	wheelchair_boarding?: Avaliable
}


export enum PickupType {
	Regular = 0,
	None = 1,
	Phone = 2,
	Driver = 3
}

export interface StopTime {
	_id: string
	trip_id: string
	arrival_time: TimeString
	departure_time: TimeString
	stop_id: string
	stop_sequence: number
	stop_headsign?: string
	pickup_type?: PickupType
	drop_off_type?: PickupType
	shape_dist_traveled?: number
	timepoint?: boolean
}


export enum TransferType {
	Recommended = 0,
	Timed = 1,
	MinRequired = 2,
	NotPossible = 3
}

export interface Transfer {
	_id: string
	from_stop_id: string
	to_stop_id: string
	transfer_type: TransferType
	min_transfer_time?: number
}


export interface Trip {
	_id: string
	route_id: string
	service_id: string
	trip_id: string
	trip_headsign?: string
	trip_short_name?: string
	direction_id?: boolean
	block_id?: string
	shape_id?: string
	wheelchair_accessible?: Avaliable
	bikes_allowed?: Avaliable
}
