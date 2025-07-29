/**
 * Precise Geographic Cleanup
 * Removes misplaced markers and reduces density for better spread
 */

import { db } from './server/db';
import { clinics } from './shared/schema';
import { eq, and, or, gt, lt, inArray } from 'drizzle-orm';

async function cleanupGeographicAccuracy() {
  console.log('🎯 Starting Precise Geographic Cleanup');
  console.log('Goal: Accurate placement with better distribution\n');

  try {
    let removedCount = 0;

    // 1. Remove obviously misplaced centers
    console.log('🗺️  Step 1: Removing geographically misplaced centers...');
    
    // Las Vegas should be in Nevada, not California
    const lasVegasCA = await db.select()
      .from(clinics)
      .where(and(eq(clinics.state, 'CA'), eq(clinics.city, 'LAS VEGAS')));
    
    if (lasVegasCA.length > 0) {
      await db.delete(clinics)
        .where(and(eq(clinics.state, 'CA'), eq(clinics.city, 'LAS VEGAS')));
      console.log(`✅ Removed ${lasVegasCA.length} Las Vegas centers incorrectly placed in California`);
      removedCount += lasVegasCA.length;
    }

    // Remove San Francisco centers that are actually in Southern California coordinates
    const misplacedSF = await db.select()
      .from(clinics)
      .where(and(
        eq(clinics.state, 'CA'),
        or(
          eq(clinics.city, 'SAN FRANCISCO'),
          eq(clinics.city, 'San Francisco')
        ),
        lt(clinics.latitude, 35) // Should be around 37.7+ for SF
      ));
    
    if (misplacedSF.length > 0) {
      await db.delete(clinics)
        .where(and(
          eq(clinics.state, 'CA'),
          or(
            eq(clinics.city, 'SAN FRANCISCO'),
            eq(clinics.city, 'San Francisco')
          ),
          lt(clinics.latitude, 35)
        ));
      console.log(`✅ Removed ${misplacedSF.length} San Francisco centers in wrong coordinates`);
      removedCount += misplacedSF.length;
    }

    // 2. Reduce excessive clustering in major cities
    console.log('\n📍 Step 2: Reducing excessive clustering...');
    
    const overclusteredCities = [
      { city: 'BROOKLYN', state: 'New York', maxKeep: 15 },
      { city: 'CHICAGO', state: 'Illinois', maxKeep: 20 },
      { city: 'MIAMI', state: 'Florida', maxKeep: 15 },
      { city: 'HOUSTON', state: 'Texas', maxKeep: 15 },
      { city: 'COLORADO SPRINGS', state: 'Colorado', maxKeep: 12 },
      { city: 'ORLANDO', state: 'Florida', maxKeep: 12 },
      { city: 'LOS ANGELES', state: 'California', maxKeep: 15 },
      { city: 'SAN DIEGO', state: 'California', maxKeep: 15 },
      { city: 'DENVER', state: 'Colorado', maxKeep: 15 },
      { city: 'PHOENIX', state: 'Arizona', maxKeep: 15 },
      { city: 'ALBUQUERQUE', state: 'New Mexico', maxKeep: 12 }
    ];

    for (const cityData of overclusteredCities) {
      const cityCount = await db.select()
        .from(clinics)
        .where(and(
          eq(clinics.city, cityData.city),
          eq(clinics.state, cityData.state)
        ));

      if (cityCount.length > cityData.maxKeep) {
        const excessCount = cityCount.length - cityData.maxKeep;
        
        // Keep the first maxKeep centers, remove the rest
        const centersToRemove = cityCount.slice(cityData.maxKeep);
        const idsToRemove = centersToRemove.map(center => center.id);
        
        await db.delete(clinics)
          .where(inArray(clinics.id, idsToRemove));
        
        console.log(`✅ Reduced ${cityData.city}, ${cityData.state} from ${cityCount.length} to ${cityData.maxKeep} centers`);
        removedCount += excessCount;
      }
    }

    // 3. Remove duplicate/very close centers in same city
    console.log('\n🔍 Step 3: Removing duplicate centers in same locations...');
    
    // Find centers with identical coordinates (likely duplicates)
    const duplicateCoords = await db.select()
      .from(clinics)
      .groupBy(clinics.latitude, clinics.longitude, clinics.city, clinics.state)
      .having(gt(clinics.id, 1)); // This is a rough way to find groups
    
    // For now, let's remove centers that are suspiciously close to each other
    const allCenters = await db.select({
      id: clinics.id,
      name: clinics.name,
      city: clinics.city,
      state: clinics.state,
      latitude: clinics.latitude,
      longitude: clinics.longitude
    }).from(clinics);

    let duplicatesRemoved = 0;
    const processedIds = new Set<string>();
    
    for (const center of allCenters) {
      if (processedIds.has(center.id)) continue;
      
      // Find other centers very close to this one (same city, very close coordinates)
      const veryClose = allCenters.filter(other => 
        other.id !== center.id &&
        !processedIds.has(other.id) &&
        other.city === center.city &&
        other.state === center.state &&
        Math.abs(other.latitude - center.latitude) < 0.001 &&
        Math.abs(other.longitude - center.longitude) < 0.001
      );
      
      if (veryClose.length > 0) {
        // Keep the first one, remove the duplicates
        const toRemove = veryClose.slice(0, Math.min(veryClose.length, 3)); // Don't remove too many at once
        for (const duplicate of toRemove) {
          await db.delete(clinics).where(eq(clinics.id, duplicate.id));
          processedIds.add(duplicate.id);
          duplicatesRemoved++;
        }
      }
      
      processedIds.add(center.id);
      
      // Prevent too many operations at once
      if (duplicatesRemoved > 50) break;
    }
    
    if (duplicatesRemoved > 0) {
      console.log(`✅ Removed ${duplicatesRemoved} duplicate/very close centers`);
      removedCount += duplicatesRemoved;
    }

    // 4. Verify state boundary accuracy for major states
    console.log('\n🗺️  Step 4: Verifying state boundary accuracy...');
    
    const stateChecks = [
      { state: 'California', minLat: 32.5, maxLat: 42, minLng: -124.5, maxLng: -114 },
      { state: 'CA', minLat: 32.5, maxLat: 42, minLng: -124.5, maxLng: -114 },
      { state: 'Texas', minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
      { state: 'Florida', minLat: 24.5, maxLat: 31, minLng: -87.5, maxLng: -80 },
      { state: 'New York', minLat: 40.5, maxLat: 45, minLng: -80, maxLng: -71 }
    ];

    for (const check of stateChecks) {
      const outOfBounds = await db.select()
        .from(clinics)
        .where(and(
          eq(clinics.state, check.state),
          or(
            lt(clinics.latitude, check.minLat),
            gt(clinics.latitude, check.maxLat),
            lt(clinics.longitude, check.minLng),
            gt(clinics.longitude, check.maxLng)
          )
        ));

      if (outOfBounds.length > 0) {
        await db.delete(clinics)
          .where(and(
            eq(clinics.state, check.state),
            or(
              lt(clinics.latitude, check.minLat),
              gt(clinics.latitude, check.maxLat),
              lt(clinics.longitude, check.minLng),
              gt(clinics.longitude, check.maxLng)
            )
          ));
        
        console.log(`✅ Removed ${outOfBounds.length} centers outside ${check.state} boundaries`);
        removedCount += outOfBounds.length;
      }
    }

    // Final statistics
    const finalCount = await db.select().from(clinics).then(results => results.length);
    console.log('\n📊 Geographic Cleanup Summary:');
    console.log(`🗑️  Total centers removed: ${removedCount}`);
    console.log(`📍 Final database size: ${finalCount} centers`);
    console.log(`🎯 Result: Better geographic spread with accurate positioning`);
    
    // Sample distribution check
    const stateDistribution = await db.select()
      .from(clinics)
      .groupBy(clinics.state)
      .orderBy(clinics.state);
    
    console.log('\n🗺️  Geographic Distribution:');
    const sampleStates = await db.execute(`
      SELECT state, COUNT(*) as count 
      FROM clinics 
      GROUP BY state 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    console.log('Top 10 states by center count:');
    sampleStates.rows.forEach((row: any) => {
      console.log(`  ${row.state}: ${row.count} centers`);
    });

    console.log('\n✅ Geographic cleanup completed!');
    console.log('Markers are now properly spread out with accurate positioning.');

  } catch (error) {
    console.error('❌ Geographic cleanup failed:', error);
  }
}

// Execute the cleanup
cleanupGeographicAccuracy();