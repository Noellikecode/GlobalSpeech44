import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Globe, MapPin, Users } from "lucide-react";
import MinimalMap from "@/components/map/minimal-map";
import ClinicModal from "@/components/modals/clinic-modal";
import SimpleWelcomeModal from "@/components/modals/simple-welcome-modal";
import FeaturesVoteModal from "@/components/modals/features-vote-modal";
import SimpleInsights from "@/components/insights/simple-insights";
import { Clinic } from "@/types/clinic";
import { apiRequest } from "@/lib/queryClient";


export default function Home() {

  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(true);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const [isFeaturesVoteModalOpen, setIsFeaturesVoteModalOpen] = useState(false);
  // const [isMlInsightsVisible, setIsMlInsightsVisible] = useState(false);
  const [filters, setFilters] = useState({
    costLevel: "all",
    services: "all",
    state: "all",
  });

  const { data: clinics = [], isLoading } = useQuery({
    queryKey: ["/api/clinics"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      try {
        const res = await fetch("/api/clinics", { 
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' } 
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Failed to fetch clinics");
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds instead of 5 minutes for deployment
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  // Record view on page load
  useEffect(() => {
    apiRequest("POST", "/api/analytics/view").catch(console.error);
  }, []);

  const handleApplyFilters = useCallback((newFilters: any) => {
    setFilters(newFilters);
    setPendingFilters(newFilters); // Also update pending filters for UI sync
    setHasAppliedFilters(true);
  }, []);





  // State coordinate boundaries for accurate filtering and zooming
  const getStateBounds = (state: string) => {
    const stateBounds: Record<string, {lat: [number, number], lng: [number, number], center: [number, number], zoom: number}> = {
      'california': { lat: [32.5, 42.0], lng: [-125.0, -114.0], center: [36.7783, -119.4179], zoom: 6 },
      'texas': { lat: [25.8, 36.5], lng: [-106.7, -93.5], center: [31.9686, -99.9018], zoom: 6 },
      'georgia': { lat: [30.3, 35.0], lng: [-85.6, -80.9], center: [33.2490, -83.4410], zoom: 7 },
      'pennsylvania': { lat: [39.7, 42.3], lng: [-80.5, -74.7], center: [40.2732, -77.1017], zoom: 7 },
      'north-carolina': { lat: [33.8, 36.6], lng: [-84.3, -75.4], center: [35.7596, -79.0193], zoom: 7 },
      'ohio': { lat: [38.4, 41.98], lng: [-84.8, -80.5], center: [40.4173, -82.9071], zoom: 7 },
      'new-york': { lat: [40.5, 45.0], lng: [-79.8, -71.8], center: [42.1657, -74.9481], zoom: 7 },
      'illinois': { lat: [37.0, 42.5], lng: [-91.5, -87.0], center: [40.3363, -89.0022], zoom: 7 },
      'alaska': { lat: [54.0, 71.5], lng: [-180.0, -130.0], center: [61.2181, -149.9003], zoom: 4 },
      'florida': { lat: [24.4, 31.0], lng: [-87.6, -80.0], center: [27.7663, -81.6868], zoom: 7 },
      'michigan': { lat: [41.7, 48.3], lng: [-90.4, -82.4], center: [44.3467, -85.4102], zoom: 6 },
      'hawaii': { lat: [18.9, 22.2], lng: [-160.3, -154.8], center: [21.0943, -157.4983], zoom: 7 },
      'massachusetts': { lat: [41.2, 42.9], lng: [-73.5, -69.9], center: [42.2081, -71.0275], zoom: 8 },
      'nevada': { lat: [35.0, 42.0], lng: [-120.0, -114.0], center: [38.3135, -117.0554], zoom: 6 },
      'arizona': { lat: [31.3, 37.0], lng: [-114.8, -109.0], center: [33.7712, -111.3877], zoom: 6 },
      'washington': { lat: [45.5, 49.0], lng: [-124.8, -116.9], center: [47.0379, -121.0187], zoom: 6 },
      'oregon': { lat: [41.9, 46.3], lng: [-124.6, -116.5], center: [44.5672, -122.1269], zoom: 6 },
      'colorado': { lat: [37.0, 41.0], lng: [-109.1, -102.0], center: [39.0598, -105.3111], zoom: 6 },
      'virginia': { lat: [36.5, 39.5], lng: [-83.7, -75.2], center: [37.7693, -78.17], zoom: 7 },
      'maryland': { lat: [37.9, 39.7], lng: [-79.5, -75.0], center: [39.0639, -76.8021], zoom: 8 },
      'connecticut': { lat: [40.95, 42.05], lng: [-73.73, -71.78], center: [41.5978, -72.7554], zoom: 8 },
      'tennessee': { lat: [34.98, 36.68], lng: [-90.31, -81.65], center: [35.7478, -86.7123], zoom: 7 },
      'indiana': { lat: [37.77, 41.76], lng: [-88.1, -84.78], center: [39.8494, -86.2583], zoom: 7 },
      'minnesota': { lat: [43.5, 49.4], lng: [-97.2, -89.5], center: [45.6945, -93.9002], zoom: 6 },
      'wisconsin': { lat: [42.5, 47.1], lng: [-92.9, -86.8], center: [44.2619, -89.6165], zoom: 6 }
    };
    return stateBounds[state] || null;
  };



  // Geographic-aware filtering that maintains proper distribution
  const filteredClinics = useMemo(() => {
    if (!clinics || clinics.length === 0) return [];
    
    const hasStateFilter = filters.state !== "all";
    const hasCostFilter = filters.costLevel !== "all";
    const hasServicesFilter = filters.services !== "all";
    
    // Filter based on criteria
    let filtered = clinics.filter((clinic: any) => {
      // Handle state filtering - match both full name and abbreviation
      if (hasStateFilter) {
        const clinicState = clinic.state?.trim();
        const filterState = filters.state;
        
        // Create comprehensive state mappings
        const stateAbbreviations: Record<string, string> = {
          'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
          'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
          'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
          'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
          'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
          'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
          'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
          'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
          'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
          'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
        };
        
        // Create reverse mapping (abbreviation to full name)
        const abbreviationToState: Record<string, string> = {};
        Object.entries(stateAbbreviations).forEach(([fullName, abbr]) => {
          abbreviationToState[abbr] = fullName;
        });
        
        // Check if clinic state matches filter state in any format
        const filterStateAbbr = stateAbbreviations[filterState];
        const filterStateFullName = abbreviationToState[filterState] || filterState;
        
        const clinicStateMatches = 
          clinicState === filterState || // Exact match
          clinicState === filterStateAbbr || // Filter is full name, clinic is abbreviation
          clinicState === filterStateFullName || // Filter is abbreviation, clinic is full name
          clinicState?.toLowerCase() === filterState?.toLowerCase(); // Case insensitive
        
        if (!clinicStateMatches) return false;
        
        // Additional coordinate validation to prevent misplaced markers
        // Validate that coordinates are actually within the state boundaries
        const stateBounds = getStateBounds(filterState.toLowerCase().replace(/\s+/g, '-'));
        if (stateBounds && clinic.latitude && clinic.longitude) {
          const { lat, lng } = stateBounds;
          const isWithinBounds = 
            clinic.latitude >= lat[0] && clinic.latitude <= lat[1] &&
            clinic.longitude >= lng[0] && clinic.longitude <= lng[1];
          
          // If coordinates are outside state bounds, exclude the marker
          if (!isWithinBounds) {
            console.warn(`Clinic "${clinic.name}" in ${clinicState} has coordinates outside ${filterState} bounds:`, 
              `${clinic.latitude}, ${clinic.longitude}`);
            return false;
          }
        }
      }
      
      if (hasCostFilter && clinic.costLevel !== filters.costLevel) return false;
      if (hasServicesFilter && !clinic.services?.includes(filters.services)) return false;
      return true;
    });
    
    // Geographic distribution sampling for better spread
    if (!hasStateFilter && filtered.length > 2000) {
      // For nationwide view, sample geographically distributed centers
      const stateGroups: Record<string, any[]> = {};
      filtered.forEach(clinic => {
        const state = clinic.state || 'Unknown';
        if (!stateGroups[state]) stateGroups[state] = [];
        stateGroups[state].push(clinic);
      });
      
      // Take proportional samples from each state
      const sampledResults: any[] = [];
      const targetTotal = 2000;
      const stateKeys = Object.keys(stateGroups);
      const basePerState = Math.floor(targetTotal / stateKeys.length);
      
      stateKeys.forEach(state => {
        const stateClinics = stateGroups[state];
        const sampleSize = Math.min(stateClinics.length, Math.max(basePerState, 5));
        
        // Geographic sampling within state - spread by latitude/longitude
        const sorted = stateClinics.sort((a, b) => {
          const latDiff = Math.abs(a.latitude - 35); // Roughly center US
          const lngDiff = Math.abs(a.longitude + 95); // Roughly center US
          const aDistance = latDiff + lngDiff;
          const bDiff = Math.abs(b.latitude - 35);
          const bLngDiff = Math.abs(b.longitude + 95);
          const bDistance = bDiff + bLngDiff;
          return aDistance - bDistance; // Prefer geographic spread
        });
        
        // Take every nth item for better distribution
        const step = Math.max(1, Math.floor(sorted.length / sampleSize));
        for (let i = 0; i < sorted.length && sampledResults.length < targetTotal; i += step) {
          sampledResults.push(sorted[i]);
        }
      });
      
      return sampledResults.slice(0, 2000);
    }
    
    // For state-specific or smaller results, maintain the geographic optimization
    return filtered.length > 1500 ? filtered.slice(0, 1500) : filtered;
  }, [clinics, filters.state, filters.costLevel, filters.services]);

  // Debounced filter change handler for smoother performance
  const [pendingFilters, setPendingFilters] = useState(filters);
  
  const debouncedFilterUpdate = useMemo(
    () => debounce((newFilters: any) => {
      setFilters(newFilters);
      setHasAppliedFilters(true);
      
      // Force refresh of ML insights when state changes
      if (newFilters.state !== filters.state) {
        import('@/lib/queryClient').then(({ queryClient }) => {
          queryClient.invalidateQueries({ 
            queryKey: ["/api/ml/insights"]
          });
        });
      }
    }, 150),
    [filters.state]
  );

  const handleFilterChange = useCallback((key: string, value: any) => {
    const newFilters = { ...pendingFilters, [key]: value };
    setPendingFilters(newFilters);
    debouncedFilterUpdate(newFilters);
  }, [pendingFilters, debouncedFilterUpdate]);

  // Simple debounce function
  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }



  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Globe className="text-white h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">GlobalSpeech</h1>
                <p className="text-sm text-gray-500">Speech therapy resources across North America</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {clinics.length > 0 && `${clinics.length} Centers`}
              </div>
              <Button 
                onClick={() => setIsFeaturesVoteModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
              >
                + Add Center
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Map Controls */}
      <div className="bg-white border-b px-4 py-3 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter by Cost:</label>
              <div className="relative">
                <Select value={pendingFilters.costLevel} onValueChange={(value) => handleFilterChange("costLevel", value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="low-cost">Low Cost</SelectItem>
                    <SelectItem value="market-rate">Market Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Services:</label>
              <div className="relative">
                <Select value={pendingFilters.services} onValueChange={(value) => handleFilterChange("services", value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="speech-therapy">Speech Therapy</SelectItem>
                    <SelectItem value="language-therapy">Language Therapy</SelectItem>
                    <SelectItem value="stuttering">Stuttering</SelectItem>
                    <SelectItem value="apraxia">Apraxia</SelectItem>
                    <SelectItem value="voice-therapy">Voice Therapy</SelectItem>
                    <SelectItem value="feeding-therapy">Feeding Therapy</SelectItem>
                    <SelectItem value="social-skills">Social Skills</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">State:</label>
              <div className="relative">
                <Select value={pendingFilters.state} onValueChange={(value) => handleFilterChange("state", value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="Alabama">Alabama</SelectItem>
                  <SelectItem value="Alaska">Alaska</SelectItem>
                  <SelectItem value="Arizona">Arizona</SelectItem>
                  <SelectItem value="Arkansas">Arkansas</SelectItem>
                  <SelectItem value="California">California</SelectItem>
                  <SelectItem value="Colorado">Colorado</SelectItem>
                  <SelectItem value="Connecticut">Connecticut</SelectItem>
                  <SelectItem value="Delaware">Delaware</SelectItem>
                  <SelectItem value="Florida">Florida</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Hawaii">Hawaii</SelectItem>
                  <SelectItem value="Idaho">Idaho</SelectItem>
                  <SelectItem value="Illinois">Illinois</SelectItem>
                  <SelectItem value="Indiana">Indiana</SelectItem>
                  <SelectItem value="Iowa">Iowa</SelectItem>
                  <SelectItem value="Kansas">Kansas</SelectItem>
                  <SelectItem value="Kentucky">Kentucky</SelectItem>
                  <SelectItem value="Louisiana">Louisiana</SelectItem>
                  <SelectItem value="Maine">Maine</SelectItem>
                  <SelectItem value="Maryland">Maryland</SelectItem>
                  <SelectItem value="Massachusetts">Massachusetts</SelectItem>
                  <SelectItem value="Michigan">Michigan</SelectItem>
                  <SelectItem value="Minnesota">Minnesota</SelectItem>
                  <SelectItem value="Mississippi">Mississippi</SelectItem>
                  <SelectItem value="Missouri">Missouri</SelectItem>
                  <SelectItem value="Montana">Montana</SelectItem>
                  <SelectItem value="Nebraska">Nebraska</SelectItem>
                  <SelectItem value="Nevada">Nevada</SelectItem>
                  <SelectItem value="New Hampshire">New Hampshire</SelectItem>
                  <SelectItem value="New Jersey">New Jersey</SelectItem>
                  <SelectItem value="New Mexico">New Mexico</SelectItem>
                  <SelectItem value="New York">New York</SelectItem>
                  <SelectItem value="North Carolina">North Carolina</SelectItem>
                  <SelectItem value="North Dakota">North Dakota</SelectItem>
                  <SelectItem value="Ohio">Ohio</SelectItem>
                  <SelectItem value="Oklahoma">Oklahoma</SelectItem>
                  <SelectItem value="Oregon">Oregon</SelectItem>
                  <SelectItem value="Pennsylvania">Pennsylvania</SelectItem>
                  <SelectItem value="Rhode Island">Rhode Island</SelectItem>
                  <SelectItem value="South Carolina">South Carolina</SelectItem>
                  <SelectItem value="South Dakota">South Dakota</SelectItem>
                  <SelectItem value="Tennessee">Tennessee</SelectItem>
                  <SelectItem value="Texas">Texas</SelectItem>
                  <SelectItem value="Utah">Utah</SelectItem>
                  <SelectItem value="Vermont">Vermont</SelectItem>
                  <SelectItem value="Virginia">Virginia</SelectItem>
                  <SelectItem value="Washington">Washington</SelectItem>
                  <SelectItem value="West Virginia">West Virginia</SelectItem>
                  <SelectItem value="Wisconsin">Wisconsin</SelectItem>
                  <SelectItem value="Wyoming">Wyoming</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center">
              <MapPin className="text-primary mr-1 h-4 w-4" />
              {filteredClinics.length === clinics.length 
                ? `${filteredClinics.length} Total Centers` 
                : `${filteredClinics.length} of ${clinics.length} Centers`}
            </span>
            {hasAppliedFilters && filteredClinics.length < clinics.length && (
              <span className="text-blue-600 text-xs bg-blue-50 px-2 py-1 rounded">
                Filters Applied
              </span>
            )}
            <span className="flex items-center">
              <Users className="text-green-500 mr-1 h-4 w-4" />
              {analytics?.totalViews || 0} Views
            </span>
          </div>
        </div>
      </div>

      {/* Map Container - Takes remaining full height */}
      <div className="flex-1 min-h-0">
        <MinimalMap 
          clinics={clinics}
          filteredClinics={filteredClinics} 
          onClinicClick={setSelectedClinic}
          isLoading={isLoading}
        />
      </div>

      {/* Modals */}
      <SimpleWelcomeModal 
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        onApplyFilters={handleApplyFilters}
        totalClinics={clinics.length}
        isMapLoading={isLoading}
      />
      
      <ClinicModal 
        clinic={selectedClinic}
        isOpen={!!selectedClinic}
        onClose={() => setSelectedClinic(null)}
      />

      <FeaturesVoteModal 
        isOpen={isFeaturesVoteModalOpen}
        onClose={() => setIsFeaturesVoteModalOpen(false)}
      />

      {/* ML Analytics Section - Moved to bottom */}
      {!isLoading && !isWelcomeModalOpen && (
        <div className="bg-white border-t px-4 py-6">
          <div className="max-w-7xl mx-auto">
            <SimpleInsights
              filteredClinics={filteredClinics}
              allClinics={clinics}
              filters={filters}
            />
          </div>
        </div>
      )}

      {/* Developer Credit */}
      <div className="fixed bottom-4 left-4 z-40">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border text-xs text-gray-600">
          Developed by{" "}
          <a 
            href="mailto:noelsimonthomas31@gmail.com" 
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            Noel Thomas
          </a>
        </div>
      </div>

    </div>
  );
}
