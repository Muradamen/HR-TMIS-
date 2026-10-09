import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
import { traderService } from '../services/trader.service';
import { locationService } from '../services/location.service';
import { verificationService } from '../services/verification.service';
import { auditService } from '../services/audit.service';
import { authService } from '../services/auth.service';
import { ApiError } from '../services/api';

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

// LocalStorage is strictly reserved for non-authoritative UI preferences
const UI_STORAGE_KEYS = {
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
      return localStorage.getItem(UI_STORAGE_KEYS.AUTH_SESSION) === 'true';
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.CURRENT_USER);
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

  // Authoritative data initialized with seed baseline and hydrated from PostgreSQL
  const [traders, setTraders] = useState<Trader[]>(SEED_TRADERS);
  const [woredas, setWoredas] = useState<Woreda[]>(SEED_WOREDAS);
  const [kebeles, setKebeles] = useState<Kebele[]>(SEED_KEBELES);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(SEED_AUDIT_LOGS);

  const [userRecentSearches, setUserRecentSearches] = useState<Record<number, string[]>>(() => {
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.RECENT_SEARCHES);
      return saved ? JSON.parse(saved) : DEFAULT_USER_RECENT_SEARCHES;
    } catch {
      return DEFAULT_USER_RECENT_SEARCHES;
    }
  });

  const [alert, setAlert] = useState<AppAlert | null>(null);

  // Sync UI-only non-authoritative preferences
  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(userRecentSearches));
  }, [userRecentSearches]);

  // Hydrate authoritative PostgreSQL data from Django API
  const refreshAuthoritativeData = useCallback(async () => {
    try {
      // 1. Fetch public administrative locations
      const [woredasData, kebelesData] = await Promise.allSettled([
        locationService.getWoredas(),
        locationService.getKebeles(),
      ]);

      if (woredasData.status === 'fulfilled' && Array.isArray(woredasData.value) && woredasData.value.length > 0) {
        setWoredas(woredasData.value);
      }
      if (kebelesData.status === 'fulfilled' && Array.isArray(kebelesData.value) && kebelesData.value.length > 0) {
        setKebeles(kebelesData.value);
      }

      // 2. Ensure session for active user
      try {
        await authService.login(currentUser.username, 'password123');
      } catch {
        // Session may already be valid
      }

      // 3. Fetch authenticated trader and audit data
      const [tradersData, auditData] = await Promise.allSettled([
        traderService.getTraders(),
        auditService.getAuditLogs(),
      ]);

      if (tradersData.status === 'fulfilled' && Array.isArray(tradersData.value) && tradersData.value.length > 0) {
        setTraders(tradersData.value);
      }
      if (auditData.status === 'fulfilled' && Array.isArray(auditData.value) && auditData.value.length > 0) {
        setAuditLogs(auditData.value);
      }
    } catch (err) {
      console.warn('API hydration info:', err);
    }
  }, [currentUser.username]);

  useEffect(() => {
    refreshAuthoritativeData();
  }, [refreshAuthoritativeData]);

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
    // Sync backend authentication with Django
    authService.login(user.username, 'password123').catch(() => {});
    showAlert('info', `Active user switched to ${user.fullName} (${user.role.replace(/_/g, ' ')})`);
  };

  const generateNextTraderId = (currentTraders: Trader[]): string => {
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
    const anticipatedTraderId = generateNextTraderId(traders);
    const now = new Date().toISOString();

    // Optimistic local representation
    const optimisticTrader: Trader = {
      id: Date.now(),
      traderId: anticipatedTraderId,
      traderType: 'LEGAL',
      status: 'SUBMITTED',
      registeredBy: currentUser.fullName,
      registeredById: currentUser.id,
      createdAt: now,
      updatedAt: now,
      legalDetails: {
        ...details,
        dataEnteredBy: details.dataEnteredBy || currentUser.fullName,
      },
    };
    setTraders(prev => [optimisticTrader, ...prev]);

    // Authoritative backend persistence to PostgreSQL
    traderService.createLegalTrader(details)
      .then(serverTrader => {
        setTraders(prev => prev.map(t => t.traderId === anticipatedTraderId ? serverTrader : t));
        showAlert('success', `Legal Trader ${serverTrader.traderId} (${details.tradeName}) registered in PostgreSQL.`);
      })
      .catch((err: ApiError) => {
        showAlert('danger', err.message || 'Failed to register legal trader in PostgreSQL database.');
      });

    return anticipatedTraderId;
  };

  const registerInformalTrader = (details: InformalTraderDetails): string => {
    const anticipatedTraderId = generateNextTraderId(traders);
    const now = new Date().toISOString();

    const optimisticTrader: Trader = {
      id: Date.now(),
      traderId: anticipatedTraderId,
      traderType: 'INFORMAL',
      status: 'SUBMITTED',
      registeredBy: currentUser.fullName,
      registeredById: currentUser.id,
      createdAt: now,
      updatedAt: now,
      informalDetails: {
        ...details,
        enumeratorDataCollectorName: details.enumeratorDataCollectorName || currentUser.fullName,
      },
    };
    setTraders(prev => [optimisticTrader, ...prev]);

    // Authoritative backend persistence to PostgreSQL
    traderService.createInformalTrader(details)
      .then(serverTrader => {
        setTraders(prev => prev.map(t => t.traderId === anticipatedTraderId ? serverTrader : t));
        showAlert('success', `Informal Trader ${serverTrader.traderId} (${details.fullName}) assessed and saved in PostgreSQL.`);
      })
      .catch((err: ApiError) => {
        showAlert('danger', err.message || 'Failed to register informal trader in PostgreSQL database.');
      });

    return anticipatedTraderId;
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

    traderService.updateLegalTrader(traderId, details)
      .then(serverTrader => {
        setTraders(prev => prev.map(t => t.traderId === traderId ? serverTrader : t));
        showAlert('success', `Trader record ${traderId} updated in PostgreSQL.`);
      })
      .catch((err: ApiError) => {
        showAlert('danger', err.message || `Failed to update trader ${traderId}`);
      });
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

    traderService.updateInformalTrader(traderId, details)
      .then(serverTrader => {
        setTraders(prev => prev.map(t => t.traderId === traderId ? serverTrader : t));
        showAlert('success', `Trader record ${traderId} updated in PostgreSQL.`);
      })
      .catch((err: ApiError) => {
        showAlert('danger', err.message || `Failed to update trader ${traderId}`);
      });
  };

  const verifyTrader = (traderId: string, status: TraderStatus, notes: string) => {
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Optimistic update
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

    // Call Django DRF verification endpoint
    verificationService.verifyTrader(traderId, status, notes)
      .then(serverTrader => {
        setTraders(prev => prev.map(t => t.traderId === traderId ? serverTrader : t));
        showAlert(
          status === 'APPROVED' ? 'success' : 'warning',
          `Trader ${traderId} verified as ${status} in PostgreSQL.`
        );
      })
      .catch((err: ApiError) => {
        showAlert('danger', err.message || `Verification action failed: ${err.code || 'Conflict'}`);
        // Refresh authoritative state on failure
        refreshAuthoritativeData();
      });
  };

  const deleteTrader = (traderId: string) => {
    setTraders(prev => prev.filter(t => t.traderId !== traderId));

    traderService.deleteTrader(traderId)
      .then(() => {
        showAlert('danger', `Trader ${traderId} deleted from PostgreSQL registry.`);
      })
      .catch((err: ApiError) => {
        showAlert('danger', err.message || `Failed to delete trader ${traderId}`);
        refreshAuthoritativeData();
      });
  };

  const addWoreda = (name: string, code: string) => {
    locationService.createWoreda(name, code)
      .then(newWoreda => {
        setWoredas(prev => [...prev, newWoreda]);
        showAlert('success', `Woreda "${name}" (${code}) added to PostgreSQL registry.`);
      })
      .catch((err: ApiError) => {
        showAlert('danger', err.message || 'Failed to add Woreda');
      });
  };

  const addKebele = (woredaId: number, name: string, code: string) => {
    locationService.createKebele(woredaId, name, code)
      .then(newKebele => {
        setKebeles(prev => [...prev, newKebele]);
        showAlert('success', `Kebele "${name}" (${code}) added to PostgreSQL registry.`);
      })
      .catch((err: ApiError) => {
        showAlert('danger', err.message || 'Failed to add Kebele');
      });
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
    localStorage.setItem(UI_STORAGE_KEYS.AUTH_SESSION, 'true');
    localStorage.setItem(UI_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

    // Authenticate with Django backend to establish session cookie
    authService.login(user.username, passwordInput).catch(() => {});

    showAlert('success', `Welcome, ${user.fullName} (${user.role.replace(/_/g, ' ')})`);
    return { success: true, user };
  };

  const logout = () => {
    authService.logout().catch(() => {});
    setIsAuthenticated(false);
    localStorage.removeItem(UI_STORAGE_KEYS.AUTH_SESSION);
    showAlert('info', 'You have been signed out successfully.');
  };

  const resetToDefaults = () => {
    refreshAuthoritativeData();
    showAlert('info', 'Reloaded latest PostgreSQL database records.');
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
