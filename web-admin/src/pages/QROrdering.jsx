import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, Copy, RefreshCw, ExternalLink } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function QROrdering() {
  const { t } = useTranslation();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);

  const loadTables = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/qr/tables');
      setTables(data);
    } catch { toast.error('Failed to load tables'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTables(); }, []);

  const generateQR = async (tableId) => {
    setGenerating(tableId);
    try {
      const { data } = await api.post(`/qr/generate/${tableId}`);
      setTables(prev => prev.map(tbl => tbl.id === tableId ? { ...tbl, qrToken: data.qrToken } : tbl));
      toast.success(t('qr.generated'));
    } catch { toast.error('Failed to generate QR'); }
    finally { setGenerating(null); }
  };

  const getMenuUrl = (token) => {
    const base = api.defaults.baseURL?.replace('/api', '') || window.location.origin;
    return `${base}/qr-menu/${token}`;
  };

  const copyUrl = (token) => {
    navigator.clipboard.writeText(getMenuUrl(token));
    toast.success(t('qr.linkCopied'));
  };

  const qrImageUrl = (token) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getMenuUrl(token))}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('qr.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('qr.subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => (
            <div key={table.id} className="card text-center space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {t('tables.table')} {table.tableNumber}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  table.qrToken ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {table.qrToken ? t('qr.active') : t('qr.noQR')}
                </span>
              </div>

              {table.qrToken ? (
                <>
                  <img src={qrImageUrl(table.qrToken)} alt="QR Code"
                    className="mx-auto rounded-lg border border-gray-100" width={160} height={160} />
                  <div className="flex gap-2">
                    <button onClick={() => copyUrl(table.qrToken)}
                      className="btn-secondary flex-1 flex items-center justify-center gap-1 text-xs">
                      <Copy size={14} /> {t('qr.copyLink')}
                    </button>
                    <a href={getMenuUrl(table.qrToken)} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary flex items-center justify-center gap-1 text-xs px-3">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <button onClick={() => generateQR(table.id)} disabled={generating === table.id}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 mx-auto">
                    <RefreshCw size={12} className={generating === table.id ? 'animate-spin' : ''} />
                    {t('qr.regenerate')}
                  </button>
                </>
              ) : (
                <>
                  <div className="py-6 text-gray-300">
                    <QrCode size={64} className="mx-auto" />
                  </div>
                  <button onClick={() => generateQR(table.id)} disabled={generating === table.id}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    {generating === table.id ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : <QrCode size={16} />}
                    {t('qr.generateQR')}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
