'use client';

import React, { useState } from "react";
import { ToggleThemeButton } from "../toggle-theme-button/ToggleThemeButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, LogOut } from "lucide-react";

type Props = {};

const Navbar = (props: Props) => {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const handleAuthClick = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleLogoClick = () => {
    if (user) {
      router.push('/books');
    } else {
      router.push('/');
    }
  };

  return (
    <>
      <div className="flex justify-between items-center p-6 border-b">
        <button 
          onClick={handleLogoClick}
          className="flex justify-between items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Image src="/logo.svg" width={50} height={50} alt="MindLens Logo" />
          <h1 className="font-bold text-2xl">MindLens</h1>
        </button>
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAuthClick('signin')}
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => handleAuthClick('signup')}
              >
                Sign Up
              </Button>
            </div>
          )}
          <ToggleThemeButton />
        </div>
      </div>
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
};

export default Navbar;
