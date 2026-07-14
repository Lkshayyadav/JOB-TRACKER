import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { 
  Plus, 
  Calendar, 
  AlertCircle, 
  ArrowRight,
  Activity,
  Zap,
  Layers,
  Percent,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Load dashboard data via TanStack Query
  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Applied':
        return <Badge variant="info">Applied</Badge>;
      case 'OA':
        return <Badge variant="warning">OA</Badge>;
      case 'Assignment':
        return <Badge variant="secondary">Assignment</Badge>;
      case 'Interview':
        return <Badge variant="warning">Interview</Badge>;
      case 'HR Round':
        return <Badge variant="warning">HR Round</Badge>;
      case 'Offer':
        return <Badge variant="success">Offer</Badge>;
      case 'Rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'Withdrawn':
        return <Badge variant="secondary">Withdrawn</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-muted rounded animate-pulse" />
        </div>
        
        {/* Skeleton stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 w-36 bg-muted rounded animate-pulse" />
            <TableSkeleton rows={4} />
          </div>
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Error fallback state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-destructive/30 rounded-lg bg-destructive/5 p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="text-lg font-semibold text-foreground">Failed to load Dashboard</h3>
        <p className="text-muted-foreground max-w-sm">
          {error instanceof Error ? error.message : 'An error occurred while connecting to the database server.'}
        </p>
        <Button onClick={() => window.location.reload()}>Retry Request</Button>
      </div>
    );
  }

  const counts = stats?.statusCounts || {
    Applied: 0,
    OA: 0,
    Assignment: 0,
    Interview: 0,
    'HR Round': 0,
    Offer: 0,
    Rejected: 0,
    Withdrawn: 0,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track and manage your professional career search progress.</p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => navigate('/applications', { state: { openAddModal: true } })}
        >
          <Plus className="h-4 w-4" /> Add Application
        </Button>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Applications */}
        <Card className="hover:border-primary/20 transition-all glow-card">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Applications</span>
              <h2 className="text-3.5xl font-bold text-foreground">{stats?.activeApplications || 0}</h2>
              <p className="text-[10px] text-muted-foreground">Jobs currently in progress</p>
            </div>
            <div className="p-3 bg-secondary/80 rounded-md">
              <Layers className="h-5 w-5 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        {/* Applications This Week */}
        <Card className="hover:border-primary/20 transition-all glow-card">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted This Week</span>
              <h2 className="text-3.5xl font-bold text-foreground">{stats?.applicationsThisWeek || 0}</h2>
              <p className="text-[10px] text-muted-foreground">Applications in last 7 days</p>
            </div>
            <div className="p-3 bg-secondary/80 rounded-md">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Applications This Month */}
        <Card className="hover:border-primary/20 transition-all glow-card">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted This Month</span>
              <h2 className="text-3.5xl font-bold text-foreground">{stats?.applicationsThisMonth || 0}</h2>
              <p className="text-[10px] text-muted-foreground">Applications in last 30 days</p>
            </div>
            <div className="p-3 bg-secondary/80 rounded-md">
              <Calendar className="h-5 w-5 text-sky-500" />
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="hover:border-primary/20 transition-all glow-card">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1 w-full mr-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Success Rate</span>
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-3.5xl font-bold text-foreground">{stats?.successRate || 0}%</h2>
                <p className="text-[10px] text-muted-foreground">Offers vs Total jobs</p>
              </div>
              {/* Mini visual indicator */}
              <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats?.successRate || 0, 100)}%` }}
                />
              </div>
            </div>
            <div className="p-3 bg-secondary/80 rounded-md flex-shrink-0">
              <Percent className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Status Counts Summary */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Pipeline Status Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { label: 'Total', count: stats?.totalApplications || 0, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
              { label: 'Applied', count: counts.Applied, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'OA', count: counts.OA, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Assignment', count: counts.Assignment, color: 'text-purple-500', bg: 'bg-purple-500/10' },
              { label: 'Interview', count: counts.Interview, color: 'text-sky-500', bg: 'bg-sky-500/10' },
              { label: 'HR Round', count: counts['HR Round'], color: 'text-pink-500', bg: 'bg-pink-500/10' },
              { label: 'Offer', count: counts.Offer, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Rejected', count: counts.Rejected, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
                <span className="text-xs font-semibold text-muted-foreground block text-center mb-1">{stat.label}</span>
                <span className={`text-xl font-bold ${stat.color} ${stat.bg} px-2.5 py-0.5 rounded-full`}>{stat.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Applications By Platform Analytics */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Applications By Platform</h3>
          {!stats?.applicationsByPlatform || stats.applicationsByPlatform.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No platform metrics recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.applicationsByPlatform.map((plat: any, i: number) => {
                const total = stats.totalApplications || 1;
                const percentage = Math.round((plat.count / total) * 100);
                return (
                  <div key={i} className="flex flex-col space-y-2 p-4 rounded-lg border border-border/60 bg-muted/15 relative overflow-hidden">
                    {/* Corner glow */}
                    <div 
                      className="absolute -right-2 -top-2 w-12 h-12 rounded-full opacity-10 blur-md"
                      style={{ backgroundColor: plat.color || '#6B7280' }}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: plat.color || '#6B7280' }} 
                        />
                        <span className="text-xs font-semibold text-foreground">{plat.platformName}</span>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">{plat.count} jobs ({percentage}%)</span>
                    </div>
                    {/* Custom progress bar */}
                    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 animate-pulse-once"
                        style={{ 
                          backgroundColor: plat.color || '#6B7280',
                          width: `${percentage}%` 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Applications Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent Applications</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/applications')}
              className="flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          {!stats || !stats.recentApplications || stats.recentApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border rounded-lg bg-card text-center space-y-4">
              <div className="p-3 bg-muted rounded-full">
                <HelpCircle className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No applications tracked yet</p>
                <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                  Add internships and jobs to begin tracking your recruitment progress.
                </p>
              </div>
              <Button size="sm" onClick={() => navigate('/applications', { state: { openAddModal: true } })}>
                Add Job Application
              </Button>
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Applied Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats.recentApplications || []).map((app) => (
                    <TableRow 
                      key={app._id} 
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => navigate('/applications', { state: { selectedAppId: app._id } })}
                    >
                      <TableCell className="font-semibold text-foreground">{app.company}</TableCell>
                      <TableCell className="text-muted-foreground">{app.role}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {new Date(app.appliedDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Side panels (Follow-ups & Recent Activity logs) */}
        <div className="space-y-6">
          {/* Follow-ups Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Follow-ups Due Today</CardTitle>
              <CardDescription>Actions requiring feedback check-ins or reminders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!stats || !stats.followUpsDueToday || stats.followUpsDueToday.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-md bg-muted/10 space-y-2">
                  <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto" />
                  <p className="text-xs font-semibold text-foreground">You are all caught up!</p>
                  <p className="text-[10px] text-muted-foreground max-w-[200px] mx-auto">
                    No follow-ups scheduled for today.
                  </p>
                </div>
              ) : (
                (stats.followUpsDueToday || []).map((app) => (
                  <div 
                    key={app._id} 
                    className="border border-border/80 rounded-md p-3.5 bg-muted/15 space-y-2 hover:bg-muted/25 cursor-pointer transition-colors"
                    onClick={() => navigate('/applications', { state: { selectedAppId: app._id } })}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-foreground text-xs line-clamp-1">{app.company}</span>
                      <span className="flex-shrink-0">{getStatusBadge(app.status)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{app.role}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Global Recent Activity Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-indigo-500" /> Recent Activity
              </CardTitle>
              <CardDescription>Live timeline stream of pipeline logs.</CardDescription>
            </CardHeader>
            <CardContent>
              {!stats || !stats.recentActivity || stats.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs italic">
                  No activity events logged yet.
                </div>
              ) : (
                <div className="relative pl-4 space-y-4 border-l border-border/80 ml-1.5">
                  {(stats.recentActivity || []).map((activity) => (
                    <div key={activity._id} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full border border-border bg-background">
                        <span className="h-1 w-1 rounded-full bg-indigo-500 animate-pulse" />
                      </span>

                      <div className="text-xs space-y-0.5">
                        <div className="flex justify-between gap-1 items-start">
                          <span className="font-bold text-foreground hover:underline cursor-pointer" onClick={() => navigate('/applications', { state: { selectedAppId: activity.applicationId } })}>
                            {activity.company}
                          </span>
                          <span className="text-[9px] text-muted-foreground/80 flex-shrink-0">
                            {new Date(activity.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          {activity.note}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
