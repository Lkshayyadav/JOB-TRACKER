import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Application, ApplicationStatus, ApplicationPriority, ApplicationMethod, FilterParams, SavedJob } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { TableSkeleton } from '../components/ui/Skeleton';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  Tag, 
  AlertCircle,
  Briefcase,
  Pin,
  Sparkles,
  Inbox,
  Globe,
  Link2,
  Mail,
  User,
  Upload
} from 'lucide-react';

const STATUS_OPTIONS: ApplicationStatus[] = ['Applied', 'OA', 'Assignment', 'Interview', 'HR Round', 'Offer', 'Rejected', 'Withdrawn'];
const PRIORITY_OPTIONS: ApplicationPriority[] = ['High', 'Medium', 'Low'];
// Source options replaced by dynamic platforms
const METHOD_OPTIONS: ApplicationMethod[] = ['Website', 'LinkedIn Easy Apply', 'Referral', 'Email', 'Recruiter', 'Other'];

type TabType = 'all' | 'active' | 'interviews' | 'offers' | 'rejected';

const KANBAN_COLUMNS = [
  { id: 'saved-jobs', title: 'Saved Jobs' },
  { id: 'Applied', title: 'Applied' },
  { id: 'OA', title: 'Online Assessment' },
  { id: 'Assignment', title: 'Assignment' },
  { id: 'Interview', title: 'Interview' },
  { id: 'HR Round', title: 'HR Round' },
  { id: 'Offer', title: 'Offer' },
  { id: 'Rejected', title: 'Rejected' },
];

export const Applications: React.FC = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { showToast } = useToast();

  // 1. View Toggle State & Persistence
  const [viewMode, setViewMode] = useState<'table' | 'board'>(() => {
    return (localStorage.getItem('jobtrack_view_mode') as 'table' | 'board') || 'table';
  });

  useEffect(() => {
    localStorage.setItem('jobtrack_view_mode', viewMode);
  }, [viewMode]);

  // Mobile active Kanban column
  const [activeMobileColumn, setActiveMobileColumn] = useState<string>('saved-jobs');

  // 2. Tab & Filter States
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [filters, setFilters] = useState<FilterParams>({
    search: '',
    status: '',
    platformId: '',
    priority: '',
    sortBy: 'newest',
  });

  // Debounced search term representation
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchTerm }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Modals / Drawers States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 4. Form Input State (Shared for Add / Edit)
  const getInitialFormState = () => {
    const defaultPriority = (localStorage.getItem('jobtrack_default_priority') as ApplicationPriority) || 'Medium';
    const defaultMethod = (localStorage.getItem('jobtrack_default_application_method') as ApplicationMethod) || 'Website';
    const defaultPlatformId = localStorage.getItem('jobtrack_default_platform_id') || '';
    
    return {
      company: '',
      role: '',
      platformId: defaultPlatformId, // useEffect will override with fetched default platform
      status: 'Applied' as ApplicationStatus,
      priority: defaultPriority,
      jobUrl: '',
      appliedDate: new Date().toISOString().split('T')[0],
      followUpDate: '',
      notes: '',
      companyWebsite: '',
      applicationMethod: defaultMethod,
      recruiterName: '',
      recruiterEmail: '',
      recruiterLinkedIn: ''
    };
  };
  const [form, setForm] = useState(getInitialFormState());

  // Quick platform states & mutation
  const [isQuickAddPlatformOpen, setIsQuickAddPlatformOpen] = useState(false);
  const [quickPlatformForm, setQuickPlatformForm] = useState({ name: '', website: '', color: '#4F46E5' });

  const quickCreatePlatformMutation = useMutation({
    mutationFn: api.createPlatform,
    onSuccess: (newPlat) => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      showToast('Platform created successfully', 'success');
      setForm(prev => ({ ...prev, platformId: newPlat._id }));
      setIsQuickAddPlatformOpen(false);
      setQuickPlatformForm({ name: '', website: '', color: '#4F46E5' });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create platform', 'error');
    }
  });

  // Platforms query — must be declared BEFORE the useEffect that uses platforms
  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms'],
    queryFn: api.getPlatforms,
  });

  // Update default platform once platforms are loaded
  useEffect(() => {
    if (platforms.length > 0 && !form.platformId) {
      const defaultPlatformId = platforms.find(p => p.isDefault)?._id || platforms[0]?._id || '';
      setForm(prev => ({ ...prev, platformId: defaultPlatformId }));
    }
  }, [platforms]);

  // 5. Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openAddModal();
      }
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsDrawerOpen(false);
        setSelectedAppId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check for navigation states
  const navState = location.state as { openAddModal?: boolean; selectedAppId?: string } | null;
  useEffect(() => {
    if (navState?.openAddModal) {
      setIsAddModalOpen(true);
      window.history.replaceState({}, document.title);
    }
    if (navState?.selectedAppId) {
      setSelectedAppId(navState.selectedAppId);
      setIsDrawerOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [navState]);

  const openAddModal = () => {
    const initial = getInitialFormState();
    // If no saved default, pick from currently loaded platforms
    if (!initial.platformId && platforms.length > 0) {
      initial.platformId = platforms.find(p => p.isDefault)?._id || platforms[0]._id;
    }
    setForm(initial);
    setIsAddModalOpen(true);
  };

  const openEditModal = (app: Application, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingApp(app);
    setForm({
      company: app.company,
      role: app.role,
      platformId: typeof app.platformId === 'object' ? (app.platformId as any)._id : app.platformId,
      status: app.status,
      priority: app.priority,
      jobUrl: app.jobUrl || '',
      appliedDate: new Date(app.appliedDate).toISOString().split('T')[0],
      followUpDate: app.followUpDate ? new Date(app.followUpDate).toISOString().split('T')[0] : '',
      notes: app.notes || '',
      companyWebsite: app.companyWebsite || '',
      applicationMethod: app.applicationMethod || 'Website',
      recruiterName: app.recruiterName || '',
      recruiterEmail: app.recruiterEmail || '',
      recruiterLinkedIn: app.recruiterLinkedIn || ''
    });
    setIsEditModalOpen(true);
  };

  // 6. Queries

  const { data: rawApplications = [], isLoading, isError, error } = useQuery({
    queryKey: ['applications', filters],
    queryFn: () => api.getApplications(filters),
  });

  const { data: savedJobs = [] } = useQuery({
    queryKey: ['savedJobs'],
    queryFn: () => api.getSavedJobs(),
  });

  // Client-side filtering for applications
  const filteredApplications = rawApplications.filter((app) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') {
      return ['Applied', 'OA', 'Assignment', 'Interview', 'HR Round'].includes(app.status);
    }
    if (activeTab === 'interviews') {
      return ['Interview', 'HR Round'].includes(app.status);
    }
    if (activeTab === 'offers') {
      return app.status === 'Offer';
    }
    if (activeTab === 'rejected') {
      return app.status === 'Rejected';
    }
    return true;
  });

  // Client-side filtering for saved jobs matching the active filters
  const filteredSavedJobs = savedJobs.filter((job) => {
    if (filters.search && 
        !job.company.toLowerCase().includes(filters.search.toLowerCase()) && 
        !job.role.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.platformId && job.platformId?._id !== filters.platformId) {
      return false;
    }
    if (filters.priority) {
      return false;
    }
    if (activeTab !== 'all' && activeTab !== 'active') {
      return false;
    }
    return true;
  });

  // Check if currently selected ID corresponds to a Saved Job
  const isSavedJobSelected = savedJobs.some((sj) => sj._id === selectedAppId);

  // Query details for active application in Drawer
  const { data: fetchedApp, isLoading: isAppDetailsLoading } = useQuery({
    queryKey: ['application', selectedAppId],
    queryFn: () => api.getApplication(selectedAppId!),
    enabled: !!selectedAppId && isDrawerOpen && !isSavedJobSelected,
  });

  // Query status transition history in Drawer
  const { data: activeHistory = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['history', selectedAppId],
    queryFn: () => api.getHistory(selectedAppId!),
    enabled: !!selectedAppId && isDrawerOpen && !isSavedJobSelected,
  });

  const activeApp = isSavedJobSelected
    ? (() => {
        const sj = savedJobs.find(x => x._id === selectedAppId);
        if (!sj) return null;
        return {
          _id: sj._id,
          company: sj.company,
          role: sj.role,
          platformId: sj.platformId,
          jobUrl: sj.jobUrl,
          notes: sj.notes,
          appliedDate: sj.savedDate || sj.createdAt,
          status: 'Applied' as ApplicationStatus, 
          priority: 'Medium' as ApplicationPriority,
          createdAt: sj.createdAt,
          updatedAt: sj.updatedAt
        } as Application;
      })()
    : fetchedApp;

  // 7. Mutations
  const createMutation = useMutation({
    mutationFn: api.createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsAddModalOpen(false);
      showToast('Job application created successfully', 'success');
      setForm(getInitialFormState());
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || 'Failed to create application';
      showToast(errMsg, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Application> }) => 
      api.updateApplication(id, data),
    onSuccess: (updatedApp) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['application', updatedApp._id] });
      queryClient.invalidateQueries({ queryKey: ['history', updatedApp._id] });
      setIsEditModalOpen(false);
      setEditingApp(null);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || 'Failed to update application';
      showToast(errMsg, 'error');
    },
  });

  const patchStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => 
      api.updateStatus(id, status),
    onSuccess: (updatedApp) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['application', updatedApp._id] });
      queryClient.invalidateQueries({ queryKey: ['history', updatedApp._id] });
      showToast(`Status updated to ${updatedApp.status}`, 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || 'Failed to update status';
      showToast(errMsg, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsDrawerOpen(false);
      setSelectedAppId(null);
      showToast('Application deleted successfully', 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || 'Failed to delete application';
      showToast(errMsg, 'error');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: api.duplicateApplication,
    onSuccess: (newApp) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast(`Duplicated successfully as a new application to ${newApp.company}!`, 'success');
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || 'Failed to duplicate application';
      showToast(errMsg, 'error');
    },
  });

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
      const errMsg = err.response?.data?.message || err.message || 'Failed to import applications';
      showToast(errMsg, 'error');
    }
  });

  // Saved Jobs & Conversion mutations
  const deleteSavedJobMutation = useMutation({
    mutationFn: api.deleteSavedJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedJobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsDrawerOpen(false);
      setSelectedAppId(null);
      showToast('Saved job bookmark deleted', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Failed to delete saved job', 'error');
    }
  });

  const convertSavedJobMutation = useMutation({
    mutationFn: async ({ id, targetStatus }: { id: string; targetStatus?: ApplicationStatus }) => {
      const newApp = await api.applySavedJob(id);
      if (targetStatus && targetStatus !== 'Applied') {
        return await api.updateStatus(newApp._id, targetStatus);
      }
      return newApp;
    },
    onSuccess: (newApp) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['savedJobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast(`Moved to ${newApp.status} column!`, 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Failed to move saved job', 'error');
    }
  });

  const convertAppToSavedJobMutation = useMutation({
    mutationFn: async (app: Application) => {
      await api.createSavedJob({
        company: app.company,
        role: app.role,
        platformId: typeof app.platformId === 'object' ? (app.platformId as any)._id : app.platformId,
        jobUrl: app.jobUrl,
        notes: app.notes,
      });
      await api.deleteApplication(app._id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['savedJobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast('Moved application back to Saved Jobs bookmark', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Failed to move application back to Saved Jobs', 'error');
    }
  });

  const handleDeleteSavedJob = (id: string, company: string) => {
    if (window.confirm(`Are you sure you want to delete the saved job bookmark for ${company}?`)) {
      deleteSavedJobMutation.mutate(id);
    }
  };

  const onDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;

    if (sourceCol === 'saved-jobs' && destCol !== 'saved-jobs') {
      convertSavedJobMutation.mutate({ id: draggableId, targetStatus: destCol as ApplicationStatus });
    } else if (sourceCol !== 'saved-jobs' && destCol === 'saved-jobs') {
      const app = rawApplications.find(a => a._id === draggableId);
      if (app) {
        convertAppToSavedJobMutation.mutate(app);
      }
    } else if (sourceCol !== 'saved-jobs' && destCol !== 'saved-jobs') {
      patchStatusMutation.mutate({ id: draggableId, status: destCol as ApplicationStatus });
    }
  };

  // CSV Parsing and import trigger
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const values = matches.map(val => val.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      
      const obj: any = {};
      headers.forEach((header, index) => {
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

  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true;
    try {
      let checkUrl = url;
      if (!/^(?:f|ht)tps?:\/\//i.test(url)) {
        checkUrl = 'https://' + url;
      }
      new URL(checkUrl);
      return true;
    } catch (_) {
      return false;
    }
  };

  const isValidEmail = (email: string): boolean => {
    if (!email.trim()) return true;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // 8. Action Handlers
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) {
      showToast('Company and Role fields are required', 'error');
      return;
    }
    if (form.jobUrl && !isValidUrl(form.jobUrl)) {
      showToast('Please enter a valid Job Listing URL', 'error');
      return;
    }
    if (form.companyWebsite && !isValidUrl(form.companyWebsite)) {
      showToast('Please enter a valid Company Website URL', 'error');
      return;
    }
    if (form.recruiterLinkedIn && !isValidUrl(form.recruiterLinkedIn)) {
      showToast('Please enter a valid Recruiter LinkedIn profile URL', 'error');
      return;
    }
    if (form.recruiterEmail && !isValidEmail(form.recruiterEmail)) {
      showToast('Please enter a valid Recruiter Email address', 'error');
      return;
    }
    createMutation.mutate(form);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    if (!form.company.trim() || !form.role.trim()) {
      showToast('Company and Role fields are required', 'error');
      return;
    }
    if (form.jobUrl && !isValidUrl(form.jobUrl)) {
      showToast('Please enter a valid Job Listing URL', 'error');
      return;
    }
    if (form.companyWebsite && !isValidUrl(form.companyWebsite)) {
      showToast('Please enter a valid Company Website URL', 'error');
      return;
    }
    if (form.recruiterLinkedIn && !isValidUrl(form.recruiterLinkedIn)) {
      showToast('Please enter a valid Recruiter LinkedIn profile URL', 'error');
      return;
    }
    if (form.recruiterEmail && !isValidEmail(form.recruiterEmail)) {
      showToast('Please enter a valid Recruiter Email address', 'error');
      return;
    }
    updateMutation.mutate({ id: editingApp._id, data: form });
  };

  const handleDelete = (id: string, company: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSavedJobSelected) {
      handleDeleteSavedJob(id, company);
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete your application to ${company}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const togglePin = (app: Application, e: React.MouseEvent) => {
    e.stopPropagation();
    const isPinned = !app.isPinned;
    updateMutation.mutate({ id: app._id, data: { isPinned } });
    showToast(isPinned ? `Pinned ${app.company}` : `Unpinned ${app.company}`, 'success');
  };

  const handleRowClick = (item: Application | SavedJob) => {
    setSelectedAppId(item._id);
    setIsDrawerOpen(true);
  };

  const getPriorityBadge = (priority: ApplicationPriority) => {
    const styles = {
      High: 'danger' as const,
      Medium: 'warning' as const,
      Low: 'secondary' as const,
    };
    return <Badge variant={styles[priority] || 'secondary'}>{priority}</Badge>;
  };

  const getFollowUpIndicator = (followUpDateStr?: string) => {
    if (!followUpDateStr) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const followUp = new Date(followUpDateStr);
    followUp.setHours(0, 0, 0, 0);

    const timeDiff = followUp.getTime() - today.getTime();
    const oneDayMs = 86400000;
    
    if (timeDiff === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          🔔 Due Today
        </span>
      );
    } else if (timeDiff === oneDayMs) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          ⏳ Tomorrow
        </span>
      );
    } else if (timeDiff < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
          ⚠️ Overdue
        </span>
      );
    }
    
    return (
      <span className="text-[11px] text-muted-foreground font-medium">
        {followUp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    );
  };

  const renderQuickStatusSelect = (app: Application) => {
    const statusStyles: Record<ApplicationStatus, string> = {
      Applied: 'border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10',
      OA: 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10',
      Assignment: 'border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10',
      Interview: 'border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10',
      'HR Round': 'border-pink-500/30 bg-pink-500/5 text-pink-600 dark:text-pink-400 hover:bg-pink-500/10',
      Offer: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10',
      Rejected: 'border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10',
      Withdrawn: 'border-slate-500/30 bg-slate-500/5 text-slate-600 dark:text-slate-400 hover:bg-slate-500/10',
    };

    return (
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-fit"
      >
        <select
          value={app.status}
          onChange={(e) => patchStatusMutation.mutate({ id: app._id, status: e.target.value as ApplicationStatus })}
          className={`h-6.5 px-2.5 py-0 border rounded-full text-[11px] font-bold shadow-sm focus:outline-none focus:ring-0 focus:border-primary outline-none cursor-pointer transition-colors ${statusStyles[app.status]}`}
          disabled={patchStatusMutation.isPending}
          aria-label="Change application status"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status} className="bg-card text-foreground font-medium">
              {status}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in w-full">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Applications</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Manage and track the progress of your submitted jobs.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground bg-secondary/80 border border-border px-2 py-1 rounded hidden lg:inline-block">
            Press <kbd className="font-sans font-bold">Ctrl + N</kbd> to add
          </span>
          <input type="file" ref={fileInputRef} accept=".csv" onChange={handleImportCSV} className="hidden" />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 border-border/80 text-sm h-9"
            disabled={importMutation.isPending}
          >
            <Upload className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Import CSV</span>
          </Button>
          <Button onClick={openAddModal} className="flex items-center gap-2 h-9">
            <Plus className="h-3.5 w-3.5" /> Add Application
          </Button>
        </div>
      </div>

      {/* ── View Toggle + Platform Filter ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-border pb-3">
        {/* View toggle */}
        <div className="flex p-0.5 rounded-lg bg-muted border border-border w-fit flex-shrink-0">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-200 ${
              viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-200 ${
              viewMode === 'board' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Board View
          </button>
        </div>

        {/* Platform filter pills — single scrollable row, never wraps */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0">
          <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap mr-1 flex-shrink-0">Platform:</span>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, platformId: '' }))}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
              !filters.platformId
                ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}
          >
            All Platforms
          </button>
          {platforms.map((plat) => (
            <button
              key={plat._id}
              onClick={() => setFilters((prev) => ({ ...prev, platformId: plat._id }))}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                filters.platformId === plat._id
                  ? 'border-primary text-primary-foreground shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
              style={filters.platformId === plat._id ? { backgroundColor: plat.color, borderColor: plat.color } : {}}
            >
              {plat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Filters ───────────────────────────────────────── */}
      <div className="border-b border-border flex items-center overflow-x-auto gap-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Applications' },
          { id: 'active', label: 'Active Pipeline' },
          { id: 'interviews', label: 'Interviews' },
          { id: 'offers', label: 'Offers' },
          { id: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`pb-3 px-1 text-sm font-semibold transition-all relative border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Filter Bar ────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          {/* Search box */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search company or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Search applications by company or role"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none min-w-[130px]"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={filters.platformId || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, platformId: e.target.value }))}
            className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none min-w-[130px]"
            aria-label="Filter by platform"
          >
            <option value="">All Platforms</option>
            {platforms.map((plat) => (
              <option key={plat._id} value={plat._id}>{plat.name}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
            className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none min-w-[120px]"
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
            className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none min-w-[110px]"
            aria-label="Sort applications"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="company">A-Z</option>
          </select>
        </CardContent>
      </Card>

      {/* Main Table view */}
      {viewMode === 'table' && (
        <>
          {isLoading ? (
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <TableSkeleton rows={6} />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-destructive/30 rounded-lg bg-destructive/5 p-8 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-rose-500" />
              <h3 className="text-lg font-semibold text-foreground">Failed to load applications</h3>
              <p className="text-muted-foreground max-w-sm">
                {error instanceof Error ? error.message : 'An error occurred while fetching applications.'}
              </p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['applications'] })}>Retry</Button>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-border rounded-lg bg-card text-center space-y-4">
              <div className="p-4 bg-muted/60 dark:bg-muted/30 rounded-full">
                <Inbox className="h-10 w-10 text-muted-foreground/60" />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-foreground">No applications found</p>
                <p className="text-sm text-muted-foreground max-w-[320px] mx-auto leading-normal">
                  {filters.search || filters.status || filters.platformId || filters.priority || activeTab !== 'all'
                    ? "No job applications match your active filters or selected tab."
                    : "Your pipeline is currently empty. Add a new application to start tracking."}
                </p>
              </div>
              {filters.search || filters.status || filters.platformId || filters.priority || activeTab !== 'all' ? (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveTab('all');
                    setFilters({ search: '', status: '', platformId: '', priority: '', sortBy: 'newest' });
                  }}
                >
                  Reset Filters
                </Button>
              ) : (
                <Button size="sm" onClick={openAddModal}>Add First Application</Button>
              )}
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm max-h-[620px] overflow-y-auto">
              <Table className="relative border-collapse">
                <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_hsl(var(--border))]">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="pl-2">Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status (Quick Update)</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow 
                      key={app._id} 
                      className="cursor-pointer hover:bg-muted/40 transition-colors group"
                      onClick={() => handleRowClick(app)}
                    >
                      <TableCell onClick={(e) => togglePin(app, e)} className="text-center pr-0.5">
                        <Pin 
                          className={`h-3.5 w-3.5 transition-all duration-200 ${
                            app.isPinned 
                              ? 'text-amber-500 fill-amber-500 rotate-45 scale-110' 
                              : 'text-muted-foreground/30 hover:text-muted-foreground/80 group-hover:opacity-100 opacity-0'
                          }`} 
                        />
                      </TableCell>

                      <TableCell className="font-semibold text-foreground pl-2 py-4">
                        <div className="flex items-center gap-1.5">
                          <span>{app.company}</span>
                          {app.isPinned && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/15">
                              Pinned
                            </span>
                          )}
                        </div>
                        {(app.jobUrl || app.companyWebsite || app.recruiterLinkedIn || app.recruiterEmail) && (
                          <div className="flex gap-2 mt-1 items-center" onClick={(e) => e.stopPropagation()}>
                            {app.jobUrl && (
                              <a href={app.jobUrl} target="_blank" rel="noreferrer" title="Open Job URL" className="text-muted-foreground hover:text-primary transition-colors">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {app.companyWebsite && (
                              <a href={app.companyWebsite} target="_blank" rel="noreferrer" title="Company Website" className="text-muted-foreground hover:text-primary transition-colors">
                                <Globe className="h-3 w-3" />
                              </a>
                            )}
                            {app.recruiterLinkedIn && (
                              <a href={app.recruiterLinkedIn} target="_blank" rel="noreferrer" title="Recruiter LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
                                <Link2 className="h-3 w-3" />
                              </a>
                            )}
                            {app.recruiterEmail && (
                              <a href={`mailto:${app.recruiterEmail}`} title={`Email Recruiter (${app.recruiterName || ''})`} className="text-muted-foreground hover:text-primary transition-colors">
                                <Mail className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground py-4">{app.role}</TableCell>
                      <TableCell className="text-muted-foreground text-xs py-4">
                        <span 
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{ 
                            color: app.platformId?.color || '#6B7280', 
                            borderColor: `${app.platformId?.color || '#6B7280'}20`, 
                            backgroundColor: `${app.platformId?.color || '#6B7280'}10` 
                          }}
                        >
                          {app.platformId?.name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">{getPriorityBadge(app.priority)}</TableCell>
                      <TableCell className="py-4">{renderQuickStatusSelect(app)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs py-4">
                        {new Date(app.appliedDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="py-4">{getFollowUpIndicator(app.followUpDate)}</TableCell>
                      <TableCell className="text-right pr-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-primary hover:bg-primary/5"
                            onClick={() => duplicateMutation.mutate(app._id)}
                            disabled={duplicateMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                            title="Duplicate Application"
                          >
                            {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => openEditModal(app, e)}
                            disabled={duplicateMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            onClick={(e) => handleDelete(app._id, app.company, e)}
                            disabled={duplicateMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Board (Kanban) View */}
      {viewMode === 'board' && (
        <div className="space-y-4">
          {/* Mobile column picker — visible only below sm */}
          <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {KANBAN_COLUMNS.map((col) => {
              const isSaved = col.id === 'saved-jobs';
              const count = isSaved ? filteredSavedJobs.length : filteredApplications.filter(a => a.status === col.id).length;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveMobileColumn(col.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap transition-colors cursor-pointer ${
                    activeMobileColumn === col.id
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {col.title} ({count})
                </button>
              );
            })}
          </div>

          <div className="w-full overflow-hidden">
            {/* Scrollable Column List — full width, horizontal scroll */}
            <div
              className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
              style={{ minHeight: 'calc(100vh - 340px)' }}
            >
              <DragDropContext onDragEnd={onDragEnd}>
                {KANBAN_COLUMNS.map((col) => {
                  const isSavedCol = col.id === 'saved-jobs';
                  const colItems = isSavedCol
                    ? filteredSavedJobs
                    : filteredApplications.filter((app) => app.status === col.id);

                  return (
                    <div
                      key={col.id}
                      className={`flex-shrink-0 bg-secondary/15 dark:bg-secondary/5 rounded-xl border border-border/40 p-3 flex flex-col h-full ${ 
                        activeMobileColumn === col.id ? 'flex w-full sm:w-72' : 'hidden sm:flex w-72'
                      }`}
                      style={{ minHeight: 'calc(100vh - 360px)' }}
                    >
                      {/* Column Title Header */}
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            col.id === 'saved-jobs' ? 'bg-slate-400' :
                            col.id === 'Applied' ? 'bg-blue-500' :
                            col.id === 'OA' ? 'bg-amber-500' :
                            col.id === 'Assignment' ? 'bg-purple-500' :
                            col.id === 'Interview' ? 'bg-sky-500' :
                            col.id === 'HR Round' ? 'bg-pink-500' :
                            col.id === 'Offer' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          <h3 className="text-sm font-bold text-foreground">{col.title}</h3>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground bg-secondary/80 border border-border/50 px-2 py-0.5 rounded-full">
                          {colItems.length}
                        </span>
                      </div>

                      {/* Droppable Card Container */}
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto space-y-3 min-h-[200px] rounded-lg transition-colors p-1 pr-1.5 scrollbar-none ${
                              snapshot.isDraggingOver ? 'bg-primary/5 border border-dashed border-primary/20' : ''
                            }`}
                          >
                            {colItems.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-28 border border-dashed border-border/60 rounded-xl text-muted-foreground/60 text-xs italic select-none">
                                No jobs here
                              </div>
                            ) : (
                              colItems.map((item, index) => {
                                if (isSavedCol) {
                                  const job = item as SavedJob;
                                  return (
                                    <Draggable key={job._id} draggableId={job._id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          onClick={() => handleRowClick(job as any)}
                                          className={`p-3.5 bg-card border rounded-xl shadow-sm hover:shadow-md hover:border-border/80 transition-all cursor-pointer select-none space-y-2.5 relative group ${
                                            snapshot.isDragging ? 'ring-2 ring-primary/45 border-primary/50 shadow-lg scale-[1.02]' : 'border-border/60'
                                          }`}
                                        >
                                          <div className="space-y-0.5">
                                            <h4 className="font-bold text-foreground text-xs tracking-tight truncate">{job.company}</h4>
                                            <p className="text-[11px] text-muted-foreground font-medium truncate">{job.role}</p>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-1">
                                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider">Saved</Badge>
                                            <span 
                                              className="text-[9px] px-1.5 py-0.5 rounded border font-semibold animate-fade-in"
                                              style={{
                                                color: job.platformId?.color || '#6B7280',
                                                borderColor: `${job.platformId?.color || '#6B7280'}20`,
                                                backgroundColor: `${job.platformId?.color || '#6B7280'}10`
                                              }}
                                            >
                                              {job.platformId?.name || 'Unknown'}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                                            <span className="flex items-center gap-0.5">
                                              <Calendar className="h-3 w-3" />
                                              {new Date(job.savedDate || job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between pt-1.5 border-t border-border/25">
                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                              {job.jobUrl && (
                                                <a href={job.jobUrl} target="_blank" rel="noreferrer" title="Open Job Listing" className="text-muted-foreground hover:text-primary transition-colors">
                                                  <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                              )}
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                              <button
                                                onClick={() => convertSavedJobMutation.mutate({ id: job._id })}
                                                className="px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary rounded text-[10px] font-bold transition-colors cursor-pointer"
                                                title="Convert to Active Application"
                                              >
                                                Apply
                                              </button>
                                              <button
                                                onClick={() => handleDeleteSavedJob(job._id, job.company)}
                                                className="p-0.5 hover:bg-rose-500/10 rounded text-rose-500 transition-colors cursor-pointer"
                                                title="Delete bookmark"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                } else {
                                  const app = item as Application;
                                  return (
                                    <Draggable key={app._id} draggableId={app._id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          onClick={() => handleRowClick(app)}
                                          className={`p-3.5 bg-card border rounded-xl shadow-sm hover:shadow-md hover:border-border/80 transition-all cursor-pointer select-none space-y-2.5 relative group ${
                                            snapshot.isDragging ? 'ring-2 ring-primary/45 border-primary/50 shadow-lg scale-[1.02]' : 'border-border/60'
                                          }`}
                                        >
                                          <button
                                            onClick={(e) => togglePin(app, e)}
                                            className="absolute top-3 right-3 p-0.5 rounded hover:bg-secondary transition-colors"
                                            title={app.isPinned ? "Unpin job" : "Pin job"}
                                          >
                                            <Pin className={`h-3.5 w-3.5 transition-all ${
                                              app.isPinned 
                                                ? 'text-amber-500 fill-amber-500 rotate-45 scale-110' 
                                                : 'text-muted-foreground/30 hover:text-muted-foreground/80 opacity-0 group-hover:opacity-100'
                                            }`} />
                                          </button>
                                          <div className="pr-5 space-y-0.5">
                                            <h4 className="font-bold text-foreground text-xs tracking-tight truncate">{app.company}</h4>
                                            <p className="text-[11px] text-muted-foreground font-medium truncate">{app.role}</p>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-1">
                                            {getPriorityBadge(app.priority)}
                                            <span 
                                              className="text-[9px] px-1.5 py-0.5 rounded border font-semibold animate-fade-in"
                                              style={{
                                                color: app.platformId?.color || '#6B7280',
                                                borderColor: `${app.platformId?.color || '#6B7280'}20`,
                                                backgroundColor: `${app.platformId?.color || '#6B7280'}10`
                                              }}
                                            >
                                              {app.platformId?.name || 'Unknown'}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                                            <span className="flex items-center gap-0.5">
                                              <Calendar className="h-3 w-3" />
                                              {new Date(app.appliedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                            {app.followUpDate && getFollowUpIndicator(app.followUpDate)}
                                          </div>
                                          <div className="flex items-center justify-between pt-1.5 border-t border-border/25">
                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                              {app.jobUrl && (
                                                <a href={app.jobUrl} target="_blank" rel="noreferrer" title="Open Job Listing" className="text-muted-foreground hover:text-primary transition-colors">
                                                  <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                              )}
                                              {app.companyWebsite && (
                                                <a href={app.companyWebsite} target="_blank" rel="noreferrer" title="Company Website" className="text-muted-foreground hover:text-primary transition-colors">
                                                  <Globe className="h-3.5 w-3.5" />
                                                </a>
                                              )}
                                              {app.recruiterLinkedIn && (
                                                <a href={app.recruiterLinkedIn} target="_blank" rel="noreferrer" title="Recruiter LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
                                                  <Link2 className="h-3.5 w-3.5" />
                                                </a>
                                              )}
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                              <button
                                                onClick={(e) => openEditModal(app, e)}
                                                className="px-1.5 py-0.5 hover:bg-secondary rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                                title="Edit application"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                onClick={(e) => handleDelete(app._id, app.company, e)}
                                                className="p-0.5 hover:bg-rose-500/10 rounded text-rose-500 transition-colors cursor-pointer"
                                                title="Delete application"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                }
                              })
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </DragDropContext>
            </div>
          </div>
        </div>
      )}

      {/* Details Side Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAppId(null);
        }}
        title={isSavedJobSelected ? 'Saved Job Bookmark' : 'Application Details'}
      >
        {isAppDetailsLoading || !activeApp ? (
          <div className="space-y-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-muted rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-1/3 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded" />
              <div className="h-8 bg-muted rounded" />
              <div className="h-8 bg-muted rounded" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Title info */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {activeApp.company}
                  {!isSavedJobSelected && (
                    <button 
                      onClick={(e) => togglePin(activeApp, e)} 
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title={activeApp.isPinned ? "Unpin application" : "Pin application"}
                    >
                      <Pin className={`h-4.5 w-4.5 ${activeApp.isPinned ? 'text-amber-500 fill-amber-500 rotate-45' : 'text-muted-foreground/40 hover:text-muted-foreground'}`} />
                    </button>
                  )}
                </h3>
                <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground/80" /> {activeApp.role}
                </p>
              </div>
              <div className="flex gap-2">
                {activeApp.jobUrl && (
                  <a 
                    href={activeApp.jobUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 border border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground rounded transition-colors"
                    title="Open Job URL"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <Button 
                  variant="outline"
                  size="sm"
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20"
                  onClick={() => handleDelete(activeApp._id, activeApp.company)}
                  disabled={deleteMutation.isPending || deleteSavedJobMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* Quick Details grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Job Source</label>
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span 
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border"
                    style={{
                      color: activeApp.platformId?.color || '#6B7280',
                      borderColor: `${activeApp.platformId?.color || '#6B7280'}20`,
                      backgroundColor: `${activeApp.platformId?.color || '#6B7280'}10`
                    }}
                  >
                    {activeApp.platformId?.name || 'Unknown'}
                  </span>
                </div>
              </div>

              {!isSavedJobSelected && (
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Priority</label>
                  <div>{getPriorityBadge(activeApp.priority)}</div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  {isSavedJobSelected ? 'Bookmark Date' : 'Applied Date'}
                </label>
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{new Date(activeApp.appliedDate).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}</span>
                </div>
              </div>

              {!isSavedJobSelected && (
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Follow-up Date</label>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={activeApp.followUpDate ? "text-foreground" : "text-muted-foreground italic text-xs"}>
                        {activeApp.followUpDate 
                          ? new Date(activeApp.followUpDate).toLocaleDateString(undefined, {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'None scheduled'
                        }
                      </span>
                    </div>
                    {activeApp.followUpDate && getFollowUpIndicator(activeApp.followUpDate)}
                  </div>
                </div>
              )}
            </div>

            {/* Contacts & Method Section */}
            {!isSavedJobSelected && (activeApp.companyWebsite || activeApp.applicationMethod || activeApp.recruiterName || activeApp.recruiterEmail || activeApp.recruiterLinkedIn) && (
              <div className="border border-border/80 rounded-md p-3.5 bg-card/45 space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-1.5 mb-2">
                  <User className="h-3.5 w-3.5 text-primary" /> Application Details & Contacts
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {activeApp.applicationMethod && (
                    <div>
                      <span className="text-muted-foreground block font-medium">Application Method:</span>
                      <span className="font-semibold text-foreground">{activeApp.applicationMethod}</span>
                    </div>
                  )}
                  {activeApp.companyWebsite && (
                    <div>
                      <span className="text-muted-foreground block font-medium">Company Website:</span>
                      <a href={activeApp.companyWebsite} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline flex items-center gap-0.5 mt-0.5">
                        <Globe className="h-3 w-3" /> Visit Site
                      </a>
                    </div>
                  )}
                  {activeApp.recruiterName && (
                    <div className="col-span-2 mt-1">
                      <span className="text-muted-foreground block font-medium">Recruiter Contact:</span>
                      <span className="font-semibold text-foreground">{activeApp.recruiterName}</span>
                    </div>
                  )}
                  {activeApp.recruiterEmail && (
                    <div>
                      <span className="text-muted-foreground block font-medium">Recruiter Email:</span>
                      <a href={`mailto:${activeApp.recruiterEmail}`} className="font-semibold text-primary hover:underline flex items-center gap-0.5 mt-0.5">
                        <Mail className="h-3 w-3" /> {activeApp.recruiterEmail}
                      </a>
                    </div>
                  )}
                  {activeApp.recruiterLinkedIn && (
                    <div>
                      <span className="text-muted-foreground block font-medium">Recruiter LinkedIn:</span>
                      <a href={activeApp.recruiterLinkedIn} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline flex items-center gap-0.5 mt-0.5">
                        <Link2 className="h-3 w-3" /> View Profile
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Modification selector */}
            <div className="bg-secondary/40 dark:bg-secondary/20 p-4 rounded-lg border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Status</span>
                <Badge variant={
                  isSavedJobSelected ? 'secondary' :
                  activeApp.status === 'Offer' ? 'success' :
                  activeApp.status === 'Rejected' ? 'danger' :
                  ['Interview', 'HR Round', 'OA'].includes(activeApp.status) ? 'warning' : 'info'
                }>
                  {isSavedJobSelected ? 'Saved Bookmark' : activeApp.status}
                </Badge>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Update Status</label>
                <select
                  value={isSavedJobSelected ? '' : activeApp.status}
                  onChange={(e) => {
                    if (isSavedJobSelected) {
                      convertSavedJobMutation.mutate({ id: activeApp._id, targetStatus: e.target.value as ApplicationStatus });
                      setIsDrawerOpen(false);
                    } else {
                      patchStatusMutation.mutate({ id: activeApp._id, status: e.target.value as ApplicationStatus });
                    }
                  }}
                  className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none w-full"
                  disabled={patchStatusMutation.isPending || convertSavedJobMutation.isPending}
                >
                  {isSavedJobSelected && <option value="">Select Status to Apply...</option>}
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Notes</label>
              <div className="text-sm border border-border/80 rounded-md p-3.5 bg-card/50 text-foreground min-h-[80px] whitespace-pre-wrap">
                {activeApp.notes || <span className="text-muted-foreground italic text-xs">No notes provided for this job application.</span>}
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* GitHub-style Status Transition Timeline */}
            {!isSavedJobSelected && (
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Pipeline History Logs
                </h4>
                {isHistoryLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-8 bg-muted rounded w-3/4" />
                    <div className="h-8 bg-muted rounded w-2/3" />
                  </div>
                ) : activeHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No transition events recorded.</p>
                ) : (
                  <div className="relative pl-6 space-y-6 border-l-2 border-border/85 ml-2.5">
                    {activeHistory.map((hist) => (
                      <div key={hist._id} className="relative animate-fade-in">
                        <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-border bg-card ring-4 ring-background">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        </span>
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              {hist.status}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(hist.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-0.5 leading-normal">
                            {hist.note}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Unified Add Application Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Application"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddSubmit} 
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving...' : 'Add Application'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleAddSubmit}>
          <Input 
            label="Company Name *" 
            placeholder="e.g. Stripe, Vercel" 
            value={form.company}
            onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
            required
          />
          <Input 
            label="Role / Title *" 
            placeholder="e.g. Frontend Engineer Intern" 
            value={form.role}
            onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job Source *</label>
              <select 
                value={form.platformId}
                onChange={(e) => {
                  if (e.target.value === 'ADD_NEW_PLATFORM') {
                    setIsQuickAddPlatformOpen(true);
                  } else {
                    setForm(prev => ({ ...prev, platformId: e.target.value }));
                  }
                }}
                className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full outline-none"
                aria-label="Job Source"
              >
                {platforms.map(plat => (
                  <option key={plat._id} value={plat._id}>{plat.name}</option>
                ))}
                <option value="ADD_NEW_PLATFORM">+ Add Platform...</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority *</label>
              <select 
                value={form.priority}
                onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value as ApplicationPriority }))}
                className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full outline-none"
                aria-label="Priority"
              >
                {PRIORITY_OPTIONS.map(pr => (
                  <option key={pr} value={pr}>{pr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status *</label>
              <select 
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as ApplicationStatus }))}
                className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full outline-none"
                aria-label="Status"
              >
                {STATUS_OPTIONS.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <Input 
              type="date"
              label="Applied Date *" 
              value={form.appliedDate}
              onChange={(e) => setForm(prev => ({ ...prev, appliedDate: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              type="date"
              label="Follow-up Date (Optional)" 
              value={form.followUpDate}
              onChange={(e) => setForm(prev => ({ ...prev, followUpDate: e.target.value }))}
            />
            <Input 
              label="Job URL (Optional)" 
              placeholder="https://..." 
              value={form.jobUrl}
              onChange={(e) => setForm(prev => ({ ...prev, jobUrl: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Application Method *</label>
              <select 
                value={form.applicationMethod}
                onChange={(e) => setForm(prev => ({ ...prev, applicationMethod: e.target.value as ApplicationMethod }))}
                className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full outline-none"
                aria-label="Application Method"
              >
                {METHOD_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <Input 
              label="Company Website (Optional)" 
              placeholder="https://..." 
              value={form.companyWebsite || ''}
              onChange={(e) => setForm(prev => ({ ...prev, companyWebsite: e.target.value }))}
            />
          </div>

          <div className="border-t border-border/40 my-2 pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Recruiter Info (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input 
                label="Recruiter Name" 
                placeholder="Jane Doe" 
                value={form.recruiterName || ''}
                onChange={(e) => setForm(prev => ({ ...prev, recruiterName: e.target.value }))}
              />
              <Input 
                label="Recruiter Email" 
                placeholder="jane@company.com" 
                value={form.recruiterEmail || ''}
                onChange={(e) => setForm(prev => ({ ...prev, recruiterEmail: e.target.value }))}
              />
              <Input 
                label="Recruiter LinkedIn" 
                placeholder="https://linkedin.com/in/..." 
                value={form.recruiterLinkedIn || ''}
                onChange={(e) => setForm(prev => ({ ...prev, recruiterLinkedIn: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes (Optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Write down any additional context, contacts, salary range, or details..."
              className="min-h-[80px] p-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* Edit Application Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingApp(null);
        }}
        title="Edit Application Details"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditModalOpen(false);
              setEditingApp(null);
            }}>Cancel</Button>
            <Button 
              onClick={handleEditSubmit} 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleEditSubmit}>
          <Input 
            label="Company Name *" 
            placeholder="e.g. Stripe, Vercel" 
            value={form.company}
            onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
            required
          />
          <Input 
            label="Role / Title *" 
            placeholder="e.g. Frontend Engineer Intern" 
            value={form.role}
            onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job Source *</label>
              <select 
                value={form.platformId}
                onChange={(e) => {
                  if (e.target.value === 'ADD_NEW_PLATFORM') {
                    setIsQuickAddPlatformOpen(true);
                  } else {
                    setForm(prev => ({ ...prev, platformId: e.target.value }));
                  }
                }}
                className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full outline-none"
                aria-label="Job Source"
              >
                {platforms.map(plat => (
                  <option key={plat._id} value={plat._id}>{plat.name}</option>
                ))}
                <option value="ADD_NEW_PLATFORM">+ Add Platform...</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority *</label>
              <select 
                value={form.priority}
                onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value as ApplicationPriority }))}
                className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full outline-none"
                aria-label="Priority"
              >
                {PRIORITY_OPTIONS.map(pr => (
                  <option key={pr} value={pr}>{pr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status *</label>
              <select 
                value={form.status}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as ApplicationStatus }))}
                className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full outline-none"
                aria-label="Status"
              >
                {STATUS_OPTIONS.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <Input 
              type="date"
              label="Applied Date *" 
              value={form.appliedDate}
              onChange={(e) => setForm(prev => ({ ...prev, appliedDate: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              type="date"
              label="Follow-up Date (Optional)" 
              value={form.followUpDate}
              onChange={(e) => setForm(prev => ({ ...prev, followUpDate: e.target.value }))}
            />
            <Input 
              label="Job URL (Optional)" 
              placeholder="https://..." 
              value={form.jobUrl}
              onChange={(e) => setForm(prev => ({ ...prev, jobUrl: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Application Method *</label>
              <select 
                value={form.applicationMethod}
                onChange={(e) => setForm(prev => ({ ...prev, applicationMethod: e.target.value as ApplicationMethod }))}
                className="h-9 px-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-full outline-none"
                aria-label="Application Method"
              >
                {METHOD_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <Input 
              label="Company Website (Optional)" 
              placeholder="https://..." 
              value={form.companyWebsite || ''}
              onChange={(e) => setForm(prev => ({ ...prev, companyWebsite: e.target.value }))}
            />
          </div>

          <div className="border-t border-border/40 my-2 pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Recruiter Info (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input 
                label="Recruiter Name" 
                placeholder="Jane Doe" 
                value={form.recruiterName || ''}
                onChange={(e) => setForm(prev => ({ ...prev, recruiterName: e.target.value }))}
              />
              <Input 
                label="Recruiter Email" 
                placeholder="jane@company.com" 
                value={form.recruiterEmail || ''}
                onChange={(e) => setForm(prev => ({ ...prev, recruiterEmail: e.target.value }))}
              />
              <Input 
                label="Recruiter LinkedIn" 
                placeholder="https://linkedin.com/in/..." 
                value={form.recruiterLinkedIn || ''}
                onChange={(e) => setForm(prev => ({ ...prev, recruiterLinkedIn: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes (Optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Write down any additional context, contacts, salary range, or details..."
              className="min-h-[80px] p-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* Quick Add Platform Modal */}
      <Modal
        isOpen={isQuickAddPlatformOpen}
        onClose={() => setIsQuickAddPlatformOpen(false)}
        title="Add Custom Platform"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsQuickAddPlatformOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (!quickPlatformForm.name.trim()) {
                  showToast('Platform name is required', 'error');
                  return;
                }
                quickCreatePlatformMutation.mutate(quickPlatformForm);
              }} 
              disabled={quickCreatePlatformMutation.isPending}
            >
              {quickCreatePlatformMutation.isPending ? 'Creating...' : 'Create Platform'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input 
            label="Platform Name *" 
            placeholder="e.g. Wellfound, LinkedIn" 
            value={quickPlatformForm.name}
            onChange={(e) => setQuickPlatformForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input 
            label="Website URL" 
            placeholder="e.g. wellfound.com" 
            value={quickPlatformForm.website}
            onChange={(e) => setQuickPlatformForm(prev => ({ ...prev, website: e.target.value }))}
          />
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color Theme</label>
            <input 
              type="color"
              value={quickPlatformForm.color}
              onChange={(e) => setQuickPlatformForm(prev => ({ ...prev, color: e.target.value }))}
              className="w-10 h-10 border border-border rounded cursor-pointer p-0 bg-transparent"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
