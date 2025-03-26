import { useAuth } from '../hooks/useAuth';
import LoginButton from '../components/LoginButton';
import { Navigate } from 'react-router-dom';

const Login = () => {
  const { user, loading, login } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Login</h1>
        <LoginButton onClick={login} />
      </div>
    </div>
  );
};

export default Login;