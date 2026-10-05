import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom';
import api from './lib/api';
import { useAuth } from './context/AuthContext';
import ChatWidget from './components/ChatWidget';
import type { Booking, DashboardStats, Room, User } from './types';

function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rooms/:id" element={<RoomDetailPage />} />
        <Route path="/my-bookings" element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/admin/rooms" element={<AdminRoute><AdminRoomsPage /></AdminRoute>} />
        <Route path="/admin/bookings" element={<AdminRoute><AdminBookingsPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ChatWidget />
    </div>
  );
}

function Navbar() {
  const { isLoggedIn, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="topbar">
      <div className="container nav-wrap">
        <Link className="brand" to="/">
          <span className="brand-mark">A</span>
          Aurelia Hotel
        </Link>

        <nav className="nav" aria-label="Main navigation">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end>
            Stay
          </NavLink>
          {isLoggedIn ? (
            <>
              <NavLink to="/my-bookings" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                My bookings
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                  Admin
                </NavLink>
              )}
            </>
          ) : null}
        </nav>

        <div className="nav-actions">
          {isLoggedIn ? (
            <>
              <span className="user-pill">{user?.full_name || 'Guest'}</span>
              <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="btn btn-outline btn-sm" to="/login">Login</Link>
              <Link className="btn btn-primary btn-sm" to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { isLoggedIn, isAdmin } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function HomePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ type: '', check_in: '', check_out: '', max_price: '' });

  const fetchRooms = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (nextFilters.type) params.type = nextFilters.type;
      if (nextFilters.check_in) params.check_in = nextFilters.check_in;
      if (nextFilters.check_out) params.check_out = nextFilters.check_out;
      if (nextFilters.max_price) params.max_price = nextFilters.max_price;

      const { data } = await api.get<Room[]>('/rooms', { params });
      setRooms(data);
    } catch {
      setError('Could not load rooms right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    fetchRooms(filters);
  };

  const resetFilters = () => {
    const cleared = { type: '', check_in: '', check_out: '', max_price: '' };
    setFilters(cleared);
    fetchRooms(cleared);
  };

  return (
    <main className="page page-home">
      <section className="hero-section">
        <div className="container hero-layout">
          <div className="hero-content">
            <p className="eyebrow">Curated luxury stays</p>
            <h1>Feel the quiet elegance of your next escape.</h1>
            <p>From sunrise coffee on the terrace to candlelit dinners and restorative spa rituals, Aurelia Hotel turns every stay into a refined memory.</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/rooms/1">Book a stay</Link>
              <Link className="btn btn-outline" to="/login">Guest login</Link>
            </div>
            <div className="hero-stats">
              <div>
                <strong>4.9/5</strong>
                <span>Guest rating</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Concierge</span>
              </div>
              <div>
                <strong>12 min</strong>
                <span>Downtown drive</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Luxury hotel experience preview">
            <div className="hero-card featured-card">
              <span className="card-chip">Signature suite</span>
              <h3>Oceanfront Retreat</h3>
              <p>Private terrace • Breakfast included • Sunset views</p>
              <div className="price-tag">From $450/night</div>
            </div>
            <div className="hotel-tag-list">
              <span>Poolside</span>
              <span>Spa</span>
              <span>Dining</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="experience-section">
          <div className="experience-intro">
            <p className="eyebrow">Why guests return</p>
            <h2>Thoughtful comforts, elevated by design.</h2>
          </div>

          <div className="feature-grid">
            <article className="feature-card card card-hover">
              <div className="feature-icon">✦</div>
              <h3>Wellness rituals</h3>
              <p>Quiet spa treatments, sunrise yoga, and restorative evenings in serene settings.</p>
            </article>
            <article className="feature-card card card-hover">
              <div className="feature-icon">✧</div>
              <h3>Fine dining</h3>
              <p>Seasonal menus, private tasting experiences, and warm hospitality from morning to night.</p>
            </article>
            <article className="feature-card card card-hover">
              <div className="feature-icon">✤</div>
              <h3>Seamless service</h3>
              <p>Airport transfers, in-room dining, and concierge support for a stress-free check-in.</p>
            </article>
          </div>
        </section>

        <form className="filter-panel card" onSubmit={applyFilters}>
          <div className="field-row">
            <div className="field">
              <label>Room type</label>
              <select value={filters.type} onChange={(e) => setFilters((current) => ({ ...current, type: e.target.value }))}>
                <option value="">All rooms</option>
                <option value="Deluxe">Deluxe</option>
                <option value="Suite">Suite</option>
                <option value="Standard">Standard</option>
              </select>
            </div>
            <div className="field">
              <label>Check in</label>
              <input type="date" value={filters.check_in} onChange={(e) => setFilters((current) => ({ ...current, check_in: e.target.value }))} />
            </div>
            <div className="field">
              <label>Check out</label>
              <input type="date" value={filters.check_out} onChange={(e) => setFilters((current) => ({ ...current, check_out: e.target.value }))} />
            </div>
            <div className="field">
              <label>Max price</label>
              <input type="number" min="0" value={filters.max_price} onChange={(e) => setFilters((current) => ({ ...current, max_price: e.target.value }))} placeholder="e.g. 250" />
            </div>
          </div>
          <div className="filter-actions">
            <button className="btn btn-primary" type="submit">Search rooms</button>
            <button className="btn btn-outline" type="button" onClick={resetFilters}>Reset</button>
          </div>
        </form>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="empty-state">Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">No rooms match your search.</div>
        ) : (
          <section className="room-grid">
            {rooms.map((room) => (
              <article className="room-card card card-hover" key={room.id}>
                <div className="room-image" style={{ backgroundImage: room.image_url ? `url(${room.image_url})` : 'linear-gradient(135deg, #16233D, #B08D57)' }} />
                <div className="room-body">
                  <div className="room-meta">
                    <span className="badge badge-muted">{room.room_type}</span>
                    <span className="badge badge-success">{room.status}</span>
                  </div>
                  <h3>Room {room.room_number}</h3>
                  <p>{room.description || 'Thoughtfully designed and restful.'}</p>
                  <div className="room-details">
                    <span>{room.capacity} guests</span>
                    <strong>${Number(room.price_per_night).toFixed(2)}</strong>
                  </div>
                  <Link className="btn btn-accent btn-block" to={`/rooms/${room.id}`}>View details</Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      const from = (location.state as { from?: string } | null)?.from || '/';
      navigate(from);
    }
  }, [isLoggedIn, location.state, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      const from = (location.state as { from?: string } | null)?.from || '/';
      navigate(from);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <div className="container auth-shell">
        <div className="card auth-card">
          <p className="eyebrow">Welcome back</p>
          <h2>Login</h2>
          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
          </form>
          <p className="auth-footer">
            Need an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function RegisterPage() {
  const { register, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoggedIn) navigate('/');
  }, [isLoggedIn, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <div className="container auth-shell">
        <div className="card auth-card">
          <p className="eyebrow">Create account</p>
          <h2>Register</h2>
          <form onSubmit={submit}>
            <div className="field">
              <label>Full name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm((current) => ({ ...current, full_name: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} required />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
          </form>
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function RoomDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const id = Number(params.id);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ check_in: '', check_out: '', guests: 1, special_requests: '' });

  useEffect(() => {
    async function loadRoom() {
      try {
        const { data } = await api.get<Room>(`/rooms/${id}`);
        setRoom(data);
      } catch {
        setError('Room not found.');
      } finally {
        setLoading(false);
      }
    }
    loadRoom();
  }, [id]);

  const nights = useMemo(() => {
    if (!form.check_in || !form.check_out) return 0;
    const diff = (new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / 86400000;
    return diff > 0 ? diff : 0;
  }, [form.check_in, form.check_out]);

  const estimatedTotal = useMemo(() => {
    if (!room) return 0;
    return nights * Number(room.price_per_night);
  }, [nights, room]);

  const amenities = room?.amenities ? room.amenities.split(',').map((item) => item.trim()).filter(Boolean) : [];

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (!room || !form.check_in || !form.check_out || nights <= 0) {
      setError('Check that your dates are valid.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/bookings', {
        room_id: room.id,
        check_in: form.check_in,
        check_out: form.check_out,
        guests: form.guests,
        special_requests: form.special_requests
      });
      setSuccess('Your booking request has been sent. Track it from “My bookings”.');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Could not complete the booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <div className="empty-state">Loading room...</div>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="page">
        <div className="container">
          <div className="alert alert-error">Room not found.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container room-detail-layout">
        <div className="room-detail-card card">
          <div className="room-detail-image" style={{ backgroundImage: room.image_url ? `url(${room.image_url})` : 'linear-gradient(135deg, #16233D, #B08D57)' }} />
          <div className="room-detail-copy">
            <div className="room-meta">
              <span className="badge badge-muted">{room.room_type}</span>
              <span className="badge badge-success">{room.status}</span>
            </div>
            <h1>Room {room.room_number}</h1>
            <p>{room.description || 'A quiet, well-appointed room designed for comfort.'}</p>
            <div className="detail-row"><strong>Capacity:</strong> {room.capacity} guests</div>
            <div className="detail-row"><strong>Nightly rate:</strong> ${Number(room.price_per_night).toFixed(2)}</div>
            <div className="detail-row"><strong>Amenities:</strong></div>
            <ul className="amenity-list">
              {amenities.length ? amenities.map((item) => <li key={item}>{item}</li>) : <li>Premium comfort essentials</li>}
            </ul>
          </div>
        </div>

        <aside className="booking-card card">
          <h3>Reserve this room</h3>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={submitBooking}>
            <div className="field-row">
              <div className="field">
                <label>Check in</label>
                <input type="date" value={form.check_in} onChange={(e) => setForm((current) => ({ ...current, check_in: e.target.value }))} required />
              </div>
              <div className="field">
                <label>Check out</label>
                <input type="date" value={form.check_out} onChange={(e) => setForm((current) => ({ ...current, check_out: e.target.value }))} required />
              </div>
            </div>
            <div className="field">
              <label>Guests</label>
              <input type="number" min="1" max={room.capacity} value={form.guests} onChange={(e) => setForm((current) => ({ ...current, guests: Number(e.target.value) }))} />
            </div>
            <div className="field">
              <label>Special requests</label>
              <textarea value={form.special_requests} onChange={(e) => setForm((current) => ({ ...current, special_requests: e.target.value }))} />
            </div>
            <div className="booking-summary">
              <span>{nights} nights</span>
              <strong>${estimatedTotal.toFixed(2)}</strong>
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}> {submitting ? 'Submitting...' : 'Book now'} </button>
          </form>
        </aside>
      </div>
    </main>
  );
}

function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<Booking[]>('/bookings/mine');
      setBookings(data);
    } catch {
      setError('Could not load your bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const cancelBooking = async (id: number) => {
    setCancellingId(id);
    try {
      await api.patch(`/bookings/${id}/cancel`, {});
      setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status: 'cancelled' } : booking));
    } catch {
      setError('Could not cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <p className="eyebrow">Your stays</p>
          <h1>My bookings</h1>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <div className="empty-state">Loading your bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">You have no bookings yet.</div>
        ) : (
          <div className="booking-list">
            {bookings.map((booking) => (
              <article className="card booking-item" key={booking.id}>
                <div className="booking-thumb" style={{ backgroundImage: booking.image_url ? `url(${booking.image_url})` : 'linear-gradient(135deg, #16233D, #B08D57)' }} />
                <div className="booking-info">
                  <div className="booking-topline">
                    <h3>Room {booking.room_number || booking.room_id}</h3>
                    <span className={`badge ${booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'checked_out' ? 'badge-success' : booking.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{booking.status}</span>
                  </div>
                  <p>{booking.room_type} • {booking.check_in} to {booking.check_out}</p>
                  <div className="booking-meta">
                    <span>{booking.guests} guests</span>
                    <strong>Total: ${Number(booking.total_amount).toFixed(2)}</strong>
                  </div>
                  {booking.status !== 'cancelled' && (
                    <button className="btn btn-danger btn-sm" onClick={() => cancelBooking(booking.id)} disabled={cancellingId === booking.id}>
                      {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      const [statsRes, usersRes] = await Promise.all([
        api.get<DashboardStats>('/users/dashboard-stats'),
        api.get<User[]>('/users')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    };
    fetchDashboard();
  }, []);

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <p className="eyebrow">Operations</p>
          <h1>Admin dashboard</h1>
        </div>

        {stats ? (
          <div className="stats-grid">
            <div className="card stat-card"><span>Total rooms</span><strong>{stats.total_rooms}</strong></div>
            <div className="card stat-card"><span>Available</span><strong>{stats.available_rooms}</strong></div>
            <div className="card stat-card"><span>Bookings</span><strong>{stats.total_bookings}</strong></div>
            <div className="card stat-card"><span>Pending</span><strong>{stats.pending_bookings}</strong></div>
            <div className="card stat-card"><span>Users</span><strong>{stats.total_users}</strong></div>
            <div className="card stat-card"><span>Revenue</span><strong>${Number(stats.revenue).toFixed(2)}</strong></div>
          </div>
        ) : (
          <div className="empty-state">Loading dashboard...</div>
        )}

        <div className="card table-card">
          <div className="panel-title-row">
            <h3>Guests</h3>
            <Link className="btn btn-outline btn-sm" to="/admin/rooms">Manage rooms</Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState({ room_number: '', room_type: 'Deluxe', price_per_night: '0', capacity: '2', description: '', amenities: '', image_url: '', status: 'available' });

  const fetchRooms = async () => {
    const { data } = await api.get<Room[]>('/rooms');
    setRooms(data);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const resetForm = () => {
    setEditingRoom(null);
    setForm({ room_number: '', room_type: 'Deluxe', price_per_night: '0', capacity: '2', description: '', amenities: '', image_url: '', status: 'available' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      room_number: form.room_number,
      room_type: form.room_type,
      price_per_night: Number(form.price_per_night),
      capacity: Number(form.capacity),
      description: form.description,
      amenities: form.amenities,
      image_url: form.image_url,
      status: form.status
    };

    if (editingRoom) {
      await api.put(`/rooms/${editingRoom.id}`, payload);
    } else {
      await api.post('/rooms', payload);
    }
    resetForm();
    fetchRooms();
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setForm({
      room_number: room.room_number,
      room_type: room.room_type,
      price_per_night: String(room.price_per_night),
      capacity: String(room.capacity),
      description: room.description || '',
      amenities: room.amenities || '',
      image_url: room.image_url || '',
      status: room.status
    });
  };

  const handleDelete = async (room: Room) => {
    await api.delete(`/rooms/${room.id}`);
    fetchRooms();
  };

  return (
    <main className="page">
      <div className="container admin-grid">
        <div className="card admin-form-card">
          <div className="panel-title-row">
            <h3>{editingRoom ? 'Edit room' : 'Add room'}</h3>
            {editingRoom && <button className="btn btn-outline btn-sm" onClick={resetForm}>Cancel</button>}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field"><label>Room number</label><input value={form.room_number} onChange={(e) => setForm((current) => ({ ...current, room_number: e.target.value }))} required /></div>
              <div className="field"><label>Type</label><select value={form.room_type} onChange={(e) => setForm((current) => ({ ...current, room_type: e.target.value }))}><option>Standard</option><option>Deluxe</option><option>Suite</option></select></div>
            </div>
            <div className="field-row">
              <div className="field"><label>Price</label><input type="number" value={form.price_per_night} onChange={(e) => setForm((current) => ({ ...current, price_per_night: e.target.value }))} required /></div>
              <div className="field"><label>Capacity</label><input type="number" min="1" value={form.capacity} onChange={(e) => setForm((current) => ({ ...current, capacity: e.target.value }))} required /></div>
            </div>
            <div className="field"><label>Status</label><select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}><option value="available">available</option><option value="maintenance">maintenance</option><option value="unavailable">unavailable</option></select></div>
            <div className="field"><label>Description</label><textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} /></div>
            <div className="field"><label>Amenities</label><input value={form.amenities} onChange={(e) => setForm((current) => ({ ...current, amenities: e.target.value }))} /></div>
            <div className="field"><label>Image URL</label><input value={form.image_url} onChange={(e) => setForm((current) => ({ ...current, image_url: e.target.value }))} /></div>
            <button className="btn btn-primary btn-block" type="submit">{editingRoom ? 'Update room' : 'Create room'}</button>
          </form>
        </div>

        <div className="card admin-table-card">
          <div className="panel-title-row"><h3>Rooms</h3><Link to="/admin/bookings" className="btn btn-outline btn-sm">Bookings</Link></div>
          <table>
            <thead>
              <tr><th>Room</th><th>Type</th><th>Price</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.room_number}</td>
                  <td>{room.room_type}</td>
                  <td>${Number(room.price_per_night).toFixed(2)}</td>
                  <td>{room.status}</td>
                  <td>
                    <div className="inline-actions">
                      <button className="btn btn-outline btn-sm" onClick={() => handleEdit(room)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(room)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBookings = async (nextStatus = statusFilter) => {
    const { data } = await api.get<Booking[]>('/bookings', { params: nextStatus ? { status: nextStatus } : {} });
    setBookings(data);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (bookingId: number, nextStatus: Booking['status']) => {
    await api.patch(`/bookings/${bookingId}/status`, { status: nextStatus });
    fetchBookings(statusFilter);
  };

  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <p className="eyebrow">Reservations</p>
          <h1>Manage bookings</h1>
        </div>
        <div className="card filter-panel">
          <div className="field">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); fetchBookings(e.target.value); }}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked in</option>
              <option value="checked_out">Checked out</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Room</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.full_name || booking.user_id}</td>
                  <td>{booking.room_number || booking.room_id}</td>
                  <td>{booking.check_in} → {booking.check_out}</td>
                  <td>{booking.status}</td>
                  <td>
                    <select value={booking.status} onChange={(e) => updateStatus(booking.id, e.target.value as Booking['status'])}>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked in</option>
                      <option value="checked_out">Checked out</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

export default App;
