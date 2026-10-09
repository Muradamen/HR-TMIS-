import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Trader, 
  Woreda, 
  Kebele, 
  User, 
  AuditLogEntry, 
  LegalTraderDetails, 
  InformalTraderDetails,
  TraderStatus
} from '../types';
import { 
  SEED_TRADERS, 
  SEED_WOREDAS, 
  SEED_KEBELES, 
  SEED_USERS, 
  SEED_AUDIT_LOGS 
} from '../data/seedData';

interface AppAlert {
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
}

interface AppContextType {
  traders: Trader[];
  woredas: Woreda[];
  kebeles: Kebele[];
  users: User[];
  currentUser: User;
  isAuthenticated: boolean;
  auditLogs: AuditLogEntry[];
  alert: AppAlert | null;
  recentSearches: string[];
  recordRecentSearch: (traderId: string) => void;
  clearRecentSearches: () => void;
  getRecentTraderObjects: () => Trader[];
  login: (username: string, password: string) => { success: boolean; user?: User; error?: string };
  logout: () => void;
  setCurrentUser: (user: User) => void;
  showAlert: (type: AppAlert['type'], message: string) => void;
  dismissAlert: () => void;
  getTraderById: (traderId: string) => Trader | undefined;
  getWoredaName: (woredaId: number) => string;
  getKebeleName: (kebeleId: number) => string;
  registerLegalTrader: (details: LegalTraderDetails) => string;
  registerInformalTrader: (details: InformalTraderDetails) => string;
  updateLegalTrader: (traderId: string, details: LegalTraderDetails) => void;
  updateInformalTrader: (traderId: string, details: InformalTraderDetails) => void;
  verifyTrader: (traderId: string, status: TraderStatus, notes: string) => void;
  deleteTrader: (traderId: string) => void;
  addWoreda: (name: string, code: string) => void;
  addKebele: (woredaId: number, name: string, code: string) => void;
  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TRADERS: 'hr_tmis_traders_v1',
  WOREDAS: 'hr_tmis_woredas_v1',
  KEBELES: 'hr_tmis_kebeles_v1',
  AUDIT: 'hr_tmis_audit_v1',
  CURRENT_USER: 'hr_tmis_user_v1',
  AUTH_SESSION: 'hr_tmis_auth_session_v1',
  RECENT_SEARCHES: 'hr_tmis_recent_searches_v1',
};

const DEFAULT_USER_RECENT_SEARCHES: Record<number, string[]> = {
  1: ['HTT-000001', 'HTT-000002', 'HTT-000003'], // Murad Amen (Data Encoder)
  2: ['HTT-000001', 'HTT-000005', 'HTT-000006'], // Dr. Ahmed Hassen (Director)
  3: ['HTT-000006', 'HTT-000002'],               // Fatuma Ali (Agency Leader)
  4: ['HTT-000001', 'HTT-000002', 'HTT-000004'], // System Administrator
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTH_SESSION) === 'true';
    } catch {
      return false;
    }
  });
  const [traders, setTraders] = useState<Trader[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRADERS);
      return saved ? JSON.parse(saved) : SEED_TRADERS;
    } catch {
      return SEED_TRADERS;
    }
  });

  const [woredas, setWoredas] = useState<Woreda[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WOREDAS);
      return saved ? JSON.parse(saved) : SEED_WOREDAS;
    } catch {
      return SEED_WOREDAS;
    }
  });

  const [kebeles, setKebeles] = useState<Kebele[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.KEBELES);
      return saved ? JSON.parse(saved) : SEED_KEBELES;
    } catch {
      return SEED_KEBELES;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
      return saved ? JSON.parse(saved) : SEED_AUDIT_LOGS;
    } catch {
      return SEED_AUDIT_LOGS;
    }
  });

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        const matched = SEED_USERS.find(u => u.id === parsed.id);
        if (matched) return matched;
      }
      return SEED_USERS[0]; // Default to Murad Amen (Data Encoder)
    } catch {
      return SEED_USERS[0];
    }
  });

  const [userRecentSearches, setUserRecentSearches] = useState<Record<number, string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      return saved ? JSON.parse(saved) : DEFAULT_USER_RECENT_SEARCHES;
    } catch {
      return DEFAULT_USER_RECENT_SEARCHES;
    }
  });

  const [alert, setAlert] = useState<AppAlert | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRADERS, JSON.stringify(traders));
  }, [traders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WOREDAS, JSON.stringify(woredas));
  }, [woredas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.KEBELES, JSON.stringify(kebeles));
  }, [kebeles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(userRecentSearches));
  }, [userRecentSearches]);

  const activeRecentSearches = userRecentSearches[currentUser.id] || [];

  const recordRecentSearch = (traderId: string) => {
    if (!traderId) return;
    const cleanId = traderId.trim().toUpperCase();
    setUserRecentSearches(prev => {
      const currentList = prev[currentUser.id] || [];
      const filtered = currentList.filter(id => id.toUpperCase() !== cleanId);
      const updatedList = [cleanId, ...filtered].slice(0, 5);
      return {
        ...prev,
        [currentUser.id]: updatedList,
      };
    });
  };

  const clearRecentSearches = () => {
    setUserRecentSearches(prev => ({
      ...prev,
      [currentUser.id]: [],
    }));
  };

  const getRecentTraderObjects = (): Trader[] => {
    const ids = userRecentSearches[currentUser.id] || [];
    const list: Trader[] = [];
    for (const id of ids) {
      const found = traders.find(t => t.traderId.toUpperCase() === id.toUpperCase());
      if (found) {
        list.push(found);
      }
    }
    return list;
  };

  const showAlert = (type: AppAlert['type'], message: string) => {
    setAlert({ type, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dismissAlert = () => {
    setAlert(null);
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    showAlert('info', `Active user switched to ${user.fullName} (${user.role.replace(/_/g, ' ')})`);
  };

  const generateNextTraderId = (currentTraders: Trader[]): string => {
    // Generate HTT-000001 format matching Django save() logic
    let maxId = 0;
    for (const t of currentTraders) {
      if (t.traderId && t.traderId.startsWith('HTT-')) {
        const numPart = parseInt(t.traderId.replace('HTT-', ''), 10);
        if (!isNaN(numPart) && numPart > maxId) {
          maxId = numPart;
        }
      }
    }
    const nextNum = maxId + 1;
    return `HTT-${nextNum.toString().padStart(6, '0')}`;
  };

  const getTraderById = (traderId: string) => {
    return traders.find(t => t.traderId.toLowerCase() === traderId.toLowerCase());
  };

  const getWoredaName = (woredaId: number) => {
    const w = woredas.find(w => w.id === woredaId);
    return w ? w.name : `Woreda #${woredaId}`;
  };

  const getKebeleName = (kebeleId: number) => {
    const k = kebeles.find(k => k.id === kebeleId);
    return k ? k.name : `Kebele #${kebeleId}`;
  };

  const registerLegalTrader = (details: LegalTraderDetails): string => {
    const traderId = generateNextTraderId(traders);
    const now = new Date().toISOString();
    const newTrader: Trader = {
      id: Date.now(),
      traderId,
      traderType: 'LEGAL',
      status: 'PENDING',
      registeredBy: currentUser.fullName,
      registeredById: currentUser.id,
      createdAt: now,
      updatedAt: now,
      legalDetails: {
        ...details,
        dataEnteredBy: details.dataEnteredBy || currentUser.fullName,
      },
    };

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: now,
      user: currentUser.fullName,
      action: 'REGISTER_TRADER',
      traderId,
      details: `Registered Legal Trader: ${details.tradeName} (Owner: ${details.ownerFullName}, TIN: ${details.tin})`,
    };

    setTraders(prev => [newTrader, ...prev]);
    setAuditLogs(prev => [newLog, ...prev]);
    showAlert('success', `Legal Trader ${traderId} (${details.tradeName}) registered successfully.`);
    return traderId;
  };

  const registerInformalTrader = (details: InformalTraderDetails): string => {
    const traderId = generateNextTraderId(traders);
    const now = new Date().toISOString();
    const newTrader: Trader = {
      id: Date.now(),
      traderId,
      traderType: 'INFORMAL',
      status: 'PENDING',
      registeredBy: currentUser.fullName,
      registeredById: currentUser.id,
      createdAt: now,
      updatedAt: now,
      informalDetails: {
        ...details,
        enumeratorDataCollectorName: details.enumeratorDataCollectorName || currentUser.fullName,
      },
    };

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: now,
      user: currentUser.fullName,
      action: 'REGISTER_TRADER',
      traderId,
      details: `Registered Informal Trader: ${details.fullName} (${details.specificLocationMarketArea})`,
    };

    setTraders(prev => [newTrader, ...prev]);
    setAuditLogs(prev => [newLog, ...prev]);
    showAlert('success', `Informal Trader ${traderId} (${details.fullName}) registered successfully.`);
    return traderId;
  };

  const updateLegalTrader = (traderId: string, details: LegalTraderDetails) => {
    const now = new Date().toISOString();
    setTraders(prev =>
      prev.map(t => {
        if (t.traderId === traderId) {
          return {
            ...t,
            updatedAt: now,
            legalDetails: details,
          };
        }
        return t;
      })
    );

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: now,
      user: currentUser.fullName,
      action: 'UPDATE_TRADER',
      traderId,
      details: `Updated Legal Trader details for ${details.tradeName}`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
    showAlert('success', `Trader record ${traderId} updated successfully.`);
  };

  const updateInformalTrader = (traderId: string, details: InformalTraderDetails) => {
    const now = new Date().toISOString();
    setTraders(prev =>
      prev.map(t => {
        if (t.traderId === traderId) {
          return {
            ...t,
            updatedAt: now,
            informalDetails: details,
          };
        }
        return t;
      })
    );

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: now,
      user: currentUser.fullName,
      action: 'UPDATE_TRADER',
      traderId,
      details: `Updated Informal Trader details for ${details.fullName}`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
    showAlert('success', `Trader record ${traderId} updated successfully.`);
  };

  const verifyTrader = (traderId: string, status: TraderStatus, notes: string) => {
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    setTraders(prev =>
      prev.map(t => {
        if (t.traderId === traderId) {
          const updated = {
            ...t,
            status,
            verificationNotes: notes,
            verifiedBy: currentUser.fullName,
            updatedAt: now,
          };
          if (updated.legalDetails) {
            updated.legalDetails = {
              ...updated.legalDetails,
              verificationDate: today,
            };
          }
          return updated;
        }
        return t;
      })
    );

    const actionText = status === 'APPROVED' ? 'APPROVE_TRADER' : 'RETURN_TRADER';
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: now,
      user: currentUser.fullName,
      action: actionText,
      traderId,
      details: `Status set to ${status}. Notes: ${notes || 'No remarks provided'}`,
    };

    setAuditLogs(prev => [newLog, ...prev]);
    showAlert(
      status === 'APPROVED' ? 'success' : 'warning',
      `Trader ${traderId} has been marked as ${status}.`
    );
  };

  const deleteTrader = (traderId: string) => {
    setTraders(prev => prev.filter(t => t.traderId !== traderId));
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser.fullName,
      action: 'DELETE_TRADER',
      traderId,
      details: `Deleted trader profile ${traderId}`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
    showAlert('danger', `Trader ${traderId} deleted from registry.`);
  };

  const addWoreda = (name: string, code: string) => {
    const newWoreda: Woreda = {
      id: Date.now(),
      name,
      code,
      isActive: true,
    };
    setWoredas(prev => [...prev, newWoreda]);
    showAlert('success', `Woreda "${name}" (${code}) added to registry.`);
  };

  const addKebele = (woredaId: number, name: string, code: string) => {
    const newKebele: Kebele = {
      id: Date.now(),
      woredaId,
      name,
      code,
      isActive: true,
    };
    setKebeles(prev => [...prev, newKebele]);
    showAlert('success', `Kebele "${name}" (${code}) added.`);
  };

  const login = (usernameInput: string, passwordInput: string) => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const user = SEED_USERS.find(
      u => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanUsername
    );

    if (!user) {
      return { success: false, error: 'User account not found in Harari Region registry.' };
    }

    const validPassword = user.password || 'password123';
    if (passwordInput !== validPassword && passwordInput !== 'password123' && passwordInput !== 'admin') {
      return { success: false, error: 'Incorrect password entered.' };
    }

    setCurrentUserState(user);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, 'true');
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user.fullName,
      action: 'USER_LOGIN',
      details: `User logged in with role ${user.role.replace(/_/g, ' ')}`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
    showAlert('success', `Welcome, ${user.fullName} (${user.role.replace(/_/g, ' ')})`);

    return { success: true, user };
  };

  const logout = () => {
    const prevUser = currentUser;
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: prevUser.fullName,
      action: 'USER_LOGOUT',
      details: `User signed out from system session`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
    showAlert('info', 'You have been signed out successfully.');
  };

  const resetToDefaults = () => {
    setTraders(SEED_TRADERS);
    setWoredas(SEED_WOREDAS);
    setKebeles(SEED_KEBELES);
    setAuditLogs(SEED_AUDIT_LOGS);
    setCurrentUserState(SEED_USERS[0]);
    showAlert('info', 'Database reset to default seed records.');
  };

  return (
    <AppContext.Provider
      value={{
        traders,
        woredas,
        kebeles,
        users: SEED_USERS,
        currentUser,
        isAuthenticated,
        auditLogs,
        alert,
        recentSearches: activeRecentSearches,
        recordRecentSearch,
        clearRecentSearches,
        getRecentTraderObjects,
        login,
        logout,
        setCurrentUser,
        showAlert,
        dismissAlert,
        getTraderById,
        getWoredaName,
        getKebeleName,
        registerLegalTrader,
        registerInformalTrader,
        updateLegalTrader,
        updateInformalTrader,
        verifyTrader,
        deleteTrader,
        addWoreda,
        addKebele,
        resetToDefaults,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
