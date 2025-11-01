/**
 * PrivacyPolicy Component
 * CalFix Privacy Policy page
 */

import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <p className="text-gray-600 mb-8">
          <strong>Effective Date: January 1, 2025</strong><br />
          <strong>Last Updated: January 1, 2025</strong>
        </p>

        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 mb-8">
          <p className="text-indigo-900">
            <strong>Your Privacy Matters</strong><br />
            At CalFix ("we", "us", "our"), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, share, and protect your data when you use our calendar management services.
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">1.1 Account Information</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>Email address</li>
            <li>Name (optional)</li>
            <li>Authentication credentials (managed by Clerk)</li>
            <li>Subscription and payment information (processed by Stripe)</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">1.2 Calendar Data</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>Calendar event titles, descriptions, and attendees</li>
            <li>Event times, dates, and locations</li>
            <li>Meeting links and conferencing details</li>
            <li>Calendar preferences and settings</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">1.3 Usage Information</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>Features you use and actions you take</li>
            <li>Calendar health metrics and analytics</li>
            <li>Browser type and device information</li>
            <li>IP address and general location data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
          <p className="mb-4 text-gray-700">We use your information to:</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>Provide and improve our calendar management services</li>
            <li>Analyze and optimize your calendar for better scheduling</li>
            <li>Detect conflicts, double-bookings, and scheduling issues</li>
            <li>Generate insights and recommendations</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send service updates and important notifications</li>
            <li>Respond to support requests</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data Security & Storage</h2>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>All data is encrypted in transit using TLS/SSL</li>
            <li>Calendar data is processed in memory and not permanently stored unless you enable specific features</li>
            <li>Authentication is handled by Clerk with industry-standard security</li>
            <li>Payment information is processed and secured by Stripe (PCI-compliant)</li>
            <li>We use Supabase (PostgreSQL) for secure data storage with encryption at rest</li>
            <li>Data is hosted on Vercel's secure infrastructure</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Google Calendar Integration</h2>
          <p className="mb-4 text-gray-700">
            CalFix's use and transfer of information received from Google APIs adheres to the{' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Google API Services User Data Policy
            </a>, including the Limited Use requirements.
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>We only access the minimum calendar data necessary to provide our services</li>
            <li>We do not sell, share, or transfer Google Calendar data to third parties except as necessary to provide our services</li>
            <li>We do not use Google Calendar data for advertising purposes</li>
            <li>OAuth tokens are securely stored and can be revoked at any time</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Sharing</h2>
          <p className="mb-4 text-gray-700">We do not sell your personal data. We may share your information with:</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li><strong>Service Providers:</strong> Clerk (authentication), Stripe (payments), Supabase (database), Vercel (hosting)</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice to users)</li>
            <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights (GDPR & CCPA)</h2>
          <p className="mb-4 text-gray-700">You have the right to:</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data ("right to be forgotten")</li>
            <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
            <li><strong>Object:</strong> Object to certain types of processing</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing at any time</li>
            <li><strong>Non-discrimination:</strong> Not receive discriminatory treatment for exercising your rights</li>
          </ul>
          <p className="text-gray-700">
            To exercise these rights, contact us at{' '}
            <a href="mailto:privacy@calfix.pro" className="text-indigo-600 hover:underline">
              privacy@calfix.pro
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>Account data is retained while your account is active</li>
            <li>Calendar event data is processed in real-time and not permanently stored unless you enable specific features</li>
            <li>We delete personal data 30 days after account deletion</li>
            <li>Some data may be retained longer for legal or legitimate business purposes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. International Data Transfers</h2>
          <p className="text-gray-700 mb-4">
            CalFix operates globally. Your data may be processed in the United States or other countries where our service providers operate. We ensure appropriate safeguards are in place for international data transfers, including Standard Contractual Clauses where required.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
          <p className="text-gray-700 mb-4">
            CalFix is not intended for users under 16 years of age. We do not knowingly collect personal information from children under 16. If we learn we have collected such information, we will promptly delete it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Cookies and Tracking</h2>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>We use essential cookies for authentication and session management</li>
            <li>Analytics cookies help us understand usage patterns (you can opt out)</li>
            <li>We do not use advertising or tracking cookies</li>
            <li>You can control cookies through your browser settings</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Updates to This Policy</h2>
          <p className="text-gray-700 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the service. Your continued use after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="text-gray-700 mb-2">
              <strong>CalFix by Madlani Labs</strong>
            </p>
            <p className="text-gray-700 mb-2">
              Email:{' '}
              <a href="mailto:privacy@calfix.pro" className="text-indigo-600 hover:underline">
                privacy@calfix.pro
              </a>
            </p>
            <p className="text-gray-700 mb-2">
              General Inquiries:{' '}
              <a href="mailto:hello@calfix.pro" className="text-indigo-600 hover:underline">
                hello@calfix.pro
              </a>
            </p>
            <p className="text-gray-700">
              Data Protection Officer:{' '}
              <a href="mailto:dpo@calfix.pro" className="text-indigo-600 hover:underline">
                dpo@calfix.pro
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
