import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext({ formatCurrency: (v) => `$${Number(v).toFixed(2)}`, currency: 'USD' });

// Country → currency mapping for auto-detection at signup
export const COUNTRY_CURRENCY_MAP = {
  US: 'USD', GB: 'GBP', IN: 'INR', EU: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR',
  JP: 'JPY', CN: 'CNY', AU: 'AUD', CA: 'CAD', BR: 'BRL', MX: 'MXN', ZA: 'ZAR',
  AE: 'AED', SA: 'SAR', KR: 'KRW', SG: 'SGD', TH: 'THB', MY: 'MYR', PH: 'PHP',
  ID: 'IDR', VN: 'VND', EG: 'EGP', NG: 'NGN', KE: 'KES', GH: 'GHS', TZ: 'TZS',
  NZ: 'NZD', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
  HU: 'HUF', RO: 'RON', TR: 'TRY', RU: 'RUB', UA: 'UAH', IL: 'ILS', QA: 'QAR',
  KW: 'KWD', BH: 'BHD', OM: 'OMR', JO: 'JOD', LK: 'LKR', BD: 'BDT', PK: 'PKR',
  NP: 'NPR', MM: 'MMK', KH: 'KHR', LA: 'LAK', CO: 'COP', PE: 'PEN', CL: 'CLP',
  AR: 'ARS', UY: 'UYU', EC: 'USD', PA: 'PAB', CR: 'CRC', GT: 'GTQ', HN: 'HNL',
  JM: 'JMD', TT: 'TTD', DO: 'DOP', PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR',
  IE: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR', EE: 'EUR',
  LV: 'EUR', LT: 'EUR', SK: 'EUR', SI: 'EUR', HR: 'EUR',
};

// Common countries list for signup dropdown
export const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' }, { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' }, { code: 'IT', name: 'Italy' }, { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' }, { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' }, { code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' }, { code: 'FI', name: 'Finland' }, { code: 'IE', name: 'Ireland' },
  { code: 'GR', name: 'Greece' }, { code: 'PL', name: 'Poland' }, { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' }, { code: 'RO', name: 'Romania' }, { code: 'HR', name: 'Croatia' },
  { code: 'TR', name: 'Turkey' }, { code: 'RU', name: 'Russia' }, { code: 'UA', name: 'Ukraine' },
  { code: 'JP', name: 'Japan' }, { code: 'CN', name: 'China' }, { code: 'KR', name: 'South Korea' },
  { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'CA', name: 'Canada' }, { code: 'MX', name: 'Mexico' }, { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' }, { code: 'CO', name: 'Colombia' }, { code: 'PE', name: 'Peru' },
  { code: 'CL', name: 'Chile' }, { code: 'AE', name: 'UAE' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'QA', name: 'Qatar' }, { code: 'KW', name: 'Kuwait' }, { code: 'IL', name: 'Israel' },
  { code: 'EG', name: 'Egypt' }, { code: 'ZA', name: 'South Africa' }, { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' }, { code: 'GH', name: 'Ghana' }, { code: 'TZ', name: 'Tanzania' },
  { code: 'SG', name: 'Singapore' }, { code: 'TH', name: 'Thailand' }, { code: 'MY', name: 'Malaysia' },
  { code: 'PH', name: 'Philippines' }, { code: 'ID', name: 'Indonesia' }, { code: 'VN', name: 'Vietnam' },
  { code: 'BD', name: 'Bangladesh' }, { code: 'PK', name: 'Pakistan' }, { code: 'LK', name: 'Sri Lanka' },
  { code: 'NP', name: 'Nepal' }, { code: 'JM', name: 'Jamaica' }, { code: 'TT', name: 'Trinidad & Tobago' },
  { code: 'DO', name: 'Dominican Republic' }, { code: 'CR', name: 'Costa Rica' },
].sort((a, b) => a.name.localeCompare(b.name));

export function CurrencyProvider({ children }) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [country, setCountry] = useState(user?.country || null);

  useEffect(() => {
    if (user?.currency) {
      setCurrency(user.currency);
      setCountry(user.country || null);
    } else if (user?.propertyId) {
      api.get('/properties/current').then(({ data }) => {
        setCurrency(data.currency || 'USD');
        setCountry(data.country || null);
      }).catch(() => {});
    }
  }, [user]);

  const formatCurrency = useCallback((value) => {
    const num = Number(value) || 0;
    try {
      return num.toLocaleString(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      return `${currency} ${num.toFixed(2)}`;
    }
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, country, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
