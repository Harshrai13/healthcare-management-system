import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, Video, Users, Clock, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDoctors } from '../../hooks/useDoctors';
import { useDebounce } from '../../hooks/useDebounce';
import { servicesAPI } from '../../api/doctorsAPI';

function DoctorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await servicesAPI.getAll();
      return data.data || [];
    },
  });

  const specialties = ['All', ...services.map((s) => s.name)];

  const queryParams = {};
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (selectedSpecialty !== 'All') queryParams.specialty = selectedSpecialty;
  queryParams.limit = 24;

  const { data: doctors = [], isLoading } = useDoctors(queryParams);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('All');
  };

  return (
    <main className="pt-20 bg-neutral-50 min-h-screen">

      {/* Search Header */}
      <section className="bg-forest-gradient py-16 px-4">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
              Find Your Perfect Doctor
            </h1>

            {/* Search Bar */}
            <div className="relative flex items-center max-w-2xl mx-auto bg-white rounded-full p-2 shadow-lg">
              <div className="pl-4 text-neutral-400">
                <Search size={24} />
              </div>
              <input
                type="text"
                placeholder="Search doctors by name, specialty, or condition..."
                className="w-full bg-transparent border-none focus:ring-0 text-neutral-800 px-4 py-3 placeholder-neutral-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container-custom py-12">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Mobile Filter Toggle */}
          <button
            className="lg:hidden flex items-center justify-center gap-2 w-full py-3 bg-white border border-neutral-200 rounded-xl font-semibold text-neutral-700"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter size={20} />
            {isFilterOpen ? 'Hide Filters' : 'Show Filters'}
          </button>

          {/* Sidebar Filters */}
          <aside className={`lg:w-1/4 lg:block ${isFilterOpen ? 'block' : 'hidden'}`}>
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 sticky top-28">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-bold text-lg text-neutral-900">Filters</h3>
                {(searchQuery || selectedSpecialty !== 'All') && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-danger hover:underline font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Specialty Filter */}
              <div className="mb-8">
                <h4 className="font-semibold text-sm text-neutral-900 mb-3 uppercase tracking-wider">Specialty</h4>
                <div className="space-y-2">
                  {specialties.map(spec => (
                    <label key={spec} className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center w-5 h-5 rounded-full border border-neutral-300 bg-white group-hover:border-primary-500 transition-colors">
                        <input
                          type="radio"
                          name="specialty"
                          className="peer sr-only"
                          checked={selectedSpecialty === spec}
                          onChange={() => setSelectedSpecialty(spec)}
                        />
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-500 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                      </div>
                      <span className={`text-sm ${selectedSpecialty === spec ? 'font-semibold text-primary-700' : 'text-neutral-600'}`}>
                        {spec}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Consultation Mode Filter */}
              <div>
                <h4 className="font-semibold text-sm text-neutral-900 mb-3 uppercase tracking-wider">Consultation Mode</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500" defaultChecked />
                    <span className="text-sm text-neutral-600 flex items-center gap-2"><Users size={16} /> In-Person Visit</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-5 h-5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500" defaultChecked />
                    <span className="text-sm text-neutral-600 flex items-center gap-2"><Video size={16} /> Video Consult</span>
                  </label>
                </div>
              </div>

            </div>
          </aside>

          {/* Main Content - Doctor Grid */}
          <div className="lg:w-3/4">

            <div className="mb-6 flex items-center justify-between">
              <p className="text-neutral-600 font-medium">
                Showing <span className="font-bold text-neutral-900">{isLoading ? '…' : doctors.length}</span> doctors
              </p>
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card-border p-6 animate-pulse space-y-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-neutral-100 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-neutral-100 rounded w-2/3" />
                        <div className="h-4 bg-neutral-100 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : doctors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 mx-auto mb-4">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">No doctors found</h3>
                <p className="text-neutral-500">Try adjusting your filters or search terms.</p>
                <button onClick={clearFilters} className="btn-outline mt-6">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {doctors.map(doctor => {
                  const firstName = doctor.user?.firstName || '';
                  const lastName = doctor.user?.lastName || '';
                  const name = `Dr. ${firstName} ${lastName}`.trim();
                  const modes = doctor.consultationModes || [];
                  const modeLabels = modes.map(m => m === 'IN_PERSON' ? 'In-Person' : m === 'VIDEO' ? 'Video' : m);

                  return (
                    <div key={doctor._id} className="card-border group hover:border-primary-300">
                      <div className="flex gap-4">
                        {/* Avatar */}
                        {doctor.user?.avatar ? (
                          <img src={doctor.user.avatar} alt={name} className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-primary-200" />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 font-display font-bold text-2xl shrink-0 border border-primary-200">
                            {firstName[0] || 'D'}{lastName[0] || ''}
                          </div>
                        )}

                        {/* Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-heading font-bold text-neutral-900 group-hover:text-primary-700 transition-colors">
                              {name}
                            </h3>
                          </div>
                          <p className="text-primary-600 font-medium text-sm mb-2">{doctor.specialty}</p>

                          <div className="flex items-center gap-1.5 text-sm mb-3">
                            <Star size={16} className="text-amber-400 fill-amber-400" />
                            <span className="font-bold text-neutral-900">{doctor.rating?.toFixed(1) || '—'}</span>
                            <span className="text-neutral-500">({doctor.reviewCount || 0} reviews)</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-neutral-100 my-4" />

                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mb-6">
                        <div className="flex items-center gap-2 text-neutral-600">
                          <Clock size={16} className="text-primary-500" />
                          <span className="truncate">Exp: {doctor.experienceYears || 0} yrs</span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-600">
                          <MapPin size={16} className="text-primary-500" />
                          <span className="truncate">Main Clinic</span>
                        </div>
                        {modeLabels.length > 0 && (
                          <div className="col-span-2 flex items-center gap-2 text-neutral-600">
                            <Video size={16} className="text-primary-500" />
                            <div className="flex gap-1.5">
                              {modeLabels.map(mode => (
                                <span key={mode} className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-semibold">{mode}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Link to="/appointments/book" className="btn-primary flex-1 justify-center text-sm py-2.5">
                          Book Now
                        </Link>
                        <Link to={`/doctors/${doctor._id}`} className="btn-outline flex-1 justify-center text-sm py-2.5">
                          Profile
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </section>
    </main>
  );
}

export default DoctorsPage;
