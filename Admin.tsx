import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase'; // Assuming Supabase client is set up
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

// Dummy data for graphs - replace with real fetches
const dummyOverviewData = [
  { name: 'Jan', users: 10, signups: 5 },
  { name: 'Feb', users: 20, signups: 15 },
  { name: 'Mar', users: 30, signups: 25 },
];

const dummyAnalyticsData = [
  { name: 'Mon', images: 100, companions: 50 },
  { name: 'Tue', images: 150, companions: 75 },
  { name: 'Wed', images: 200, companions: 100 },
];

const ADMIN_EMAIL = 'lustforgeapp@gmail.com';

const Admin = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    waitlistSignups: 0,
    totalCompanions: 0,
    totalImages: 0,
    activeToys: 0,
  });
  const [users, setUsers] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [companions, setCompanions] = useState([]);
  const [imagePrompt, setImagePrompt] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [style, setStyle] = useState('default');
  const [randomize, setRandomize] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    const isAdmin = session?.user?.email === ADMIN_EMAIL;
    if (!session) {
      // Not logged in: redirect to landing page
      router.push('/');
      return;
    }
    if (!isAdmin) {
      // Logged in but not admin: redirect to dashboard
      router.push('/dashboard');
      return;
    }

    // Admin: load data
    fetchStats();
    fetchUsers();
    fetchWaitlist();
    fetchCompanions();
  }, [session, status, router]);

  const fetchStats = async () => {
    try {
      const { count: totalUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      const { count: waitlistSignups } = await supabase.from('waitlist').select('id', { count: 'exact', head: true });
      const { count: totalCompanions } = await supabase.from('companion_portraits').select('id', { count: 'exact', head: true });
      const { count: totalImages } = await supabase.from('images').select('id', { count: 'exact', head: true }); // Assuming images table
      const { count: activeToys } = await supabase.from('toys').select('id', { count: 'exact', head: true }); // Assuming toys table with active filter if needed
      setStats({ totalUsers: totalUsers || 0, waitlistSignups: waitlistSignups || 0, totalCompanions: totalCompanions || 0, totalImages: totalImages || 0, activeToys: activeToys || 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchWaitlist = async () => {
    try {
      const { data } = await supabase.from('waitlist').select('*');
      setWaitlist(data || []);
    } catch (error) {
      console.error('Error fetching waitlist:', error);
    }
  };

  const fetchCompanions = async () => {
    try {
      const { data } = await supabase.from('companion_portraits').select('*');
      setCompanions(data || []);
    } catch (error) {
      console.error('Error fetching companions:', error);
    }
  };

  const handleDeleteCompanion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this companion?')) return;
    try {
      await supabase.from('companion_portraits').delete().eq('id', id);
      fetchCompanions();
    } catch (error) {
      console.error('Error deleting companion:', error);
    }
  };

  const generateImage = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('prompt', imagePrompt);
      formData.append('characterName', characterName);
      formData.append('subtitle', subtitle);
      formData.append('style', style);
      formData.append('randomize', randomize.toString());
      formData.append('portrait', portrait.toString());

      const res = await fetch('/api/generate-image', { // Assuming Edge Function at this route
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setPreviewImage(data.imageUrl || data.image); // Adjust based on actual response
      // Optionally save to DB: await supabase.from('images').insert({...});
    } catch (error) {
      console.error('Image generation failed', error);
      alert('Image generation failed. Please try again.');
    }
    setLoading(false);
  };

  const saveImage = async () => {
    if (previewImage) {
      // Implement save logic, e.g., to images table or storage
      console.log('Saving image:', previewImage);
      alert('Image saved!'); // Placeholder
    }
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  if (!session || !isAdmin) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white font-inter">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 shadow-lg shadow-purple-500/25">
        <div className="p-4">
          <h2 className="text-xl font-cinzel text-purple-400 mb-8">Admin Panel</h2>
          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'forge-studio', label: 'Forge Studio' },
              { id: 'character-management', label: 'Character Management' },
              { id: 'user-management', label: 'User Management' },
              { id: 'waitlist', label: 'Waitlist' },
              { id: 'analytics', label: 'Analytics' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  activeTab === item.id
                    ? 'bg-purple-600 text-white shadow-purple-500/50'
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gray-900 border-b border-purple-500/30 p-4 shadow-lg shadow-teal-500/25 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToDashboard}
              className="bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg font-medium transition-all shadow-teal-500/50 text-sm"
            >
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-cinzel text-pink-400">Admin Panel</h1>
          </div>
          <div className="text-sm text-gray-400">
            Logged in as: {session.user.email}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-cinzel text-teal-400 mb-6">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg shadow-pink-500/25">
                  <h3 className="text-sm text-gray-300">Total Users</h3>
                  <p className="text-2xl font-bold text-pink-400">{stats.totalUsers}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg shadow-purple-500/25">
                  <h3 className="text-sm text-gray-300">Waitlist Signups</h3>
                  <p className="text-2xl font-bold text-purple-400">{stats.waitlistSignups}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg shadow-teal-500/25">
                  <h3 className="text-sm text-gray-300">Total Companions Generated</h3>
                  <p className="text-2xl font-bold text-teal-400">{stats.totalCompanions}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg shadow-pink-500/25">
                  <h3 className="text-sm text-gray-300">Total Images Generated</h3>
                  <p className="text-2xl font-bold text-pink-400">{stats.totalImages}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg shadow-purple-500/25">
                  <h3 className="text-sm text-gray-300">Active Toys</h3>
                  <p className="text-2xl font-bold text-purple-400">{stats.activeToys}</p>
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow-lg shadow-teal-500/25">
                <h3 className="text-lg font-cinzel text-teal-400 mb-4">User Growth</h3>
                <LineChart width={600} height={300} data={dummyOverviewData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#EC4899" strokeWidth={2} />
                  <Line type="monotone" dataKey="signups" stroke="#8B5CF6" strokeWidth={2} />
                </LineChart>
              </div>
            </div>
          )}

          {activeTab === 'forge-studio' && (
            <div>
              <h2 className="text-2xl font-cinzel text-teal-400 mb-4">**Forge Studio**</h2>
              <p className="text-sm text-gray-400 mb-8">Powered by Grok</p>
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg shadow-purple-500/25">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      className="w-full p-3 bg-gray-700 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={4}
                      placeholder="Enter image prompt..."
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Character Name</label>
                      <input
                        type="text"
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        className="w-full p-3 bg-gray-700 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Character name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Subtitle</label>
                      <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        className="w-full p-3 bg-gray-700 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Subtitle"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
                      <select
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        className="w-full p-3 bg-gray-700 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="default">Default</option>
                        <option value="cyberpunk">Cyberpunk</option>
                        <option value="goth">Goth</option>
                      </select>
                    </div>
                    <div className="flex space-x-4">
                      <label className="flex items-center text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={randomize}
                          onChange={(e) => setRandomize(e.target.checked)}
                          className="mr-2 text-purple-500"
                        />
                        Randomize
                      </label>
                      <label className="flex items-center text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={portrait}
                          onChange={(e) => setPortrait(e.target.checked)}
                          className="mr-2 text-purple-500"
                        />
                        Portrait Mode
                      </label>
                    </div>
                    <button
                      onClick={generateImage}
                      disabled={loading || !imagePrompt.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-all shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Generating...' : 'Generate Image'}
                    </button>
                  </div>
                </div>
                {previewImage && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-300 mb-4">Preview</h3>
                    <img src={previewImage} alt="Preview" className="max-w-md rounded-lg shadow-lg shadow-teal-500/25" />
                    <button
                      onClick={saveImage}
                      className="mt-4 bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg font-medium transition-all shadow-teal-500/50"
                    >
                      Save Image
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'character-management' && (
            <div>
              <h2 className="text-2xl font-cinzel text-teal-400 mb-6">Character Management</h2>
              <div className="bg-gray-800 rounded-lg shadow-lg shadow-pink-500/25 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="p-3 text-left text-gray-300">ID</th>
                      <th className="p-3 text-left text-gray-300">Name</th>
                      <th className="p-3 text-left text-gray-300">Portrait URL</th>
                      <th className="p-3 text-left text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companions.map((comp) => (
                      <tr key={comp.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3">{comp.id}</td>
                        <td className="p-3">{comp.name || 'N/A'}</td>
                        <td className="p-3">
                          {comp.portrait_url ? (
                            <a href={comp.portrait_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                              View
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteCompanion(comp.id)}
                            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-all"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {companions.length === 0 && (
                <p className="text-gray-400 mt-4">No companions found.</p>
              )}
            </div>
          )}

          {activeTab === 'user-management' && (
            <div>
              <h2 className="text-2xl font-cinzel text-teal-400 mb-6">User Management</h2>
              <div className="bg-gray-800 rounded-lg shadow-lg shadow-purple-500/25 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="p-3 text-left text-gray-300">ID</th>
                      <th className="p-3 text-left text-gray-300">Email</th>
                      <th className="p-3 text-left text-gray-300">Name</th>
                      <th className="p-3 text-left text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3">{user.id}</td>
                        <td className="p-3">{user.email}</td>
                        <td className="p-3">{user.full_name || 'N/A'}</td>
                        <td className="p-3">
                          {/* Add more actions like ban if needed */}
                          <span className="text-gray-500">Manage</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <p className="text-gray-400 mt-4">No users found.</p>
              )}
            </div>
          )}

          {activeTab === 'waitlist' && (
            <div>
              <h2 className="text-2xl font-cinzel text-teal-400 mb-6">Waitlist</h2>
              <div className="bg-gray-800 rounded-lg shadow-lg shadow-teal-500/25 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="p-3 text-left text-gray-300">ID</th>
                      <th className="p-3 text-left text-gray-300">Email</th>
                      <th className="p-3 text-left text-gray-300">Signup Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map((entry) => (
                      <tr key={entry.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3">{entry.id}</td>
                        <td className="p-3">{entry.email}</td>
                        <td className="p-3">{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {waitlist.length === 0 && (
                <p className="text-gray-400 mt-4">No waitlist entries found.</p>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-2xl font-cinzel text-teal-400 mb-6">Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg shadow-pink-500/25">
                  <h3 className="text-lg font-medium text-pink-400 mb-4">Image Generation Trends</h3>
                  <BarChart width={300} height={300} data={dummyAnalyticsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="images" fill="#EC4899" />
                    <Bar dataKey="companions" fill="#8B5CF6" />
                  </BarChart>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg shadow-purple-500/25">
                  <h3 className="text-lg font-medium text-purple-400 mb-4">Companion Creation</h3>
                  <LineChart width={300} height={300} data={dummyAnalyticsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip />
                    <Line type="monotone" dataKey="companions" stroke="#A78BFA" strokeWidth={2} />
                  </LineChart>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-cinzel { font-family: 'Cinzel Decorative', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
};

export default Admin;