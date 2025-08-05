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
            Help us expand our directory by suggesting new speech therapy centers to add to the map.
          </p>
        </DialogHeader>
        
        <div className="flex-1 h-[600px]">
          <iframe
            src="https://globalspeech.features.vote/"
            className="w-full h-full border-0"
            title="Submit New Center"
            allow="forms-to-submit"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          />
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Submissions are reviewed and added to the map within 24-48 hours
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}