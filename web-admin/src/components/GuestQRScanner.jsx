import { useState, useRef, useEffect } from 'react';
import { QrCode, Search, X, UserCheck } from 'lucide-react';
import api from '../api/axios';
import Modal from './Modal';
import toast from 'react-hot-toast';

/**
 * GuestQRScanner — A button + modal component that lets staff look up a guest
 * by scanning/entering a QR token. Works with USB/Bluetooth barcode scanners
 * (which act as keyboard input) or manual paste.
 *
 * @param {Function} onGuestFound - Callback with the full guest object when found
 */
export default function GuestQRScanner({ onGuestFound }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [guest, setGuest] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setToken('');
      setGuest(null);
      setError('');
    }
  }, [open]);

  const lookupGuest = async (qrToken) => {
    const cleanToken = qrToken.trim();
    if (!cleanToken) return;

    setLoading(true);
    setError('');
    setGuest(null);
    try {
      const res = await api.get(`/guest-register/scan/${cleanToken}`);
      setGuest(res.data.guest);
    } catch (err) {
      const msg = err.response?.status === 404
        ? 'No guest found with this QR code'
        : err.response?.data?.error || 'Lookup failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      lookupGuest(token);
    }
  };

  const handleUseGuest = () => {
    if (guest && onGuestFound) {
      onGuestFound(guest);
      toast.success(`Guest loaded: ${guest.firstName} ${guest.lastName}`);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary flex items-center gap-2 text-sm"
        title="Scan guest QR code for quick check-in"
      >
        <QrCode size={16} /> Scan Guest QR
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Scan Guest QR Code" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Scan the guest&apos;s QR code with a barcode scanner, or paste the QR token below.
          </p>

          {/* Token input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input-field pl-9 font-mono text-sm"
                placeholder="Scan or paste QR token here..."
                autoFocus
              />
            </div>
            <button
              onClick={() => lookupGuest(token)}
              disabled={!token.trim() || loading}
              className="btn-primary flex items-center gap-1"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Search size={16} />
              )}
              Lookup
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <X size={16} />
              {error}
            </div>
          )}

          {/* Guest result card */}
          {guest && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <UserCheck size={18} />
                Guest Found
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="font-medium text-gray-900">{guest.firstName} {guest.lastName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium text-gray-900">{guest.phone}</p>
                </div>
                {guest.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium text-gray-900">{guest.email}</p>
                  </div>
                )}
                {guest.idType && (
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <p className="font-medium text-gray-900">
                      {guest.idType.replace(/_/g, ' ')} — {guest.idNumber}
                    </p>
                  </div>
                )}
                {guest.nationality && (
                  <div>
                    <span className="text-gray-500">Nationality:</span>
                    <p className="font-medium text-gray-900">{guest.nationality}</p>
                  </div>
                )}
                {guest.dateOfBirth && (
                  <div>
                    <span className="text-gray-500">Date of Birth:</span>
                    <p className="font-medium text-gray-900">{guest.dateOfBirth}</p>
                  </div>
                )}
                {guest.address && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Address:</span>
                    <p className="font-medium text-gray-900">{guest.address}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleUseGuest}
                className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
              >
                <UserCheck size={16} />
                Use This Guest for Reservation
              </button>
            </div>
          )}

          {/* Help text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium mb-1">How it works:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
              <li>Guest registers via the mobile app and receives a QR code</li>
              <li>At check-in, scan the QR code with a barcode scanner</li>
              <li>Guest details are loaded instantly — select to use for reservation</li>
            </ol>
          </div>
        </div>
      </Modal>
    </>
  );
}
