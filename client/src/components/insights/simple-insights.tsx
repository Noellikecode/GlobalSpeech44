import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  MapPin, 
  Users, 
  TrendingUp,
  Target,
  Star
} from "lucide-react";
import { Clinic } from "@/types/clinic";

interface SimpleInsightsProps {
  filteredClinics: Clinic[];
  allClinics: Clinic[];
  filters: {
    state: string;
    costLevel: string;
    services: string;
  };
}

export default function SimpleInsights({ filteredClinics, allClinics, filters }: SimpleInsightsProps) {
  // Lightweight analytics computed from existing data
  const insights = useMemo(() => {
    const total = allClinics.length;
    const filtered = filteredClinics.length;
    
    // State analysis
    const stateStats = allClinics.reduce((acc: Record<string, number>, clinic) => {
      const state = clinic.state || 'Unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});
    
    const topStates = Object.entries(stateStats)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3);
    
    // Coverage calculation
    const coverage = filters.state === 'all' 
      ? Math.round((total / 6000) * 100) // Rough estimate of US coverage
      : Math.round((filtered / (stateStats[filters.state] || 1)) * 100);
    
    // Service gaps (states with fewer clinics)
    const lowCoverageStates = Object.entries(stateStats)
      .filter(([state, count]) => (count as number) < 50)
      .slice(0, 3);
    
    return {
      totalClinics: total,
      filteredClinics: filtered,
      coverage,
      topStates,
      lowCoverageStates,
      currentState: filters.state
    };
  }, [filteredClinics, allClinics, filters.state]);

  return (
    <div className="fixed bottom-4 right-4 w-80 z-50">
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold text-gray-800">Coverage Insights</span>
            <Badge variant="secondary" className="text-xs">Real-time</Badge>
          </div>
          
          <div className="space-y-3 text-sm">
            {/* Current View Stats */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Showing Centers:</span>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-green-500" />
                <span className="font-medium">{insights.filteredClinics}</span>
                {insights.currentState !== 'all' && (
                  <span className="text-gray-400">/ {insights.totalClinics}</span>
                )}
              </div>
            </div>

            {/* Coverage */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Coverage:</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <span className="font-medium text-blue-600">{insights.coverage}%</span>
                <span className="text-xs text-gray-400">
                  {insights.currentState === 'all' ? 'National' : insights.currentState}
                </span>
              </div>
            </div>

            {/* Top States */}
            {insights.currentState === 'all' && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Top Coverage States:</div>
                <div className="space-y-1">
                  {insights.topStates.map(([state, count], index) => (
                    <div key={state} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        <Star className={`inline h-3 w-3 mr-1 ${index === 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
                        {state}
                      </span>
                      <span className="font-medium">{count as number} centers</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Gaps */}
            {insights.currentState === 'all' && insights.lowCoverageStates.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Growth Opportunities:</div>
                <div className="space-y-1">
                  {insights.lowCoverageStates.map(([state, count]) => (
                    <div key={state} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        <Target className="inline h-3 w-3 mr-1 text-orange-500" />
                        {state}
                      </span>
                      <span className="text-orange-600 font-medium">{count as number} centers</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Recommendation */}
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Recommendation:</div>
              <div className="text-xs text-gray-700">
                {insights.currentState === 'all' 
                  ? `Focus expansion in ${insights.lowCoverageStates[0]?.[0] || 'rural areas'} for better coverage`
                  : `${insights.filteredClinics} centers available in ${insights.currentState}`
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}