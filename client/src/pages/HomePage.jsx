import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import heroImage from '../assets/home-hero.png';

const rolePath = {
  patient: '/patient',
  doctor: '/doctor',
  nurse: '/nurse',
  admin: '/admin',
};

const highlights = [
  {
    title: 'Patients',
    text: 'Find doctors, request appointments, and track confirmations from one place.',
  },
  {
    title: 'Doctors',
    text: 'Review appointment requests, manage availability, and keep schedules clear.',
  },
  {
    title: 'Nurses',
    text: 'View assigned appointments and stay aligned with daily care schedules.',
  },
  {
    title: 'Admins',
    text: 'Manage users, doctors, nurses, appointments, and resource assignments.',
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const dashboardPath = user ? rolePath[user.role] : '/login';

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link to="/" className="text-xl font-bold tracking-tight text-white">
            HARMS
          </Link>
          <nav className="flex items-center gap-3">
            {user ? (
              <Link to={dashboardPath} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
                  Login
                </Link>
                <Link to="/register" className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative min-h-[92vh] overflow-hidden">
          <img
            src={heroImage}
            alt="Hospital staff coordinating patient appointments"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/85 via-gray-900/55 to-gray-900/10" />
          <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl items-center px-5 pb-16 pt-24">
            <div className="max-w-2xl text-white">
              <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-200">
                Hospital Appointment & Resource Management
              </p>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                HARMS
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-gray-100">
                A focused system for booking appointments, coordinating doctors, assigning nurses, and keeping hospital workflows visible.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={dashboardPath} className="btn-primary bg-teal-600 hover:bg-teal-700">
                  {loading ? 'Loading...' : user ? 'Go to dashboard' : 'Login to continue'}
                </Link>
                {!user && (
                  <Link to="/register" className="btn-secondary border-white/50 bg-white/95 text-gray-900 hover:bg-white">
                    Create account
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 bg-gray-50 py-12">
          <div className="mx-auto max-w-7xl px-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {highlights.map((item) => (
                <div key={item.title} className="card p-5">
                  <h2 className="text-base font-semibold text-gray-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
