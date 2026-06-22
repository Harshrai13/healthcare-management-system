import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Save, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { doctorsAPI } from '../../api/doctorsAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

function SchedulePage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [localSchedule, setLocalSchedule] = useState(null);

  const doctorId = user?._id || user?.id || user?.doctorId;

  const { data: savedSchedule = {}, isLoading } = useQuery({
    queryKey: ['doctor_schedule', doctorId],
    queryFn: async () => {
      if (!doctorId) return {};
      const { data } = await doctorsAPI.getSchedule(doctorId);
      return data.data?.schedule || data.data || {};
    },
    enabled: !!doctorId,
  });

  const schedule = localSchedule || savedSchedule;

  const saveMutation = useMutation({
    mutationFn: (scheduleData) => doctorsAPI.updateProfile(doctorId, { schedule: scheduleData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor_schedule'] });
      setIsEditing(false);
      setLocalSchedule(null);
      toast.success('Schedule updated successfully!');
    },
    onError: () => toast.error('Failed to save schedule'),
  });

  const handleToggleSlot = (day, slotStart) => {
    if (!isEditing) return;
    setLocalSchedule((prev) => {
      const current = prev || savedSchedule;
      const daySlots = [...(current[day] || [])];
      const slotIdx = daySlots.findIndex((s) => s.start === slotStart);
      if (slotIdx >= 0) {
        daySlots.splice(slotIdx, 1);
      } else {
        const endHour = parseInt(slotStart.split(':')[0]) + 1;
        daySlots.push({ start: slotStart, end: `${String(endHour).padStart(2, '0')}:00` });
        daySlots.sort((a, b) => a.start.localeCompare(b.start));
      }
      return { ...current, [day]: daySlots };
    });
  };

  const isSlotActive = (day, slot) => {
    const current = localSchedule || savedSchedule;
    return (current[day] || []).some((s) => slot >= s.start && slot < s.end);
  };

  const handleSave = () => {
    const toSave = localSchedule || savedSchedule;
    saveMutation.mutate(toSave);
  };

  const handleCancel = () => {
    setLocalSchedule(null);
    setIsEditing(false);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-900">My Schedule</h1>
            <p className="text-neutral-500 mt-1">Manage your weekly availability and time slots</p>
          </div>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="btn-primary flex items-center gap-2">
            <Calendar size={16} /> Edit Schedule
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={handleCancel} className="btn-outline">Cancel</button>
            <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2">
              <Save size={16} /> {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-600 w-24">Time</th>
                {daysOfWeek.map((day) => (
                  <th key={day} className="py-3 px-2 text-center text-sm font-medium text-neutral-600 min-w-[80px]">
                    {day.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot} className="border-b border-neutral-50">
                  <td className="py-2 px-4 text-xs font-mono text-neutral-500">{slot}</td>
                  {daysOfWeek.map((day) => {
                    const active = isSlotActive(day, slot);
                    return (
                      <td key={day} className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleToggleSlot(day, slot)}
                          disabled={!isEditing}
                          className={`w-full h-8 rounded-md text-xs transition-colors ${
                            active
                              ? 'bg-primary-100 border border-primary-300 text-primary-700'
                              : 'bg-neutral-50 border border-neutral-100 text-transparent hover:border-neutral-300'
                          } ${isEditing ? 'cursor-pointer hover:bg-primary-50' : 'cursor-default'}`}
                        >
                          {active ? 'Booked' : '-'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
        <h2 className="font-display font-bold text-neutral-900 mb-4">Weekly Summary</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-primary-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-primary-700">{daysOfWeek.filter((d) => (schedule[d] || []).length > 0).length}</p>
            <p className="text-sm text-primary-600">Working Days</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-700">
              {daysOfWeek.reduce((total, d) => total + (schedule[d] || []).reduce((h, s) => {
                const start = parseInt(s.start.split(':')[0]);
                const end = parseInt(s.end.split(':')[0]);
                return h + (end - start);
              }, 0), 0)}h
            </p>
            <p className="text-sm text-blue-600">Total Hours</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-700">
              {daysOfWeek.reduce((total, d) => total + (schedule[d] || []).length, 0)}
            </p>
            <p className="text-sm text-green-600">Time Blocks</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SchedulePage;
