/**
 * Airport Data Type Definitions
 */

export interface AirportData {
  country: string;
  city: string;
  timezone: string;
  flag: string;
  name?: string;
  icao?: string;
}

export interface AirportDatabase {
  [iataCode: string]: AirportData;
}

export interface HomeLocation {
  city: string;
  country: string;
  timezone: string;
  flag: string;
}
