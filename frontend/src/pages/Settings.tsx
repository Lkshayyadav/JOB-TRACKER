import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { ApplicationPriority, ApplicationMethod } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { 
  Download, 
  Upload, 
  FileText, 
  User, 
  Bell, 
  Sliders 
} from 'lucide-react';

// Source options replaced by dynamic platforms
const PRIORITY_OPTIONS: ApplicationPriority[] = ['High', 'Medium', 'Low'];
const METHOD_OPTIONS: ApplicationMethod[] = ['Website', 'LinkedIn Easy Apply', 'Referral', 'Email', 'Recruiter', 'Other'];

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'defaults' | 'data' | 'notifications'>('defaults');

  // Load defaults state
  const [defaultPlatformId, setDefaultPlatformId] = useState<string>(
    localStorage.getItem('jobtrack_default_platform_id') || ''
  );
  const [defaultPriority, setDefaultPriority] = useState<ApplicationPriority>(
    (localStorage.getItem('jobtrack_default_priority') as ApplicationPriority) || 'Medium'
  );
  const [defaultMethod, setDefaultMethod] = useState<ApplicationMethod>(
    (localStorage.getItem('jobtrack_default_application_method') as ApplicationMethod) || 'Website'
  );

  // Profile fields state (stored in localStorage)
  const [profile, setProfile] = useState(() => ({
    firstName: localStorage.getItem('jobtrack_profile_firstname') || 'Lakshay',
    lastName: localStorage.getItem('jobtrack_profile_lastname') || 'Yadav',
    email: localStorage.getItem('jobtrack_profile_email') || 'lakshay.yadav@example.com',
  }));

  const [emailReminders, setEmailReminders] = useState(() => {
    return localStorage.getItem('jobtrack_notif_email_reminders') !== 'false';
  });
  const [weeklyDigest, setWeeklyDigest] = useState(() => {
    return localStorage.getItem('jobtrack_notif_weekly_digest') !== 'false';
  });

  // Queries
  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms'],
    queryFn: api.getPlatforms,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.getApplications(),
  });

  // Mutations
  const importMutation = useMutation({
    mutationFn: api.importApplicationsBatch,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast(`Imported ${data.length} applications successfully!`, 'success');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (err: any) => {
      showToast(err.message || 'Import failed. Check CSV formatting.', 'error');
    }
  });

  // Default Template Save Handler
  const handleSaveDefaults = () => {
    localStorage.setItem('jobtrack_default_platform_id', defaultPlatformId);
    localStorage.setItem('jobtrack_default_priority', defaultPriority);
    localStorage.setItem('jobtrack_default_application_method', defaultMethod);
    showToast('Default template values saved successfully', 'success');
  };

  const handleSaveProfile = () => {
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      showToast('First Name and Last Name are required', 'error');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(profile.email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    localStorage.setItem('jobtrack_profile_firstname', profile.firstName);
    localStorage.setItem('jobtrack_profile_lastname', profile.lastName);
    localStorage.setItem('jobtrack_profile_email', profile.email);
    showToast('Profile details updated successfully', 'success');
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('jobtrack_notif_email_reminders', String(emailReminders));
    localStorage.setItem('jobtrack_notif_weekly_digest', String(weeklyDigest));
    showToast('Notification preferences updated successfully', 'success');
  };

  // Export handlers
  const handleExportCSV = () => {
    if (applications.length === 0) {
      showToast('No applications found to export', 'info');
      return;
    }
    const headers = [
      'Company', 'Role', 'Source', 'Status', 'AppliedDate', 
      'FollowUpDate', 'Priority', 'Notes', 'Pinned', 'CompanyWebsite', 
      'ApplicationMethod', 'RecruiterName', 'RecruiterEmail', 'RecruiterLinkedIn'
    ];
    
    const csvRows = [headers.join(',')];
    
    applications.forEach(app => {
      const row = [
        `"${(app.company || '').replace(/"/g, '""')}"`,
        `"${(app.role || '').replace(/"/g, '""')}"`,
        `"${(app.platformId?.name || app.platformId || '').toString().replace(/"/g, '""')}"`,
        `"${(app.status || '').replace(/"/g, '""')}"`,
        `"${app.appliedDate || ''}"`,
        `"${app.followUpDate || ''}"`,
        `"${(app.priority || '').replace(/"/g, '""')}"`,
        `"${(app.notes || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
        app.isPinned ? 'true' : 'false',
        `"${(app.companyWebsite || '').replace(/"/g, '""')}"`,
        `"${(app.applicationMethod || '').replace(/"/g, '""')}"`,
        `"${(app.recruiterName || '').replace(/"/g, '""')}"`,
        `"${(app.recruiterEmail || '').replace(/"/g, '""')}"`,
        `"${(app.recruiterLinkedIn || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `jobtrack_applications_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Applications exported to CSV successfully', 'success');
  };

  const handleExportJSON = () => {
    if (applications.length === 0) {
      showToast('No applications found to export', 'info');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(applications, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `jobtrack_applications_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Applications exported to JSON successfully', 'success');
  };

  // CSV Parse helper
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return [];
    
    // Read and clean headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Matches values, handling quotes
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const values = matches.map(val => val.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      
      const obj: any = {};
      headers.forEach((header, index) => {
        // Lowercase helper mappings
        const cleanHeader = header.toLowerCase();
        let key = header;
        
        if (cleanHeader === 'company') key = 'company';
        else if (cleanHeader === 'role' || cleanHeader === 'position') key = 'role';
        else if (cleanHeader === 'source') key = 'source';
        else if (cleanHeader === 'status') key = 'status';
        else if (cleanHeader === 'applieddate' || cleanHeader === 'applied date') key = 'appliedDate';
        else if (cleanHeader === 'followupdate' || cleanHeader === 'follow up date') key = 'followUpDate';
        else if (cleanHeader === 'priority') key = 'priority';
        else if (cleanHeader === 'notes') key = 'notes';
        else if (cleanHeader === 'pinned' || cleanHeader === 'ispinned') key = 'isPinned';
        else if (cleanHeader === 'companywebsite' || cleanHeader === 'company website') key = 'companyWebsite';
        else if (cleanHeader === 'applicationmethod' || cleanHeader === 'application method') key = 'applicationMethod';
        else if (cleanHeader === 'recruitername' || cleanHeader === 'recruiter name') key = 'recruiterName';
        else if (cleanHeader === 'recruiteremail' || cleanHeader === 'recruiter email') key = 'recruiterEmail';
        else if (cleanHeader === 'recruiterlinkedin' || cleanHeader === 'recruiter linkedin') key = 'recruiterLinkedIn';

        obj[key] = values[index] || '';
      });
      
      // Clean dates and booleans
      if (obj.isPinned) {
        obj.isPinned = obj.isPinned === 'true' || obj.isPinned === '1';
      }
      if (!obj.appliedDate) {
        delete obj.appliedDate;
      }
      if (!obj.followUpDate) {
        delete obj.followUpDate;
      }
      
      result.push(obj);
    }
    return result;
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedData = parseCSV(text);
        if (parsedData.length === 0) {
          showToast('No valid records found in CSV file', 'error');
          return;
        }
        importMutation.mutate(parsedData);
      } catch (err) {
        showToast('Error parsing CSV file. Verify headers.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your personal preferences, template defaults, and CSV data flows.</p>
      </div>

      {/* Tabs list */}
      <div className="border-b border-border flex gap-6 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('defaults')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'defaults'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="h-4 w-4" /> Application Defaults
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'data'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" /> Data Management
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="h-4 w-4" /> Profile Details
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bell className="h-4 w-4" /> Notifications
        </button>
      </div>

      {/* Defaults Tab */}
      {activeTab === 'defaults' && (
        <Card>
          <CardHeader>
            <CardTitle>Application Template Defaults</CardTitle>
            <CardDescription>Values automatically pre-filled when adding a new application to speed up logging.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Platform</label>
                <select 
                  value={defaultPlatformId}
                  onChange={(e) => setDefaultPlatformId(e.target.value)}
                  className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none"
                  aria-label="Default Platform"
                >
                  <option value="">-- Pick a Platform --</option>
                  {platforms.map(plat => (
                    <option key={plat._id} value={plat._id}>{plat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Priority</label>
                <select 
                  value={defaultPriority}
                  onChange={(e) => setDefaultPriority(e.target.value as ApplicationPriority)}
                  className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none"
                  aria-label="Default Priority"
                >
                  {PRIORITY_OPTIONS.map(pr => (
                    <option key={pr} value={pr}>{pr}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Application Method</label>
                <select 
                  value={defaultMethod}
                  onChange={(e) => setDefaultMethod(e.target.value as ApplicationMethod)}
                  className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none"
                  aria-label="Default Application Method"
                >
                  {METHOD_OPTIONS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2 p-6 border-t border-border/40 bg-muted/10">
            <Button onClick={handleSaveDefaults}>Save Defaults</Button>
          </CardFooter>
        </Card>
      )}

      {/* Data Management Tab */}
      {activeTab === 'data' && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Data Controls</CardTitle>
            <CardDescription>Export your application details or import previously logged positions via CSV.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Import Card */}
              <div className="border border-border/80 bg-background/40 p-5 rounded-lg flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Upload className="h-4 w-4 text-primary" /> Import Applications
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload a CSV file containing columns like Company, Role, Source, Status, Priority, and Notes to batch log entries.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importMutation.isPending}
                  >
                    {importMutation.isPending ? 'Uploading...' : 'Choose CSV File'}
                  </Button>
                </div>
              </div>

              {/* Export Card */}
              <div className="border border-border/80 bg-background/40 p-5 rounded-lg flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Download className="h-4 w-4 text-emerald-500" /> Export Applications
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Download a full snapshot of your job tracking records. Highly recommended for backing up logs.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-center gap-2"
                    onClick={handleExportCSV}
                    disabled={applications.length === 0 || importMutation.isPending}
                  >
                    Export CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-center gap-2"
                    onClick={handleExportJSON}
                    disabled={applications.length === 0 || importMutation.isPending}
                  >
                    Export JSON
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Form */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Update your email address and profile details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="First Name" 
                value={profile.firstName} 
                onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
              />
              <Input 
                label="Last Name" 
                value={profile.lastName} 
                onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <Input 
              label="Email Address" 
              type="email" 
              value={profile.email} 
              onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input label="Current Password" type="password" placeholder="••••••••" />
          </CardContent>
          <CardFooter className="justify-end gap-2 p-6 border-t border-border/40 bg-muted/10">
            <Button variant="outline">Discard</Button>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </CardFooter>
        </Card>
      )}

      {/* Notifications Panel */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Notifications Preference</CardTitle>
            <CardDescription>Control how and when you receive application reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="email_reminders"
                  checked={emailReminders}
                  onChange={(e) => setEmailReminders(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <label htmlFor="email_reminders" className="text-sm font-semibold text-foreground">
                    Interview reminders
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Receive email notifications 24 hours prior to scheduled interviews.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="weekly_digest"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <label htmlFor="weekly_digest" className="text-sm font-semibold text-foreground">
                    Weekly progress digest
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Get a weekly email summary of your application statistics and status changes.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2 p-6 border-t border-border/40 bg-muted/10">
            <Button variant="outline">Discard</Button>
            <Button onClick={handleSaveNotifications}>Save Preferences</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};
