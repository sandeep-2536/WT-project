import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { doctorAPI, appointmentAPI } from '../../api/services';
import { Spinner, PageHeader } from '../../components/ui';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';

const SPECIALIZATIONS = [
  'All', 'Cardiology', 'Orthopedics', 'Dermatology', 'Neurology',
  'Pediatrics', 'Gynecology', 'Ophthalmology', 'ENT', 'General',
];

export default function BookAppointment() {
  const qc = useQueryClient();
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [specFilter, setSpecFilter] = useState('All');
  const [step, setStep] = useState(1); // 1=search, 2=slot, 3=confirm
  const [alternates, setAlternates] = useState([]);

  const { register, handleSubmit, formState: { errors } } = useForm();

  // Fetch doctors
  const { data: doctorData, isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors', specFilter],
    queryFn: () => doctorAPI.list({ specialization: specFilter === 'All' ? '' : specFilter, limit: 20 }),
    select: (res) => res.data.data,
  });

  // Fetch slots for selected doctor + date
  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['slots', selectedDoctor?._id, selectedDate],
    queryFn: () => doctorAPI.slots(selectedDoctor._id, selectedDate),
    enabled: !!selectedDoctor && !!selectedDate,
    select: (res) => res.data.data.slots,
  });

  const bookMutation = useMutation({
    mutationFn: (data) => appointmentAPI.book(data),
    onSuccess: () => {
      toast.success('Appointment request submitted! Awaiting doctor approval.');
      qc.invalidateQueries({ queryKey: ['patient-appointments'] });
      setStep(1);
      setSelectedDoctor(null);
      setSelectedDate('');
      setSelectedTime('');
      setAlternates([]);
    },
    onError: (err) => {
      const alts = err.response?.data?.alternates;
      if (alts?.length) {
        setAlternates(alts);
        toast.error('Slot unavailable. See alternate times below.');
      } else {
        toast.error(err.response?.data?.message || 'Booking failed');
      }
    },
  });

  const onConfirm = handleSubmit((formData) => {
    bookMutation.mutate({
      doctorId: selectedDoctor._id,
      date: selectedDate,
      time: selectedTime,
      reason: formData.reason,
    });
  });

  // Min date = today, max = 30 days ahead
  const today = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  return (
    <div>
      <PageHeader title="Book Appointment" subtitle="Find a doctor and choose your preferred time slot" />

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {['Find doctor', 'Choose slot', 'Confirm'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? 'font-medium text-gray-900' : 'text-gray-400'}`}>{label}</span>
            {i < 2 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Doctor search */}
      {step === 1 && (
        <div>
          <div className="flex flex-wrap gap-2 mb-6">
            {SPECIALIZATIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSpecFilter(s)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${specFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {loadingDoctors ? (
            <Spinner />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(doctorData || []).map((doc) => (
                <div
                  key={doc._id}
                  className="card p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                  onClick={() => { setSelectedDoctor(doc); setStep(2); }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600">
                      {doc.userId?.name?.[0] || 'D'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">Dr. {doc.userId?.name}</p>
                      <p className="text-sm text-blue-600">{doc.specialization}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{doc.experience} yrs experience</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Consultation fee</span>
                    <span className="font-medium text-gray-900">₹{doc.consultationFee}</span>
                  </div>
                  {doc.bio && (
                    <p className="mt-2 text-xs text-gray-500 line-clamp-2">{doc.bio}</p>
                  )}
                </div>
              ))}
              {!doctorData?.length && (
                <div className="col-span-3 text-center py-12 text-gray-400">
                  <p className="text-4xl mb-2">👨‍⚕️</p>
                  <p>No doctors found for this specialization</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date & slot */}
      {step === 2 && selectedDoctor && (
        <div className="max-w-lg">
          <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:underline mb-4 flex items-center gap-1">
            ← Back to doctors
          </button>

          <div className="card p-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
                {selectedDoctor.userId?.name?.[0] || 'D'}
              </div>
              <div>
                <p className="font-semibold">Dr. {selectedDoctor.userId?.name}</p>
                <p className="text-sm text-gray-500">{selectedDoctor.specialization}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select date</label>
            <input
              type="date"
              className="input max-w-xs"
              min={today}
              max={maxDate}
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); setAlternates([]); }}
            />
          </div>

          {selectedDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Available time slots</label>
              {loadingSlots ? (
                <Spinner />
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(slotsData || []).map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-colors ${selectedTime === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'}`}
                      >
                        {t}
                      </button>
                    ))}
                    {!slotsData?.length && (
                      <p className="text-sm text-gray-400">No available slots for this date</p>
                    )}
                  </div>

                  {/* Alternate slots after failed booking */}
                  {alternates.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 mb-2">Suggested alternate slots:</p>
                      <div className="flex flex-wrap gap-2">
                        {alternates.map((t) => (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className="px-3 py-1.5 text-sm bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <button
            disabled={!selectedDate || !selectedTime}
            onClick={() => setStep(3)}
            className="btn-primary mt-6"
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="max-w-lg">
          <button onClick={() => setStep(2)} className="text-sm text-blue-600 hover:underline mb-4">
            ← Back
          </button>

          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Confirm appointment</h2>

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Doctor</span>
                <span className="font-medium">Dr. {selectedDoctor?.userId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Specialization</span>
                <span>{selectedDoctor?.specialization}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{format(new Date(selectedDate), 'EEEE, dd MMMM yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fee</span>
                <span>₹{selectedDoctor?.consultationFee}</span>
              </div>
            </div>

            <form onSubmit={onConfirm}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for visit (optional)</label>
                <textarea
                  {...register('reason')}
                  className="input resize-none"
                  rows={3}
                  placeholder="Describe your symptoms or reason..."
                />
              </div>
              <button
                type="submit"
                disabled={bookMutation.isPending}
                className="btn-primary w-full"
              >
                {bookMutation.isPending ? 'Submitting...' : 'Submit appointment request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
