import { Router } from 'express';
import { GeographicValidator } from '../geographic-validator';
import { db } from '../db';
import { clinics } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const validator = new GeographicValidator();

// Start comprehensive validation of all locations
router.post('/validate-all', async (req, res) => {
  try {
    console.log('Starting comprehensive geographic validation...');
    
    const results = await validator.validateAllLocations(5); // Small batch size for API limits
    const report = validator.generateReport(results);
    
    console.log('Validation complete:', report.summary);
    
    res.json({
      success: true,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate a specific location by ID
router.post('/validate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get clinic from database
    const clinic = await db.select().from(clinics).where(eq(clinics.id, id)).limit(1);
    
    if (clinic.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }
    
    const result = await validator.validateLocation(clinic[0]);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Single validation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get validation status/progress
router.get('/status', async (req, res) => {
  try {
    // This could be enhanced with a job queue system for long-running validations
    res.json({
      success: true,
      status: 'ready',
      message: 'Validation service is ready to process requests'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;