import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { WarningCircle, Check } from '@phosphor-icons/react';
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login(email, password);
      setIsSuccess(true);
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          if (user.role === 'ADMIN') {
            navigate('/admin');
          } else if (user.role === 'TECHNICIAN') {
            navigate('/technician');
          } else {
            navigate('/employee');
          }
        }, 280);
      }, 700);
    } catch (err: any) {
      setError(err.message || "That email or password isn't right.");
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
            {isSuccess ? (
              <motion.div
                key="auth-success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={styles.authSuccessBox}
              >
                <motion.div
                  initial={{ scale: 0.6, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  className={styles.checkOrb}
                >
                  <Check size={28} weight="bold" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={styles.authSuccessTitle}
                >
                  Authenticated
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className={styles.authSuccessSub}
                >
                  Loading workspace…
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
              >
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
