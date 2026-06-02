import { useState, useEffect } from 'preact/hooks';
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

export function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-[#0c0b0a]">
        <span class="text-sm text-[#8f887e]">SpecMind</span>
      </div>
    );
  }

  if (!user) return <Login />;
  return <Dashboard user={user} />;
}
