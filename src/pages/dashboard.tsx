import { useState } from 'react';
// import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Settings, LogOut, User, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useTheme } from '@/components/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SettingsModal from '@/components/models/setting-model';
import CreateSaleForm from '@/components/create-sales-form';
import SalesTable from '@/components/sales-table';
// import { productService } from '@/services/product-service';
// import { profitService } from '@/services/profit-service';

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  // const queryClient = useQueryClient();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateSaleOpen, setIsCreateSaleOpen] = useState(false);

  // const { data: products } = useQuery({
  //   queryKey: ['products'],
  //   queryFn: productService.getProducts,
  // });

  // const { data: profitRules } = useQuery({
  //   queryKey: ['profitRules'],
  //   queryFn: profitService.getProfitRules,
  // });

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="text-primary font-bold text-xl">PC</span>
                </div>
                <span className="font-semibold text-xl hidden sm:inline">Price Calculator</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setIsCreateSaleOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Sale
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SalesTable />
        </motion.div>
      </main>

      {/* Modals */}
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <CreateSaleForm open={isCreateSaleOpen} onOpenChange={setIsCreateSaleOpen} />
    </div>
  );
}