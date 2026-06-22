import { Layout } from './components/Layout';
import { useHashRoute } from './hooks/useHashRoute';
import { AdminPage } from './pages/AdminPage';
import { BookingPage } from './pages/BookingPage';
import { CatalogPage } from './pages/CatalogPage';

function App() {
  const { route, navigate } = useHashRoute();

  return (
    <Layout route={route} onNavigate={navigate}>
      {route.page === 'catalog' && <CatalogPage onNavigate={navigate} />}
      {route.page === 'booking' && (
        <BookingPage
          key={route.eventTypeId}
          eventTypeId={route.eventTypeId}
          onNavigate={navigate}
        />
      )}
      {route.page === 'admin' && <AdminPage />}
    </Layout>
  );
}

export default App;
