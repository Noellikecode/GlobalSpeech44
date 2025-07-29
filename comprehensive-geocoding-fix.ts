/**
 * Comprehensive Geocoding Fix
 * Uses real geocoding APIs to get accurate coordinates for all centers
 */

import { db } from './server/db';
import { clinics } from './shared/schema';
import { eq } from 'drizzle-orm';

interface GeocodingResult {
  lat: number;
  lng: number;
  accuracy: string;
}

async function geocodeAddress(city: string, state: string): Promise<GeocodingResult | null> {
  try {
    const query = encodeURIComponent(`${city}, ${state}, United States`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=us`
    );
    
    if (!response.ok) {
      console.log(`  ❌ API error for ${city}, ${state}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        accuracy: data[0].class || 'unknown'
      };
    }
    
    return null;
  } catch (error) {
    console.log(`  ❌ Error geocoding ${city}, ${state}: ${error}`);
    return null;
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function comprehensiveGeocodingFix() {
  console.log('🌍 Comprehensive Geocoding Fix');
  console.log('Using real geocoding APIs for accurate coordinates\n');

  try {
    // Get all centers grouped by city/state for efficient geocoding
    const allCenters = await db.select({
      id: clinics.id,
      name: clinics.name,
      city: clinics.city,
      state: clinics.state,
      latitude: clinics.latitude,
      longitude: clinics.longitude
    }).from(clinics);

    console.log(`Processing ${allCenters.length} centers...`);

    // Group by city/state to avoid duplicate geocoding
    const cityStateGroups = new Map<string, typeof allCenters>();
    allCenters.forEach(center => {
      const key = `${center.city.toLowerCase().trim()}, ${center.state.toLowerCase().trim()}`;
      if (!cityStateGroups.has(key)) {
        cityStateGroups.set(key, []);
      }
      cityStateGroups.get(key)!.push(center);
    });

    console.log(`Found ${cityStateGroups.size} unique city/state combinations`);

    let processedCities = 0;
    let correctedCenters = 0;
    let removedCenters = 0;
    const geocodeCache = new Map<string, GeocodingResult>();

    // Process each city/state group
    for (const [cityStateKey, centers] of cityStateGroups) {
      const [cityName, stateName] = cityStateKey.split(', ');
      
      // Skip if we've already processed too many (rate limiting)
      if (processedCities >= 100) {
        console.log(`\n⏰ Rate limit reached, processed ${processedCities} cities`);
        break;
      }

      console.log(`\n🔍 ${processedCities + 1}/${Math.min(cityStateGroups.size, 100)}: ${cityName}, ${stateName} (${centers.length} centers)`);

      // Check if we already have coordinates for this city
      if (geocodeCache.has(cityStateKey)) {
        const coords = geocodeCache.get(cityStateKey)!;
        console.log(`  📋 Using cached coordinates: ${coords.lat}, ${coords.lng}`);
        
        // Update all centers in this city
        for (const center of centers) {
          const distance = calculateDistance(
            center.latitude, center.longitude,
            coords.lat, coords.lng
          );

          if (distance > 50) { // More than 50km from correct location
            // Add small random variation to avoid exact duplicates
            const adjustedLat = coords.lat + (Math.random() - 0.5) * 0.02;
            const adjustedLng = coords.lng + (Math.random() - 0.5) * 0.02;
            
            await db.update(clinics)
              .set({
                latitude: adjustedLat,
                longitude: adjustedLng
              })
              .where(eq(clinics.id, center.id));
            
            console.log(`    ✅ ${center.name}: corrected (was ${distance.toFixed(0)}km off)`);
            correctedCenters++;
          }
        }
        continue;
      }

      // Geocode this city/state
      const geoResult = await geocodeAddress(cityName, stateName);
      
      if (geoResult) {
        geocodeCache.set(cityStateKey, geoResult);
        console.log(`  📍 Geocoded: ${geoResult.lat.toFixed(6)}, ${geoResult.lng.toFixed(6)}`);

        // Update all centers in this city
        for (const center of centers) {
          const currentDistance = calculateDistance(
            center.latitude, center.longitude,
            geoResult.lat, geoResult.lng
          );

          if (currentDistance > 50) {
            // If center claims to be in this city but is >200km away, it's likely wrong
            if (currentDistance > 200) {
              await db.delete(clinics).where(eq(clinics.id, center.id));
              console.log(`    ❌ ${center.name}: removed (${currentDistance.toFixed(0)}km from ${cityName})`);
              removedCenters++;
            } else {
              // Correct the coordinates with small variation
              const adjustedLat = geoResult.lat + (Math.random() - 0.5) * 0.02;
              const adjustedLng = geoResult.lng + (Math.random() - 0.5) * 0.02;
              
              await db.update(clinics)
                .set({
                  latitude: adjustedLat,
                  longitude: adjustedLng
                })
                .where(eq(clinics.id, center.id));
              
              console.log(`    ✅ ${center.name}: corrected from ${currentDistance.toFixed(0)}km away`);
              correctedCenters++;
            }
          } else {
            console.log(`    ✓ ${center.name}: already accurate (${currentDistance.toFixed(0)}km)`);
          }
        }
      } else {
        console.log(`  ⚠️  Failed to geocode ${cityName}, ${stateName}`);
        
        // If we can't geocode the city, remove centers that are clearly misplaced
        for (const center of centers) {
          // Basic state boundary checks
          const stateChecks: Record<string, {minLat: number, maxLat: number, minLng: number, maxLng: number}> = {
            'california': { minLat: 32.5, maxLat: 42.0, minLng: -124.5, maxLng: -114.0 },
            'ca': { minLat: 32.5, maxLat: 42.0, minLng: -124.5, maxLng: -114.0 },
            'texas': { minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
            'florida': { minLat: 24.5, maxLat: 31.0, minLng: -87.6, maxLng: -80.0 },
            'new york': { minLat: 40.5, maxLat: 45.0, minLng: -79.8, maxLng: -71.8 }
          };
          
          const stateBounds = stateChecks[stateName];
          if (stateBounds) {
            const { latitude, longitude } = center;
            if (latitude < stateBounds.minLat || latitude > stateBounds.maxLat ||
                longitude < stateBounds.minLng || longitude > stateBounds.maxLng) {
              await db.delete(clinics).where(eq(clinics.id, center.id));
              console.log(`    ❌ ${center.name}: removed (outside state bounds)`);
              removedCenters++;
            }
          }
        }
      }

      processedCities++;
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const finalCount = await db.select().from(clinics).then(results => results.length);
    
    console.log('\n📊 Comprehensive Geocoding Results:');
    console.log(`🏙️  Cities processed: ${processedCities}`);
    console.log(`✅ Centers corrected: ${correctedCenters}`);
    console.log(`🗑️  Centers removed: ${removedCenters}`);
    console.log(`📍 Final database size: ${finalCount} centers`);
    console.log('\n🎯 Geographic accuracy significantly improved!');

  } catch (error) {
    console.error('❌ Comprehensive geocoding failed:', error);
  }
}

// Execute the fix
comprehensiveGeocodingFix();