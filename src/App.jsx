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
import { GroupModal } from './components/GroupModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ProfilePage } from './components/ProfilePage';
import { AdminUserManagement } from './components/AdminUserManagement';
import { AdminDashboard } from './components/AdminDashboard';
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
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ group: '', company: '' });
  const [sortOption, setSortOption] = useState('name_asc');
  const { theme } = useTheme();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'edit', 'create'
  const [selectedIdol, setSelectedIdol] = useState(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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
    setLoading(true);
    let groupsLoaded = false;
    let idolsLoaded = false;
    const checkLoading = () => {
      if (groupsLoaded && idolsLoaded) setLoading(false);
    };

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
        groupsLoaded = true;
        checkLoading();
        setDbError(null);
      },
      (error) => {
        console.error("Firestore groups error:", error);
        setDbError("Firestore access denied. Please check your security rules or ensure the database is initialized.");
        groupsLoaded = true;
        checkLoading();
      }
    );

    const unsubIdols = onSnapshot(collection(db, 'idols'),
      (snap) => {
        const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setIdols(data);
        idolsLoaded = true;
        checkLoading();
        setDbError(null);
      },
      (error) => {
        console.error("Firestore idols error:", error);
        setDbError("Firestore access denied. Please check your security rules or ensure the database is initialized.");
        idolsLoaded = true;
        checkLoading();
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
    return groups
      .filter(g => !filters.company || g.company.includes(filters.company))
      .sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
      });
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

  const handleAddGroupClick = () => {
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async (groupData) => {
    try {
      await addDoc(collection(db, 'groups'), {
        ...groupData,
        createdAt: new Date().toISOString(),
        members: []
      });
      setGroupModalOpen(false);
    } catch (err) {
      console.error("Error adding group: ", err);
      alert("Failed to add group");
    }
  };

  const handleCardClick = (idol) => {
    setSelectedIdol(idol);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleSave = async (idolData) => {
    try {
      const timestamp = new Date().toISOString();
      if (modalMode === 'create') {
        const newIdol = {
          ...idolData,
          likes: 0,
          isFavorite: false,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        await addDoc(collection(db, 'idols'), newIdol);
      } else if (selectedIdol?.id) {
        const idolRef = doc(db, 'idols', selectedIdol.id);
        await updateDoc(idolRef, { ...idolData, updatedAt: timestamp });
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save data. Please check your Firestore rules.");
    }
  };

  const handleDelete = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Idol',
      message: 'Are you sure you want to delete this idol? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'idols', id));
          setModalOpen(false);
        } catch (err) {
          console.error("Delete error:", err);
        }
      }
    });
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

  const handleFavoriteGroup = async (groupId) => {
    if (!user) return;
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        isFavorite: !group.isFavorite
      });
    } catch (err) {
      console.error("Favorite group error:", err);
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

  const handleDeleteGroup = async (groupId) => {
    if (!isAdmin) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? This cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'groups', groupId));
          navigate('/');
        } catch (err) {
          console.error("Error deleting group:", err);
          alert("Failed to delete group");
        }
      }
    });
  };

  const handleMemberClick = (member) => {
    setSelectedIdol(member);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleNotificationClick = (notification) => {
    if (notification.targetType === 'group') {
      navigate(`/group/${notification.targetId}`);
    } else if (notification.targetType === 'idol') {
      const idol = idols.find(i => i.id === notification.targetId);
      if (idol) {
        setSelectedIdol(idol);
        setModalMode('view');
        setModalOpen(true);
      }
    }
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
        onAddGroupClick={handleAddGroupClick}
        onLoginClick={() => navigate('/login')}
        onProfileClick={() => navigate('/profile')}
        onHomeClick={() => navigate('/')}
        onNotificationClick={handleNotificationClick}
        onManageUsersClick={() => navigate('/admin/users')}
        onDashboardClick={() => navigate('/admin/dashboard')}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {dbError && (
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 text-center">
            <p className="text-red-500 font-black uppercase tracking-widest text-[10px] mb-2">System Alert: Database Connectivity</p>
            <p className="text-slate-900 dark:text-white text-sm font-bold mb-4">{dbError}</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-4">💡 Tip: Make sure you have created the 'Firestore Database' in your Firebase Console and applied the security rules.</p>
          </div>
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
                  idols={idols}
                  companies={groupCompanies}
                  selectedCompany={filters.company}
                  onSelectCompany={(company) => setFilters(prev => ({ ...prev, company }))}
                  onSelectGroup={handleGroupClick}
                  onSelectIdol={handleCardClick}
                  onLikeIdol={handleLike}
                  onFavoriteGroup={handleFavoriteGroup}
                  loading={loading}
                  searchTerm={searchTerm}
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

            <Route path="/forgot-password" element={
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ForgotPasswordPage
                  onNavigate={(view) => navigate(`/${view}`)}
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

            <Route path="/admin/users" element={
              <motion.div
                key="admin-users"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <AdminUserManagement
                  onBack={() => navigate('/')}
                />
              </motion.div>
            } />

            <Route path="/admin/dashboard" element={
              <motion.div
                key="admin-dashboard"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <AdminDashboard
                  onBack={() => navigate('/')}
                />
              </motion.div>
            } />

            <Route path="/group/:groupId" element={<GroupRouteWrapper groups={groups} idols={idols} handleMemberClick={handleMemberClick} onUpdateGroup={handleUpdateGroup} onDeleteGroup={handleDeleteGroup} navigate={navigate} />} />
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

      <GroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onSave={handleSaveGroup}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}

function GroupRouteWrapper({ groups, idols, handleMemberClick, onUpdateGroup, onDeleteGroup, navigate }) {
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
        onDeleteGroup={onDeleteGroup}
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
