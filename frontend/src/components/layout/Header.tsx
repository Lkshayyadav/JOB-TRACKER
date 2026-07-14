import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Simple title mapper based on pathname
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard';
      case '/applications':
        return 'Applications';
      case '/saved-jobs':
        return 'Saved Jobs';
      case '/follow-ups':
        return 'Follow-ups';
      case '/settings':
        return 'Settings';
      default:
        return 'JobTrack';
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 transition-all duration-300">
      {/* Mobile Menu Toggle & Dynamic Title */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors md:hidden"
          aria-label="Toggle Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline">Workspace</span>
          <span className="text-xs text-muted-foreground/50 hidden sm:inline">/</span>
          <span className="text-sm font-semibold text-foreground tracking-tight">{getPageTitle()}</span>
        </div>
      </div>

      {/* Right Side: Mock Search & Profile Controls */}
      <div className="flex items-center gap-4">
        {/* Search Mock */}
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Quick search... (⌘K)"
            disabled
            className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-muted/20 text-xs shadow-sm focus:outline-none cursor-not-allowed opacity-80"
          />
        </div>

        {/* Notifications Mock */}
        <button className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-not-allowed" disabled>
          <Bell className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-border/60" />

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity p-1.5 rounded-lg hover:bg-secondary/40"
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-8 h-8 rounded-full border border-border object-cover" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold leading-none text-foreground truncate max-w-[120px]">
                {user?.name || 'User'}
              </span>
              <span className="text-[10px] text-muted-foreground/80 mt-0.5 truncate max-w-[120px]">
                {user?.email || 'Account Info'}
              </span>
            </div>
          </div>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-56 bg-card border border-border rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-border/60 flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-foreground truncate">{user?.name}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 mt-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
