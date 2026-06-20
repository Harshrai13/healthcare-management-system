import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Video, MapPin, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Check, ListPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { appointmentsAPI } from '../../api/appointmentsAPI';

function AppointmentBooking() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState({
    serviceId: '',
    serviceName: '',
    doctorId: '',
    date: '',
    startTime: '',
    consultationType: 'IN_PERSON',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await api.get('/services');
      return data.data;
    },
  });

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors', booking.serviceName],
    queryFn: async () => {
      // First try matching by specialty
      const { data } = await api.get(`/doctors?specialty=${encodeURIComponent(booking.serviceName)}&available=true`);
      let doctors = data.data?.doctors || [];
      // Fallback: if no doctors match, show all available doctors
      if (doctors.length === 0) {
        const { data: allData } = await api.get('/doctors?available=true');
        doctors = allData.data?.doctors || [];
      }
      return doctors;
    },
    enabled: !!booking.serviceName,
  });

  const { data: scheduleData } = useQuery({
    queryKey: ['doctorSchedule', booking.doctorId],
    queryFn: async () => {
      const { data } = await api.get(`/doctors/${booking.doctorId}/schedule`);
      return data.data;
    },
    enabled: !!booking.doctorId,
  });

  const { data: availabilityData } = useQuery({
    queryKey: ['doctorAvailability', booking.doctorId, booking.date],
    queryFn: async () => {
      const { data } = await api.get(`/doctors/${booking.doctorId}/availability`, { params: { date: booking.date } });
      return data.data;
    },
    enabled: !!booking.doctorId && !!booking.date,
  });

  const bookedSlots = availabilityData?.bookedSlots || [];

  const bookAppointment = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/appointments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast.success('Appointment booked successfully!');
      navigate('/dashboard/appointments');
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.message || 'Failed to book appointment.';
      if (error.response?.status === 409) {
        toast.error('This slot is no longer available.');
        setShowWaitlist(true);
      } else {
        toast.error(msg);
      }
    },
  });

  const joinWaitlist = useMutation({
    mutationFn: (data) => appointmentsAPI.joinWaitlist(data),
    onSuccess: () => {
      toast.success('Added to waitlist! We will notify you when a slot opens.');
      navigate('/dashboard/appointments');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to join waitlist.');
    },
  });

  const allTimeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let min = 0; min < 60; min += 30) {
        if (hour === 16 && min > 30) break;
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const availableSlots = useMemo(
    () => allTimeSlots.filter((t) => !bookedSlots.includes(t)),
    [allTimeSlots, bookedSlots]
  );

  const allSlotsBooked = booking.date && booking.doctorId && availableSlots.length === 0;

  const handleNext = () => {
    if (step === 1 && !booking.serviceId) {
      toast.error('Please select a service');
      return;
    }
    if (step === 2 && !booking.doctorId) {
      toast.error('Please select a doctor');
      return;
    }
    if (step === 3 && (!booking.date || !booking.startTime)) {
      toast.error('Please select date and time');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { serviceName, ...submitData } = booking;
      await bookAppointment.mutateAsync(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!booking.doctorId || !booking.serviceId) {
      toast.error('Please select a doctor and service first');
      return;
    }
    const preferredDates = booking.date ? [booking.date] : [getMinDate()];
    await joinWaitlist.mutateAsync({
      doctorId: booking.doctorId,
      serviceId: booking.serviceId,
      preferredDates,
    });
  };

  const generateTimeSlots = () => allTimeSlots;

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-display font-bold text-neutral-900 mb-8">Book an Appointment</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-12">
        {['Service', 'Doctor', 'Date & Time', 'Confirm'].map((label, idx) => (
          <div key={label} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              step > idx + 1 ? 'bg-primary-700 text-white' : step === idx + 1 ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-700' : 'bg-neutral-100 text-neutral-400'
            }`}>
              {step > idx + 1 ? <CheckCircle size={20} /> : idx + 1}
            </div>
            <span className={`ml-2 hidden sm:block ${step === idx + 1 ? 'text-primary-700 font-medium' : 'text-neutral-500'}`}>{label}</span>
            {idx < 3 && <div className={`w-12 sm:w-24 h-0.5 mx-2 ${step > idx + 1 ? 'bg-primary-700' : 'bg-neutral-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Service */}
      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-heading font-semibold text-neutral-900">Select a Service</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servicesData?.map((service) => (
              <button
                key={service._id}
                onClick={() => setBooking({ ...booking, serviceId: service._id, serviceName: service.name, doctorId: '' })}
                className={`card text-left transition-all relative ${booking.serviceId === service._id ? 'ring-2 ring-primary-700 bg-primary-50 scale-[1.02]' : 'hover:scale-[1.02] hover:border-primary-300'}`}
              >
                {booking.serviceId === service._id && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-primary-700 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}
                <h3 className="font-heading font-semibold text-neutral-900">{service.name}</h3>
                <p className="text-sm text-neutral-600 mt-2 line-clamp-2">{service.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Doctor */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-heading font-semibold text-neutral-900">Select a Doctor</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {doctorsData?.map((doctor) => (
              <button
                key={doctor._id}
                onClick={() => setBooking({ ...booking, doctorId: doctor._id })}
                className={`card text-left transition-all flex items-center gap-4 relative ${booking.doctorId === doctor._id ? 'ring-2 ring-primary-700 bg-primary-50 scale-[1.02]' : 'hover:scale-[1.02] hover:border-primary-300'}`}
              >
                {booking.doctorId === doctor._id && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-primary-700 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-primary-700">
                    {doctor.user?.firstName?.[0]}{doctor.user?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-neutral-900">Dr. {doctor.user?.firstName} {doctor.user?.lastName}</h3>
                  <p className="text-sm text-primary-700">{doctor.specialty}</p>
                  <p className="text-sm text-neutral-500">{doctor.experienceYears} years exp • ★ {doctor.rating}</p>
                </div>
              </button>
            ))}
            {(!doctorsData || doctorsData.length === 0) && (
              <p className="text-neutral-500 col-span-2 text-center py-8">No doctors available for this service.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Date & Time */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-heading font-semibold text-neutral-900">Select Date & Time</h2>

          <div className="card">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Consultation Type</label>
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setBooking({ ...booking, consultationType: 'IN_PERSON' })}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${booking.consultationType === 'IN_PERSON' ? 'border-primary-700 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600'}`}
              >
                <MapPin size={18} /> In-Person
              </button>
              <button
                onClick={() => setBooking({ ...booking, consultationType: 'VIDEO' })}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${booking.consultationType === 'VIDEO' ? 'border-primary-700 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-600'}`}
              >
                <Video size={18} /> Video Call
              </button>
            </div>

            <label className="block text-sm font-medium text-neutral-700 mb-2">Date</label>
            <input
              type="date"
              min={getMinDate()}
              value={booking.date}
              onChange={(e) => setBooking({ ...booking, date: e.target.value, startTime: '' })}
              className="input-field mb-6"
            />

            <label className="block text-sm font-medium text-neutral-700 mb-2">Available Time Slots</label>
            {allSlotsBooked ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium">All slots are booked for this date.</p>
                <p className="text-xs text-amber-700 mt-1">Join the waitlist and we will notify you when a slot opens.</p>
                <button
                  onClick={handleJoinWaitlist}
                  disabled={joinWaitlist.isPending}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  <ListPlus size={16} /> {joinWaitlist.isPending ? 'Joining...' : 'Join Waitlist'}
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {generateTimeSlots().map((time) => {
                const isBooked = bookedSlots.includes(time);
                return (
                <button
                  key={time}
                  disabled={isBooked}
                  onClick={() => setBooking({ ...booking, startTime: time })}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    isBooked ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed line-through' :
                    booking.startTime === time ? 'bg-primary-700 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {time}
                </button>
              );})}
            </div>
            )}

            {(showWaitlist || allSlotsBooked) && !allSlotsBooked && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <button
                  onClick={handleJoinWaitlist}
                  disabled={joinWaitlist.isPending}
                  className="flex items-center gap-2 text-sm text-primary-700 font-medium hover:text-primary-800"
                >
                  <ListPlus size={16} /> Prefer a different date? Join the waitlist instead
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Notes (optional)</label>
            <textarea
              value={booking.notes}
              onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
              className="input-field resize-none"
              rows={3}
              placeholder="Any symptoms or concerns you'd like to share..."
            />
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="space-y-6">
          <h2 className="text-xl font-heading font-semibold text-neutral-900">Confirm Your Appointment</h2>
          <div className="card space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-neutral-100">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-primary-700" size={24} />
              </div>
              <div>
                <p className="font-heading font-semibold text-neutral-900">Appointment Summary</p>
                <p className="text-sm text-neutral-500">Please review the details below</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-500">Service</p>
                <p className="font-medium text-neutral-900">{servicesData?.find((s) => s._id === booking.serviceId)?.name}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Doctor</p>
                <p className="font-medium text-neutral-900">Dr. {doctorsData?.find((d) => d._id === booking.doctorId)?.user?.firstName} {doctorsData?.find((d) => d._id === booking.doctorId)?.user?.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Date & Time</p>
                <p className="font-medium text-neutral-900">{new Date(booking.date).toLocaleDateString()} at {booking.startTime}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Type</p>
                <p className="font-medium text-neutral-900">{booking.consultationType === 'VIDEO' ? 'Video Consultation' : 'In-Person Visit'}</p>
              </div>
            </div>

            {booking.notes && (
              <div>
                <p className="text-sm text-neutral-500">Notes</p>
                <p className="text-neutral-900">{booking.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-yellow-800">By confirming, you agree to our cancellation policy. You can reschedule or cancel up to 24 hours before your appointment.</p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="btn-outline">
            <ArrowLeft size={18} className="mr-2" /> Back
          </button>
        ) : <div />}
        {step < 4 ? (
          <button onClick={handleNext} className="btn-primary">
            Next <ArrowRight size={18} className="ml-2" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        )}
      </div>
    </div>
  );
}

export default AppointmentBooking;
