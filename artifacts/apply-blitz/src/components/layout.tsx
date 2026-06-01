import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Search, 
  Briefcase, 
  Wand2, 
  UserCircle, 
  Settings,
  LogOut,
  Zap,
  ScanText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBanner } from "@/components/notification-banner";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Find Jobs", icon: Search },
  { href: "/applications", label: "My Applications", icon: Briefcase },
  { href: "/ai", label: "AI Tailor", icon: Wand2 },
  { href: "/resume-analyzer", label: "Resume Analyzer", icon: ScanText },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-md">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">ApplyBlitz</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group font-medium text-sm",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-secondary hover:text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-white")} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-border">
          <button className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-white hover:bg-secondary rounded-md transition-colors">
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <NotificationBanner />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
