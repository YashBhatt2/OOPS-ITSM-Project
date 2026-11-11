import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { WarningCircle } from '@phosphor-icons/react';
import { Brand } from '@/components/ui/Brand/Brand';
import { ThemeToggle } from '@/components/ui/ThemeToggle/ThemeToggle';
import { Input } from '@/components/ui/Field/Field';
import { Button } from '@/components/ui/Button/Button';
import { AuthFaceIdMorph } from './AuthFaceIdMorph';
import { useAuth } from './AuthContext';
import styles from './AuthPages.module.css';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    setIsLoading(true);

    try {
      await register(displayName, email, password);
      // Automatically log the new employee in
      await login(email, password);
      setIsSuccess(true);
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          navigate('/employee');
        }, 280);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'We could not create your account. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className={styles.heroContainer}
      animate={{
        opacity: isExiting ? 0 : 1,
        filter: isExiting ? 'blur(16px)' : 'blur(0px)',
        scale: isExiting ? 0.98 : 1,
      }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={styles.heroHeader}>
        <Brand />
        <ThemeToggle />
      </header>

      <div className={styles.skyArea}>
        <h1 className={styles.displayBrand}>Service Desk</h1>
      </div>

      <main className={styles.panelWrapper}>
        <motion.div
          layoutId="auth-glass-card"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className={styles.glassPanel}
        >
          <AnimatePresence mode="wait">
            {isLoading || isSuccess ? (
              <motion.div
                key="reg-face-id"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <AuthFaceIdMorph
                  status={isSuccess ? 'authenticated' : 'authenticating'}
                  title={isSuccess ? 'Account created' : 'Creating account…'}
                  subtitle={isSuccess ? 'Welcome to Service Desk…' : 'Registering credentials with server'}
                />
              </motion.div>
            ) : (
              <motion.div
                key="reg-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
              >
                <h2 className={styles.panelTitle}>Create an account</h2>

                {error && (
                  <div className={styles.errorBanner} role="alert">
                    <WarningCircle size={18} weight="light" />
                    <span>{error}</span>
                  </div>
                )}

                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  <Input
                    id="register-name"
                    label="Full name"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />

                  <Input
                    id="register-email"
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />

                  <Input
                    id="register-password"
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    helperText="Must be between 12 and 72 characters."
                    required
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="large"
                    isLoading={isLoading}
                  >
                    Create account
                  </Button>

                  <div className={styles.switchLink}>
                    Already have an account? <Link to="/signin">Sign in</Link>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <footer className={styles.floorArea}>
        <p className={styles.floorTagline}>
          Reliable service management. Engineered for clarity.
        </p>
      </footer>
    </motion.div>
  );
};
