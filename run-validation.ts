#!/usr/bin/env tsx

/**
 * Comprehensive Geographic Validation Runner
 * 
 * This script validates all 6,365+ speech therapy center locations
 * with insane precision (<10m accuracy) using trusted geocoding sources.
 * 
 * Usage: npm run validate-locations
 */

import { GeographicValidator } from './server/geographic-validator';
import { db } from './server/db';
import { clinics } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function runComprehensiveValidation() {
  console.log('🗺️  Starting COMPREHENSIVE Geographic Validation');
  console.log('⚡ Target: INSANE PRECISION (<10m accuracy)');
  console.log('📍 Validating all speech therapy center locations...\n');

  const validator = new GeographicValidator();
  
  try {
    // Start validation with small batch size to respect API limits
    console.log('📋 Phase 1: Loading all clinic data...');
    const allClinics = await db.select().from(clinics);
    console.log(`✅ Found ${allClinics.length} clinics in database\n`);

    console.log('🔍 Phase 2: Starting precision validation...');
    console.log('   • Forward geocoding: Address → Coordinates');
    console.log('   • Reverse geocoding: Coordinates → Address');
    console.log('   • Distance calculation: Haversine formula');
    console.log('   • Precision threshold: <10 meters');
    console.log('   • Confidence threshold: >90%\n');

    const results = await validator.validateAllLocations(3); // Very small batches due to API limits
    
    console.log('📊 Phase 3: Generating comprehensive report...\n');
    const report = validator.generateReport(results);
    
    // Display summary
    console.log('='.repeat(60));
    console.log('📋 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total locations validated: ${report.summary.total}`);
    console.log(`✅ High-precision locations: ${report.summary.validated}`);
    console.log(`⚠️  Locations needing correction: ${report.summary.needsCorrection}`);
    console.log(`📏 Precision issues (>10m): ${report.summary.precisionIssues}`);
    console.log(`📈 Average confidence score: ${report.summary.averageConfidence}%`);
    
    // Precision statistics
    const highPrecision = results.filter(r => r.distanceError !== undefined && r.distanceError <= 10);
    const mediumPrecision = results.filter(r => r.distanceError !== undefined && r.distanceError > 10 && r.distanceError <= 50);
    const lowPrecision = results.filter(r => r.distanceError !== undefined && r.distanceError > 50);
    
    console.log('\n📍 PRECISION BREAKDOWN:');
    console.log(`🎯 Ultra-high precision (≤10m): ${highPrecision.length} locations`);
    console.log(`📍 High precision (10-50m): ${mediumPrecision.length} locations`);
    console.log(`⚠️  Low precision (>50m): ${lowPrecision.length} locations`);
    
    // Top issues requiring immediate attention
    if (report.issues.length > 0) {
      console.log('\n❌ TOP ISSUES REQUIRING IMMEDIATE CORRECTION:');
      console.log('-'.repeat(60));
      
      report.issues.slice(0, 10).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.name}`);
        console.log(`   📍 Location: ${issue.address}`);
        console.log(`   📊 Confidence: ${issue.confidenceScore}%`);
        if (issue.distanceError) {
          console.log(`   📏 Distance error: ${Math.round(issue.distanceError)}m`);
        }
        console.log(`   🚨 Issues: ${issue.issues.join(', ')}`);
        console.log('');
      });
    }
    
    // State-by-state breakdown
    console.log('\n🗺️  STATE-BY-STATE PRECISION ANALYSIS:');
    console.log('-'.repeat(60));
    
    const stateStats = new Map<string, { total: number; highPrecision: number; avgConfidence: number }>();
    
    results.forEach(result => {
      // Extract state from clinic data
      const clinicData = allClinics.find(c => c.id === result.id);
      const state = clinicData?.state || 'Unknown';
      
      if (!stateStats.has(state)) {
        stateStats.set(state, { total: 0, highPrecision: 0, avgConfidence: 0 });
      }
      
      const stats = stateStats.get(state)!;
      stats.total++;
      stats.avgConfidence += result.confidenceScore;
      
      if (result.distanceError !== undefined && result.distanceError <= 10) {
        stats.highPrecision++;
      }
    });
    
    // Calculate averages and sort by precision percentage
    const stateAnalysis = Array.from(stateStats.entries()).map(([state, stats]) => ({
      state,
      total: stats.total,
      highPrecision: stats.highPrecision,
      precisionRate: (stats.highPrecision / stats.total) * 100,
      avgConfidence: Math.round(stats.avgConfidence / stats.total)
    })).sort((a, b) => b.precisionRate - a.precisionRate);
    
    stateAnalysis.slice(0, 15).forEach(analysis => {
      console.log(`${analysis.state.padEnd(20)} | ${analysis.total.toString().padEnd(5)} total | ${analysis.highPrecision.toString().padEnd(5)} precise | ${analysis.precisionRate.toFixed(1).padEnd(6)}% | ${analysis.avgConfidence}% confidence`);
    });
    
    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n🔧 RECOMMENDATIONS:');
      console.log('-'.repeat(60));
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    // Export detailed results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `validation-report-${timestamp}.json`;
    
    const fullReport = {
      timestamp: new Date().toISOString(),
      summary: report.summary,
      stateAnalysis,
      detailedResults: results,
      recommendations: report.recommendations
    };
    
    // Save to file
    const fs = await import('fs');
    fs.writeFileSync(filename, JSON.stringify(fullReport, null, 2));
    console.log(`\n💾 Full validation report saved to: ${filename}`);
    
    console.log('\n✅ Comprehensive geographic validation completed!');
    
    if (report.summary.needsCorrection > 0) {
      console.log(`\n⚠️  ACTION REQUIRED: ${report.summary.needsCorrection} locations need correction`);
      console.log('   Run the correction script to fix these issues automatically.');
    } else {
      console.log('\n🎉 ALL LOCATIONS VALIDATED WITH HIGH PRECISION!');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  runComprehensiveValidation()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runComprehensiveValidation };