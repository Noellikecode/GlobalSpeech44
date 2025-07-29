import { db } from './db';
import { clinics } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ValidationResult {
  id: string;
  name: string;
  address: string;
  providedCoords: { lat: number; lng: number };
  validatedCoords?: { lat: number; lng: number };
  distanceError?: number; // meters
  confidenceScore: number; // 0-100
  issues: string[];
  correctionNeeded: boolean;
  reverseGeocodingMatch: boolean;
  forwardGeocodingMatch: boolean;
}

interface GeocodeResponse {
  lat: number;
  lng: number;
  address: string;
  confidence: number;
}

export class GeographicValidator {
  private readonly PRECISION_THRESHOLD = 10; // meters
  private readonly CONFIDENCE_THRESHOLD = 90; // percentage
  private readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  
  constructor() {
    // Rate limiting for Nominatim API (1 request per second)
    this.delay = this.delay.bind(this);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Forward geocoding: Address -> Coordinates
  private async forwardGeocode(address: string, city: string, state: string): Promise<GeocodeResponse | null> {
    try {
      await this.delay(1100); // Respect Nominatim rate limits
      
      const query = encodeURIComponent(`${address}, ${city}, ${state}, USA`);
      const url = `${this.NOMINATIM_BASE_URL}/search?format=json&q=${query}&limit=1&countrycodes=us&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SpeechAccessMap/1.0 (contact@speechaccess.app)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.length === 0) {
        return null;
      }
      
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address: result.display_name,
        confidence: parseFloat(result.importance) * 100 || 50
      };
    } catch (error) {
      console.error(`Forward geocoding error for ${address}:`, error);
      return null;
    }
  }

  // Reverse geocoding: Coordinates -> Address
  private async reverseGeocode(lat: number, lng: number): Promise<GeocodeResponse | null> {
    try {
      await this.delay(1100); // Respect Nominatim rate limits
      
      const url = `${this.NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SpeechAccessMap/1.0 (contact@speechaccess.app)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || data.error) {
        return null;
      }
      
      return {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        address: data.display_name,
        confidence: parseFloat(data.importance) * 100 || 50
      };
    } catch (error) {
      console.error(`Reverse geocoding error for ${lat}, ${lng}:`, error);
      return null;
    }
  }

  // Calculate distance between two points using Haversine formula
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  // Validate address components against expected location
  private validateAddressComponents(
    providedAddress: string, 
    providedCity: string, 
    providedState: string,
    geocodedAddress: string
  ): { cityMatch: boolean; stateMatch: boolean; issues: string[] } {
    const issues: string[] = [];
    const geocodedLower = geocodedAddress.toLowerCase();
    const providedCityLower = providedCity.toLowerCase();
    const providedStateLower = providedState.toLowerCase();
    
    const cityMatch = geocodedLower.includes(providedCityLower);
    const stateMatch = geocodedLower.includes(providedStateLower);
    
    if (!cityMatch) {
      issues.push(`City mismatch: Expected ${providedCity}, but geocoded address suggests different city`);
    }
    
    if (!stateMatch) {
      issues.push(`State mismatch: Expected ${providedState}, but geocoded address suggests different state`);
    }
    
    return { cityMatch, stateMatch, issues };
  }

  // Validate a single clinic location
  async validateLocation(clinic: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      id: clinic.id,
      name: clinic.name,
      address: clinic.address || 'No address provided',
      providedCoords: { lat: clinic.latitude, lng: clinic.longitude },
      confidenceScore: 0,
      issues: [],
      correctionNeeded: false,
      reverseGeocodingMatch: false,
      forwardGeocodingMatch: false
    };

    // Check if coordinates are valid
    if (!clinic.latitude || !clinic.longitude || 
        isNaN(clinic.latitude) || isNaN(clinic.longitude)) {
      result.issues.push('Invalid or missing coordinates');
      result.correctionNeeded = true;
      return result;
    }

    // Check if coordinates are in reasonable ranges
    if (clinic.latitude < 24 || clinic.latitude > 49 || 
        clinic.longitude < -125 || clinic.longitude > -66) {
      result.issues.push('Coordinates outside continental US bounds');
      result.correctionNeeded = true;
    }

    try {
      // Reverse geocoding check
      const reverseResult = await this.reverseGeocode(clinic.latitude, clinic.longitude);
      
      if (reverseResult) {
        const addressValidation = this.validateAddressComponents(
          clinic.address || '',
          clinic.city,
          clinic.state,
          reverseResult.address
        );
        
        result.reverseGeocodingMatch = addressValidation.cityMatch && addressValidation.stateMatch;
        result.issues.push(...addressValidation.issues);
        
        if (result.reverseGeocodingMatch) {
          result.confidenceScore += 50;
        }
      } else {
        result.issues.push('Reverse geocoding failed - coordinates may be invalid');
        result.correctionNeeded = true;
      }

      // Forward geocoding check (if address is available)
      if (clinic.address && clinic.city && clinic.state) {
        const forwardResult = await this.forwardGeocode(clinic.address, clinic.city, clinic.state);
        
        if (forwardResult) {
          const distance = this.calculateDistance(
            clinic.latitude, clinic.longitude,
            forwardResult.lat, forwardResult.lng
          );
          
          result.validatedCoords = { lat: forwardResult.lat, lng: forwardResult.lng };
          result.distanceError = distance;
          
          if (distance <= this.PRECISION_THRESHOLD) {
            result.forwardGeocodingMatch = true;
            result.confidenceScore += 40;
          } else {
            result.issues.push(`Location precision error: ${Math.round(distance)}m from expected coordinates`);
            result.correctionNeeded = distance > 100; // Flag for correction if >100m off
          }
          
          result.confidenceScore += Math.max(0, forwardResult.confidence - 50);
        } else {
          result.issues.push('Forward geocoding failed - address may be invalid');
        }
      } else {
        result.issues.push('Insufficient address data for forward geocoding validation');
      }

      // Final confidence calculation
      result.confidenceScore = Math.min(100, Math.max(0, result.confidenceScore));
      
      if (result.confidenceScore < this.CONFIDENCE_THRESHOLD) {
        result.correctionNeeded = true;
      }

    } catch (error) {
      result.issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.correctionNeeded = true;
    }

    return result;
  }

  // Validate all clinics in batches
  async validateAllLocations(batchSize: number = 10): Promise<ValidationResult[]> {
    console.log('Starting comprehensive geographic validation...');
    
    const allClinics = await db.select().from(clinics);
    const results: ValidationResult[] = [];
    
    console.log(`Validating ${allClinics.length} clinic locations...`);
    
    for (let i = 0; i < allClinics.length; i += batchSize) {
      const batch = allClinics.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allClinics.length/batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(clinic => this.validateLocation(clinic))
      );
      
      results.push(...batchResults);
      
      // Progress logging
      if ((i + batchSize) % 100 === 0 || i + batchSize >= allClinics.length) {
        const completed = Math.min(i + batchSize, allClinics.length);
        console.log(`Validated ${completed}/${allClinics.length} locations`);
      }
    }
    
    return results;
  }

  // Generate validation report
  generateReport(results: ValidationResult[]): {
    summary: {
      total: number;
      validated: number;
      needsCorrection: number;
      averageConfidence: number;
      precisionIssues: number;
    };
    issues: ValidationResult[];
    recommendations: string[];
  } {
    const needsCorrection = results.filter(r => r.correctionNeeded);
    const precisionIssues = results.filter(r => r.distanceError && r.distanceError > this.PRECISION_THRESHOLD);
    const totalConfidence = results.reduce((sum, r) => sum + r.confidenceScore, 0);
    
    const recommendations: string[] = [];
    
    if (needsCorrection.length > 0) {
      recommendations.push(`${needsCorrection.length} locations require immediate correction`);
    }
    
    if (precisionIssues.length > 0) {
      recommendations.push(`${precisionIssues.length} locations have precision errors >10m`);
    }
    
    const highPrecisionCount = results.filter(r => 
      r.distanceError !== undefined && r.distanceError <= this.PRECISION_THRESHOLD
    ).length;
    
    if (highPrecisionCount < results.length * 0.95) {
      recommendations.push('Consider re-geocoding locations with low precision scores');
    }
    
    return {
      summary: {
        total: results.length,
        validated: results.filter(r => !r.correctionNeeded).length,
        needsCorrection: needsCorrection.length,
        averageConfidence: Math.round(totalConfidence / results.length),
        precisionIssues: precisionIssues.length
      },
      issues: needsCorrection.sort((a, b) => a.confidenceScore - b.confidenceScore),
      recommendations
    };
  }
}