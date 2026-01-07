import { X } from 'lucide-react';

interface TermsOfServiceProps {
  onClose: () => void;
}

export function TermsOfService({ onClose }: TermsOfServiceProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1f15]/95 backdrop-blur-xl border border-red-500/20 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl shadow-red-900/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-500/20">
          <h2 className="text-white text-2xl font-bold">SAFECORD Terms of Service</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-red-600/30 hover:bg-red-600/50 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 max-h-[calc(90vh-100px)] scrollbar-custom">
          <div className="space-y-4 text-gray-300">
            <p className="text-sm text-gray-400">
              <strong>Last Updated:</strong> January 6, 2026
            </p>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">1. Acceptance of Terms</h3>
              <p>
                By accessing or using SAFECORD ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to these Terms, you may not use the Service. SAFECORD is a voice calling and messaging 
                platform designed for safe and secure communication.
              </p>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">2. Age Requirements</h3>
              <p className="mb-2">
                <strong className="text-red-400">IMPORTANT:</strong> You must be at least 13 years old to use SAFECORD.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Users under 13 years of age are strictly prohibited from using the Service</li>
                <li>We reserve the right to request age verification at any time</li>
                <li>Accounts found to belong to users under 13 will be permanently banned without warning</li>
                <li>Users who misrepresent their age will be permanently banned</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">3. Account Responsibilities</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You are responsible for maintaining the security of your account credentials</li>
                <li>You must provide accurate and truthful information during registration</li>
                <li>You may not share your account with others</li>
                <li>You must notify us immediately of any unauthorized access to your account</li>
                <li>You are responsible for all activities that occur under your account</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">4. Prohibited Conduct</h3>
              <p className="mb-2">You may not use SAFECORD to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Harass, threaten, or intimidate other users</li>
                <li>Share explicit, violent, or inappropriate content</li>
                <li>Impersonate others or create fake accounts</li>
                <li>Spam, advertise, or send unsolicited messages</li>
                <li>Share personal information of others without consent</li>
                <li>Attempt to hack, exploit, or disrupt the Service</li>
                <li>Use the Service for any illegal activities</li>
                <li>Circumvent age restrictions or safety features</li>
                <li>Create multiple accounts to evade bans or restrictions</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">5. Moderation and Enforcement</h3>
              <p className="mb-2">
                SAFECORD employs a rank-based moderation system with the following roles:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Rank 5 (Owner/Co-Owner):</strong> Full server control and moderation powers</li>
                <li><strong>Administrator:</strong> Can manage channels, roles, and moderate members</li>
                <li><strong>Moderator:</strong> Can timeout and warn members</li>
                <li><strong>Member:</strong> Standard user access</li>
              </ul>
              <p className="mt-3">
                Moderators and administrators have the right to timeout, kick, or ban users who violate server rules or 
                these Terms. However, Owners and Co-Owners cannot be permanently banned by server moderators (except for 
                underage violations, which result in immediate platform-wide bans).
              </p>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">6. Report Mod Abuse System</h3>
              <p className="mb-2">
                All users have access to the "Report Mod Abuse" system server where they can:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Report moderator misconduct or abuse of power</li>
                <li>Appeal unjust bans, timeouts, or kicks</li>
                <li>Request review of moderation decisions</li>
                <li>Report violations of platform rules</li>
              </ul>
              <p className="mt-3">
                The SAFECORD team reviews all reports and takes appropriate action against moderators who abuse their powers.
              </p>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">7. Content and Privacy</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You retain ownership of content you create on SAFECORD</li>
                <li>By posting content, you grant SAFECORD a license to store and display it</li>
                <li>We do not sell your personal information to third parties</li>
                <li>Messages and voice calls may be monitored for safety and security purposes</li>
                <li>We reserve the right to remove content that violates these Terms</li>
                <li><strong className="text-yellow-400">SAFECORD is not designed for collecting personally identifiable information (PII) or securing highly sensitive data</strong></li>
              </ul>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">8. Server Ownership and Permissions</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Server owners have full control over their servers</li>
                <li>Only server owners and administrators can create channels and roles</li>
                <li>All users can invite others to servers they are members of</li>
                <li>Co-owners cannot assign Owner roles to other members</li>
                <li>Server owners are responsible for ensuring their servers comply with these Terms</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">9. Termination</h3>
              <p className="mb-2">
                We reserve the right to suspend or terminate your account at any time for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violation of these Terms of Service</li>
                <li>Being under the age of 13</li>
                <li>Engaging in illegal activities</li>
                <li>Harassing or threatening other users</li>
                <li>Attempting to disrupt or damage the Service</li>
              </ul>
              <p className="mt-3">
                Bans for underage violations are permanent and non-appealable. Other violations may result in timeouts or 
                permanent bans depending on severity.
              </p>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">10. Limitation of Liability</h3>
              <p className="mb-2">
                SAFECORD is provided "as is" without warranties of any kind. We are not liable for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Loss of data or content</li>
                <li>Service interruptions or downtime</li>
                <li>Actions of other users on the platform</li>
                <li>Damages resulting from use of the Service</li>
                <li>Third-party content or links</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">11. WebRTC and Voice Communication</h3>
              <p className="mb-2">
                SAFECORD uses WebRTC technology for voice calling:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Voice calls use peer-to-peer mesh networking for quality communication</li>
                <li>You are responsible for your internet connection quality</li>
                <li>We do not guarantee call quality or availability</li>
                <li>Voice data may be temporarily stored for quality and safety purposes</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">12. Seasonal Themes</h3>
              <p>
                SAFECORD features seasonal themes that appear during the first week of holidays by default. Users can enable 
                permanent seasonal mode in settings. Themes are cosmetic only and do not affect functionality.
              </p>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">13. Changes to Terms</h3>
              <p>
                We reserve the right to modify these Terms at any time. Continued use of the Service after changes 
                constitutes acceptance of the new Terms. We will notify users of significant changes via the platform.
              </p>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">14. Intellectual Property</h3>
              <p className="mb-2">
                All SAFECORD branding, logos, and original content are protected by intellectual property laws:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You may not use SAFECORD branding without permission</li>
                <li>You may not reverse engineer or copy the Service</li>
                <li>User-generated content belongs to the respective creators</li>
              </ul>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">15. Dispute Resolution</h3>
              <p>
                Any disputes arising from these Terms or use of SAFECORD will be resolved through the Report Mod Abuse 
                system or, if necessary, through binding arbitration in accordance with applicable laws.
              </p>
            </section>

            <section>
              <h3 className="text-white text-xl font-semibold mb-3">16. Contact Information</h3>
              <p>
                For questions about these Terms or to report violations, please use the "Report Mod Abuse" system server 
                accessible from your server list, or contact the SAFECORD support team.
              </p>
            </section>

            <div className="pt-6 border-t border-red-500/20 mt-6">
              <p className="text-gray-400 text-sm">
                By using SAFECORD, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
              <p className="text-red-400 text-sm mt-2 font-semibold">
                Remember: You must be at least 13 years old to use SAFECORD. Any user found to be under 13 will be permanently banned.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-red-500/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg hover:opacity-90 transition-all"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
