import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { CardSkeleton } from '../components/ui/Skeleton';
import { 
  Bookmark, 
  Trash2, 
  ExternalLink, 
  Briefcase, 
  Calendar, 
  Plus, 
  ArrowUpRight 
} from 'lucide-react';

// Platforms are loaded dynamically

export const SavedJobs: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const initialFormState = {
    company: '',
    role: '',
    platformId: '',
    jobUrl: '',
    notes: '',
  };
  const [form, setForm] = useState(initialFormState);

  // Queries
  const { data: platforms = [] } = useQuery({
    queryKey: ['platforms'],
    queryFn: api.getPlatforms,
  });

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

  // Update default platform once platforms are loaded
  useEffect(() => {
    if (platforms.length > 0 && !form.platformId) {
      const defaultPlatformId = platforms.find(p => p.isDefault)?._id || platforms[0]?._id || '';
      setForm(prev => ({ ...prev, platformId: defaultPlatformId }));
    }
  }, [platforms]);

  // Queries
  const { data: savedJobs = [], isLoading, isError, error } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: api.getSavedJobs,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: api.createSavedJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      setIsAddModalOpen(false);
      showToast('Job bookmarked successfully', 'success');
      setForm(initialFormState);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to save job bookmark', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteSavedJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      showToast('Job bookmark deleted', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete job bookmark', 'error');
    },
  });

  const applyMutation = useMutation({
    mutationFn: api.applySavedJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      showToast('Application created! Bookmark removed.', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to apply saved job', 'error');
    },
  });

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

  // Actions
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
    createMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-destructive/30 rounded-lg bg-destructive/5 p-8 text-center space-y-4">
        <Bookmark className="h-12 w-12 text-rose-500" />
        <h3 className="text-lg font-semibold text-foreground">Failed to load Saved Jobs</h3>
        <p className="text-muted-foreground max-w-sm">
          {error instanceof Error ? error.message : 'An error occurred.'}
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Saved Jobs</h1>
          <p className="text-muted-foreground mt-1">Bookmark positions you find interesting and apply whenever you're ready.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Save Job
        </Button>
      </div>

      {savedJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-border rounded-lg bg-card text-center space-y-4">
          <div className="p-4 bg-muted/60 dark:bg-muted/30 rounded-full">
            <Bookmark className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-foreground">No saved jobs yet</p>
            <p className="text-sm text-muted-foreground max-w-[320px] mx-auto leading-normal">
              Found a job but not ready to apply? Save it here so you don't lose the link.
            </p>
          </div>
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>Save a Job Bookmark</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedJobs.map((job) => (
            <Card key={job._id} className="hover:border-primary/20 transition-all flex flex-col justify-between group">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <CardTitle className="text-lg line-clamp-1">{job.company}</CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3" /> {job.role}
                      </CardDescription>
                    </div>
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-full border font-semibold inline-flex items-center"
                      style={{
                        color: job.platformId?.color || '#6B7280',
                        borderColor: `${job.platformId?.color || '#6B7280'}20`,
                        backgroundColor: `${job.platformId?.color || '#6B7280'}10`
                      }}
                    >
                      {job.platformId?.name || 'Unknown'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 space-y-3">
                  {job.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 dark:bg-muted/10 p-2.5 rounded border border-border/50">
                      {job.notes}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                      Saved {new Date(job.savedDate || job.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    {job.jobUrl && (
                      <a 
                        href={job.jobUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-1 hover:text-foreground text-primary/80 transition-colors font-semibold"
                      >
                        <ExternalLink className="h-3 w-3" /> Job Link
                      </a>
                    )}
                  </div>
                </CardContent>
              </div>

              <div className="p-4 border-t border-border/60 bg-muted/10 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20"
                  onClick={() => deleteMutation.mutate(job._id)}
                  disabled={deleteMutation.isPending || applyMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => applyMutation.mutate(job._id)}
                  disabled={applyMutation.isPending || deleteMutation.isPending}
                  className="flex items-center gap-1.5"
                >
                  {applyMutation.isPending ? 'Applying...' : <>Apply Now <ArrowUpRight className="h-3.5 w-3.5" /></>}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Saved Job Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Bookmark a Job"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddSubmit} 
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Job'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleAddSubmit}>
          <Input 
            label="Company Name *" 
            placeholder="e.g. Google, Stripe" 
            value={form.company}
            onChange={(e) => setForm(prev => ({ ...prev, company: e.target.value }))}
            required
          />
          <Input 
            label="Role / Title *" 
            placeholder="e.g. Software Engineer Intern" 
            value={form.role}
            onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
            required
          />

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

          <Input 
            label="Job Listing URL (Optional)" 
            placeholder="https://..." 
            value={form.jobUrl}
            onChange={(e) => setForm(prev => ({ ...prev, jobUrl: e.target.value }))}
          />

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes (Optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Salary range, description, referral notes, contact names..."
              className="min-h-[90px] p-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none"
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
