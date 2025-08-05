import { Router } from "express";
import { db } from "../db";
import { clinics, submissions } from "@shared/schema";
import { insertClinicSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Geocoding function using Nominatim
async function geocodeAddress(address: string, city: string, state: string): Promise<{lat: number, lon: number} | null> {
  try {
    const query = `${address}, ${city}, ${state}, USA`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=us`,
      {
        headers: {
          'User-Agent': 'GlobalSpeech/1.0 (Speech Therapy Center Locator)'
        }
      }
    );
    
    if (!response.ok) throw new Error('Geocoding failed');
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Submit new center
router.post("/", async (req, res) => {
  try {
    const validatedData = insertClinicSchema.parse(req.body);
    
    // Geocode the address
    const coords = await geocodeAddress(
      validatedData.address,
      validatedData.city,
      validatedData.state
    );
    
    if (!coords) {
      return res.status(400).json({ error: "Could not geocode the provided address" });
    }
    
    // Create clinic record
    const [clinic] = await db.insert(clinics).values({
      name: validatedData.name,
      country: validatedData.country,
      state: validatedData.state,
      city: validatedData.city,
      latitude: coords.lat,
      longitude: coords.lon,
      costLevel: validatedData.costLevel,
      services: validatedData.services,
      languages: validatedData.languages || null,
      teletherapy: validatedData.teletherapy,
      phone: validatedData.phone || null,
      website: validatedData.website || null,
      email: validatedData.email || null,
      notes: validatedData.notes || null,
      verified: false, // Needs admin approval
      submittedBy: validatedData.submittedBy,
      submitterEmail: validatedData.submitterEmail,
    }).returning();
    
    // Create submission record
    await db.insert(submissions).values({
      clinicId: clinic.id,
      status: "pending",
    });
    
    res.json({ 
      message: "Submission received successfully",
      submissionId: clinic.id 
    });
  } catch (error: any) {
    console.error("Submission error:", error);
    res.status(400).json({ 
      error: error.message || "Failed to process submission" 
    });
  }
});

export default router;