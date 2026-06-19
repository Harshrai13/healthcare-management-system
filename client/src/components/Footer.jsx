import { memo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Facebook, Twitter, Instagram, Linkedin, ArrowRight } from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-forest-gradient text-white relative overflow-hidden pt-20">
      {/* Decorative mesh background */}
      <div className="absolute inset-0 bg-dark-mesh opacity-40 pointer-events-none"></div>
      
      <div className="container-custom relative z-10 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Brand Column */}
          <div className="lg:col-span-4">
            <Link to="/" className="flex items-center gap-3 mb-6 inline-flex group">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 transition-transform group-hover:scale-105">
                <span className="text-primary-300 font-display font-bold text-2xl">V</span>
              </div>
              <div>
                <h2 className="text-2xl font-display font-black tracking-tight text-white">VerdantCare</h2>
                <p className="text-[10px] font-bold text-primary-400 tracking-widest uppercase mt-0.5">MEDICAL CENTER</p>
              </div>
            </Link>
            <p className="text-primary-100/80 text-sm leading-relaxed mb-8 pr-4">
              Premium healthcare services combining expert medical care with compassionate patient experience. Your health journey, elevated.
            </p>
            
            {/* Newsletter */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold mb-3 text-white">Subscribe to our newsletter</h4>
              <form className="relative flex items-center" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Email address" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-4 pr-14 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all backdrop-blur-sm"
                />
                <button type="submit" className="absolute right-2 w-9 h-9 bg-primary-500 hover:bg-primary-400 rounded-lg flex items-center justify-center text-white transition-colors shadow-emerald">
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2 lg:col-start-6">
            <h3 className="text-lg font-heading font-bold mb-6 text-white">Quick Links</h3>
            <ul className="space-y-3.5">
              {[
                { name: 'About Us', path: '/about' },
                { name: 'Our Doctors', path: '/doctors' },
                { name: 'Book Appointment', path: '/appointments/book' },
                { name: 'Patient Portal', path: '/dashboard' },
                { name: 'Health Blog', path: '/blog' },
                { name: 'Patient Reviews', path: '/reviews' },
              ].map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-primary-100/70 hover:text-white transition-colors text-sm font-medium flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-heading font-bold mb-6 text-white">Specialties</h3>
            <ul className="space-y-3.5">
              {[
                'Family Medicine', 
                'Telemedicine', 
                'Pediatrics', 
                "Women's Health", 
                'Cardiology', 
                'Wellness Programs'
              ].map((service) => (
                <li key={service}>
                  <Link to="/services" className="text-primary-100/70 hover:text-white transition-colors text-sm font-medium flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {service}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3 text-sm">
            <h3 className="text-lg font-heading font-bold mb-6 text-white">Contact Us</h3>
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-primary-400">
                  <MapPin size={16} />
                </div>
                <span className="text-primary-100/80 leading-relaxed mt-1">123 Premium Care Blvd,<br />Suite 400, NY 10001</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-primary-400">
                  <Phone size={16} />
                </div>
                <a href="tel:+1234567890" className="text-primary-100/80 hover:text-white transition-colors font-medium">
                  +1 (800) 123-4567
                </a>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-primary-400">
                  <Mail size={16} />
                </div>
                <a href="mailto:hello@verdantcare.com" className="text-primary-100/80 hover:text-white transition-colors">
                  hello@verdantcare.com
                </a>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-primary-400">
                  <Clock size={16} />
                </div>
                <div className="text-primary-100/80 mt-1">
                  <p>Mon-Fri: 8am - 8pm</p>
                  <p>Sat-Sun: 9am - 5pm</p>
                </div>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 relative z-10 bg-black/20">
        <div className="container-custom py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-primary-100/60 text-sm">
              &copy; {currentYear} VerdantCare Medical Center. All rights reserved.
            </p>
            
            <div className="flex items-center gap-4">
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-primary-500 hover:text-white transition-all">
                <Twitter size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-primary-500 hover:text-white transition-all">
                <Linkedin size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-primary-500 hover:text-white transition-all">
                <Facebook size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-primary-500 hover:text-white transition-all">
                <Instagram size={16} />
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <Link to="/privacy-policy" className="text-primary-100/60 hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="text-primary-100/60 hover:text-white transition-colors">Terms</Link>
              <Link to="/faq" className="text-primary-100/60 hover:text-white transition-colors">FAQ</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default memo(Footer);
