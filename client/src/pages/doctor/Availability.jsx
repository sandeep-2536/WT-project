import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorAPI } from '../../api/services';
import { Spinner, PageHeader } from '../../components/ui';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultSlot = (day) => ({
  day,
  startTime: '09:00',
  endTime: '17:00',
  slotDuration: 30,
  isAvailable: false,
});

export default function DoctorAvailability() {
  const qc = useQueryClient();
  const [slots, setSlots] = useState(DAYS.map(defaultSlot));

  const { data: profile, isLoading } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: doctorAPI.profile,
    select: (res) => res.data.data.doctor,
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile?.availability?.length) {
      const filled = DAYS.map((day) => {
        const existing = profile.availability.find((s) => s.day === day);
        return existing ? { ...existing } : defaultSlot(day);
      });
      setSlots(filled);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => doctorAPI.setAvailability(slots.filter((s) => s.isAvailable)),
    onSuccess: () => {
      toast.success('Availability saved');
      qc.invalidateQueries({ queryKey: ['doctor-profile'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const update = (day, field, value) => {
    setSlots((prev) => prev.map((s) => s.day === day ? { ...s, [field]: value } : s));
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="My Availability"
        subtitle="Set the days and hours patients can book appointments with you"
      />

      <div className="space-y-3 mb-8">
        {slots.map((slot) => (
          <div key={slot.day} className={`card p-4 transition-all ${slot.isAvailable ? 'border-teal-200 bg-teal-50/30' : ''}`}>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Toggle */}
              <label className="flex items-center gap-2 min-w-[120px] cursor-pointer">
                <button
                  type="button"
                  onClick={() => update(slot.day, 'isAvailable', !slot.isAvailable)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${slot.isAvailable ? 'bg-teal-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${slot.isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className={`text-sm font-medium ${slot.isAvailable ? 'text-gray-900' : 'text-gray-400'}`}>
                  {slot.day}
                </span>
              </label>

              {slot.isAvailable && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">From</span>
                    <input
                      type="time"
                      className="input w-32 py-1.5"
                      value={slot.startTime}
                      onChange={(e) => update(slot.day, 'startTime', e.target.value)}
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      className="input w-32 py-1.5"
                      value={slot.endTime}
                      onChange={(e) => update(slot.day, 'endTime', e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Slot duration</span>
                    <select
                      className="input w-28 py-1.5"
                      value={slot.slotDuration}
                      onChange={(e) => update(slot.day, 'slotDuration', Number(e.target.value))}
                    >
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="btn-primary"
      >
        {saveMutation.isPending ? 'Saving...' : 'Save availability'}
      </button>
    </div>
  );
}
