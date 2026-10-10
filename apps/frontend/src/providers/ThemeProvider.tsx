import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { FC, ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="light" 
      forcedTheme="light"
      enableSystem={false}
      storageKey="nm_theme"
      disableTransitionOnChange={true}
    >
      {children}
    </NextThemesProvider>
  );
};
