import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings, Trash2, Key } from "lucide-react";
import logoUrl from "@/assets/logo.png";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/account");
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently removed.",
      });
      window.location.href = "/login";
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = () => {
    setShowDeleteDialog(false);
    deleteAccountMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <img src={logoUrl} alt="NetworkCloud" className="h-8 w-8 object-contain" data-testid="img-logo-header" />
              <span className="font-semibold text-foreground hidden sm:inline">NetworkCloud</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/devices">
                <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.startsWith('/devices') ? 'text-primary' : 'text-muted-foreground'}`} data-testid="nav-dashboard">
                  Dashboard
                </span>
              </Link>
              <Link href="/agent-tokens">
                <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer flex items-center gap-1 ${location === '/agent-tokens' ? 'text-primary' : 'text-muted-foreground'}`} data-testid="nav-agent-tokens">
                  <Key className="w-3.5 h-3.5" />
                  Agent Tokens
                </span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profile" className="w-6 h-6 rounded-full" data-testid="img-user-avatar" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-foreground" data-testid="text-user-name">{user?.firstName || 'User'}</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-muted-foreground"
                  data-testid="button-settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => setShowDeleteDialog(true)}
                  data-testid="menu-item-delete-account"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => logout()}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 md:px-6 py-8 md:py-12 bg-gradient-to-b from-background via-background to-secondary/10">
        {children}
      </main>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account 
              and remove all your devices and data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
