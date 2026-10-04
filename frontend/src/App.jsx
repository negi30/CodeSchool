import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Terminal, ShoppingCart, ShieldAlert } from 'lucide-react';
import Home from './pages/Home';
import CoursePage from './pages/CoursePage';
import AdminPage from './pages/AdminPage';
import AuthModal from './components/AuthModal';
import CartModal from './components/CartModal';

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [user, setUser] = useState(() => {
    try { const s = localStorage.getItem('codeschool_user'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [cart, setCart] = useState(() => {
    try { const s = localStorage.getItem('codeschool_cart'); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('codeschool_user', JSON.stringify(user));
      // Silently sync fresh data (like admin-updated progress) on mount
      fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': user.adminToken || '' },
        body: JSON.stringify({ email: user.email })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(prev => ({ 
            ...data.user, 
            adminToken: data.validAdminSession ? prev.adminToken : undefined 
          }));
        }
      })
      .catch(() => {});
    } else {
      localStorage.removeItem('codeschool_user');
    }
  }, []); // Run once on mount
  
  // Keep localStorage updated when user state changes during session
  useEffect(() => {
    if (user) localStorage.setItem('codeschool_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('codeschool_cart', JSON.stringify(cart));
  }, [cart]);

  const navigate = useNavigate();

  const addToCart = (course) => {
    if (cart.find(c => c._id === course._id)) return alert('Course already in cart!');
    if (user?.purchasedCourses?.some(c => {
      const pId = typeof c.courseId === 'object' ? c.courseId._id : c.courseId;
      return pId === course._id;
    })) return alert('You already own this course!');
    setCart([...cart, course]);
    alert('Item added to cart!');
  };

  const handleLogout = () => { setUser(null); setCart([]); localStorage.removeItem('codeschool_user'); navigate('/'); };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-accent selection:text-black font-sans relative overflow-hidden">
      <div className="neopunk-grain pointer-events-none"></div>

      <nav className="p-6 px-12 flex justify-between items-center border-b-2 border-accent/20 backdrop-blur-md sticky top-0 z-50 bg-[#050505]/80">
        <Link to="/" className="text-3xl font-black tracking-tighter uppercase flex items-center gap-2">
          <Terminal className="text-accent" size={32} />
          <span className="text-accent">Code</span>School.
        </Link>

        <div className="flex items-center space-x-6">
          {/* Show Admin Panel only for verified admins with a session token */}
          {user?.isAdmin && user?.adminToken && (
            <Link to="/admin" className="text-red-500 border border-red-500 px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all flex items-center gap-2">
              <ShieldAlert size={16}/> Admin Panel
            </Link>
          )}

          <button onClick={() => setIsCartOpen(true)} className="relative text-gray-300 hover:text-accent transition-colors">
            <ShoppingCart size={28} />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-black text-xs font-black w-5 h-5 flex items-center justify-center rounded-full shadow-[0_0_10px_#00ff88]">
                {cart.length}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center space-x-4 border border-accent/30 px-6 py-2 ml-4">
              <span className="text-gray-300 font-mono text-sm">Hi, <span className="text-accent font-bold">{user.name}</span></span>
              <button onClick={handleLogout} className="text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-widest">[ Log Out ]</button>
            </div>
          ) : (
            <button onClick={() => setIsAuthOpen(true)} className="ml-4 border-2 border-accent text-accent px-8 py-3 font-bold hover:bg-accent hover:text-black transition-all uppercase tracking-widest text-sm">
              Log In / Sign Up
            </button>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/"           element={<Home user={user} updateUser={setUser} />} />
        <Route path="/courses/:id" element={<CoursePage user={user} cart={cart} openAuth={() => setIsAuthOpen(true)} addToCart={addToCart} />} />
        <Route path="/admin"      element={<AdminPage user={user} />} />
      </Routes>

      <footer className="bg-black py-12 border-t border-gray-900 text-center relative z-10 text-gray-600 font-mono text-sm mt-20">
        <p>CodeSchool © 2026. Empowering Next-Gen Developers.</p>
      </footer>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onLoginSuccess={(userData) => {
        // Strip any stale adminToken that doesn't belong to this fresh session
        const { adminToken, ...baseUser } = userData;
        // If this login returned an adminToken (2FA verified), keep it. Otherwise strip it.
        const safeUser = adminToken ? userData : baseUser;
        setUser(safeUser);
        // CRITICAL: Filter cart to remove any courses this user already owns.
        // Catches the case where cart was built while logged out (or as another user).
        if (safeUser.purchasedCourses?.length > 0) {
          setCart(prev => prev.filter(c => !safeUser.purchasedCourses.some(pc => {
            const pId = typeof pc.courseId === 'object' ? pc.courseId._id : pc.courseId;
            return pId === c._id;
          })));
        }
      }} />
      <CartModal
        isOpen={isCartOpen} onClose={() => setIsCartOpen(false)}
        cart={cart}
        removeFromCart={(id) => setCart(cart.filter(c => c._id !== id))}
        clearCart={() => setCart([])}
        user={user} updateUser={setUser}
        openAuth={() => { setIsCartOpen(false); setIsAuthOpen(true); }}
      />
    </div>
  );
}
export default App;
