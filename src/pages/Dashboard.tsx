// src/pages/Dashboard.tsx - Full updated code with admin button fix and build error resolved
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'; // Install with: npm install @heroicons/react
import { LogOutIcon, UserIcon, SettingsIcon, MessageCircleIcon, PlusIcon, UsersIcon } from 'lucide-react'; // Install with: npm install lucide-react

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [companions, setCompanions] = useState([]); // Example: list of user's companions
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/auth', { replace: true });
          return;
        }

        setUser(session.user);

        // Fetch user's companions (example - adjust table/query to your schema)
        const { data: userCompanions, error } = await supabase
          .from('companions') // Assuming a 'companions' table linked to user_id; change if using 'companion_portraits' or similar
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setCompanions(userCompanions || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndData();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth', { replace: true });
      } else {
        setUser(session.user);
        // Optionally refetch data on auth change
        fetchUserAndData();
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut(); // Direct Supabase call - no custom utility needed
    navigate('/auth', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl">Loading Dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect handled
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white font-inter">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 shadow-lg shadow-purple-500/25">
        <div className="p-4">
          <h2 className="text-xl font-cinzel text-purple-400 mb-8">LustForge AI</h2>
          <nav className="space-y-2">
            {/* Dashboard Home */}
            <button
              onClick={() => navigate('/dashboard')}
              className={`w-full text-left p-3 rounded-lg transition-all flex items-center ${
                window.location.pathname === '/dashboard'
                  ? 'bg-purple-600 text-white shadow-purple-500/50'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Dashboard
            </button>

            {/* Chat */}
            <button
              onClick={() => navigate('/chat')}
              className={`w-full text-left p-3 rounded-lg transition-all flex items-center ${
                window.location.pathname === '/chat'
                  ? 'bg-purple-600 text-white shadow-purple-500/50'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <MessageCircleIcon className="mr-2 h-4 w-4" />
              Chat
            </button>

            {/* Companions List */}
            <button
              onClick={() => navigate('/companions')} // Assuming a /companions route for listing; adjust if needed
              className={`w-full text-left p-3 rounded-lg transition-all flex items-center ${
                window.location.pathname.startsWith('/companions')
                  ? 'bg-purple-600 text-white shadow-purple-500/50'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <UsersIcon className="mr-2 h-4 w-4" />
              Companions
            </button>

            {/* Create Companion */}
            <button
              onClick={() => navigate('/create-companion')}
              className={`w-full text-left p-3 rounded-lg transition-all flex items-center ${
                window.location.pathname === '/create-companion'
                  ? 'bg-purple-600 text-white shadow-purple-500/50'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Companion
            </button>

            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className={`w-full text-left p-3 rounded-lg transition-all flex items-center ${
                window.location.pathname === '/settings'
                  ? 'bg-purple-600 text-white shadow-purple-500/50'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </button>

            {/* Admin Panel Button - UPDATED: Just shield icon with red glow, no text, no access check */}
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center justify-center p-3 rounded-lg transition-all hover:bg-gray-700 w-full group shadow-red-500/25 hover:shadow-red-500/50 hover:shadow-lg transform hover:scale-105"
              title="Admin Panel" // Tooltip for accessibility
            >
              <ShieldExclamationIcon className="h-6 w-6 text-red-500 group-hover:text-red-400 transition-all duration-300 animate-pulse" />
            </button>

            {/* Divider */}
            <div className="border-t border-gray-700 my-4"></div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full text-left p-3 rounded-lg flex items-center hover:bg-gray-700 text-gray-300 transition-all"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              Sign Out
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gray-900 border-b border-purple-500/30 p-4 shadow-lg shadow-teal-500/25 flex justify-between items-center">
          <h1 className="text-3xl font-cinzel text-pink-400">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">Welcome, {user.email}</span>
          </div>
        </div>

        {/* Main Area - Example content; customize as needed */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg shadow-purple-500/25">
            <h2 className="text-2xl font-cinzel text-teal-400 mb-4">Your Companions</h2>
            {companions.length === 0 ? (
              <p className="text-gray-400">
                No companions yet.{' '}
                <button 
                  onClick={() => navigate('/create-companion')} 
                  className="text-purple-400 hover:underline"
                >
                  Create one now!
                </button>
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companions.map((companion) => (
                  <div key={companion.id} className="bg-gray-700 p-4 rounded-lg shadow-md hover:shadow-purple-500/25 transition-all">
                    <h3 className="text-lg font-medium text-white mb-2">{companion.name}</h3>
                    <p className="text-sm text-gray-300 mb-4">{companion.description || 'No description'}</p>
                    <button
                      onClick={() => navigate(`/companions/${companion.id}`)}
                      className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm transition-all"
                    >
                      View Profile
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fonts - Matching the theme */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
};

export default Dashboard;