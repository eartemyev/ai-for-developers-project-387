interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Загрузка…' }: LoadingStateProps) {
  return <p className="status status--loading">{message}</p>;
}
