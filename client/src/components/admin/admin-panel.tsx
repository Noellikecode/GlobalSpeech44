import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Check, Eye, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingSubmission {
  id: string;
  clinic: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    phone?: string;
    website?: string;
    email?: string;
    costLevel: string;
    services: string[];
    languages?: string;
    teletherapy: boolean;
    notes?: string;
    submittedBy: string;
    submitterEmail: string;
  };
  status: string;
  createdAt: string;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["/api/admin/submissions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/submissions");
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
    enabled: isOpen,
  });

  const approveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      return await apiRequest("POST", `/api/admin/submissions/${submissionId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Approved!",
        description: "The center has been approved and added to the map.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clinics"] });
      setSelectedSubmission(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve submission.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/submissions/${submissionId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Rejected",
        description: "The submission has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      setSelectedSubmission(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject submission.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (submissionId: string) => {
    if (confirm("Are you sure you want to approve this center?")) {
      approveMutation.mutate(submissionId);
    }
  };

  const handleReject = (submissionId: string) => {
    const reason = prompt("Reason for rejection (optional):");
    if (reason !== null) {
      rejectMutation.mutate({ submissionId, reason: reason || "No reason provided" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Submissions List */}
        <div className="w-1/2 border-r">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">Admin Panel - Pending Submissions</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto h-[calc(90vh-4rem)]">
            {isLoading ? (
              <div className="p-4 text-center">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No pending submissions</div>
            ) : (
              <div className="space-y-2 p-4">
                {submissions.map((submission: PendingSubmission) => (
                  <div
                    key={submission.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedSubmission?.id === submission.id ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{submission.clinic.name}</h3>
                      <Badge variant="secondary">
                        {submission.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {submission.clinic.city}, {submission.clinic.state}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted by: {submission.clinic.submittedBy}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submission Details */}
        <div className="w-1/2">
          {selectedSubmission ? (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Review Submission</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Center Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedSubmission.clinic.name}</p>
                    <p><strong>Address:</strong> {selectedSubmission.clinic.address}</p>
                    <p><strong>City:</strong> {selectedSubmission.clinic.city}</p>
                    <p><strong>State:</strong> {selectedSubmission.clinic.state}</p>
                    <p><strong>Country:</strong> {selectedSubmission.clinic.country}</p>
                    {selectedSubmission.clinic.phone && (
                      <p><strong>Phone:</strong> {selectedSubmission.clinic.phone}</p>
                    )}
                    {selectedSubmission.clinic.email && (
                      <p><strong>Email:</strong> {selectedSubmission.clinic.email}</p>
                    )}
                    {selectedSubmission.clinic.website && (
                      <p><strong>Website:</strong> {selectedSubmission.clinic.website}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Services & Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Cost Level:</strong> {selectedSubmission.clinic.costLevel}</p>
                    <p><strong>Services:</strong></p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSubmission.clinic.services.map(service => (
                        <Badge key={service} variant="outline" className="text-xs">
                          {service.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                    {selectedSubmission.clinic.languages && (
                      <p><strong>Languages:</strong> {selectedSubmission.clinic.languages}</p>
                    )}
                    <p><strong>Teletherapy:</strong> {selectedSubmission.clinic.teletherapy ? "Yes" : "No"}</p>
                    {selectedSubmission.clinic.notes && (
                      <div>
                        <strong>Notes:</strong>
                        <p className="mt-1 p-2 bg-gray-50 rounded text-xs">
                          {selectedSubmission.clinic.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Submitter Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedSubmission.clinic.submittedBy}</p>
                    <p><strong>Email:</strong> {selectedSubmission.clinic.submitterEmail}</p>
                    <p><strong>Submitted:</strong> {new Date(selectedSubmission.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => handleReject(selectedSubmission.id)}
                  disabled={rejectMutation.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedSubmission.id)}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a submission to review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}