import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const BrandingContext = createContext(null);

const DEFAULT_BRANDING = {
  brandName: 'HotelSaaS',
  tagline: 'Hospitality Platform',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#2563eb',
  accentColor: '#d4a843',
  sidebarColor: '#1a1f2e',
};

/**
 * Provides white-label branding to the entire app.
 * Fetches branding from /api/properties/branding on auth.
 * Applies CSS custom properties for dynamic theming.
 */
export function BrandingProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(false);

  // Fetch branding when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setBranding(DEFAULT_BRANDING);
      return;
    }

    const fetchBranding = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/properties/branding');
        setBranding({
          brandName: data.brandName || DEFAULT_BRANDING.brandName,
          tagline: data.tagline || DEFAULT_BRANDING.tagline,
          logoUrl: data.logoUrl || '',
          faviconUrl: data.faviconUrl || '',
          primaryColor: data.primaryColor || DEFAULT_BRANDING.primaryColor,
          accentColor: data.accentColor || DEFAULT_BRANDING.accentColor,
          sidebarColor: data.sidebarColor || DEFAULT_BRANDING.sidebarColor,
        });
      } catch (err) {
        console.error('Failed to fetch branding:', err);
        // Keep defaults on error
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, [isAuthenticated]);

  // Apply CSS custom properties + page title whenever branding changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', branding.primaryColor);
    root.style.setProperty('--brand-accent', branding.accentColor);
    root.style.setProperty('--brand-sidebar', branding.sidebarColor);

    // Update page title
    document.title = `${branding.brandName} - Hotel & Restaurant Management`;

    // Update favicon if set
    if (branding.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }, [branding]);

  const updateBranding = useCallback(async (updates) => {
    const { data } = await api.put('/properties/branding', updates);
    const updated = {
      brandName: data.brandName || DEFAULT_BRANDING.brandName,
      tagline: data.tagline || DEFAULT_BRANDING.tagline,
      logoUrl: data.logoUrl || '',
      faviconUrl: data.faviconUrl || '',
      primaryColor: data.primaryColor || DEFAULT_BRANDING.primaryColor,
      accentColor: data.accentColor || DEFAULT_BRANDING.accentColor,
      sidebarColor: data.sidebarColor || DEFAULT_BRANDING.sidebarColor,
    };
    setBranding(updated);
    return updated;
  }, []);

  const resetBranding = useCallback(async () => {
    return updateBranding({
      brandName: DEFAULT_BRANDING.brandName,
      tagline: DEFAULT_BRANDING.tagline,
      logoUrl: '',
      faviconUrl: '',
      primaryColor: DEFAULT_BRANDING.primaryColor,
      accentColor: DEFAULT_BRANDING.accentColor,
      sidebarColor: DEFAULT_BRANDING.sidebarColor,
    });
  }, [updateBranding]);

  return (
    <BrandingContext.Provider value={{ branding, updateBranding, resetBranding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used within BrandingProvider');
  return context;
}

export { DEFAULT_BRANDING };
