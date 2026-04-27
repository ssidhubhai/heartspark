import { Ecliptic, GeoVector, Body } from 'astronomy-engine';

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export function getZodiacSign(longitude: number): string {
  // Longitude is 0-360, each sign is 30 degrees
  const index = Math.floor(longitude / 30) % 12;
  return ZODIAC_SIGNS[index];
}

export interface AstrologicalPlacements {
  sun: string;
  moon: string;
  mercury: string;
  venus: string;
  mars: string;
}

export function calculatePlacements(dateString: string, timeString?: string): AstrologicalPlacements {
  try {
    // Combine date and time, default to noon UTC if no time provided to minimize moon error
    const dateTimeString = timeString ? `${dateString}T${timeString}:00Z` : `${dateString}T12:00:00Z`;
    const date = new Date(dateTimeString);
    
    // Fallback if invalid date
    if (isNaN(date.getTime())) {
      return { sun: 'Unknown', moon: 'Unknown', mercury: 'Unknown', venus: 'Unknown', mars: 'Unknown' };
    }

    const sunLon = Ecliptic(GeoVector(Body.Sun, date, true)).elon;
    const moonLon = Ecliptic(GeoVector(Body.Moon, date, true)).elon;
    const mercuryLon = Ecliptic(GeoVector(Body.Mercury, date, true)).elon;
    const venusLon = Ecliptic(GeoVector(Body.Venus, date, true)).elon;
    const marsLon = Ecliptic(GeoVector(Body.Mars, date, true)).elon;

    return {
      sun: getZodiacSign(sunLon),
      moon: getZodiacSign(moonLon),
      mercury: getZodiacSign(mercuryLon),
      venus: getZodiacSign(venusLon),
      mars: getZodiacSign(marsLon),
    };
  } catch (error) {
    console.error("Error calculating placements:", error);
    return { sun: 'Unknown', moon: 'Unknown', mercury: 'Unknown', venus: 'Unknown', mars: 'Unknown' };
  }
}
