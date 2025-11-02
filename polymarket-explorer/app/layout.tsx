'use client';
import type React from 'react';
import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import '@/globals.css';
export const metadata = {
title: 'Polymarket Explorer',
description: 'Explore live Polymarket prediction markets',
};
export default function RootLayout({ children }: { children: ReactNode }) {
return (
&lt;html lang="en" suppressHydrationWarning&gt;
&lt;body className="flex flex-col min-h-screen bg-gradient-to-b from-slate-950 to-sla
&lt;Header /&gt;
&lt;main className="flex-1"&gt;
{children}
&lt;/main&gt;
&lt;Footer /&gt;
&lt;/body&gt;
&lt;/html&gt;
);
}
