import { FileText } from 'lucide-react';

function TermsPage() {
  return (
    <section className="section-padding">
      <div className="container-custom max-w-4xl">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-primary-700" />
          </div>
          <h1 className="text-4xl font-display font-bold text-neutral-900">Terms & Conditions</h1>
          <p className="text-neutral-500 mt-2">Last updated: June 1, 2026</p>
        </div>

        <div className="space-y-6">
          {[
            { title: '1. Acceptance of Terms', content: 'By accessing and using the VerdantCare Medical Center platform, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our services.' },
            { title: '2. Services Description', content: 'VerdantCare Medical Center provides an online healthcare platform that includes appointment booking, telehealth consultations, patient portal access, medical records management, and related healthcare services.' },
            { title: '3. User Accounts', content: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate and current.' },
            { title: '4. Appointments & Cancellations', content: 'Appointments are subject to availability and confirmation. Cancellations must be made at least 24 hours prior to the scheduled appointment time. Repeated no-shows may result in restrictions on future bookings.' },
            { title: '5. Medical Advice Disclaimer', content: 'The information provided on this platform is for general informational purposes only and does not constitute medical advice. Always seek the advice of your physician or other qualified health provider with any questions regarding a medical condition.' },
            { title: '6. Payment Terms', content: 'Fees for services are due at the time of service unless otherwise arranged with our billing department. We accept major credit cards and insurance billing. All fees are non-refundable unless required by law.' },
            { title: '7. Intellectual Property', content: 'All content on this platform, including text, graphics, logos, images, and software, is the property of VerdantCare Medical Center and is protected by applicable intellectual property laws.' },
            { title: '8. Limitation of Liability', content: 'VerdantCare Medical Center shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our platform or services. Our total liability shall not exceed the amount paid by you for the specific service giving rise to the claim.' },
            { title: '9. Modifications', content: 'We reserve the right to modify these terms at any time. Continued use of the platform after modifications constitutes acceptance of the updated terms. We will notify registered users of significant changes via email.' },
            { title: '10. Governing Law', content: 'These Terms shall be governed by the laws of the State of South Carolina, United States. Any disputes arising under these Terms shall be resolved in the courts of South Carolina.' },
          ].map((section) => (
            <div key={section.title} className="bg-white rounded-xl border border-neutral-100 p-6">
              <h2 className="text-xl font-display font-bold text-neutral-900 mb-3">{section.title}</h2>
              <p className="text-neutral-600 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TermsPage;
