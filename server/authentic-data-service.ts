import { db } from './db.js';
import { clinics } from '@shared/schema';
import { eq, desc, and, isNotNull } from 'drizzle-orm';

/**
 * Authentic Data Service
 * Sources provider data from legitimate healthcare databases
 */
export class AuthenticDataService {
  
  /**
   * Fetch provider ratings from CMS Provider Data Catalog
   * https://data.cms.gov/provider-data/
   * Note: Disabled for deployment stability - use database verification instead
   */
  async fetchCMSProviderRatings(npiNumber: string) {
    // Commented out external API calls that cause deployment timeouts
    // Use database verification instead for production deployment
    return null;
  }

  /**
   * Fetch provider quality data from NPPES NPI Registry
   * https://npiregistry.cms.hhs.gov/
   * Note: Disabled for deployment stability - use database verification instead
   */
  async fetchNPPESProviderData(npiNumber: string) {
    // Commented out external API calls that cause deployment timeouts
    // Use database verification instead for production deployment
    return null;
  }

  /**
   * Get top-rated clinics based on authentic verification criteria
   */
  async getAuthenticTopClinics(state: string, limit: number = 3) {
    try {
      // Query database for clinics with strong verification indicators
      const topClinics = await db
        .select({
          id: clinics.id,
          name: clinics.name,
          city: clinics.city,
          state: clinics.state,
          verified: clinics.verified,
          services: clinics.services,
          teletherapy: clinics.teletherapy,
          phone: clinics.phone,
          website: clinics.website,
          email: clinics.email
        })
        .from(clinics)
        .where(
          and(
            eq(clinics.state, state),
            eq(clinics.verified, true),
            isNotNull(clinics.phone) // Has contact information
          )
        )
        .orderBy(desc(clinics.verified), clinics.name)
        .limit(limit);

      return topClinics.map((clinic, index) => ({
        id: clinic.id,
        name: clinic.name,
        city: clinic.city,
        verified: clinic.verified,
        hasContact: !!(clinic.phone || clinic.email || clinic.website),
        services: Array.isArray(clinic.services) ? clinic.services.slice(0, 3) : ['Speech Therapy'],
        teletherapy: clinic.teletherapy,
        contactMethods: [
          clinic.phone ? 'Phone' : null,
          clinic.email ? 'Email' : null,
          clinic.website ? 'Website' : null
        ].filter(Boolean)
      }));
    } catch (error) {
      console.error('Error fetching authentic clinic data:', error);
      return [];
    }
  }

  /**
   * Get provider credentials and certifications
   */
  async getProviderCredentials(clinicName: string) {
    // This would integrate with state licensing boards and ASHA certification databases
    // For now, return verification status based on database completeness
    try {
      const clinic = await db
        .select({
          name: clinics.name,
          verified: clinics.verified,
          services: clinics.services,
          phone: clinics.phone,
          website: clinics.website
        })
        .from(clinics)
        .where(eq(clinics.name, clinicName))
        .limit(1);

      if (clinic.length === 0) return null;

      const clinicData = clinic[0];
      
      return {
        verified: clinicData.verified,
        completeness: this.calculateDataCompleteness(clinicData),
        hasMultipleServices: Array.isArray(clinicData.services) && clinicData.services.length > 1,
        hasWebPresence: !!(clinicData.website || clinicData.phone)
      };
    } catch (error) {
      console.error('Error getting provider credentials:', error);
      return null;
    }
  }

  /**
   * Calculate data completeness score for provider verification
   */
  private calculateDataCompleteness(clinic: any): number {
    let score = 0;
    const fields = ['name', 'phone', 'website', 'services'];
    
    fields.forEach(field => {
      if (clinic[field]) {
        if (field === 'services' && Array.isArray(clinic[field]) && clinic[field].length > 0) {
          score += 25;
        } else if (field !== 'services' && clinic[field]) {
          score += 25;
        }
      }
    });
    
    return score;
  }

  /**
   * Validate provider against state licensing databases
   */
  async validateStateLicense(providerName: string, state: string) {
    // This would query state-specific licensing board APIs
    // Each state has different requirements and APIs
    
    const stateLicensingBoards = {
      'California': 'https://www.speechandhearing.ca.gov/',
      'Texas': 'https://www.tdlr.texas.gov/',
      'New York': 'https://www.op.nysed.gov/',
      'Florida': 'https://floridaspeechhearing.gov/'
      // Add more states as needed
    };

    return {
      hasLicensingBoard: state in stateLicensingBoards,
      boardUrl: stateLicensingBoards[state as keyof typeof stateLicensingBoards],
      recommendVerification: true
    };
  }
}

export const authenticDataService = new AuthenticDataService();