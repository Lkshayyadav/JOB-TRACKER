import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Platform } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { CardSkeleton } from '../components/ui/Skeleton';
import { 
  Globe, 
  Trash2, 
  Edit2, 
  ExternalLink, 
  Plus, 
  Check, 
  Briefcase, 
  Bookmark, 
  Info,
  Search
} from 'lucide-react';

const PRESETS = [
  { name: 'LinkedIn Blue', hex: '#0077B5' },
  { name: 'Wellfound Black', hex: '#000000' },
  { name: 'Internshala Blue', hex: '#008BD2' },
  { name: 'Unstop Navy', hex: '#1C4980' },
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Rose', hex: '#EF4444' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Slate', hex: '#6B7280' },
];

export const Platforms: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Active states
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [platformToDelete, setPlatformToDelete] = useState<Platform | null>(null);
  const [migrationPlatformId, setMigrationPlatformId] = useState('');

  // Form State
  const initialFormState = {
    name: '',
    website: '',
    logo: '',
    color: '#4F46E5',
    description: '',
    isDefault: false
  };
  const [form, setForm] = useState(initialFormState);

  // 1. Queries
  const { data: platforms = [], isLoading, isError, error } = useQuery({
    queryKey: ['platforms-stats'],
    queryFn: api.getPlatformStats,
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: api.createPlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      setIsFormModalOpen(false);
      showToast('Platform created successfully', 'success');
      setForm(initialFormState);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create platform', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Platform> }) => 
      api.updatePlatform(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      setIsFormModalOpen(false);
      showToast('Platform updated successfully', 'success');
      setSelectedPlatform(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update platform', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, moveTo }: { id: string; moveTo?: string }) => 
      api.deletePlatform(id, moveTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsDeleteModalOpen(false);
      setPlatformToDelete(null);
      setMigrationPlatformId('');
      showToast('Platform deleted successfully', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete platform', 'error');
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: api.setDefaultPlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms-stats'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      showToast('Default platform updated', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update default platform', 'error');
    }
  });

  // 3. Actions
  const handleOpenAdd = () => {
    setForm(initialFormState);
    setSelectedPlatform(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (p: Platform) => {
    setSelectedPlatform(p);
    setForm({
      name: p.name,
      website: p.website || '',
      logo: p.logo || '',
      color: p.color || '#4F46E5',
      description: p.description || '',
      isDefault: p.isDefault
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (p: Platform) => {
    setPlatformToDelete(p);
    // Find first other platform to migrate to by default
    const firstOther = platforms.find(other => other._id !== p._id);
    setMigrationPlatformId(firstOther ? firstOther._id : '');
    setIsDeleteModalOpen(true);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Platform name is required', 'error');
      return;
    }
    if (form.website && !isValidUrl(form.website)) {
      showToast('Please enter a valid Website URL', 'error');
      return;
    }

    if (selectedPlatform) {
      updateMutation.mutate({ id: selectedPlatform._id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDeleteSubmit = () => {
    if (!platformToDelete) return;
    
    const isUsed = (platformToDelete.applicationsCount || 0) > 0 || (platformToDelete.savedJobsCount || 0) > 0;
    
    if (isUsed && !migrationPlatformId) {
      showToast('Please select another platform to migrate records to.', 'error');
      return;
    }

    deleteMutation.mutate({ 
      id: platformToDelete._id, 
      moveTo: isUsed ? migrationPlatformId : undefined 
    });
  };

  // 4. Client Side Filter
  const filteredPlatforms = platforms.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <Globe className="h-12 w-12 text-rose-500" />
        <h3 className="text-lg font-semibold text-foreground">Failed to load Platforms</h3>
        <p className="text-muted-foreground max-w-sm">
          {error instanceof Error ? error.message : 'An error occurred while fetching platforms.'}
        </p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['platforms-stats'] })}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Management</h1>
          <p className="text-muted-foreground mt-1">Organize and manage your custom job hunt pipelines, portals, and referral sources.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2 self-start md:self-auto">
          <Plus className="h-4 w-4" /> Add Platform
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search platforms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {filteredPlatforms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-border rounded-lg bg-card text-center space-y-4">
          <div className="p-4 bg-muted/60 dark:bg-muted/30 rounded-full">
            <Globe className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-foreground">No platforms found</p>
            <p className="text-sm text-muted-foreground max-w-[320px] mx-auto leading-normal">
              {searchTerm ? "Try clearing or editing your search keyword to see results." : "Create your first job hunting platform to track applications."}
            </p>
          </div>
          {!searchTerm && <Button size="sm" onClick={handleOpenAdd}>Create Platform</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlatforms.map((p) => (
              <Card 
                key={p._id} 
                className="hover:border-primary/30 transition-all flex flex-col justify-between group overflow-hidden relative"
              >
                {/* Color Strip Indicator */}
                <div 
                  className="h-1.5 w-full absolute top-0 left-0" 
                  style={{ backgroundColor: p.color || '#4F46E5' }} 
                />

                <div className="pt-5">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        {/* Fallback Round Logo */}
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
                          style={{ backgroundColor: p.color || '#4F46E5' }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg line-clamp-1 flex items-center gap-1.5">
                            {p.name}
                            {p.isDefault && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/20">
                                Default
                              </Badge>
                            )}
                          </CardTitle>
                          {p.website && (
                            <a 
                              href={p.website.startsWith('http') ? p.website : `https://${p.website}`}
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs text-primary/80 hover:text-foreground inline-flex items-center gap-1 mt-0.5"
                            >
                              <ExternalLink className="h-3 w-3" /> Visit Website
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4 space-y-4">
                    {p.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                        {p.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 italic min-h-[2rem]">
                        No description provided.
                      </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-md">
                          <Briefcase className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase">Applications</p>
                          <p className="text-sm font-bold text-foreground">{p.applicationsCount || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-500/10 rounded-md">
                          <Bookmark className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase">Saved Jobs</p>
                          <p className="text-sm font-bold text-foreground">{p.savedJobsCount || 0}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Actions */}
                <div className="p-4 border-t border-border/40 bg-muted/10 flex justify-between gap-2">
                  <div>
                    {!p.isDefault && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setDefaultMutation.mutate(p._id)}
                        disabled={setDefaultMutation.isPending}
                      >
                        Set Default
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenEdit(p)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20"
                      onClick={() => handleOpenDelete(p)}
                      disabled={p.isDefault && platforms.length > 1}
                      title={p.isDefault && platforms.length > 1 ? "Cannot delete the default platform. Make another platform default first." : ""}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Platform Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={selectedPlatform ? "Edit Platform" : "Add Platform"}
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsFormModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Platform'}
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input 
            label="Platform Name *" 
            placeholder="e.g. LinkedIn, Wellfound" 
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          <Input 
            label="Website URL" 
            placeholder="e.g. linkedin.com" 
            value={form.website}
            onChange={(e) => setForm(prev => ({ ...prev, website: e.target.value }))}
          />

          <Input 
            label="Logo URL (Optional)" 
            placeholder="e.g. https://domain.com/logo.png" 
            value={form.logo}
            onChange={(e) => setForm(prev => ({ ...prev, logo: e.target.value }))}
          />

          {/* Color Picker & Presets */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Color Theme</label>
            <div className="flex gap-3 items-center">
              <input 
                type="color"
                value={form.color}
                onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                className="w-10 h-10 border border-border rounded cursor-pointer p-0 bg-transparent"
                title="Choose Color"
              />
              <Input 
                value={form.color}
                onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                placeholder="#HEXCODE"
                className="flex-1"
              />
            </div>
            {/* Presets Grid */}
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, color: preset.hex }))}
                  className="w-6 h-6 rounded-full border border-border/80 relative flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                >
                  {form.color.toLowerCase() === preset.hex.toLowerCase() && (
                    <Check className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description (Optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Keep quick notes about job boards, profiles, referral networks..."
              className="min-h-[80px] p-3 border border-input bg-background rounded-md text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring outline-none"
            />
          </div>

          {/* Default Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox"
              id="isDefault"
              checked={form.isDefault}
              onChange={(e) => setForm(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="h-4 w-4 border border-input bg-background rounded text-primary focus:ring-1 focus:ring-ring"
            />
            <label htmlFor="isDefault" className="text-sm text-foreground font-medium select-none cursor-pointer">
              Set as Default Platform
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete / Migration Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Platform"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button 
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
              onClick={handleDeleteSubmit} 
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Are you sure you want to delete platform <strong className="text-rose-500">{platformToDelete?.name}</strong>?
          </p>

          {platformToDelete && ((platformToDelete.applicationsCount || 0) > 0 || (platformToDelete.savedJobsCount || 0) > 0) ? (
            <div className="p-4 border border-rose-500/20 bg-rose-500/5 rounded-lg space-y-3">
              <div className="flex items-start gap-2.5">
                <Info className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Platform is currently in use</h4>
                  <div className="flex gap-4 mt-2 text-sm text-foreground font-medium">
                    <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> Applications: {platformToDelete.applicationsCount || 0}</span>
                    <span className="flex items-center gap-1.5"><Bookmark className="h-4 w-4" /> Saved Jobs: {platformToDelete.savedJobsCount || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Migrate active records to:
                </label>
                <select
                  value={migrationPlatformId}
                  onChange={(e) => setMigrationPlatformId(e.target.value)}
                  className="h-9 px-3 border border-rose-500/20 bg-background rounded-md text-sm outline-none w-full"
                  aria-label="Migration Platform Selection"
                >
                  <option value="" disabled>-- Select Destination Platform --</option>
                  {platforms
                    .filter(other => other._id !== platformToDelete._id)
                    .map(other => (
                      <option key={other._id} value={other._id}>{other.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              This platform is not linked to any active applications or bookmarks, so it can be deleted immediately.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};
