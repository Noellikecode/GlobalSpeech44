/**
 * Final Density Optimization 
 * Completes the geographic accuracy improvements
 */

import { db } from './server/db';
import { clinics } from './shared/schema';
import { eq, and, or, gt, lt } from 'drizzle-orm';

async function finalOptimization() {
  console.log('🎯 Final Density Optimization');
  
  try {
    // Remove any remaining misplaced centers by state boundary verification
    const stateChecks = [
      { state: 'California', minLat: 32.5, maxLat: 42, minLng: -124.5, maxLng: -114 },
      { state: 'CA', minLat: 32.5, maxLat: 42, minLng: -124.5, maxLng: -114 },
      { state: 'Texas', minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
      { state: 'Florida', minLat: 24.5, maxLat: 31, minLng: -87.5, maxLng: -80 },
      { state: 'New York', minLat: 40.5, maxLat: 45, minLng: -80, maxLng: -71 }
    ];

    let totalRemoved = 0;
    
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
        console.log(`Found ${outOfBounds.length} centers outside ${check.state} boundaries`);
        for (const center of outOfBounds) {
          console.log(`  - ${center.name} at ${center.latitude},${center.longitude} (${center.city})`);
        }
        
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
        
        totalRemoved += outOfBounds.length;
      }
    }

    const finalCount = await db.select().from(clinics).then(results => results.length);
    console.log(`✅ Optimization complete: ${finalCount} centers remaining`);
    console.log(`🗑️  Additional centers removed: ${totalRemoved}`);
    
    // Final distribution check
    const distribution = await db.execute(`
      SELECT state, COUNT(*) as count 
      FROM clinics 
      GROUP BY state 
      ORDER BY count DESC 
      LIMIT 15
    `);
    
    console.log('\n📊 Final Distribution:');
    distribution.rows.forEach((row: any) => {
      console.log(`  ${row.state}: ${row.count} centers`);
    });

  } catch (error) {
    console.error('❌ Final optimization failed:', error);
  }
}

finalOptimization();