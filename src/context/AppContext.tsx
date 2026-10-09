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
  login: (username: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
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
  RECENT_SEARCHES: 'hr_tmis_recent_searches_v1',
};

const DEFAULT_USER_RECENT_SEARCHES: Record<number, string[]> = {};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [currentUser, setCurrentUserState] = useState<User>({
    id: 0, username: '', fullName: '', email: '', role: 'DATA_ENCODER', department: '',
  });

  // Authoritative records come from the authenticated Django API; never trust browser seed data.
  const [traders, setTraders] = useState<Trader[]>([]);
  const [woredas, setWoredas] = useState<Woreda[]>([]);
  const [kebeles, setKebeles] = useState<Kebele[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [users] = useState<User[]>([]);

  const [userRecentSearches, setUserRecentSearches] = useState<Record<number, string[]>>(() => {
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.RECENT_SEARCHES);
      return saved ? JSON.parse(saved) : DEFAULT_USER_RECENT_SEARCHES;
    } catch {
      return DEFAULT_USER_RECENT_SEARCHES;
    }
  });

  const [alert, setAlert] = useState<AppAlert | null>(null);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(userRecentSearches));
  }, [userRecentSearches]);

  // Restore an existing server session, then load data only after authentication succeeds.
  const refreshAuthoritativeData = useCallback(async () => {
    try {
      const authenticatedUser = await authService.getMe();
      setCurrentUserState(authenticatedUser);
      setIsAuthenticated(true);

      const [woredasData, kebelesData, tradersData, auditData] = await Promise.allSettled([
        locationService.getWoredas(),
        locationService.getKebeles(),
        traderService.getTraders(),
        auditService.getAuditLogs(),
      ]);
      setWoredas(woredasData.status === 'fulfilled' ? woredasData.value : []);
      setKebeles(kebelesData.status === 'fulfilled' ? kebelesData.value : []);
      setTraders(tradersData.status === 'fulfilled' ? tradersData.value : []);
      setAuditLogs(auditData.status === 'fulfilled' ? auditData.value : []);
    } catch {
      setIsAuthenticated(false);
      setTraders([]);
      setWoredas([]);
      setKebeles([]);
      setAuditLogs([]);
    }
  }, []);

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
        setTraders(prev => [serverTrader, ...prev.filter(t => t.traderId !== anticipatedTraderId && t.traderId !== serverTrader.traderId)]);
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
    traderService.deleteTrader(traderId)
      .then(archivedTrader => {
        setTraders(prev => prev.map(t => t.traderId === traderId ? archivedTrader : t));
        showAlert('success', `Trader ${traderId} archived; its audit history is retained.`);
      })
      .catch((err: ApiError) => {
        showAlert('danger', err.message || `Failed to archive trader ${traderId}`);
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

  const login = async (usernameInput: string, passwordInput: string) => {
    try {
      const response = await authService.login(usernameInput.trim(), passwordInput);
      const user = response.user;
      setCurrentUserState(user);
      setIsAuthenticated(true);
      setUserRecentSearches(prev => ({ ...prev, [user.id]: prev[user.id] || [] }));
      await refreshAuthoritativeData();
      showAlert('success', `Welcome, ${user.fullName} (${user.role.replace(/_/g, ' ')})`);
      return { success: true, user };
    } catch (error: any) {
      setIsAuthenticated(false);
      return { success: false, error: error?.message || 'Invalid credentials.' };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Clear local UI state even if the session has already expired.
    }
    setIsAuthenticated(false);
    setCurrentUserState({ id: 0, username: '', fullName: '', email: '', role: 'DATA_ENCODER', department: '' });
    setTraders([]);
    setWoredas([]);
    setKebeles([]);
    setAuditLogs([]);
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
        users,
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
