import { useLayoutEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useDevice, useDeviceNetworkState } from "@/hooks/use-devices";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ArrowLeft, Network, Activity, Clock, Shield, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DeviceDetail() {
  const [, params] = useRoute("/devices/:id");
  const id = params ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { data: device, isLoading: loadingDevice, error: deviceError } = useDevice(id);
  const { data: networkState, isLoading: loadingNetwork } = useDeviceNetworkState(id);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Device deleted",
        description: "The device has been removed from your account.",
      });
      setLocation("/devices");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete device. Please try again.",
        variant: "destructive",
      });
    },
  });

  useLayoutEffect(() => {
    if (deviceError) {
      document.title = "Device Not Found | NetworkCloud";
    } else if (device) {
      document.title = `${device.name} | NetworkCloud`;
    }
  }, [device, deviceError]);

  if (deviceError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <h2 className="text-2xl font-bold mb-4" data-testid="text-device-not-found">Device Not Found</h2>
          <Button onClick={() => setLocation("/devices")} data-testid="button-go-back">Go Back</Button>
        </div>
      </Layout>
    );
  }

  const isLoading = loadingDevice || loadingNetwork;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Breadcrumb / Back */}
        <Button 
          variant="ghost" 
          className="pl-0 text-muted-foreground"
          onClick={() => setLocation("/devices")}
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : device && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-4xl font-display font-bold text-foreground mb-2" data-testid="text-device-name">{device.name}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <span className="font-mono bg-muted px-2 py-0.5 rounded" data-testid="text-device-id">DEV-{String(device.id).padStart(4, '0')}</span>
                  <span>•</span>
                  <span data-testid="text-device-created">Added {device.createdAt ? format(new Date(device.createdAt), 'PPP') : 'Unknown'}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={device.status} className="px-4 py-1.5 text-base" data-testid="badge-device-status" />
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="icon"
                      data-testid="button-delete-device"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle data-testid="text-delete-dialog-title">Delete this device?</AlertDialogTitle>
                      <AlertDialogDescription data-testid="text-delete-dialog-description">
                        This will permanently remove <strong>{device.name}</strong> from your account. 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                        data-testid="button-confirm-delete"
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete Device"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Main Info Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Network Card (Hero) */}
              <Card className="md:col-span-2 p-8 bg-gradient-to-br from-white to-slate-50 border-border shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                      <Network className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-lg" data-testid="text-network-config-heading">Network Configuration</h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2">
                        IP Address
                      </p>
                      <div className="font-mono text-4xl font-bold tracking-tight text-foreground bg-white/50 backdrop-blur w-fit px-4 py-2 rounded-xl border border-border/50 shadow-sm" data-testid="text-device-ip">
                        {networkState?.ipAddress || "Unknown"}
                      </div>
                    </div>

                    {networkState?.isLastKnown && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium border border-amber-100" data-testid="badge-last-known">
                        <Activity className="w-4 h-4" />
                        Showing last known configuration
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Details Side Panel */}
              <div className="space-y-6">
                <Card className="p-6 bg-white shadow-sm border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold" data-testid="text-activity-heading">Activity</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Seen</p>
                      <p className="font-medium" data-testid="text-device-last-seen">
                        {device.lastSeenAt 
                          ? format(new Date(device.lastSeenAt), 'PP pp') 
                          : 'Never'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Updated</p>
                      <p className="font-medium" data-testid="text-device-last-updated">
                        {networkState?.updatedAt 
                          ? format(new Date(networkState.updatedAt), 'PP pp') 
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white shadow-sm border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold" data-testid="text-security-heading">Security</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Encryption</span>
                      <span className="font-medium text-emerald-600" data-testid="text-encryption-status">Active</span>
                    </div>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Access Level</span>
                      <span className="font-medium" data-testid="text-access-level">Read-Only</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </Layout>
  );
}
