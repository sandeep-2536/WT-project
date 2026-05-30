import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { role: 'patient' },
  });

  const role = watch('role');

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      const payload = { ...formData };
      if (payload.role === 'doctor') {
        payload.experience = Number(payload.experience);
        payload.consultationFee = Number(payload.consultationFee);
      }
      if (payload.role === 'nurse') {
        payload.maxLoad = Number(payload.maxLoad);
      }
      const user = await registerUser(payload);
      if (user.approvalStatus === 'pending') {
        toast.success('Request submitted. Please wait for admin approval.');
        navigate('/login');
        return;
      }

      toast.success('Account created successfully!');
      navigate(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HARMS</h1>
          <p className="text-gray-500 mt-1">Create your account</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Register</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className="input"
                placeholder="Jane Doe"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email"
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select {...register('role')} className="input">
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
              </select>
            </div>

            {role === 'doctor' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <input
                    {...register('specialization', { required: 'Specialization required for doctors' })}
                    className="input"
                    placeholder="e.g. Cardiology"
                  />
                  {errors.specialization && <p className="mt-1 text-xs text-red-600">{errors.specialization.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualifications</label>
                  <input
                    {...register('qualifications')}
                    className="input"
                    placeholder="e.g. MBBS, MD"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                    <input
                      {...register('experience', {
                        required: 'Experience required',
                        min: { value: 0, message: 'Cannot be negative' },
                      })}
                      type="number"
                      min="0"
                      className="input"
                      placeholder="Years"
                    />
                    {errors.experience && <p className="mt-1 text-xs text-red-600">{errors.experience.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Consultation fee</label>
                    <input
                      {...register('consultationFee', {
                        required: 'Fee required',
                        min: { value: 0, message: 'Cannot be negative' },
                      })}
                      type="number"
                      min="0"
                      className="input"
                      placeholder="Amount"
                    />
                    {errors.consultationFee && <p className="mt-1 text-xs text-red-600">{errors.consultationFee.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {role === 'nurse' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    {...register('department', { required: 'Department required for nurses' })}
                    className="input"
                    placeholder="e.g. General"
                  />
                  {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualifications</label>
                  <input
                    {...register('qualifications')}
                    className="input"
                    placeholder="e.g. BSc Nursing, GNM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max daily load</label>
                  <input
                    {...register('maxLoad', {
                      required: 'Max load required',
                      min: { value: 1, message: 'Minimum 1 appointment' },
                    })}
                    type="number"
                    min="1"
                    className="input"
                    placeholder="e.g. 8"
                  />
                  {errors.maxLoad && <p className="mt-1 text-xs text-red-600">{errors.maxLoad.message}</p>}
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
