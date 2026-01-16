import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { IdolModal } from './components/IdolModal';
import { Loader2 } from 'lucide-react';
import { GroupPage } from './components/GroupPage';
import { GroupSelection } from './components/GroupSelection';
import { LoginPage } from './components/LoginPage';
import { GroupModal } from './components/GroupModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { RegisterPage } from './components/RegisterPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ProfilePage } from './components/ProfilePage';
import { FavoritesPage } from './components/FavoritesPage';
import { IdolDetailPage } from './components/IdolDetailPage';
import { PublicProfilePage } from './components/PublicProfilePage';
import { AdminUserManagement } from './components/AdminUserManagement';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAwardManagement } from './components/AdminAwardManagement';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, writeBatch, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { cn } from './lib/utils';

function RequireAdmin({ children }) {
  const location = useLocation();
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-brand-pink" size={40} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const [_error, setError] = useState(null);
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

    const unsubGroups = onSnapshot(collection(db, 'groups'),
      (snap) => {
        const data = snap.docs.map(doc => {
          const groupData = doc.data();
          return {
            ...groupData, id: doc.id,
            isFavorite: user ? (groupData.favoritedBy || []).includes(user.uid) : false
          };
        });
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
        const data = snap.docs.map(doc => {
          const idolData = doc.data();
          return {
            ...idolData, id: doc.id,
            isFavorite: user ? (idolData.favoritedBy || []).includes(user.uid) : false
          };
        });
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


  const filteredGroups = useMemo(() => {
    return groups
      .filter(g => !filters.company || (g.company || '').split(' (')[0] === filters.company)
      .sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [groups, filters.company]);

  const groupCompanies = useMemo(() => {
    const fromGroups = groups.map(g => (g.company || '').split(' (')[0]);
    const fromIdols = idols.map(i => (i.company || '').split(' (')[0]);
    return [...new Set([...fromGroups, ...fromIdols])].filter(Boolean).sort();
  }, [groups, idols]);

  // Navigation Scroll Fix
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  // Handlers
  const handleAddClick = (initialData) => {
    const data = (initialData && initialData.nativeEvent) ? null : initialData;
    setSelectedIdol(data || null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleAddGroupClick = () => {
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async (groupData) => {
    try {
      const { members: memberIds, ...restGroupData } = groupData;
      
      // Create ID from name (slugify)
      const groupId = restGroupData.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const groupRef = doc(db, 'groups', groupId);

      await setDoc(groupRef, {
        ...restGroupData,
        createdAt: new Date().toISOString(),
        members: memberIds || []
      });

      if (memberIds && memberIds.length > 0) {
        const batch = writeBatch(db);
        memberIds.forEach(idolId => {
          const idolRef = doc(db, 'idols', idolId);
          batch.update(idolRef, { 
            groupId: groupRef.id, 
            group: restGroupData.name 
          });
        });
        await batch.commit();
      }

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

  const handleCloseModal = () => {
    setModalOpen(false);
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
        const docRef = await addDoc(collection(db, 'idols'), newIdol);
        
        if (user) {
          await addDoc(collection(db, 'auditLogs'), {
            targetId: docRef.id,
            targetType: 'idol',
            action: 'create',
            userId: user.uid,
            userName: user.name || user.email || 'Unknown',
            changes: newIdol,
            createdAt: serverTimestamp()
          });
        }

        setModalOpen(false);
      } else if (selectedIdol?.id) {
        const idolRef = doc(db, 'idols', selectedIdol.id);
        
        const changes = {};
        let hasChanges = false;
        Object.keys(idolData).forEach(key => {
          if (['id', 'createdAt', 'updatedAt', 'likes', 'isFavorite'].includes(key)) return;
          const newValue = idolData[key];
          const oldValue = selectedIdol[key];
          if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
            changes[key] = { from: oldValue ?? null, to: newValue };
            hasChanges = true;
          }
        });

        await updateDoc(idolRef, { ...idolData, updatedAt: timestamp });

        try {
          if (hasChanges && user) {
            await addDoc(collection(db, 'auditLogs'), {
              targetId: selectedIdol.id,
              targetType: 'idol',
              action: 'update',
              userId: user.uid,
              userName: user.name || user.email || 'Unknown',
              changes: changes,
              createdAt: serverTimestamp()
            });
          }
        } catch (auditErr) {
          console.warn("Failed to create audit log:", auditErr);
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      if (err.code === 'permission-denied') {
        alert("Permission denied. You do not have access to modify this data.");
      } else {
        alert("Failed to save data: " + err.message);
      }
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

  const handleFavoriteIdol = async (id) => {
    if (!user) {
      alert('Please log in to favorite idols.');
      return;
    }
    const idol = idols.find(i => i.id === id);
    if (!idol) return;
    try {
      const idolRef = doc(db, 'idols', id);
      const isCurrentlyFavorite = (idol.favoritedBy || []).includes(user.uid);
      await updateDoc(idolRef, {
        favoritedBy: isCurrentlyFavorite ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      console.error("Favorite idol error:", err);
    }
  };

  const handleFavoriteGroup = async (groupId) => {
    if (!user) return alert('Please log in to favorite groups.');
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      const isCurrentlyFavorite = (group.favoritedBy || []).includes(user.uid);
      await updateDoc(groupRef, {
        favoritedBy: isCurrentlyFavorite ? arrayRemove(user.uid) : arrayUnion(user.uid)
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

  const handleLogoutRequest = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Logout',
      message: 'Are you sure you want to sign out of your account?',
      onConfirm: () => {
        logout();
        navigate('/');
      },
      confirmText: 'Logout',
      confirmButtonClass: 'bg-brand-pink text-white hover:bg-brand-pink/90 shadow-lg shadow-brand-pink/20'
    });
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
        onProfileClick={() => {
          const u = (user?.username || '').toLowerCase().trim();
          if (u) {
            navigate(`/u/${u}`);
            return;
          }
          navigate('/profile');
        }}
        onEditProfileClick={() => navigate('/profile')}
        onHomeClick={() => navigate('/')}
        onFavoritesClick={() => navigate('/favorites')}
        onNotificationClick={handleNotificationClick}
        onManageUsersClick={() => navigate('/admin/users')}
        onDashboardClick={() => navigate('/admin/dashboard')}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onLogoutRequest={handleLogoutRequest}
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
                  onLikeIdol={handleFavoriteIdol}
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
                  onRegisterSuccess={() => navigate('/profile')}
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

            <Route path="/favorites" element={
              <motion.div
                key="favorites"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <FavoritesPage
                  idols={idols}
                  groups={groups}
                  onBack={() => navigate('/')}
                  onSelectIdol={handleCardClick}
                  onSelectGroup={handleGroupClick}
                  onFavoriteIdol={handleFavoriteIdol}
                  onFavoriteGroup={handleFavoriteGroup}
                />
              </motion.div>
            } />

            <Route
              path="/idol/:idolId"
              element={
                <motion.div
                  key="idol-detail"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <IdolDetailPage />
                </motion.div>
              }
            />

            <Route
              path="/u/:username"
              element={
                <motion.div
                  key="public-profile"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <PublicProfilePage />
                </motion.div>
              }
            />

            <Route
              path="/admin/users"
              element={
                <RequireAdmin>
                  <motion.div
                    key="admin-users"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <AdminUserManagement onBack={() => navigate('/')} />
                  </motion.div>
                </RequireAdmin>
              }
            />

            <Route
              path="/admin/dashboard"
              element={
                <RequireAdmin>
                  <motion.div
                    key="admin-dashboard"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <AdminDashboard onBack={() => navigate('/')} />
                  </motion.div>
                </RequireAdmin>
              }
            />

            <Route
              path="/admin/awards"
              element={
                <RequireAdmin>
                  <motion.div
                    key="admin-awards"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <AdminAwardManagement onBack={() => navigate('/')} />
                  </motion.div>
                </RequireAdmin>
              }
            />

            <Route path="/group/:groupId" element={<GroupRouteWrapper groups={groups} idols={idols} handleMemberClick={handleMemberClick} onUpdateGroup={handleUpdateGroup} onDeleteGroup={handleDeleteGroup} navigate={navigate} onSearch={setSearchTerm} allIdols={idols} onGroupClick={handleGroupClick} />} />
          </Routes>
        </AnimatePresence>
      </main>

      <IdolModal
        isOpen={modalOpen}
        mode={modalMode}
        idol={selectedIdol}
        onClose={handleCloseModal}
        onSave={handleSave}
        onDelete={handleDelete}
        onLike={handleFavoriteIdol}
        onGroupClick={handleGroupClick}
        onIdolClick={handleCardClick}
      />

      <GroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onSave={handleSaveGroup}
        idols={idols}
        onAddIdol={handleAddClick}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmButtonClass={confirmModal.confirmButtonClass}
      />
    </div>
  );
}

function GroupRouteWrapper({ groups, idols, handleMemberClick, onUpdateGroup, onDeleteGroup, navigate, onSearch, allIdols, onGroupClick }) {
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
        onSearch={onSearch}
        allIdols={allIdols}
        onGroupClick={onGroupClick}
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
