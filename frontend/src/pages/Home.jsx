import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

const Home = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to the App</h1>
        {user ? (
          <Link to="/dashboard" className="text-blue-500 hover:underline">
            Go to Dashboard
          </Link>
        ) : (
          <Link to="/login" className="text-blue-500 hover:underline">
            Please Login
          </Link>
        )}
      </div>
    </div>
  );
};

export default Home;