/**
 * TermsOfService Component
 * CalFix Terms of Service page
 */

import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>

        <p className="text-gray-600 mb-8">
          <strong>Effective Date: January 1, 2025</strong><br />
          <strong>Last Updated: January 1, 2025</strong>
        </p>

        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 mb-8">
          <p className="text-indigo-900">
            <strong>Agreement to Terms</strong><br />
            By accessing or using CalFix ("Service"), operated by Madlani Labs ("we", "us", "our", "Company"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Service Description</h2>
          <p className="mb-4 text-gray-700">
            CalFix is a software-as-a-service (SaaS) calendar management platform that:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>Analyzes calendar health and provides optimization recommendations</li>
            <li>Detects and resolves scheduling conflicts and issues</li>
            <li>Manages multiple calendars for executive assistants</li>
            <li>Automates calendar organization tasks</li>
            <li>Provides insights and analytics on calendar usage</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Account Registration</h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Eligibility</h3>
          <p className="mb-4 text-gray-700">
            You must be at least 16 years old and have the legal capacity to enter into these Terms. By using CalFix, you represent and warrant that you meet these requirements.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Account Security</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
            <li>You agree to notify us immediately of any unauthorized use of your account</li>
            <li>You are responsible for all activities that occur under your account</li>
            <li>We are not liable for any loss or damage from your failure to comply with account security</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Accurate Information</h3>
          <p className="mb-4 text-gray-700">
            You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Subscription and Payment</h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Subscription Plans</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li><strong>7-Day Trial:</strong> Free trial with full feature access, automatically converts to paid subscription</li>
            <li><strong>Basic Plan ($9/month):</strong> 1 calendar management</li>
            <li><strong>EA Plan ($19/month):</strong> Up to 5 calendars</li>
            <li><strong>EA Pro Plan ($39/month):</strong> Up to 15 calendars</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Billing</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>All fees are in US Dollars and exclude applicable taxes</li>
            <li>Subscriptions automatically renew unless canceled before the renewal date</li>
            <li>Payment processing is handled by Stripe, subject to their terms and privacy policy</li>
            <li>We may change prices with 30 days notice for monthly subscriptions</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Refunds</h3>
          <p className="mb-4 text-gray-700">
            We offer a 7-day free trial. After the trial period, subscriptions are non-refundable except where required by law. You may cancel your subscription at any time, with cancellation taking effect at the end of the current billing period.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Acceptable Use</h2>
          <p className="mb-4 text-gray-700">You agree not to:</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>Use the Service for any illegal purpose or in violation of any laws</li>
            <li>Attempt to gain unauthorized access to any part of the Service or related systems</li>
            <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
            <li>Transmit viruses, malware, or other harmful code</li>
            <li>Use the Service to send spam or unsolicited communications</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Resell, sublicense, or redistribute the Service without our written consent</li>
            <li>Use automated systems or software to extract data from the Service (scraping)</li>
            <li>Impersonate any person or entity or falsely state your affiliation</li>
            <li>Use the Service to monitor availability, performance, or functionality for competitive purposes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Intellectual Property</h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Our Property</h3>
          <p className="mb-4 text-gray-700">
            The Service, including all content, features, and functionality, is owned by Madlani Labs and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Your Content</h3>
          <p className="mb-4 text-gray-700">
            You retain ownership of your calendar data and content. By using the Service, you grant us a limited, non-exclusive license to access and process your content solely to provide the Service to you.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Feedback</h3>
          <p className="mb-4 text-gray-700">
            Any feedback, suggestions, or ideas you provide about the Service become our property and may be used without compensation to you.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Third-Party Services</h2>
          <p className="mb-4 text-gray-700">
            CalFix integrates with third-party services including:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>Google Calendar (subject to Google's Terms of Service)</li>
            <li>Clerk (authentication services)</li>
            <li>Stripe (payment processing)</li>
            <li>Supabase (database services)</li>
          </ul>
          <p className="text-gray-700">
            Your use of these third-party services is subject to their respective terms and privacy policies. We are not responsible for third-party services' availability or functionality.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Disclaimers and Warranties</h2>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-gray-700">
              <strong>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND</strong>, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, title, or non-infringement.
            </p>
          </div>

          <p className="mb-4 text-gray-700">We do not warrant that:</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>The Service will be uninterrupted, secure, or error-free</li>
            <li>Any defects or errors will be corrected</li>
            <li>The Service will meet your requirements or expectations</li>
            <li>Any data or content will be accurate or reliable</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>

          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <p className="text-gray-700">
              <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW</strong>, Madlani Labs shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from your use or inability to use the Service.
            </p>
          </div>

          <p className="mb-4 text-gray-700">
            Our total liability for any claims under these Terms shall not exceed the amount you paid us in the 12 months preceding the claim.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Indemnification</h2>
          <p className="text-gray-700">
            You agree to defend, indemnify, and hold harmless Madlani Labs, its officers, directors, employees, and agents from any claims, damages, obligations, losses, liabilities, costs, or expenses arising from:
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700">
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Your use or misuse of the Service</li>
            <li>Your content or data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">10.1 By You</h3>
          <p className="mb-4 text-gray-700">
            You may terminate your account at any time through your account settings or by contacting support. Termination takes effect at the end of the current billing period.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">10.2 By Us</h3>
          <p className="mb-4 text-gray-700">
            We may suspend or terminate your account immediately if you breach these Terms or engage in conduct we deem harmful to the Service or other users.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">10.3 Effect of Termination</h3>
          <p className="mb-4 text-gray-700">
            Upon termination, your right to use the Service ceases immediately. We may delete your data after 30 days following termination. Sections that by their nature should survive termination will continue to apply.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Governing Law and Disputes</h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">11.1 Governing Law</h3>
          <p className="mb-4 text-gray-700">
            These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">11.2 Arbitration</h3>
          <p className="mb-4 text-gray-700">
            Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the American Arbitration Association rules, except where prohibited by law.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">11.3 Class Action Waiver</h3>
          <p className="mb-4 text-gray-700">
            You agree to resolve disputes on an individual basis and waive any right to participate in class actions or class arbitrations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Modifications to Terms</h2>
          <p className="text-gray-700">
            We reserve the right to modify these Terms at any time. We will notify you of material changes via email or through the Service. Your continued use after changes constitutes acceptance of the modified Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">13. General Provisions</h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">13.1 Entire Agreement</h3>
          <p className="mb-4 text-gray-700">
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and Madlani Labs regarding the Service.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">13.2 Severability</h3>
          <p className="mb-4 text-gray-700">
            If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in effect.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">13.3 Waiver</h3>
          <p className="mb-4 text-gray-700">
            Our failure to enforce any right or provision does not constitute a waiver of that right or provision.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">13.4 Assignment</h3>
          <p className="mb-4 text-gray-700">
            You may not assign or transfer these Terms without our written consent. We may assign our rights and obligations without restriction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Information</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="text-gray-700 mb-2">
              <strong>CalFix by Madlani Labs</strong>
            </p>
            <p className="text-gray-700 mb-2">
              Email:{' '}
              <a href="mailto:legal@madlanilabs.com" className="text-indigo-600 hover:underline">
                legal@madlanilabs.com
              </a>
            </p>
            <p className="text-gray-700 mb-2">
              General Inquiries:{' '}
              <a href="mailto:ravi@madlanilabs.com" className="text-indigo-600 hover:underline">
                ravi@madlanilabs.com
              </a>
            </p>
            <p className="text-gray-700">
              Support:{' '}
              <a href="mailto:support@madlanilabs.com" className="text-indigo-600 hover:underline">
                support@madlanilabs.com
              </a>
            </p>
          </div>
        </section>

        <div className="mt-12 p-6 bg-indigo-50 rounded-lg">
          <p className="text-sm text-gray-700 text-center">
            By using CalFix, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;