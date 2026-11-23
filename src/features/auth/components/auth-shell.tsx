import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
  footer,
  theme,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  theme?: "student";
}) {
  return (
    <main data-theme={theme} className="flex flex-1 flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-2 p-4">
        <AppNav />
        <div className="flex gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {children}
            {footer && <div className="text-center text-sm">{footer}</div>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
