import { useState, useEffect } from 'react';
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
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);
  const [initialCapturedAt, setInitialCapturedAt] = useState<string | null | undefined>(undefined);

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

  useEffect(() => {
    if (!isPolling) return;
    
    // Stop if we got a newer timestamp. We compare against the state variable
    // initialized on click, so parent re-renders don't break the stop condition.
    if (initialCapturedAt !== undefined && currentCapturedAt !== initialCapturedAt) {
       setIsPolling(false);
    }
    
    // Stop if 40 seconds passed (timeout)
    if (pollingStartTime && Date.now() - pollingStartTime > 40000) {
       setIsPolling(false);
    }
  }, [isPolling, currentCapturedAt, initialCapturedAt, pollingStartTime]);

  const mutation = useMutation({
    mutationFn: () => requestLocationUpdate(user.id),
    onSuccess: () => {
      setInitialCapturedAt(user.last_location_at);
      setIsPolling(true);
      setPollingStartTime(Date.now());
    }
  });

  const isLoading = mutation.isPending || isPolling;
  const isTimeout = !isPolling && pollingStartTime && initialCapturedAt !== undefined && currentCapturedAt === initialCapturedAt;

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
