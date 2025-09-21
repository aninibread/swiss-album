import React from 'react';
import { CssTooltip } from '../ui/Tooltip';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <CssTooltip />
      {/* Fixed Background */}
      <div className="fixed inset-0 -z-10" style={{
        background: 'linear-gradient(to right, rgb(240 250 235) 10%, rgb(230 245 250) 25%, rgb(201 220 235) 60%, rgb(200 220 200) 85%)'
      }}></div>
      
      <div className="min-h-screen text-stone-800">
        <div className="max-w-7xl mx-auto flex">
          {children}
        </div>
      </div>
    </>
  );
}