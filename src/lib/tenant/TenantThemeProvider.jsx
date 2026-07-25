'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '@/utils/axios';

export const DEFAULT_TENANT_THEME = {
  tenant: { id: null, name: 'So7baFit', slug: 'so7bafit', status: 'active' },
  branding: {
    appName: 'So7baFit',
    shortName: 'So7ba',
    tagline: 'Train smarter. Live stronger.',
    companyName: 'So7baFit',
    supportEmail: null,
    logoLightUrl: '/logo/logo1.png',
    logoDarkUrl: '/logo/logo1.png',
    iconUrl: '/logo/logo1.png',
    splashLogoUrl: '/logo/logo1.png',
    loginBackgroundUrl: null,
    colors: {
      primary: '#2563eb',
      primaryForeground: '#ffffff',
      secondary: '#0284c7',
      secondaryForeground: '#ffffff',
      accent: '#0ea5e9',
      accentForeground: '#ffffff',
      background: '#f8fafc',
      surface: '#ffffff',
      card: '#ffffff',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      mutedText: '#94a3b8',
      border: '#e2e8f0',
      divider: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#3b82f6',
      darkPrimary: '#3b82f6',
      darkBackground: '#0b1120',
      darkSurface: '#111827',
      darkCard: '#1f2937',
      darkTextPrimary: '#f8fafc',
      darkTextSecondary: '#94a3b8',
      darkBorder: '#334155',
    },
    radius: { border: 10, button: 12, card: 16 },
    typography: { fontFamily: 'Inter', arabicFontFamily: 'Cairo' },
    themeMode: 'system',
    paletteKey: 'blue',
    brandingVersion: 1,
  },
};

const STORAGE_KEY = 'so7bafit_tenant_branding_v1';

const TenantThemeContext = createContext({
  ...DEFAULT_TENANT_THEME,
  loading: false,
  discoveryToken: null,
  setTenantBranding: () => {},
  clearTenant: () => {},
  refreshBranding: async () => {},
  applyCssVars: () => {},
});

function applyCssVarsFromBranding(branding) {
  if (typeof document === 'undefined' || !branding?.colors) return;
  const root = document.documentElement;
  const c = branding.colors;
  const map = {
    '--tenant-primary': c.primary,
    '--tenant-primary-fg': c.primaryForeground,
    '--tenant-secondary': c.secondary,
    '--tenant-secondary-fg': c.secondaryForeground,
    '--tenant-accent': c.accent,
    '--tenant-bg': c.background,
    '--tenant-surface': c.surface,
    '--tenant-card': c.card,
    '--tenant-text': c.textPrimary,
    '--tenant-text-secondary': c.textSecondary,
    '--tenant-muted': c.mutedText,
    '--tenant-border': c.border,
    '--tenant-success': c.success,
    '--tenant-warning': c.warning,
    '--tenant-danger': c.danger,
    '--tenant-info': c.info,
    '--tenant-radius': `${branding.radius?.border ?? 10}px`,
    '--tenant-radius-button': `${branding.radius?.button ?? 12}px`,
    '--tenant-radius-card': `${branding.radius?.card ?? 16}px`,
    // Bridge into existing ThemeProvider CSS vars (500/600 scale approximation)
    '--color-primary-500': c.primary,
    '--color-primary-600': c.primary,
    '--color-primary-700': c.primary,
    '--color-secondary-500': c.secondary,
    '--color-secondary-600': c.secondary,
    '--color-gradient-from': c.primary,
    '--color-gradient-via': c.primary,
    '--color-gradient-to': c.secondary,
  };
  Object.entries(map).forEach(([k, v]) => {
    if (v) root.style.setProperty(k, v);
  });
  if (branding.appName) {
    document.title = branding.appName;
  }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, cachedAt: Date.now() }));
  } catch {}
}

export function TenantThemeProvider({ children }) {
  const cached = typeof window !== 'undefined' ? loadCache() : null;
  const [tenant, setTenant] = useState(cached?.tenant || DEFAULT_TENANT_THEME.tenant);
  const [branding, setBranding] = useState(cached?.branding || DEFAULT_TENANT_THEME.branding);
  const [discoveryToken, setDiscoveryToken] = useState(cached?.discoveryToken || null);
  const [loading, setLoading] = useState(false);

  const applyBundle = useCallback((bundle, token = null) => {
    if (!bundle) return;
    const nextTenant = bundle.tenant || DEFAULT_TENANT_THEME.tenant;
    const nextBranding = bundle.branding || DEFAULT_TENANT_THEME.branding;
    setTenant(nextTenant);
    setBranding(nextBranding);
    if (token !== undefined) setDiscoveryToken(token);
    applyCssVarsFromBranding(nextBranding);
    saveCache({
      tenant: nextTenant,
      branding: nextBranding,
      discoveryToken: token === undefined ? discoveryToken : token,
      brandingVersion: nextBranding.brandingVersion,
    });
  }, [discoveryToken]);

  const clearTenant = useCallback(() => {
    setTenant(DEFAULT_TENANT_THEME.tenant);
    setBranding(DEFAULT_TENANT_THEME.branding);
    setDiscoveryToken(null);
    applyCssVarsFromBranding(DEFAULT_TENANT_THEME.branding);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const refreshBranding = useCallback(async () => {
    setLoading(true);
    try {
      if (tenant?.slug && tenant.slug !== 'so7bafit') {
        const { data } = await api.get(`/public/tenants/${tenant.slug}/branding`);
        applyBundle(data, discoveryToken);
        return data;
      }
      // authenticated path
      try {
        const { data } = await api.get('/tenant/branding');
        applyBundle(data, discoveryToken);
        return data;
      } catch {
        applyCssVarsFromBranding(branding);
        return null;
      }
    } catch {
      applyCssVarsFromBranding(branding || DEFAULT_TENANT_THEME.branding);
      return null;
    } finally {
      setLoading(false);
    }
  }, [applyBundle, branding, discoveryToken, tenant?.slug]);

  useEffect(() => {
    applyCssVarsFromBranding(branding);
    // Stale-while-revalidate
    if (tenant?.slug) {
      api
        .get(`/public/tenants/${tenant.slug}/branding`)
        .then(({ data }) => {
          if (data?.branding?.brandingVersion !== branding?.brandingVersion) {
            applyBundle(data, discoveryToken);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      tenant,
      branding,
      colors: branding?.colors || DEFAULT_TENANT_THEME.branding.colors,
      assets: {
        logo: branding?.logoLightUrl || DEFAULT_TENANT_THEME.branding.logoLightUrl,
        logoDark: branding?.logoDarkUrl || branding?.logoLightUrl,
        icon: branding?.iconUrl,
        splash: branding?.splashLogoUrl,
        loginBackground: branding?.loginBackgroundUrl,
      },
      appName: branding?.appName || 'So7baFit',
      discoveryToken,
      loading,
      setTenantBranding: applyBundle,
      clearTenant,
      refreshBranding,
      applyCssVars: () => applyCssVarsFromBranding(branding),
    }),
    [tenant, branding, discoveryToken, loading, applyBundle, clearTenant, refreshBranding],
  );

  return <TenantThemeContext.Provider value={value}>{children}</TenantThemeContext.Provider>;
}

export function useTenantTheme() {
  return useContext(TenantThemeContext);
}

export async function discoverTenantByEmail(email) {
  const { data } = await api.post('/auth/discover-tenant', { email });
  return data;
}

export async function discoverTenantByLicense(licenseKey) {
  const { data } = await api.post('/auth/discover-tenant-by-license', { licenseKey });
  return data;
}
