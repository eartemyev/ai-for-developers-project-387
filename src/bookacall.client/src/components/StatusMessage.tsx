interface StatusMessageProps {
  variant: 'error' | 'success' | 'info';
  children: React.ReactNode;
}

export function StatusMessage({ variant, children }: StatusMessageProps) {
  return <p className={`status status--${variant}`}>{children}</p>;
}
