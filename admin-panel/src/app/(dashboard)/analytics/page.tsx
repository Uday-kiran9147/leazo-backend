'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

const COLORS = ['#00ff00', '#ffffff', '#1e293b', '#334155'];

export default function AnalyticsPage() {
  const [dau, setDau] = useState(0);
  const [mau, setMau] = useState(0);
  const [retention, setRetention] = useState(0);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [distributionData, setDistributionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [dauRes, mauRes, retentionRes, activityRes, distributionRes] = await Promise.all([
          apiClient.get('/admin/dau'),
          apiClient.get('/admin/mau'),
          apiClient.get('/admin/retention?period=month'),
          apiClient.get('/admin/weekly-activity'),
          apiClient.get('/admin/user-distribution')
        ]);
        
        setDau(dauRes.data.data.count);
        setMau(mauRes.data.data.count);
        setRetention(retentionRes.data.data);
        setActivityData(activityRes.data.data);
        setDistributionData(distributionRes.data.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-6 h-6 border-2 border-white/10 border-t-[#00ff00] rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-white tracking-tight">ANALYTICS</h1>
        <p className="text-white/30 text-xs uppercase tracking-widest mt-1">Deep system performance metrics</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Daily Terminals', value: dau, indicator: 'Real-time', icon: Users },
          { label: 'Monthly Terminals', value: mau, indicator: 'MTD', icon: Calendar },
          { label: 'Retention Index', value: `${retention.toFixed(1)}%`, indicator: 'M1 Pulse', icon: TrendingUp }
        ].map((item, i) => (
          <div key={item.label} className="p-8 rounded-2xl border border-white/5 bg-white/[0.01] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
               <item.icon className="w-4 h-4 text-white/10" />
               <span className="text-[9px] font-bold text-[#00ff00] uppercase tracking-widest bg-[#00ff00]/5 px-2 py-0.5 rounded-full">{item.indicator}</span>
            </div>
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-1">{item.label}</p>
            <h2 className="text-4xl font-bold text-white tracking-tighter">{item.value}</h2>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-10 rounded-2xl border border-white/5 bg-white/[0.01]">
          <h3 className="text-[10px] font-bold text-white/30 mb-12 uppercase tracking-[0.2em] border-l-2 border-[#00ff00] pl-4">Velocity Matrix</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff10" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#ffffff10" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }} />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#00ff00" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4, fill: '#00ff00', stroke: '#000', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-10 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col">
          <h3 className="text-[10px] font-bold text-white/30 mb-12 uppercase tracking-[0.2em] border-l-2 border-white/20 pl-4">System Demographics</h3>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-8">
            {distributionData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between p-3 border border-white/5 rounded-xl bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
