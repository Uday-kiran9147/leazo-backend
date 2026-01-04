'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  MapPin, 
  Home, 
  CheckCircle2, 
  X, 
  Clock, 
  Pause,
  Phone,
  User as UserIcon,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/api-client';
import { Portion } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

export default function RoutesPage() {
  const [portions, setPortions] = useState<Portion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'Review' | 'Hold' | 'Approved' | 'Rejected'>('Review');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedPortion, setSelectedPortion] = useState<Portion | null>(null);

  const fetchPortions = async (status: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/admin/get-portions/${status}`);
      setPortions(response.data.data.portions);
    } catch (error) {
      console.error('Error fetching portions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortions(filter);
  }, [filter]);

  const updateStatus = async (id: string, status: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionLoading(id);
    try {
      await apiClient.patch(`/admin/update-portion-status/${id}/${status}`);
      if (selectedPortion?._id === id) {
        setSelectedPortion(null);
      }
      setPortions(prev => prev.filter(p => p._id !== id));
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPortions = portions.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.address?.locality || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.address?.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ActionButton = ({ portionId, targetStatus, icon: Icon, label, variant }: any) => {
    const isCurrent = filter === targetStatus;
    if (isCurrent) return null;

    const variants: any = {
      approve: "bg-[#00ff00] text-black hover:bg-[#00dd00]",
      reject: "border border-red-500/20 text-red-500 hover:bg-red-500/5",
      hold: "border border-white/10 text-white/60 hover:text-white hover:bg-white/5",
      review: "border border-amber-500/20 text-amber-500 hover:bg-amber-500/5"
    };

    return (
      <button 
        onClick={(e) => updateStatus(portionId, targetStatus, e)}
        disabled={actionLoading === portionId}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
          variants[variant]
        )}
      >
        <Icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{label}</span>
      </button>
    );
  };

  if (loading && portions.length === 0) return <div className="flex items-center justify-center h-96"><div className="w-6 h-6 border-2 border-white/10 border-t-[#00ff00] rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">LISTINGS</h1>
          <p className="text-white/30 text-xs uppercase tracking-widest mt-1">Review and moderate submissions</p>
        </div>
        
        <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-xl">
          {(['Review', 'Hold', 'Approved', 'Rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === s ? "bg-[#00ff00] text-black" : "text-white/40 hover:text-white"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-center gap-4 py-1.5 px-6 border border-white/5 rounded-xl bg-white/[0.01] transition-all focus-within:border-white/10 group">
        <Search className="w-4 h-4 text-white/20 group-focus-within:text-[#00ff00]" />
        <input 
          type="text" 
          placeholder="SEARCH SUBMISSIONS..." 
          className="bg-transparent border-none outline-none text-white text-[10px] font-bold tracking-[0.2em] w-full placeholder:text-white/10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredPortions.map((portion) => (
            <motion.div
              key={portion._id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPortion(portion)}
              className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden group cursor-pointer transition-all hover:border-white/10"
            >
              <div className="relative aspect-[16/10] bg-slate-900 border-b border-white/5">
                {portion.images?.[0] ? (
                  <img src={portion.images[0]} alt="" className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                ) : (
                  <img src="/placeholder.png" alt="" className="w-full h-full object-cover opacity-20 grayscale" />
                )}
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-full text-[8px] font-bold text-white tracking-widest uppercase">
                    {portion.approvalStatus}
                  </span>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="min-h-[50px]">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight line-clamp-1">{portion.title}</h3>
                  <div className="flex items-center gap-2 text-white/20 text-[9px] font-bold uppercase tracking-widest mt-2">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{portion.address?.locality || portion.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-4 border-y border-white/5">
                   <div>
                      <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest mb-1">Valuation</p>
                      <p className="text-white font-bold text-base tracking-tight">{formatCurrency(portion.price)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest mb-1">Level</p>
                      <p className="text-white/60 font-medium text-xs uppercase tracking-widest">{portion.floor || 'N/A'}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <ActionButton portionId={portion._id} targetStatus="Approved" icon={Check} label="Approve" variant="approve" />
                  <ActionButton portionId={portion._id} targetStatus="Rejected" icon={X} label="Reject" variant="reject" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedPortion && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm" 
              onClick={() => setSelectedPortion(null)} 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-5xl bg-black border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row h-full max-h-[85vh]"
            >
              <button 
                onClick={() => setSelectedPortion(null)}
                className="absolute top-6 right-6 z-10 p-2 text-white/20 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-full md:w-1/2 h-64 md:h-auto bg-slate-900 overflow-hidden">
                {selectedPortion.images?.[0] ? (
                  <img src={selectedPortion.images[0]} className="w-full h-full object-cover" alt="" />
                ) : (
                  <img src="/placeholder.png" className="w-full h-full object-cover opacity-20" alt="" />
                )}
              </div>

              <div className="flex-1 p-10 md:p-16 overflow-y-auto space-y-10 no-scrollbar">
                <div className="space-y-4">
                  <div className="text-[#00ff00] text-[9px] font-bold uppercase tracking-[0.2em] mb-4 border-l-2 border-[#00ff00] pl-4">MODERATION UNIT</div>
                  <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">{selectedPortion.title}</h2>
                  <div className="flex items-center gap-2 text-white/30 text-sm font-medium uppercase tracking-widest">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedPortion.address?.locality}, {selectedPortion.address?.city}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 border border-white/5 rounded-2xl bg-white/[0.01]">
                    <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest mb-1">Index Price</p>
                    <p className="text-[#00ff00] font-bold text-2xl tracking-tighter">{formatCurrency(selectedPortion.price)}</p>
                  </div>
                  <div className="p-6 border border-white/5 rounded-2xl bg-white/[0.01]">
                    <p className="text-white/20 text-[8px] font-bold uppercase tracking-widest mb-1">Portion ID</p>
                    <p className="text-white/80 font-bold text-2xl tracking-tighter">{selectedPortion.portionNumber || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Description</h4>
                  <p className="text-white/60 leading-relaxed font-medium text-sm">{selectedPortion.description || 'Null'}</p>
                </div>

                <div className="p-8 border border-white/5 rounded-3xl bg-white/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-white/40" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-lg uppercase tracking-tight">{selectedPortion.contact?.name || 'Owner'}</p>
                      <p className="text-white/20 text-[10px] font-bold tracking-widest uppercase">{selectedPortion.contact?.phoneNumber || 'Private'}</p>
                    </div>
                  </div>
                  {selectedPortion.contact?.phoneNumber && (
                    <a href={`tel:${selectedPortion.contact.phoneNumber}`} className="p-4 bg-white/5 hover:bg-[#00ff00] text-white hover:text-black rounded-2xl transition-all">
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => updateStatus(selectedPortion._id, 'Approved')} className="bg-[#00ff00] text-black font-bold py-5 rounded-2xl uppercase tracking-[0.2em] text-[11px] hover:bg-[#00dd00] transition-colors">Approve</button>
                  <button onClick={() => updateStatus(selectedPortion._id, 'Rejected')} className="border border-red-500/20 text-red-500 font-bold py-5 rounded-2xl uppercase tracking-[0.2em] text-[11px] hover:bg-red-500/5 transition-colors">Reject</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
