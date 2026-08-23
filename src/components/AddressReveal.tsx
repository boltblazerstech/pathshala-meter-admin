import { useState, useEffect, useId } from 'react';
import { useAddressRevealContext } from '../contexts/AddressRevealContext';
import { reverseGeocode } from '../api/geocode';

export function AddressReveal({ lat, lng }: { lat: number, lng: number }) {
  const id = useId();
  const context = useAddressRevealContext();
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReveal = async () => {
    if (address || loading) return;
    setLoading(true);
    setError(false);
    context?.registerLoading(id, true);
    
    try {
      const result = await reverseGeocode(lat, lng);
      setAddress(result.address);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
      context?.registerLoading(id, false);
    }
  };

  useEffect(() => {
    if (context?.revealAllTick) {
      if (!address && !error) {
        handleReveal();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.revealAllTick]);

  if (address) {
    return <span className="text-gray-600 block text-xs mt-1 font-sans">{address}</span>;
  }

  return (
    <div className="inline-flex items-center gap-2 mt-1">
      <button 
        onClick={handleReveal}
        disabled={loading}
        className="text-gray-400 hover:text-indigo-600 focus:outline-none transition-colors"
        title="Reveal Address"
      >
        {loading ? (
           <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
           </svg>
        ) : (
           <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
           </svg>
        )}
      </button>
      {error && <span className="text-red-500 text-[10px]">couldn't resolve address</span>}
    </div>
  );
}
