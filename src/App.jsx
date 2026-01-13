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
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { GoogleDriveProvider } from './context/GoogleDriveContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import { db } from './lib/firebase';
import { cn } from './lib/utils';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);

  React.useEffect(() => {
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

  // No longer needed: setCurrentView, setSelectedGroupId (moved to URL)
  const [idols, setIdols] = useState([]);
  const [groups, setGroups] = useState([]);

  // Firestore Real-time Sync & Seeding
  useEffect(() => {
    const seedDatabase = async () => {
      try {
        const groupsSnap = await getDocs(query(collection(db, 'groups'), limit(1)));
        if (groupsSnap.empty && initialGroups?.length > 0) {
          console.log("Seeding groups...");
          const batch = writeBatch(db);
          initialGroups.forEach((g) => {
            const newRef = doc(collection(db, 'groups'));
            batch.set(newRef, { ...g, id: newRef.id });
          });
          await batch.commit();
        }

        const idolsSnap = await getDocs(query(collection(db, 'idols'), limit(1)));
        if (idolsSnap.empty && initialIdols?.length > 0) {
          console.log("Seeding idols...");
          const batch = writeBatch(db);
          initialIdols.forEach((idol) => {
            const newRef = doc(collection(db, 'idols'));
            batch.set(newRef, { ...idol, id: newRef.id });
          });
          await batch.commit();
        }
      } catch (err) {
        console.error("Seeding error:", err);
      }
    };

    seedDatabase();

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snap) => {
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setGroups(data);
    });

    const unsubIdols = onSnapshot(collection(db, 'idols'), (snap) => {
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setIdols(data);
    });

    return () => {
      unsubGroups();
      unsubIdols();
    };
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ group: '', company: '' });
  const [sortOption, setSortOption] = useState('name_asc');
  const { theme } = useTheme();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'edit', 'create'
  const [selectedIdol, setSelectedIdol] = useState(null);

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

            <Route path="/group/:groupId" element={<GroupRouteWrapper groups={groups} idols={idols} handleMemberClick={handleMemberClick} navigate={navigate} />} />
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

function GroupRouteWrapper({ groups, idols, handleMemberClick, navigate }) {
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
      />
    </motion.div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <GoogleDriveProvider>
          <AuthProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </AuthProvider>
        </GoogleDriveProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
