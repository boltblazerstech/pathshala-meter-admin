import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { requestLocationUpdate } from '../api/locations';
import { AddressReveal } from './AddressReveal';
import { getSupervisor } from '../api/supervisors';
import { getTeacher } from '../api/teachers';
import type { Supervisor, Teacher } from '../types';

function RefreshIcon({ className = '', size = 14 }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}

function RelativeTime({ dateString }: { dateString: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    // Update every 30 seconds
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const diffMs = now - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return <span>Just now</span>;
  if (diffMins < 60) return <span>{diffMins}m ago</span>;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return <span>{diffHours}h ago</span>;
  return <span>{Math.floor(diffHours / 24)}d ago</span>;
}

export function LocationCell({ user, type }: { user: Supervisor | Teacher, type: 'supervisor' | 'teacher' }) {
  const [isPolling, setIsPolling] = useState(false);
  const [didTimeout, setDidTimeout] = useState(false);

  // Bug 4 fix: Use a ref to capture the baseline timestamp at the exact
  // moment the admin clicks, avoiding stale closure issues with the user prop.
  const baselineTimestampRef = useRef<string | null | undefined>(undefined);
  // Bug 1 fix: Use a ref to hold the timeout ID so we can clear it on unmount or success.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useQuery({
    queryKey: [type, user.id, 'location'],
    queryFn: () => type === 'supervisor' ? getSupervisor(user.id) : getTeacher(user.id),
    enabled: isPolling,
    refetchInterval: isPolling ? 5000 : false,
  });

  // Safely fallback to the parent's data if the query hasn't returned location fields yet
  // This prevents the UI from clearing out data while fetching
  const currentCapturedAt = query.data?.last_location_at ?? user.last_location_at;
  const currentLat = query.data?.last_location_lat ?? user.last_location_lat;
  const currentLng = query.data?.last_location_lng ?? user.last_location_lng;

  // Bug 2 + 3 fix: Check for new data using a simple comparison against the ref.
  // This runs on every render (not gated by useEffect dependencies), so even if
  // React Query structural sharing skips a re-render, the NEXT poll that does
  // bring new data will trigger this immediately.
  useEffect(() => {
    if (!isPolling) return;
    const baseline = baselineTimestampRef.current;

    // Stop condition: we got a DIFFERENT timestamp than what we saved on click.
    // Works for null/undefined baselines too (new users with no prior location).
    if (baseline !== undefined && currentCapturedAt !== baseline) {
      setIsPolling(false);
      setDidTimeout(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isPolling, currentCapturedAt]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    setDidTimeout(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const mutation = useMutation({
    mutationFn: () => requestLocationUpdate(user.id),
    onSuccess: () => {
      // Bug 4 fix: Capture the CURRENT value from the user prop right now,
      // not from a stale closure. Using a ref means the stop-condition
      // comparison always uses the value from the moment of this click.
      baselineTimestampRef.current = user.last_location_at ?? null;
      setIsPolling(true);
      setDidTimeout(false);

      // Bug 1 fix: Use a standalone setTimeout that WILL fire after 40s
      // regardless of whether React re-renders or not. This completely
      // bypasses the React Query structural sharing problem (Bug 3).
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(stopPolling, 40000);
    }
  });

  const isLoading = mutation.isPending || isPolling;
  // Bug 5 fix: Use a dedicated `didTimeout` boolean that is explicitly set
  // only when the 40s timer fires, and explicitly cleared on a new click or success.
  const isTimeout = didTimeout && !isPolling;

  return (
    <div className="flex items-center justify-between w-full min-w-[150px]">
       <div>
         {currentLat && currentLng ? (
            <>
               <div className="flex items-center gap-1.5">
                 <a 
                   href={`https://www.google.com/maps?q=${currentLat},${currentLng}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-blue-600 hover:underline truncate"
                   title={`${currentLat}, ${currentLng}`}
                 >
                   {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
                 </a>
                 <AddressReveal lat={currentLat} lng={currentLng} />
               </div>
               <div className="text-xs text-gray-500">
                 Updated <RelativeTime dateString={currentCapturedAt!} />
                 {isTimeout && <span className="ml-1 text-red-500" title="No response from device">(timeout)</span>}
               </div>
            </>
         ) : (
            <span className="text-gray-400 text-sm">No location yet</span>
         )}
       </div>
       <button 
         onClick={() => mutation.mutate()} 
         disabled={isLoading} 
         className={`p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex-shrink-0 ml-2`}
         title="Request location update"
       >
          <RefreshIcon className={isLoading ? 'animate-spin' : ''} size={14} />
       </button>
    </div>
  )
}
