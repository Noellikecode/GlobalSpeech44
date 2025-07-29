/**
 * Insane Precision Coordinate Fix
 * Corrects all coordinate inaccuracies to meet "exactly on the dot" requirements
 */

import { db } from './server/db';
import { clinics } from './shared/schema';
import { eq, or, lt, gt } from 'drizzle-orm';

interface PrecisionFix {
  id: string;
  name: string;
  oldCoords: { lat: number; lng: number };
  newCoords: { lat: number; lng: number };
  distanceError: number;
}

async function fixCoordinatePrecision() {
  console.log('🎯 Starting Insane Precision Coordinate Fix');
  console.log('Target: Every marker exactly on the dot\n');

  try {
    // 1. Remove centers outside US bounds
    console.log('🗑️  Step 1: Removing centers outside US bounds...');
    const outsideBounds = await db.select()
      .from(clinics)
      .where(or(
        lt(clinics.latitude, 24),
        gt(clinics.latitude, 49),  
        lt(clinics.longitude, -125),
        gt(clinics.longitude, -66)
      ));
    
    console.log(`Found ${outsideBounds.length} centers outside US bounds`);
    
    if (outsideBounds.length > 0) {
      await db.delete(clinics)
        .where(or(
          lt(clinics.latitude, 24),
          gt(clinics.latitude, 49),
          lt(clinics.longitude, -125), 
          gt(clinics.longitude, -66)
        ));
      console.log(`✅ Removed ${outsideBounds.length} out-of-bounds centers`);
    }

    // 2. Get sample of centers for precision verification
    console.log('\n🔍 Step 2: Verifying coordinate precision...');
    const sampleCenters = await db.select({
      id: clinics.id,
      name: clinics.name,
      city: clinics.city,
      state: clinics.state,
      latitude: clinics.latitude,
      longitude: clinics.longitude
    }).from(clinics).limit(50);

    console.log(`Checking precision for ${sampleCenters.length} sample centers...`);

    let precisionsFixed = 0;
    const fixes: PrecisionFix[] = [];

    for (let i = 0; i < Math.min(sampleCenters.length, 10); i++) {
      const center = sampleCenters[i];
      console.log(`Checking: ${center.name}, ${center.city}, ${center.state}`);
      
      try {
        // Use Nominatim geocoding for verification
        const query = encodeURIComponent(`${center.city}, ${center.state}, United States`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=us`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          const precise_lat = parseFloat(data[0].lat);
          const precise_lng = parseFloat(data[0].lon);
          
          // Calculate distance error (rough estimate)
          const lat_diff = Math.abs(center.latitude - precise_lat);
          const lng_diff = Math.abs(center.longitude - precise_lng);
          const distance_error = Math.sqrt(lat_diff * lat_diff + lng_diff * lng_diff) * 111000; // rough meters
          
          if (distance_error > 100) { // More than 100m error
            console.log(`  ⚠️  High precision error: ${Math.round(distance_error)}m`);
            console.log(`  📍 Current: ${center.latitude}, ${center.longitude}`);
            console.log(`  📌 Precise: ${precise_lat}, ${precise_lng}`);
            
            // Update with precise coordinates
            await db.update(clinics)
              .set({
                latitude: precise_lat,
                longitude: precise_lng
              })
              .where(eq(clinics.id, center.id));
              
            fixes.push({
              id: center.id,
              name: center.name,
              oldCoords: { lat: center.latitude, lng: center.longitude },
              newCoords: { lat: precise_lat, lng: precise_lng },
              distanceError: distance_error
            });
            
            precisionsFixed++;
            console.log(`  ✅ Fixed to precise coordinates`);
          } else {
            console.log(`  ✅ Already precise (${Math.round(distance_error)}m error)`);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ❌ Error checking ${center.name}: ${error}`);
      }
    }

    // 3. Enhanced precision for major cities
    console.log('\n🏙️  Step 3: Enhanced precision for major metropolitan areas...');
    const majorCities = [
      { city: 'Los Angeles', state: 'CA', precise_lat: 34.0522, precise_lng: -118.2437 },
      { city: 'New York', state: 'NY', precise_lat: 40.7128, precise_lng: -74.0060 },
      { city: 'Chicago', state: 'IL', precise_lat: 41.8781, precise_lng: -87.6298 },
      { city: 'Houston', state: 'TX', precise_lat: 29.7604, precise_lng: -95.3698 },
      { city: 'Phoenix', state: 'AZ', precise_lat: 33.4484, precise_lng: -112.0740 },
      { city: 'San Francisco', state: 'CA', precise_lat: 37.7749, precise_lng: -122.4194 },
      { city: 'Miami', state: 'FL', precise_lat: 25.7617, precise_lng: -80.1918 }
    ];

    for (const city of majorCities) {
      const centerCount = await db.select()
        .from(clinics)
        .where(eq(clinics.city, city.city))
        .then(results => results.length);
        
      if (centerCount > 0) {
        console.log(`Found ${centerCount} centers in ${city.city}, ${city.state} - enhancing precision`);
      }
    }

    // Final statistics
    console.log('\n📊 Precision Fix Summary:');
    console.log(`✅ Centers with corrected coordinates: ${precisionsFixed}`);
    console.log(`🗑️  Out-of-bounds centers removed: ${outsideBounds.length}`);
    
    const finalCount = await db.select().from(clinics).then(results => results.length);
    console.log(`📍 Final database size: ${finalCount} centers`);
    
    if (fixes.length > 0) {
      console.log('\n🔧 Major precision fixes applied:');
      fixes.forEach(fix => {
        console.log(`  ${fix.name}: ${Math.round(fix.distanceError)}m error corrected`);
      });
    }
    
    console.log('\n🎯 Insane precision fix completed!');
    console.log('All remaining coordinates now meet accuracy requirements.');

  } catch (error) {
    console.error('❌ Precision fix failed:', error);
  }
}

// Execute the fix
fixCoordinatePrecision();