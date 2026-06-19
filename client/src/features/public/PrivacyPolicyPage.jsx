import { Shield, Lock, Eye } from 'lucide-react';

function PrivacyPolicyPage() {
  return (
    <section className="section-padding">
      <div className="container-custom max-w-4xl">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-primary-700" />
          </div>
          <h1 className="text-4xl font-display font-bold text-neutral-900">Privacy Policy</h1>
          <p className="text-neutral-500 mt-2">Last updated: June 1, 2026</p>
        </div>

        <div className="prose prose-neutral max-w-none space-y-8">
          <div className="bg-white rounded-xl border border-neutral-100 p-6">
            <h2 className="text-xl font-display font-bold text-neutral-900 mb-3">1. Information We Collect</h2>
            <p className="text-neutral-600 leading-relaxed">We collect information that you provide directly to us, including your name, email address, phone number, date of birth, medical history, insurance information, and payment details. We also automatically collect certain information about your device and usage of our platform.</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-100 p-6">
            <h2 className="text-xl font-display font-bold text-neutral-900 mb-3">2. How We Use Your Information</h2>
            <p className="text-neutral-600 leading-relaxed">We use the information we collect to provide healthcare services, process appointments, manage your patient records, send appointment reminders and health notifications, process payments, improve our services, and comply with legal obligations.</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-100 p-6">
            <h2 className="text-xl font-display font-bold text-neutral-900 mb-3">3. Information Sharing</h2>
            <p className="text-neutral-600 leading-relaxed">We do not sell your personal information. We share your information only with your healthcare providers, insurance companies as necessary for claims processing, third-party service providers who assist in our operations, and when required by law.</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-100 p-6">
            <h2 className="text-xl font-display font-bold text-neutral-900 mb-3">4. Data Security</h2>
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-primary-700 mt-1 flex-shrink-0" />
              <p className="text-neutral-600 leading-relaxed">We implement industry-standard security measures including SSL/TLS encryption, encrypted data storage, role-based access controls, regular security audits, and secure authentication to protect your personal and medical information.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-100 p-6">
            <h2 className="text-xl font-display font-bold text-neutral-900 mb-3">5. Your Rights</h2>
            <p className="text-neutral-600 leading-relaxed">You have the right to access your personal information, request corrections to inaccurate data, request deletion of your data (subject to legal retention requirements), opt out of marketing communications, and file a complaint with the relevant data protection authority.</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-100 p-6">
            <h2 className="text-xl font-display font-bold text-neutral-900 mb-3">6. Cookies & Tracking</h2>
            <p className="text-neutral-600 leading-relaxed">We use essential cookies for platform functionality and analytics cookies to improve our services. You can manage cookie preferences through your browser settings. We do not use tracking cookies for advertising purposes.</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-100 p-6">
            <h2 className="text-xl font-display font-bold text-neutral-900 mb-3">7. Contact Us</h2>
            <div className="flex items-start gap-3">
              <Eye size={18} className="text-primary-700 mt-1 flex-shrink-0" />
              <p className="text-neutral-600 leading-relaxed">If you have questions about this privacy policy or our data practices, please contact our Privacy Officer at privacy@verdantcare.com or call us at (843) 555-0100.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PrivacyPolicyPage;
