'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Redirect /book to /books (book selection page)
export default function BookRedirectPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push('/books');
    }
  }, [user, loading, router]);

  return (
    <ProtectedRoute>
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to your books...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
