import React from 'react';
import { Users, Music2, Calendar, Star } from 'lucide-react';
import { motion } from 'framer-motion';

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-2xl flex items-center gap-4 relative overflow-hidden"
        >
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${color}-500/10 rounded-full blur-2xl`} />
            <div className={`p-3 rounded-xl bg-${color}-500/20 text-${color}-400`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-slate-400 text-sm font-medium">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </motion.div>
    );
}

export function StatsDashboard({ idols }) {
    const totalIdols = idols.length;
    const totalGroups = new Set(idols.map(i => i.group)).size;
    const totalCompanies = new Set(idols.map(i => i.company)).size;
    const totalLikes = idols.reduce((acc, curr) => acc + (curr.likes || 0), 0);

    // Format likes to K/M
    const formatLikes = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num;
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Users} label="Total Idols" value={totalIdols} color="brand-purple" />
            <StatCard icon={Music2} label="Active Groups" value={totalGroups} color="brand-pink" />
            <StatCard icon={Calendar} label="Average Age" value="23" color="brand-blue" />
            <StatCard icon={Star} label="Total Likes" value={formatLikes(totalLikes)} color="yellow" />
        </div>
    );
}
