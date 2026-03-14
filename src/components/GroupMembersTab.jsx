import React from 'react';
import { motion, Reorder } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Check, ListOrdered, GripVertical } from 'lucide-react';
import { MemberCard } from './MemberCard';
import { convertDriveLink } from '../../lib/storage';

export function GroupMembersTab({
    isEditing, isReordering, setIsReordering, sortedMembers, activeMembers, formerMembers,
    setFormData, onMemberClick, setLightboxImage, onSearchPosition, onFavoriteMember, onEditMember
}) {
    const { theme } = useTheme();
    const { isAdmin, user } = useAuth();

    return (
        <>
            {isEditing && isAdmin && (
                <div className="flex justify-end mb-4">
                    <button onClick={() => setIsReordering(!isReordering)} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", isReordering ? "bg-brand-pink text-white shadow-lg shadow-brand-pink/20" : (theme === 'dark' ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200"))}>
                        {isReordering ? <Check size={16} /> : <ListOrdered size={16} />}
                        {isReordering ? "Done Reordering" : "Reorder Members"}
                    </button>
                </div>
            )}

            {isReordering && isAdmin ? (
                <Reorder.Group axis="y" values={sortedMembers} onReorder={(newOrder) => { setFormData(prev => ({ ...prev, members: newOrder.map(m => m.id) })); }} className="space-y-4">
                    {sortedMembers.map((member) => (
                        <Reorder.Item key={member.id} value={member}>
                            <div className={cn("flex items-center gap-4 p-4 rounded-2xl border cursor-grab active:cursor-grabbing", theme === 'dark' ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-100 shadow-sm")}>
                                <GripVertical className="text-slate-400" />
                                <img src={convertDriveLink(member.image)} className="w-12 h-12 rounded-full object-cover" alt="" />
                                <div className={cn("font-bold flex items-center gap-2", member.status === 'Inactive' && "text-slate-500")}>
                                    {member.name}
                                    {member.status === 'Inactive' && (
                                        <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 px-1.5 py-0.5 rounded uppercase font-black tracking-widest border border-red-500/20">Inactive</span>
                                    )}
                                </div>
                            </div>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            ) : (
                <motion.div
                    key="members-content"
                    variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } } }}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8"
                >
                    {activeMembers.length > 0 && (
                        <div className="col-span-1 md:col-span-1 xl:col-span-2 mt-4 mb-2">
                            <h3 className={cn("text-lg font-black uppercase tracking-widest flex items-center gap-2", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                                <div className="w-8 h-1 bg-brand-pink rounded-full" />
                                Active Members
                            </h3>
                        </div>
                    )}
                    {activeMembers.map((member, idx) => (
                        <MemberCard key={member.id || idx} id={`member-${member.id}`} member={member} onClick={() => onMemberClick(member)} onImageClick={(img) => setLightboxImage(img)} onSearchPosition={onSearchPosition} onFavorite={() => onFavoriteMember && onFavoriteMember(member.id)} onEdit={() => onEditMember && onEditMember(member)} />
                    ))}

                    {formerMembers.length > 0 && (
                        <>
                            <div className="col-span-1 md:col-span-1 xl:col-span-2 mt-12 mb-6">
                                <div className="flex items-center gap-4">
                                    <h3 className={cn("text-lg font-black uppercase tracking-widest flex items-center gap-2 shrink-0", theme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                                        <div className="w-8 h-1 bg-slate-400 rounded-full" />
                                        Former Members
                                    </h3>
                                    <div className={cn("h-px w-full", theme === 'dark' ? "bg-white/5" : "bg-slate-100")} />
                                </div>
                                <p className={cn("text-xs font-bold mt-2", theme === 'dark' ? "text-slate-600" : "text-slate-400")}>Members who have officially left the group.</p>
                            </div>
                            {formerMembers.map((member, idx) => (
                                <MemberCard key={member.id || idx} id={`member-${member.id}`} member={member} onClick={() => onMemberClick(member)} onImageClick={(img) => setLightboxImage(img)} onSearchPosition={onSearchPosition} onFavorite={() => onFavoriteMember && onFavoriteMember(member.id)} onEdit={() => onEditMember && onEditMember(member)} />
                            ))}
                        </>
                    )}
                </motion.div>
            )}
        </>
    );
}