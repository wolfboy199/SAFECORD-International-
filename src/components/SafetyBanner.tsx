import { Shield, AlertTriangle } from 'lucide-react';

export function SafetyBanner() {
  return (
    <div className="bg-red-900/30 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <Shield className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-red-200 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Safety & Moderation Policy
          </h3>
          <ul className="text-red-200/80 space-y-1 text-sm">
            <li>• <strong>Age Requirement:</strong> You must be 13+ to use SAFECORD</li>
            <li>• <strong>Zero Tolerance:</strong> Sexual content, grooming, and inappropriate behavior result in immediate permanent ban</li>
            <li>• <strong>Auto-Moderation:</strong> All messages are automatically scanned for violations</li>
            <li>• <strong>Stay Safe:</strong> Never share personal information, photos, or meet strangers from online</li>
            <li>• <strong>Report Abuse:</strong> If someone makes you uncomfortable, leave immediately and report to authorities</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
