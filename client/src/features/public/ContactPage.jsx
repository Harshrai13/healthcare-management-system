import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { publicAPI } from '../../api/generalAPI';

function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await publicAPI.submitContact(formData);
      toast.success('Message sent successfully! We will get back to you soon.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="text-center mb-16">
          <span className="text-primary-700 font-medium">Get in Touch</span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mt-2">Contact Us</h1>
          <p className="text-neutral-600 mt-4 max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out to us through any of the channels below.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-heading font-bold text-neutral-900 mb-6">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">Name *</label>
                  <input id="name" name="name" type="text" required value={formData.name} onChange={handleChange} className="input-field" placeholder="Your name" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">Email *</label>
                  <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className="input-field" placeholder="your@email.com" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                  <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className="input-field" placeholder="+1 (234) 567-890" />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 mb-1">Subject *</label>
                  <input id="subject" name="subject" type="text" required value={formData.subject} onChange={handleChange} className="input-field" placeholder="How can we help?" />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-neutral-700 mb-1">Message *</label>
                <textarea id="message" name="message" rows={5} required value={formData.message} onChange={handleChange} className="input-field resize-none" placeholder="Tell us more about your inquiry..." />
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                <Send size={18} className="mr-2" />
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-bold text-neutral-900 mb-6">Contact Information</h2>
            <div className="space-y-6">
              {[
                { icon: MapPin, title: 'Address', content: '123 Healthcare Ave, Suite 100\nSouth Carolina, SC 29601' },
                { icon: Phone, title: 'Phone', content: '+1 (234) 567-8900\nEmergency: +1 (234) 567-9111' },
                { icon: Mail, title: 'Email', content: 'info@verdantcare.com\nappointments@verdantcare.com' },
                { icon: Clock, title: 'Hours', content: 'Mon-Fri: 9:00 AM - 6:00 PM\nSat: 9:00 AM - 2:00 PM\nSun: Closed' },
              ].map(({ icon: Icon, title, content }) => (
                <div key={title} className="flex gap-4">
                  <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="text-primary-700" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">{title}</h3>
                    <p className="text-neutral-600 whitespace-pre-line">{content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 h-64 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl flex items-center justify-center">
              <MapPin size={48} className="text-primary-700/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactPage;
