import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

const faqData = [
  {
    category: 'Appointments',
    questions: [
      { q: 'How do I book an appointment?', a: 'You can book an appointment through our website by visiting the Appointments page. Select your preferred doctor, service, date, and time. You will receive a confirmation email once your booking is confirmed.' },
      { q: 'Can I reschedule or cancel my appointment?', a: 'Yes, you can reschedule or cancel your appointment up to 24 hours before the scheduled time. Log into your patient portal and go to your appointment history to make changes.' },
      { q: 'What happens if I miss my appointment?', a: 'If you miss an appointment without prior cancellation, it will be marked as a no-show. Repeated no-shows may affect your ability to book future appointments. Please cancel or reschedule in advance.' },
      { q: 'How far in advance can I book?', a: 'You can book appointments up to 60 days in advance. Some specialists may have different availability windows.' },
    ],
  },
  {
    category: 'Telehealth',
    questions: [
      { q: 'How do video consultations work?', a: 'After booking a video consultation, you will receive a secure link via email before your appointment time. Click the link at your scheduled time to join the encrypted video call with your doctor.' },
      { q: 'What equipment do I need for telehealth?', a: 'You need a device with a camera and microphone (smartphone, tablet, or computer), a stable internet connection, and a quiet, well-lit space for the consultation.' },
      { q: 'Is telehealth as effective as in-person visits?', a: 'For many conditions, telehealth is equally effective. However, your doctor may recommend an in-person visit if a physical examination is required.' },
    ],
  },
  {
    category: 'Billing & Insurance',
    questions: [
      { q: 'What insurance plans do you accept?', a: 'We accept most major insurance plans. Please contact our billing department or check the Insurance Information page for a complete list of accepted providers.' },
      { q: 'How do I view my invoices?', a: 'Log into your patient portal and navigate to the Billing section. You can view, download, and pay invoices directly from your dashboard.' },
      { q: 'Do you offer payment plans?', a: 'Yes, we offer flexible payment plans for eligible patients. Contact our billing department to discuss available options.' },
    ],
  },
  {
    category: 'Medical Records',
    questions: [
      { q: 'How can I access my medical records?', a: 'Your medical records are securely stored and accessible through your patient portal. You can view visit summaries, prescriptions, lab results, and upload documents.' },
      { q: 'Are my records kept confidential?', a: 'Absolutely. We follow strict healthcare privacy practices. Your records are encrypted, access is role-based, and we comply with all applicable healthcare regulations.' },
      { q: 'Can I request copies of my records?', a: 'Yes, you can request copies of your medical records through the patient portal or by contacting our records department directly.' },
    ],
  },
  {
    category: 'General',
    questions: [
      { q: 'What are your clinic hours?', a: 'Our clinic is open Monday through Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 1:00 PM. We are closed on Sundays and major holidays.' },
      { q: 'Do you offer emergency services?', a: 'We offer urgent care services during clinic hours. For medical emergencies outside of clinic hours, please call 911 or visit your nearest emergency room.' },
      { q: 'How do I create an account?', a: 'Click the Register button on the homepage and fill in your details. You will receive a verification email to activate your account.' },
    ],
  },
];

function FAQPage() {
  const [openItems, setOpenItems] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggleItem = (key) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredData = faqData
    .map((section) => ({
      ...section,
      questions: section.questions.filter(
        (item) =>
          item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.a.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((section) => section.questions.length > 0);

  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="text-center mb-12">
          <span className="text-primary-700 font-medium">FAQ</span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mt-2">
            Frequently Asked Questions
          </h1>
          <p className="text-neutral-600 mt-4 max-w-2xl mx-auto text-lg">
            Find answers to common questions about our services, appointments, billing, and more.
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-10">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto space-y-8">
          {filteredData.map((section) => (
            <div key={section.category}>
              <h2 className="text-xl font-display font-bold text-neutral-900 mb-4">{section.category}</h2>
              <div className="space-y-2">
                {section.questions.map((item, idx) => {
                  const key = `${section.category}-${idx}`;
                  return (
                    <div key={key} className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors"
                      >
                        <span className="font-medium text-neutral-900 pr-4">{item.q}</span>
                        <ChevronDown
                          size={18}
                          className={`text-neutral-400 transition-transform flex-shrink-0 ${
                            openItems[key] ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {openItems[key] && (
                        <div className="px-4 pb-4 text-neutral-600 text-sm leading-relaxed border-t border-neutral-50 pt-3">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredData.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <Search size={40} className="mx-auto mb-3 text-neutral-300" />
              <p className="font-medium">No questions found matching your search</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default FAQPage;
