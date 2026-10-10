

export const Dialog = ({ open, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      {children}
    </div>
  );
};

export const DialogContent = ({ children, className = '' }: any) => {
  return (
    <div className={`relative bg-background border border-border shadow-lg rounded-xl w-full p-6 sm:max-w-md ${className}`}>
      {children}
    </div>
  );
};

export const DialogHeader = ({ children, className = '' }: any) => {
  return (
    <div className={`flex flex-col space-y-1.5 text-center sm:text-left mb-4 ${className}`}>
      {children}
    </div>
  );
};

export const DialogTitle = ({ children, className = '' }: any) => {
  return (
    <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );
};

export const DialogDescription = ({ children, className = '' }: any) => {
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>
      {children}
    </p>
  );
};

export const DialogFooter = ({ children, className = '' }: any) => {
  return (
    <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 ${className}`}>
      {children}
    </div>
  );
};
