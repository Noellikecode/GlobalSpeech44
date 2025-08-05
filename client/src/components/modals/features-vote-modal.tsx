import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FeaturesVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeaturesVoteModal({ isOpen, onClose }: FeaturesVoteModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Submit New Speech Therapy Center
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Anonymously suggest new speech therapy centers to add to our directory.
          </p>
        </DialogHeader>
        
        <div className="flex-1 h-[600px] p-6">
          <div className="bg-gray-50 rounded-lg p-8 h-full flex flex-col items-center justify-center text-center">
            <div className="max-w-md">
              <h3 className="text-lg font-semibold mb-4">Anonymous Submission</h3>
              <p className="text-gray-600 mb-6">
                Submit new speech therapy centers anonymously via email. Your submission will be reviewed privately and added to the map if approved.
              </p>
              
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-lg border text-left">
                  <p className="font-medium text-sm mb-2">Email Template:</p>
                  <p className="text-xs text-gray-600">
                    Send center details to: <strong>noelsimonthomas31@gmail.com</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Include: Name, Address, Phone, Website, Services offered
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      const subject = encodeURIComponent("New Speech Therapy Center Submission");
                      const body = encodeURIComponent(`Hi,

I'd like to suggest adding a new speech therapy center to GlobalSpeech:

Center Name: 
Address: 
City, State: 
Phone: 
Website: 
Email: 
Services: (e.g., speech therapy, language therapy, voice therapy)
Cost Level: (free, low-cost, market-rate)

Additional Notes: 

Thank you!`);
                      window.open(`mailto:noelsimonthomas31@gmail.com?subject=${subject}&body=${body}`, '_blank');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                  >
                    Open Email Template
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText('noelsimonthomas31@gmail.com');
                      // Could add a toast notification here
                    }}
                    className="px-4"
                  >
                    Copy Email
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Anonymous submissions are reviewed privately and added within 24-48 hours
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}