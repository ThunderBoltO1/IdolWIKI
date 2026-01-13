import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { initialIdols, initialGroups } from './data/idols';
import { Navbar } from './components/Navbar';
import { StatsDashboard } from './components/StatsDashboard';
import { FilterBar } from './components/FilterBar';
import { IdolCard } from './components/IdolCard';
import { IdolModal } from './components/IdolModal';
import { GroupPage } from './components/GroupPage';
import { GroupSelection } from './components/GroupSelection';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { ProfilePage } from './components/ProfilePage';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import { db } from './lib/firebase';
import { cn } from './lib/utils';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const [error, setError] = useState(null);
  const [idols, setIdols] = useState([]);
  const [groups, setGroups] = useState([]);
  const [dbError, setDbError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ group: '', company: '' });
  const [sortOption, setSortOption] = useState('name_asc');
  const { theme } = useTheme();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'edit', 'create'
  const [selectedIdol, setSelectedIdol] = useState(null);

  // Error Handler
  useEffect(() => {
    const handleError = (event) => {
      setError({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        error: event.error?.stack
      });
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Firestore Real-time Sync & Seeding
  useEffect(() => {
    const seedDatabase = async () => {
      try {
        console.log("Checking database status...");
        const groupsSnap = await getDocs(query(collection(db, 'groups'), limit(1)));
        if (groupsSnap.empty && initialGroups?.length > 0) {
          console.log("Seeding groups...");
          const batch = writeBatch(db);
          initialGroups.forEach((g) => {
            const docRef = doc(db, 'groups', g.id);
            batch.set(docRef, g);
          });
          await batch.commit();
        }

        const idolsSnap = await getDocs(query(collection(db, 'idols'), limit(1)));
        if (idolsSnap.empty && initialIdols?.length > 0) {
          console.log("Seeding idols...");
          const batch = writeBatch(db);
          initialIdols.forEach((idol) => {
            const docRef = doc(db, 'idols', idol.id);
            batch.set(docRef, idol);
          });
          await batch.commit();
        }
      } catch (err) {
        console.error("Seeding failed critical check:", err);
        if (err.code === 'permission-denied') {
          setDbError("Seeding failed: Missing permissions. Please ensure your account has the 'admin' role in Firestore.");
        }
      }
    };

    seedDatabase();

    const unsubGroups = onSnapshot(collection(db, 'groups'),
      (snap) => {
        const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setGroups(data);
        setDbError(null);
      },
      (error) => {
        console.error("Firestore groups error:", error);
        setDbError("Firestore access denied. Please check your security rules or ensure the database is initialized.");
      }
    );

    const unsubIdols = onSnapshot(collection(db, 'idols'),
      (snap) => {
        const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setIdols(data);
        setDbError(null);
      },
      (error) => {
        console.error("Firestore idols error:", error);
        setDbError("Firestore access denied. Please check your security rules or ensure the database is initialized.");
      }
    );

    return () => {
      unsubGroups();
      unsubIdols();
    };
  }, [user]);


  // Derived Data
  const uniqueGroups = useMemo(() => {
    try {
      return [...new Set((idols || []).map(i => i.group))].filter(Boolean).sort();
    } catch (e) {
      console.error('Error calculating uniqueGroups', e);
      return [];
    }
  }, [idols]);

  const uniqueCompanies = useMemo(() => {
    try {
      return [...new Set((idols || []).map(i => i.company))].filter(Boolean).sort();
    } catch (e) {
      console.error('Error calculating uniqueCompanies', e);
      return [];
    }
  }, [idols]);

  const filteredGroups = useMemo(() => {
    return groups.filter(g => !filters.company || g.company.includes(filters.company));
  }, [groups, filters.company]);

  const groupCompanies = useMemo(() => {
    return [...new Set(groups.map(g => (g.company || '').split(' (')[0]))].sort();
  }, [groups]);

  // Navigation Scroll Fix
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Handlers
  const handleAddClick = () => {
    setSelectedIdol(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleCardClick = (idol) => {
    setSelectedIdol(idol);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleSave = async (idolData) => {
    try {
      if (modalMode === 'create') {
        const newIdol = {
          ...idolData,
          likes: 0,
          isFavorite: false,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'idols'), newIdol);
      } else if (selectedIdol?.id) {
        const idolRef = doc(db, 'idols', selectedIdol.id);
        await updateDoc(idolRef, idolData);
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save data. Please check your Firestore rules.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this idol?')) {
      try {
        await deleteDoc(doc(db, 'idols', id));
        setModalOpen(false);
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  const handleLike = async (id) => {
    const idol = idols.find(i => i.id === id);
    if (!idol) return;
    try {
      const idolRef = doc(db, 'idols', id);
      await updateDoc(idolRef, {
        likes: idol.isFavorite ? (idol.likes || 0) - 1 : (idol.likes || 0) + 1,
        isFavorite: !idol.isFavorite
      });
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleGroupClick = (groupId) => {
    navigate(`/group/${groupId}`);
    setModalOpen(false);
  };

  const handleUpdateGroup = async (groupId, data) => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, data);
    } catch (err) {
      console.error("Group update error:", err);
      alert("Failed to update group: " + err.message);
    }
  };

  const handleResetData = async () => {
    if (!isAdmin) return;
    if (!window.confirm("⚠️ WARNING: This will clear all current Idols/Groups and re-sync with the latest data. This is recommended to fix the 'Missing Idols' issue. Proceed?")) return;

    try {
      setDbError("🔄 Re-syncing database... please wait.");

      // Clear groups
      const gSnap = await getDocs(collection(db, 'groups'));
      const b1 = writeBatch(db);
      gSnap.docs.forEach(d => b1.delete(d.ref));
      await b1.commit();

      // Clear idols
      const iSnap = await getDocs(collection(db, 'idols'));
      const b2 = writeBatch(db);
      iSnap.docs.forEach(d => b2.delete(d.ref));
      await b2.commit();

      // Trigger reload
      window.location.reload();
    } catch (err) {
      console.error("Reset error:", err);
      alert("Reset failed: " + err.message);
    }
  };

  const handleMemberClick = (member) => {
    setSelectedIdol(member);
    setModalMode('view');
    setModalOpen(true);
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 font-sans selection:bg-brand-pink/30 relative",
      theme === 'dark' ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
    )}>
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={cn(
          "absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"
        )} />

        <div className={cn(
          "absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-all duration-1000",
          theme === 'dark' ? "bg-brand-purple/20" : "bg-brand-purple/10"
        )} />

        <div className={cn(
          "absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-all duration-1000",
          theme === 'dark' ? "bg-brand-pink/10" : "bg-brand-pink/5"
        )} />
      </div>

      <Navbar
        onAddClick={handleAddClick}
        onLoginClick={() => navigate('/login')}
        onProfileClick={() => navigate('/profile')}
        onHomeClick={() => navigate('/')}
      />

      {dbError && (
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 text-center">
            <p className="text-red-500 font-black uppercase tracking-widest text-[10px] mb-2">System Alert: Database Connectivity</p>
            <p className="text-slate-900 dark:text-white text-sm font-bold mb-4">{dbError}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-4">💡 Tip: Make sure you have created the 'Firestore Database' in your Firebase Console and applied the security rules.</p>
            {isAdmin && (
              <button
                onClick={handleResetData}
                className="px-6 py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg"
              >
                Perform System Re-Sync
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Quick Sync Tool (Optional, always visible for admin) */}
      {!dbError && isAdmin && (
        <div className="fixed bottom-6 left-6 z-50">
          <button
            onClick={handleResetData}
            className="px-4 py-2 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-2xl"
            title="Fix Data Linking Issues"
          >
            🔄 Re-Sync Data
          </button>
        </div>
      )}


      <main className="container mx-auto px-4 py-8 relative z-10">
        <AnimatePresence mode='wait'>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <motion.div
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GroupSelection
                  groups={filteredGroups}
                  companies={groupCompanies}
                  selectedCompany={filters.company}
                  onSelectCompany={(company) => setFilters(prev => ({ ...prev, company }))}
                  onSelectGroup={handleGroupClick}
                />
              </motion.div>
            } />

            <Route path="/login" element={
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <LoginPage
                  onNavigate={(view) => navigate(`/${view}`)}
                  onLoginSuccess={() => navigate('/')}
                />
              </motion.div>
            } />

            <Route path="/register" element={
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <RegisterPage
                  onNavigate={(view) => navigate(`/${view}`)}
                  onRegisterSuccess={() => navigate('/')}
                />
              </motion.div>
            } />

            <Route path="/profile" element={
              <motion.div
                key="profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <ProfilePage
                  onBack={() => navigate('/')}
                />
              </motion.div>
            } />

            <Route path="/group/:groupId" element={<GroupRouteWrapper groups={groups} idols={idols} handleMemberClick={handleMemberClick} onUpdateGroup={handleUpdateGroup} navigate={navigate} />} />
          </Routes>
        </AnimatePresence>
      </main>

      <IdolModal
        isOpen={modalOpen}
        mode={modalMode}
        idol={selectedIdol}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onLike={handleLike}
        onGroupClick={handleGroupClick}
      />
    </div>
  );
}

function GroupRouteWrapper({ groups, idols, handleMemberClick, onUpdateGroup, navigate }) {
  const { groupId } = useParams();
  const group = groups.find(g => g.id === groupId);
  const members = idols.filter(i => i.groupId === groupId);

  return (
    <motion.div
      key={`group-${groupId}`}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GroupPage
        group={group}
        members={members}
        onBack={() => navigate('/')}
        onMemberClick={handleMemberClick}
        onUpdateGroup={onUpdateGroup}
      />
    </motion.div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
