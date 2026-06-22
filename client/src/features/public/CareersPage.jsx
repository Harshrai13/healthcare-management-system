import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, Clock, DollarSign, Users, Heart, Send, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { publicAPI } from '../../api/generalAPI';

const openPositions = [
  { id: '1', title: 'Family Medicine Physician', department: 'Clinical', type: 'Full-time', location: 'Main Campus', experience: '5+ years' },
  { id: '2', title: 'Registered Nurse', department: 'Nursing', type: 'Full-time', location: 'Main Campus', experience: '2+ years' },
  { id: '3', title: 'Medical Receptionist', department: 'Administration', type: 'Full-time', location: 'Main Campus', experience: '1+ years' },
  { id: '4', title: 'Pediatric Specialist', department: 'Clinical', type: 'Part-time', location: 'Main Campus', experience: '3+ years' },
  { id: '5', title: 'Telehealth Coordinator', department: 'Operations', type: 'Full-time', location: 'Remote', experience: '2+ years' },
  { id: '6', title: 'Billing Specialist', department: 'Finance', type: 'Full-time', location: 'Main Campus', experience: '3+ years' },
];

const benefits = [
  { icon: Heart, label: 'Comprehensive health, dental, and vision insurance' },
  { icon: DollarSign, label: 'Competitive salary and retirement plan (401k)' },
  { icon: Clock, label: 'Generous PTO and paid holidays' },
  { icon: Users, label: 'Professional development and CME allowance' },
];

function CareersPage() {
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', coverLetter: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApply = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await publicAPI.submitCareerApplication({
        ...formData,
        positionTitle: selectedPosition?.title,
        positionId: selectedPosition?.id,
      });
      toast.success('Application submitted successfully! We will review and get back to you.');
      setSelectedPosition(null);
      setFormData({ name: '', email: '', phone: '', coverLetter: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-padding">
      <div className="container-custom">
        <Link to="/" className="inline-flex items-center gap-2 text-primary-700 font-medium hover:text-primary-800 mb-6">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div className="text-center mb-12">
          <span className="text-primary-700 font-medium">Careers</span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mt-2">
            Join Our Team
          </h1>
          <p className="text-neutral-600 mt-4 max-w-2xl mx-auto text-lg">
            Build a rewarding career in healthcare. Explore open positions and become part of the VerdantCare family.
          </p>
        </div>

        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8 mb-12">
          <h2 className="text-xl font-display font-bold text-neutral-900 mb-4">Why Work at VerdantCare?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit) => (
              <div key={benefit.label} className="flex items-center gap-3 bg-white rounded-xl p-4 border border-neutral-100">
                <benefit.icon size={18} className="text-primary-700 flex-shrink-0" />
                <p className="text-sm text-neutral-700">{benefit.label}</p>
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-2xl font-display font-bold text-neutral-900 mb-6">Open Positions</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {openPositions.map((position) => (
            <div key={position.id} className="bg-white rounded-xl border border-neutral-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-bold text-neutral-900">{position.title}</h3>
                  <p className="text-sm text-neutral-500">{position.department}</p>
                </div>
                <Briefcase size={18} className="text-primary-700" />
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full">{position.type}</span>
                <span className="flex items-center gap-1 text-xs text-neutral-500"><MapPin size={10} /> {position.location}</span>
                <span className="flex items-center gap-1 text-xs text-neutral-500"><Clock size={10} /> {position.experience}</span>
              </div>
              <button
                onClick={() => setSelectedPosition(position)}
                className="btn-outline w-full text-sm py-2"
              >
                Apply Now
              </button>
            </div>
          ))}
        </div>

        {selectedPosition && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-display font-bold text-neutral-900 mb-1">Apply: {selectedPosition.title}</h2>
              <p className="text-sm text-neutral-500 mb-6">{selectedPosition.department} - {selectedPosition.type}</p>
              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email *</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field" placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Phone *</label>
                  <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" placeholder="+1 (555) 000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Cover Letter</label>
                  <textarea rows={4} value={formData.coverLetter} onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })} className="input-field" placeholder="Tell us why you're a great fit..." />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setSelectedPosition(null)} className="btn-outline flex-1">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Send size={16} />
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default CareersPage;
