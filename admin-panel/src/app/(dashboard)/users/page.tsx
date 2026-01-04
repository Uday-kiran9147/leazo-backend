'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/api-client';
import { User } from '@/types';
import { cn } from '@/lib/utils';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/admin/users'); 
      setUsers(response.data.data);
    } catch (error) {
       console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  const updateRole = async (userId: string, role: string) => {
    if (currentUser?.role !== 'Admin') {
      setError('Only Admins can update user roles.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      await apiClient.patch(`/admin/${userId}/role`, { role });
      setUsers(users.map(u => u._id === userId ? { ...u, role: role as any } : u));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredUsers = users.filter(u => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''} ${u.name || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const isAdmin = currentUser?.role === 'Admin';

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-6 h-6 border-2 border-white/10 border-t-[#00ff00] rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">USERS</h1>
          <p className="text-white/30 text-xs uppercase tracking-widest mt-1">Manage global access and roles</p>
        </div>
        <div className="px-4 py-1.5 border border-white/5 rounded-full text-[10px] font-bold text-white/40 tracking-widest uppercase">
          {users.length} Total
        </div>
      </header>

      <div className="flex items-center gap-4 py-1.5 px-6 border border-white/5 rounded-xl bg-white/[0.01] transition-all focus-within:border-white/10 group">
        <Search className="w-4 h-4 text-white/20 group-focus-within:text-[#00ff00] transition-colors" />
        <input 
          type="text" 
          placeholder="SEARCH IDENTITY..." 
          className="bg-transparent border-none outline-none text-white text-[10px] font-bold tracking-[0.2em] w-full placeholder:text-white/10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
        <div className="py-3 px-4 border border-red-500/20 bg-red-500/5 text-red-500 rounded-xl flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredUsers.map((user) => (
            <motion.div
              key={user._id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col gap-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/60 text-xs font-bold">
                  {(user.firstName?.[0] || user.name?.[0] || user.email[0]).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate uppercase tracking-tight">
                      {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}` : (user.name || 'Anonymous')}
                    </h3>
                    {user.role === 'Admin' && <ShieldCheck className="w-3 h-3 text-[#00ff00]" />}
                  </div>
                  <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex gap-1">
                  {(['User', 'Moderator', 'Admin'] as const).map((role) => (
                    <button
                      key={role}
                      disabled={!isAdmin || user._id === currentUser?._id}
                      onClick={() => updateRole(user._id, role)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-[9px] font-bold tracking-widest transition-all uppercase border",
                        user.role === role 
                          ? "bg-[#00ff00] text-black border-transparent shadow-[0_0_15px_-5px_#00ff0055]" 
                          : "text-white/20 border-white/5 hover:text-white hover:border-white/10 disabled:opacity-30"
                      )}
                    >
                      {role[0]}
                    </button>
                  ))}
                </div>
                <button className="p-2 text-white/20 hover:text-white transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
