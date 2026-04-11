import { useState, useEffect } from 'react';
import { Users, Skull, Loader2, TrendingUp, Activity, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DashboardStats = {
  totalUsers: number;
  recentActivity: number;
  revenue: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, recentActivity: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);

        // Fetch total users (adjust table name if needed, e.g., 'profiles')
        const { count: userCount, error: userError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (userError) throw userError;

        // Fetch recent activity (placeholder query - customize to your schema)
        const { count: activityCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        // Placeholder revenue
        const revenue = 12450.75;

        setStats({ totalUsers: userCount || 0, recentActivity: activityCount || 0, revenue });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-xl text-gray-600">Welcome back! Here's what's happening.</p>
          </div>
          <div className="hidden md:block p-4 bg-white/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Growing</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map((i) => (
              <div key={i} className="p-8 bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 animate-pulse">
                <div className="h-12 w-12 bg-gray-300 rounded-xl mb-4 mx-auto" />
                <div className="h-6 bg-gray-300 rounded mb-2 mx-auto w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Total Users Card */}
            <div className="group cursor-pointer p-8 bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 hover:shadow-3xl transition-all duration-500 hover:-translate-y-2">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl backdrop-blur-sm border border-blue-200/50">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <Skull className="h-6 w-6 text-purple-500 opacity-75 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-gray-900 mb-1">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-lg text-gray-600 font-medium">Total Users</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="group cursor-pointer p-8 bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 hover:shadow-3xl transition-all duration-500 hover:-translate-y-2">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl backdrop-blur-sm border border-green-200/50">
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <TrendingUp className="h-6 w-6 text-emerald-500 opacity-75 group-hover:opacity-100" />
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-gray-900 mb-1">{stats.recentActivity}</p>
                <p className="text-lg text-gray-600 font-medium">This Week</p>
              </div>
            </div>

            {/* Revenue */}
            <div className="group cursor-pointer p-8 bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 md:col-span-1 lg:col-span-1">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl backdrop-blur-sm border border-emerald-200/50">
                  <DollarSign className="h-8 w-8 text-emerald-600" />
                </div>
                <TrendingUp className="h-6 w-6 text-emerald-500 opacity-75 group-hover:opacity-100" />
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-gray-900 mb-1">${stats.revenue.toLocaleString()}</p>
                <p className="text-lg text-gray-600 font-medium">Lifetime Revenue</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
