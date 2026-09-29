import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { orgsApi } from '../api/client.js';

const OrgContext = createContext(null);

const STORAGE_KEY = 'nexora_active_org_id';

export const OrgProvider = ({ children }) => {
  const { user, memberships, refreshUser } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setActiveOrg(null);
      setLoadingOrgs(false);
      return;
    }

    try {
      setLoadingOrgs(true);
      const res = await orgsApi.list();
      if (res.success && Array.isArray(res.data)) {
        setOrganizations(res.data);

        // Resolve active organization
        const savedOrgId = localStorage.getItem(STORAGE_KEY);
        let current = null;

        if (savedOrgId) {
          current = res.data.find((o) => o.id === savedOrgId);
        }

        // Fallback to first organization if saved id not found or invalid
        if (!current && res.data.length > 0) {
          current = res.data[0];
        }

        setActiveOrg(current);
        if (current) {
          localStorage.setItem(STORAGE_KEY, current.id);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoadingOrgs(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations, memberships.length]);

  const switchOrg = useCallback((orgId) => {
    const target = organizations.find((o) => o.id === orgId);
    if (target) {
      setActiveOrg(target);
      localStorage.setItem(STORAGE_KEY, target.id);
      setRefetchIndex((prev) => prev + 1); // Triggers re-fetch across app
    }
  }, [organizations]);

  const refreshActiveOrg = useCallback(async () => {
    await refreshUser();
    await fetchOrganizations();
    setRefetchIndex((prev) => prev + 1);
  }, [refreshUser, fetchOrganizations]);

  return (
    <OrgContext.Provider
      value={{
        organizations,
        activeOrg,
        activeRole: activeOrg?.role || 'MEMBER',
        loadingOrgs,
        refetchIndex,
        switchOrg,
        refreshActiveOrg
      }}
    >
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
};
