import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle, AlertTriangle, Target, Clock, Database } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ValidationResult {
  id: string;
  name: string;
  address: string;
  providedCoords: { lat: number; lng: number };
  validatedCoords?: { lat: number; lng: number };
  distanceError?: number;
  confidenceScore: number;
  issues: string[];
  correctionNeeded: boolean;
  reverseGeocodingMatch: boolean;
  forwardGeocodingMatch: boolean;
}

interface ValidationReport {
  summary: {
    total: number;
    validated: number;
    needsCorrection: number;
    averageConfidence: number;
    precisionIssues: number;
  };
  issues: ValidationResult[];
  recommendations: string[];
}

export default function LocationValidator() {
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [validationStartTime, setValidationStartTime] = useState<Date | null>(null);

  const startValidation = async () => {
    setIsValidating(true);
    setProgress(0);
    setValidationStartTime(new Date());
    setReport(null);

    try {
      // Simulate progress updates during validation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 10, 95));
      }, 2000);

      const response = await apiRequest('/api/validation/validate-all', {
        method: 'POST'
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.success) {
        setReport(response.report);
      } else {
        throw new Error(response.error || 'Validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert('Validation failed. Please check the console for details.');
    } finally {
      setIsValidating(false);
    }
  };

  const getValidationDuration = () => {
    if (!validationStartTime) return '';
    const duration = Math.round((Date.now() - validationStartTime.getTime()) / 1000);
    return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  };

  const getPrecisionBadge = (distanceError?: number) => {
    if (distanceError === undefined) return <Badge variant="secondary">No Data</Badge>;
    if (distanceError <= 10) return <Badge variant="default" className="bg-green-500">Ultra High</Badge>;
    if (distanceError <= 50) return <Badge variant="default" className="bg-blue-500">High</Badge>;
    if (distanceError <= 100) return <Badge variant="default" className="bg-yellow-500">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
    if (confidence >= 70) return <Badge variant="default" className="bg-blue-500">Good</Badge>;
    if (confidence >= 50) return <Badge variant="default" className="bg-yellow-500">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Geographic Location Validator</h1>
        <p className="text-gray-600 mb-6">
          Comprehensive validation of all {report?.summary.total || '6,365+'} speech therapy center locations
          <br />
          <span className="text-sm">Target precision: &lt;10 meter accuracy using trusted geocoding sources</span>
        </p>
      </div>

      {/* Validation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Precision Validation Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={startValidation} 
              disabled={isValidating}
              size="lg"
              className="min-w-[200px]"
            >
              {isValidating ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Start Comprehensive Validation
                </>
              )}
            </Button>
            
            {isValidating && (
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">
                  Duration: {getValidationDuration()} | Processing with API rate limits
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {report && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Database className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{report.summary.total}</div>
                <div className="text-sm text-gray-600">Total Locations</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold text-green-600">{report.summary.validated}</div>
                <div className="text-sm text-gray-600">High Precision</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                <div className="text-2xl font-bold text-red-600">{report.summary.needsCorrection}</div>
                <div className="text-sm text-gray-600">Need Correction</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold text-yellow-600">{report.summary.precisionIssues}</div>
                <div className="text-sm text-gray-600">Precision Issues</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold mb-2">{report.summary.averageConfidence}%</div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
                {getConfidenceBadge(report.summary.averageConfidence)}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Issues */}
          {report.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Locations Requiring Immediate Correction ({report.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {report.issues.slice(0, 20).map((issue, index) => (
                    <div key={issue.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{issue.name}</h4>
                          <p className="text-sm text-gray-600">{issue.address}</p>
                        </div>
                        <div className="flex gap-2">
                          {getPrecisionBadge(issue.distanceError)}
                          {getConfidenceBadge(issue.confidenceScore)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <span className="font-medium">Current:</span> {issue.providedCoords.lat.toFixed(6)}, {issue.providedCoords.lng.toFixed(6)}
                        </div>
                        {issue.validatedCoords && (
                          <div>
                            <span className="font-medium">Validated:</span> {issue.validatedCoords.lat.toFixed(6)}, {issue.validatedCoords.lng.toFixed(6)}
                          </div>
                        )}
                      </div>
                      
                      {issue.distanceError && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">Distance Error:</span> {Math.round(issue.distanceError)}m
                        </div>
                      )}
                      
                      <div className="text-sm">
                        <span className="font-medium">Issues:</span>
                        <ul className="list-disc list-inside text-red-600 mt-1">
                          {issue.issues.map((issueText, i) => (
                            <li key={i}>{issueText}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                  
                  {report.issues.length > 20 && (
                    <div className="text-center text-gray-600 text-sm">
                      ... and {report.issues.length - 20} more locations requiring attention
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {report.summary.needsCorrection === 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  🎉 All Locations Validated with High Precision!
                </h3>
                <p className="text-green-700">
                  All {report.summary.total} speech therapy centers meet the precision requirements.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}