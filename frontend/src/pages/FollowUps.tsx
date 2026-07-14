import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Application } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Drawer } from '../components/ui/Drawer';
import { TableSkeleton } from '../components/ui/Skeleton';
import { 
  Bell, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Briefcase,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const FollowUps: React.FC = () => {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Queries
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.getApplications(),
  });

  const { data: activeApp, isLoading: isAppDetailsLoading } = useQuery({
    queryKey: ['application', selectedAppId],
    queryFn: () => api.getApplication(selectedAppId!),
    enabled: !!selectedAppId && isDrawerOpen,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse" />
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  // Parse follow-up dates and group
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);
  today.setHours(0,0,0,0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overdueList: Application[] = [];
  const todayList: Application[] = [];
  const tomorrowList: Application[] = [];
  const upcomingList: Application[] = [];

  applications.forEach((app) => {
    if (!app.followUpDate) return;

    const followUp = new Date(app.followUpDate.split('T')[0]);
    followUp.setHours(0,0,0,0);

    const diffTime = followUp.getTime() - today.getTime();
    
    if (diffTime < 0) {
      overdueList.push(app);
    } else if (diffTime === 0) {
      todayList.push(app);
    } else if (diffTime === 86400000) {
      tomorrowList.push(app);
    } else {
      upcomingList.push(app);
    }
  });

  // Sort helper
  const sortByDate = (a: Application, b: Application) => {
    return new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime();
  };

  overdueList.sort(sortByDate);
  todayList.sort(sortByDate);
  tomorrowList.sort(sortByDate);
  upcomingList.sort(sortByDate);

  const handleCardClick = (appId: string) => {
    setSelectedAppId(appId);
    setIsDrawerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Applied': return <Badge variant="info">Applied</Badge>;
      case 'OA': return <Badge variant="warning">OA</Badge>;
      case 'Assignment': return <Badge variant="secondary">Assignment</Badge>;
      case 'Interview': return <Badge variant="warning">Interview</Badge>;
      case 'HR Round': return <Badge variant="warning">HR Round</Badge>;
      case 'Offer': return <Badge variant="success">Offer</Badge>;
      case 'Rejected': return <Badge variant="danger">Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderSection = (
    title: string, 
    list: Application[], 
    colorClass: string, 
    icon: React.ReactNode,
    emptyMessage: string
  ) => {
    return (
      <Card className="flex flex-col h-full bg-card/60">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              {icon}
              <span className={colorClass}>{title}</span>
            </CardTitle>
            <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {list.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[500px]">
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-8">{emptyMessage}</p>
          ) : (
            list.map((app) => (
              <div
                key={app._id}
                onClick={() => handleCardClick(app._id)}
                className="border border-border/60 hover:border-primary/20 bg-background/50 hover:bg-muted/30 p-3.5 rounded-lg cursor-pointer transition-all space-y-2 group shadow-sm"
              >
                <div className="flex justify-between items-start gap-1">
                  <h4 className="text-xs font-bold text-foreground line-clamp-1">{app.company}</h4>
                  <span className="flex-shrink-0">{getStatusBadge(app.status)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{app.role}</p>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                  <span className="flex items-center gap-1 font-semibold text-foreground/80">
                    <Calendar className="h-3 w-3" />
                    {new Date(app.followUpDate!).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  };

  const hasAnyFollowUps = overdueList.length > 0 || todayList.length > 0 || tomorrowList.length > 0 || upcomingList.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Follow-ups</h1>
        <p className="text-muted-foreground mt-1">Keep track of upcoming tasks, follow-up deadlines, and overdue check-ins.</p>
      </div>

      {!hasAnyFollowUps ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-border rounded-lg bg-card text-center space-y-4">
          <div className="p-4 bg-muted/60 dark:bg-muted/30 rounded-full">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-foreground">You are all caught up!</p>
            <p className="text-sm text-muted-foreground max-w-[320px] mx-auto leading-normal">
              No follow-ups scheduled. Set a follow-up date inside any job application to schedule reminders.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Overdue */}
          {renderSection(
            'Overdue', 
            overdueList, 
            'text-rose-500', 
            <AlertTriangle className="h-4 w-4 text-rose-500" />,
            'No overdue check-ins!'
          )}

          {/* Today */}
          {renderSection(
            'Today', 
            todayList, 
            'text-amber-500', 
            <Bell className="h-4 w-4 text-amber-500 animate-pulse" />,
            'Nothing scheduled for today.'
          )}

          {/* Tomorrow */}
          {renderSection(
            'Tomorrow', 
            tomorrowList, 
            'text-blue-500', 
            <Clock className="h-4 w-4 text-blue-500" />,
            'No follow-ups for tomorrow.'
          )}

          {/* Upcoming */}
          {renderSection(
            'Upcoming', 
            upcomingList, 
            'text-indigo-500', 
            <Calendar className="h-4 w-4 text-indigo-500" />,
            'No upcoming tasks scheduled.'
          )}
        </div>
      )}

      {/* Details Side Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAppId(null);
        }}
        title="Application Details"
      >
        {isAppDetailsLoading || !activeApp ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-foreground">{activeApp.company}</h3>
              <p className="text-muted-foreground text-sm flex items-center gap-1 mt-0.5">
                <Briefcase className="h-3.5 w-3.5" /> {activeApp.role}
              </p>
            </div>
            
            <div className="h-px bg-border/60" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Status</label>
                <div>{getStatusBadge(activeApp.status)}</div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Follow-up Date</label>
                <div className="text-foreground font-semibold flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(activeApp.followUpDate!).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>

            {activeApp.notes && (
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Notes</label>
                <div className="text-xs border border-border/80 rounded-md p-3.5 bg-card text-foreground min-h-[80px] whitespace-pre-wrap leading-relaxed">
                  {activeApp.notes}
                </div>
              </div>
            )}

            {activeApp.jobUrl && (
              <a 
                href={activeApp.jobUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
              >
                <ExternalLink className="h-4.5 w-4.5" /> Open job listing webpage
              </a>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
