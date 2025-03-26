import { useAuth } from '../hooks/useAuth';
import LogoutButton from '../components/LogoutButton';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, loading, logout } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="mb-2">Welcome, {user.displayName}</p>
        <p className="mb-4">Email: {user.email}</p>
        <LogoutButton onClick={logout} />
      </div>
    </div>
  );
};

export default Dashboard;