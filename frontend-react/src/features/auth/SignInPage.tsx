import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WarningCircle } from '@phosphor-icons/react';
import { Brand } from '@/components/ui/Brand/Brand';
import { ThemeToggle } from '@/components/ui/ThemeToggle/ThemeToggle';
import { Input } from '@/components/ui/Field/Field';
import { Button } from '@/components/ui/Button/Button';
import { useAuth } from './AuthContext';
import styles from './AuthPages.module.css';

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'TECHNICIAN') {
        navigate('/technician');
      } else {
        navigate('/employee');
      }
    } catch (err: any) {
      setError(err.message || "That email or password isn't right.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.heroContainer}>
      <header className={styles.heroHeader}>
        <Brand />
        <ThemeToggle />
      </header>

      <div className={styles.skyArea}>
        <h1 className={styles.displayBrand}>Service Desk</h1>
      </div>

      <main className={styles.panelWrapper}>
        <div className={styles.glassPanel}>
          <h2 className={styles.panelTitle}>Sign in</h2>

          {error && (
            <div className={styles.errorBanner} role="alert">
              <WarningCircle size={18} weight="light" />
              <span>{error}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <Input
              id="signin-email"
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />

            <Input
              id="signin-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="large"
              isLoading={isLoading}
            >
              Sign in
            </Button>

            <div className={styles.switchLink}>
              New here? <Link to="/register">Create an account</Link>
            </div>
          </form>
        </div>
      </main>

      <footer className={styles.floorArea}>
        <p className={styles.floorTagline}>
          Reliable service management. Engineered for clarity.
        </p>
      </footer>
    </div>
  );
};

