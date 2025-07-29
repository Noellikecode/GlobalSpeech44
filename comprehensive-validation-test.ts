/**
 * Comprehensive Geographic Validation Test Script
 * Tests a small sample of locations with insane precision requirements
 */

import { db } from './server/db';
import { GeographicValidator } from './server/geographic-validator';

async function testValidationSystem() {
  console.log('🧪 Testing Geographic Validation System');
  console.log('Target: Insane precision (<10m accuracy)\n');

  const validator = new GeographicValidator();
  
  try {
    // Test with a small sample first
    const sampleClinics = await db.select().from(require('@shared/schema').clinics).limit(5);
    
    console.log(`Testing with ${sampleClinics.length} sample locations...\n`);
    
    for (const clinic of sampleClinics) {
      console.log(`🔍 Validating: ${clinic.name}`);
      console.log(`   📍 Location: ${clinic.city}, ${clinic.state}`);
      console.log(`   📌 Coords: ${clinic.latitude}, ${clinic.longitude}`);
      
      const result = await validator.validateLocation(clinic);
      
      console.log(`   ✅ Confidence: ${result.confidenceScore}%`);
      if (result.distanceError !== undefined) {
        console.log(`   📏 Precision: ${Math.round(result.distanceError)}m error`);
      }
      
      if (result.issues.length > 0) {
        console.log(`   ⚠️  Issues: ${result.issues.join(', ')}`);
      }
      
      console.log(`   🎯 Status: ${result.correctionNeeded ? 'NEEDS CORRECTION' : 'VALIDATED'}\n`);
    }
    
    console.log('✅ Validation system test completed!');
    console.log('Ready for full database validation.');
    
  } catch (error) {
    console.error('❌ Validation test failed:', error);
  }
}

// Run test
testValidationSystem();