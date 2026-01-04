'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Home, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api-client';
import { DashboardStats } from '@/types';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes, growthRes] = await Promise.all([
          apiClient.get('/admin/dashboard'),
          apiClient.get('/admin/weekly-activity'),
          apiClient.get('/admin/weekly-listings')
        ]);
        
        setStats(statsRes.data.data);
        setActivityData(activityRes.data.data);
        setGrowthData(growthRes.data.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Listings', value: stats?.totalListings ?? 0, icon: Home },
    { label: 'Active Listings', value: stats?.activeListings ?? 0, icon: CheckCircle2 },
    { label: 'Pending Review', value: stats?.pendingInquiries ?? 0, icon: Clock },
    { label: 'Occupancy Rate', value: stats?.occupancyRate ?? '0%', icon: TrendingUp },
  ];

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-6 h-6 border-2 border-white/10 border-t-[#00ff00] rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-white tracking-tight">DASHBOARD</h1>
        <p className="text-white/30 text-xs uppercase tracking-widest mt-1">Platform overview and performance</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <stat.icon className="w-4 h-4 text-white/20" />
              <div className="text-[#00ff00] text-[10px] font-bold tracking-widest uppercase">Live</div>
            </div>
            <div>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{stat.label}</p>
              <h2 className="text-3xl font-bold text-white mt-1 tracking-tight">{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.01]">
          <h3 className="text-[10px] font-bold text-white/30 mb-8 uppercase tracking-widest">User Activity</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff10" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#ffffff10" fontSize={10} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#00ff00', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="users" stroke="#00ff00" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.01]">
          <h3 className="text-[10px] font-bold text-white/30 mb-8 uppercase tracking-widest">Listing Growth</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff10" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#ffffff10" fontSize={10} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '10px' }}
                />
                <Bar dataKey="listings" fill="#ffffff" opacity={0.5} radius={[2, 2, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
