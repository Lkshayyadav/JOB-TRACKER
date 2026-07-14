import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Settings as SettingsIcon, Sun, Moon, Bookmark, Bell, Globe } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, emoji: '📊' },
    { name: 'Applications', path: '/applications', icon: ClipboardList, emoji: '📋' },
    { name: 'Saved Jobs', path: '/saved-jobs', icon: Bookmark, emoji: '🔖' },
    { name: 'Follow-ups', path: '/follow-ups', icon: Bell, emoji: '🔔' },
    { name: 'Platforms', path: '/platforms', icon: Globe, emoji: '🌐' },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, emoji: '⚙️' },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`w-64 border-r border-border bg-card/60 backdrop-blur-md flex flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300 transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border/40 gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
          J
        </div>
        <span className="font-semibold text-base tracking-tight">JobTrack</span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 group ${
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
              }`
            }
          >
            <item.icon className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions / Theme Toggle */}
      <div className="p-4 border-t border-border/40">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all duration-200"
          aria-label="Toggle theme"
        >
          <span className="flex items-center gap-3">
            {theme === 'dark' ? (
              <>
                <Sun className="h-4.5 w-4.5 text-amber-500" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4.5 w-4.5 text-slate-700" />
                <span>Dark Mode</span>
              </>
            )}
          </span>
        </button>
      </div>
      </aside>
    </>
  );
};
