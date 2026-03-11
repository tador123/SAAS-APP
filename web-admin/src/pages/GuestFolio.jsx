import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Printer, Search, DollarSign, BedDouble, UtensilsCrossed } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useCurrency } from '../context/CurrencyContext';

export default function GuestFolio() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [guests, setGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [folio, setFolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/guests', { params: { limit: 100 } }).then(({ data }) => {
      setGuests(data.data || data.guests || []);
    }).catch(() => {});
  }, []);

  const loadFolio = useCallback(async (guestId) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/folio/${guestId}`);
      setFolio(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load folio');
      setFolio(null);
    } finally { setLoading(false); }
  }, []);

  const selectGuest = (guest) => {
    setSelectedGuest(guest);
    loadFolio(guest.id);
  };

  const printFolio = () => window.print();

  const filteredGuests = guests.filter(g => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('folio.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('folio.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Guest list */}
        <div className="lg:col-span-1 card p-0">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('common.search')}
                className="input-field pl-9 text-sm"
              />
            </div>
          </div>
          <div className="max-h-[65vh] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {filteredGuests.map(g => (
              <button key={g.id} onClick={() => selectGuest(g)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedGuest?.id === g.id ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-primary-600' : ''}`}>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{g.firstName} {g.lastName}</p>
                <p className="text-xs text-gray-500">{g.email}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Folio detail */}
        <div className="lg:col-span-3">
          {!selectedGuest ? (
            <div className="card text-center py-16 text-gray-400">
              <FileText size={48} className="mx-auto mb-4" />
              <p>{t('folio.selectGuest')}</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : folio ? (
            <div className="space-y-4 print:space-y-2" id="folio-print">
              {/* Header */}
              <div className="card flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {folio.guest.firstName} {folio.guest.lastName}
                  </h2>
                  <p className="text-sm text-gray-500">{folio.folioNumber}</p>
                </div>
                <button onClick={printFolio} className="btn-secondary flex items-center gap-2 print:hidden">
                  <Printer size={16} /> {t('folio.printFolio')}
                </button>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: t('folio.roomCharges'), value: folio.summary.roomCharges, icon: BedDouble, color: 'text-blue-600' },
                  { label: t('folio.restaurantCharges'), value: folio.summary.restaurantCharges, icon: UtensilsCrossed, color: 'text-orange-600' },
                  { label: t('folio.totalPaid'), value: folio.summary.totalPaid, icon: DollarSign, color: 'text-green-600' },
                  { label: t('folio.balance'), value: folio.summary.balance, icon: DollarSign, color: folio.summary.balance > 0 ? 'text-red-600' : 'text-green-600' },
                ].map(card => (
                  <div key={card.label} className="card text-center">
                    <card.icon size={20} className={`mx-auto ${card.color}`} />
                    <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                    <p className={`text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
                  </div>
                ))}
              </div>

              {/* Room charges */}
              {folio.reservations.length > 0 && (
                <div className="card p-0">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold flex items-center gap-2"><BedDouble size={16} /> {t('folio.roomCharges')}</h3>
                  </div>
                  <table className="w-full">
                    <thead><tr>
                      <th className="table-header">{t('rooms.roomNumber')}</th>
                      <th className="table-header">{t('reservations.checkIn')}</th>
                      <th className="table-header">{t('reservations.checkOut')}</th>
                      <th className="table-header">Nights</th>
                      <th className="table-header text-right">{t('common.total')}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {folio.reservations.map(r => (
                        <tr key={r.id}>
                          <td className="table-cell font-medium">{r.room}</td>
                          <td className="table-cell text-sm">{r.checkIn}</td>
                          <td className="table-cell text-sm">{r.checkOut}</td>
                          <td className="table-cell">{r.nights}</td>
                          <td className="table-cell text-right font-medium">{formatCurrency(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Restaurant charges */}
              {folio.orders.length > 0 && (
                <div className="card p-0">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold flex items-center gap-2"><UtensilsCrossed size={16} /> {t('folio.restaurantCharges')}</h3>
                  </div>
                  <table className="w-full">
                    <thead><tr>
                      <th className="table-header">{t('orders.orderNumber')}</th>
                      <th className="table-header">{t('common.date')}</th>
                      <th className="table-header">{t('orders.items')}</th>
                      <th className="table-header text-right">{t('common.total')}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {folio.orders.map(o => (
                        <tr key={o.id}>
                          <td className="table-cell font-medium">{o.orderNumber}</td>
                          <td className="table-cell text-sm">{new Date(o.date).toLocaleDateString()}</td>
                          <td className="table-cell text-sm">{(o.items || []).length} items</td>
                          <td className="table-cell text-right font-medium">{formatCurrency(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Balance summary */}
              <div className="card bg-gray-50 dark:bg-gray-800/50">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>{t('folio.totalCharges')}</span>
                  <span>{formatCurrency(folio.summary.totalCharges)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500 mt-1">
                  <span>{t('folio.totalPaid')}</span>
                  <span className="text-green-600">-{formatCurrency(folio.summary.totalPaid)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span>{t('folio.balance')}</span>
                  <span className={folio.summary.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(folio.summary.balance)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
