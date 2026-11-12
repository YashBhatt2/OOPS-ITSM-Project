import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useMotionValueEvent } from 'motion/react';
import { List, ArrowRight } from '@phosphor-icons/react';
import clsx from 'clsx';
import { Brand } from '@/components/ui/Brand/Brand';
import { ThemeToggle } from '@/components/ui/ThemeToggle/ThemeToggle';
import { Button } from '@/components/ui/Button/Button';
import { Dialog } from '@/components/ui/Dialog/Dialog';
import { LifecycleBar } from '@/components/ui/LifecycleBar/LifecycleBar';
import { PriorityMarker } from '@/components/ui/PriorityMarker/PriorityMarker';
import { StatusLabel } from '@/components/ui/StatusLabel/StatusLabel';
import { useAuth } from '@/features/auth/AuthContext';
import { spring } from '@/lib/constants';
import { INCIDENT_STORY, FACTS_STRIP, ROLE_STORIES, IncidentStageSnapshot } from './fixtures';
import styles from './LandingPage.module.css';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // SLA Ticking Clocks (Transform-free pure text updates without aria-live)
  const [heroSeconds, setHeroSeconds] = useState(82 * 60 + 4); // 01:22:04
  const [healthySeconds, setHealthySeconds] = useState(74 * 60 + 10); // 01:14:10
  const [breachedSeconds, setBreachedSeconds] = useState(18 * 60 + 42); // +00:18:42

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setHealthySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setBreachedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec: number) => {
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return { main: `${h}:${m}:`, tail: s };
  };

  // Check reduced motion
  useEffect(() => {
    const checkMotion = () => {
      const reduced =
        document.documentElement.getAttribute('data-reduced-motion') === 'true' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setIsReducedMotion(reduced);
      if (reduced) {
        setActiveStageIdx(INCIDENT_STORY.length - 1);
      }
    };
    checkMotion();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', checkMotion);
    return () => media.removeEventListener('change', checkMotion);
  }, []);

  // Lifecycle Story scroll tracking
  const storyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (isReducedMotion) return;
    const clamped = Math.max(0, Math.min(0.999, latest));
    const step = Math.floor(clamped * INCIDENT_STORY.length);
    setActiveStageIdx(step);
  });

  const getWorkspaceUrl = () => {
    if (user?.role === 'ADMIN') return '/admin';
    if (user?.role === 'TECHNICIAN') return '/technician';
    return '/employee';
  };

  const currentStage: IncidentStageSnapshot = INCIDENT_STORY[activeStageIdx] || INCIDENT_STORY[0];
  const heroTimer = formatTimer(heroSeconds);
  const healthyTimer = formatTimer(healthySeconds);
  const breachedTimer = formatTimer(breachedSeconds);

  return (
    <div className={styles.pageContainer}>
      {/* ── 1. Top Bar (Glass Chrome) ── */}
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <Brand />

          <nav className={styles.topBarNav} aria-label="Main navigation">
            <a href="#how-it-works" className={styles.navLink}>
              How it works
            </a>
            <a href="#roles" className={styles.navLink}>
              Roles
            </a>
            <a href="#sla" className={styles.navLink}>
              SLA
            </a>
          </nav>

          <div className={styles.topBarRight}>
            <ThemeToggle />

            {user ? (
              <Link to={getWorkspaceUrl()}>
                <Button variant="primary" size="compact">
                  Open your workspace
                </Button>
              </Link>
            ) : (
              <div className={styles.authGroup}>
                <Link to="/signin">
                  <Button variant="ghost" size="compact">
                    Sign in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="compact">
                    Create account
                  </Button>
                </Link>
              </div>
            )}

            <button
              type="button"
              className={styles.mobileMenuBtn}
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <List size={20} weight="light" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Dialog (Solid Surface, not glass) */}
      <Dialog
        open={isMobileMenuOpen}
        onOpenChange={setIsMobileMenuOpen}
        title="Navigation"
        size="small"
      >
        <div className={styles.mobileNavContent}>
          <a
            href="#how-it-works"
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            How it works
          </a>
          <a
            href="#roles"
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Roles
          </a>
          <a
            href="#sla"
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            SLA
          </a>

          <div className={styles.mobileNavActions}>
            {user ? (
              <Link to={getWorkspaceUrl()} onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="primary" size="large" style={{ width: '100%' }}>
                  Open your workspace
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="primary" size="large" style={{ width: '100%' }}>
                    Create account
                  </Button>
                </Link>
                <Link to="/signin" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" size="large" style={{ width: '100%' }}>
                    Sign in
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </Dialog>

      {/* ── 2. Hero: The One Cinematic Moment ── */}
      <section className={styles.heroSection}>
        <div className={styles.heroCore} aria-hidden="true" />
        <div className={styles.heroGrain} aria-hidden="true" />

        <div className={styles.heroContainer}>
          <div className={styles.heroLeft}>
            <motion.h1
              className={styles.heroHeadline}
              initial={isReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.snappy}
            >
              Every incident, seen through.
            </motion.h1>

            <motion.p
              className={styles.heroSubhead}
              initial={isReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.snappy, delay: isReducedMotion ? 0 : 0.08 }}
            >
              Service Desk carries an issue from the first report to a verified fix.
              The right technician, a clock that&apos;s always running, and a record of every step.
            </motion.p>

            <motion.div
              className={styles.heroCtas}
              initial={isReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.snappy, delay: isReducedMotion ? 0 : 0.16 }}
            >
              {user ? (
                <Link to={getWorkspaceUrl()}>
                  <Button variant="primary" size="large">
                    Open your workspace
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button variant="primary" size="large">
                      Get started
                    </Button>
                  </Link>
                  <Link to="/signin">
                    <Button variant="ghost" size="large">
                      Sign in
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </div>

          {/* Product Stage: Real incident card rising out of hero light */}
          <div className={styles.heroRight}>
            <motion.div
              className={styles.heroProductCard}
              initial={isReducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.snappy, delay: isReducedMotion ? 0 : 0.2 }}
              aria-hidden="true"
            >
              <div className={styles.cardHeaderRow}>
                <span className={styles.cardRef}>INC-000123</span>
                <StatusLabel status="IN_PROGRESS" />
              </div>

              <div>
                <h3 className={styles.cardTitle}>
                  Primary database replica connection timeout
                </h3>
                <div className={styles.cardMetaRow}>
                  <span>Database Services</span>
                  <span className={styles.cardDividerDot}>•</span>
                  <span>Infrastructure</span>
                </div>
              </div>

              <div className={styles.cardClockRow}>
                <span className={styles.clockLabel}>Resolution SLA</span>
                <span className={styles.clockDigits}>
                  {heroTimer.main}
                  <span className={styles.clockDimTail}>{heroTimer.tail}</span>
                </span>
              </div>

              <LifecycleBar status="IN_PROGRESS" />

              <div className={styles.cardFooterRow}>
                <span>Elena Rostova</span>
                <PriorityMarker priority="P1" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 3. Facts Strip (One Mono Line of Real Facts Only) ── */}
      <section className={styles.factsStrip} aria-label="System facts">
        <div className={styles.factsInner}>
          {FACTS_STRIP.map((fact, idx) => (
            <React.Fragment key={fact}>
              <span className={styles.factItem}>{fact}</span>
              {idx < FACTS_STRIP.length - 1 && (
                <span className={styles.factSeparator} aria-hidden="true">
                  /
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ── 4. The Lifecycle Story (Replaces Six Cards) ── */}
      <section id="how-it-works" className={styles.section} ref={storyRef}>
        <div className={styles.sectionEyebrow}>One incident, followed from report to fix</div>
        <h2 className={styles.sectionTitle}>The lifecycle of an issue</h2>
        <p className={styles.sectionDesc}>
          Follow incident INC-000123 through every phase of resolution.
          No ambiguous states, no lost tickets, and an immutable audit trail.
        </p>

        <div className={styles.storyGrid}>
          {/* Sticky Left Column: One Morphing Incident Surface */}
          <div className={styles.storyStickyColumn} aria-hidden="true">
            <div className={styles.stickySurfaceContainer}>
              <div className={styles.progressRail}>
                <div
                  className={styles.railIndicator}
                  style={{
                    height: `${((activeStageIdx + 1) / INCIDENT_STORY.length) * 100}%`,
                  }}
                />
                {INCIDENT_STORY.map((_, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      styles.railTick,
                      idx <= activeStageIdx && styles.railTickActive
                    )}
                  />
                ))}
              </div>

              <div className={styles.storySurfaceCard}>
                <div className={styles.surfaceMetaRow}>
                  <span className={styles.cardRef}>{currentStage.reference}</span>
                  <StatusLabel status={currentStage.status} />
                </div>

                <div>
                  <h3 className={styles.cardTitle}>{currentStage.title}</h3>
                  <div className={styles.cardMetaRow}>
                    <span>{currentStage.service}</span>
                    <span className={styles.cardDividerDot}>•</span>
                    <span>Reporter: {currentStage.reporter}</span>
                  </div>
                </div>

                <LifecycleBar status={currentStage.status} />

                <div className={styles.cardClockRow}>
                  <span className={styles.clockLabel}>
                    {currentStage.status === 'NEW'
                      ? 'Target Deadline'
                      : currentStage.status === 'VERIFIED'
                      ? 'Total Elapsed Time'
                      : 'Resolution SLA Remaining'}
                  </span>
                  <span className={styles.clockDigits}>
                    {currentStage.status === 'VERIFIED'
                      ? currentStage.slaElapsed
                      : currentStage.slaRemaining}
                  </span>
                </div>

                {currentStage.notes.length > 0 && (
                  <div className={styles.surfaceNotesBox}>
                    {currentStage.notes.map((n, i) => (
                      <div key={i} className={styles.noteItem}>
                        <div className={styles.noteHeader}>
                          <span>{n.author}</span>
                          {n.isInternal && (
                            <span className={styles.internalBadge}>• Internal note</span>
                          )}
                          <span>• {n.time}</span>
                        </div>
                        <p className={styles.noteText}>{n.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {currentStage.resolution && (
                  <div className={styles.resolutionBox}>
                    <div className={styles.resolutionLabel}>Resolution recorded</div>
                    <p className={styles.resolutionText}>{currentStage.resolution}</p>
                  </div>
                )}

                <div className={styles.cardFooterRow}>
                  <span>
                    {currentStage.assignee
                      ? `${currentStage.assignee} (${currentStage.assigneeRole})`
                      : 'Unassigned'}
                  </span>
                  <PriorityMarker priority={currentStage.priority} />
                </div>

                {currentStage.auditBadge && (
                  <div className={styles.auditBadgeBox}>
                    {currentStage.auditBadge}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Six Clean Steps with Hairlines (NO CARDS) */}
          <div className={styles.stepsColumn}>
            {INCIDENT_STORY.map((stage, idx) => {
              const isActive = idx === activeStageIdx;
              return (
                <div
                  key={stage.stepNumber}
                  className={styles.stepRow}
                  style={{
                    opacity: isReducedMotion ? 1 : isActive ? 1 : 0.45,
                  }}
                >
                  <div className={styles.stepHeader}>
                    <span
                      className={clsx(
                        styles.stepNumber,
                        isActive && styles.stepNumberActive
                      )}
                    >
                      {stage.stepNumber}
                    </span>
                    <h3 className={styles.stepTitle}>{stage.stepTitle}</h3>
                  </div>

                  <p className={styles.stepSummary}>{stage.stepSummary}</p>

                  {/* Compact Preview on Mobile */}
                  <div className={styles.mobileStepPreview} aria-hidden="true">
                    <div className={styles.cardClockRow} style={{ marginTop: 'var(--space-2)' }}>
                      <span className={styles.clockLabel}>Status: {stage.statusLabel}</span>
                      <span className={styles.clockDigits} style={{ fontSize: 'var(--fs-body)' }}>
                        {stage.assignee || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. Three Roles (Three Hairline Columns, Real-UI Vignettes, NO CARDS) ── */}
      <section id="roles" className={styles.section}>
        <div className={styles.sectionEyebrow}>Responsibility and reach</div>
        <h2 className={styles.sectionTitle}>Three roles. Absolute clarity.</h2>
        <p className={styles.sectionDesc}>
          Every user has one role and one focused interface. Permissions are strictly
          checked on the backend.
        </p>

        <div className={styles.rolesGrid}>
          {ROLE_STORIES.map((role) => (
            <div key={role.id} className={styles.roleColumn}>
              <div className={styles.roleTitleRow}>
                <span className={styles.roleTagline}>{role.tagline}</span>
                <h3 className={styles.roleTitle}>{role.title}</h3>
              </div>
              <p className={styles.roleDesc}>{role.description}</p>

              {/* Real UI Vignettes */}
              <div className={styles.roleVignette} aria-hidden="true">
                {role.id === 'employee' && (
                  <>
                    <div className={styles.vignetteMeta}>
                      <span>EMPLOYEE VIEW</span>
                      <StatusLabel status="IN_PROGRESS" />
                    </div>
                    <h4 className={styles.vignetteTitle}>
                      INC-000123: Primary database replica connection timeout
                    </h4>
                    <div className={styles.cardMetaRow}>
                      <span>Reported by you</span>
                      <span className={styles.cardDividerDot}>•</span>
                      <span>1 open ticket</span>
                    </div>
                  </>
                )}

                {role.id === 'technician' && (
                  <>
                    <div className={styles.vignetteMeta}>
                      <span>ASSIGNED QUEUE</span>
                      <PriorityMarker priority="P1" />
                    </div>
                    <h4 className={styles.vignetteTitle}>
                      INC-000123: Database replica timeout
                    </h4>
                    <div className={styles.vignetteMeta} style={{ color: 'var(--text-2)' }}>
                      <span>SLA: 01:22:04</span>
                      <span>3 of 5 active slots in use</span>
                    </div>
                  </>
                )}

                {role.id === 'admin' && (
                  <>
                    <div className={styles.vignetteMeta}>
                      <span>DISPATCH RECOMMENDATION</span>
                      <span style={{ color: 'var(--green)', fontWeight: 500 }}>98% match</span>
                    </div>
                    <h4 className={styles.vignetteTitle}>
                      Elena Rostova (PostgreSQL L5)
                    </h4>
                    <div className={styles.vignetteMeta} style={{ color: 'var(--text-2)' }}>
                      <span>Capacity: 2 of 5 slots</span>
                      <span>Skill-first routing</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. SLA Moment (Calm, Large Mono Clock Numerals, Exactly One Red Element) ── */}
      <section id="sla" className={styles.slaSection}>
        <div className={styles.sectionEyebrow}>Deadline visibility</div>
        <h2 className={styles.sectionTitle}>
          Clocks run on elapsed time. When one slips, you see it.
        </h2>
        <p className={styles.sectionDesc}>
          Deadlines are calculated from cycle opening and never pause. Proactive warnings
          trigger at 80% elapsed time, and breaches escalate immediately to administrators.
        </p>

        <div className={styles.slaGrid}>
          {/* Healthy SLA State (Silence is good, shows nothing special) */}
          <div className={styles.slaBlock}>
            <div className={styles.slaStatusHeader}>
              <span className={styles.slaStateLabel}>P1 Resolution SLA • Healthy</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', color: 'var(--text-3)' }}>
                Target: 2h 00m
              </span>
            </div>

            <div className={styles.slaClockNumeral} aria-label="Healthy SLA countdown">
              {healthyTimer.main}
              <span className={styles.slaClockTail}>{healthyTimer.tail}</span>
            </div>

            <p className={styles.slaCaption}>
              Silence is good. While milestones remain on schedule, the system operates
              quietly without unnecessary alerts.
            </p>
          </div>

          {/* Breached SLA State (Single red signal on the page) */}
          <div className={clsx(styles.slaBlock, styles.slaBlockBreached)}>
            <div className={styles.slaStatusHeader}>
              <span className={styles.slaStateLabel} style={{ color: 'var(--red)' }}>
                Response SLA • Escalated
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--red)', fontSize: 'var(--fs-micro)', fontWeight: 600 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'var(--red)',
                  }}
                  aria-hidden="true"
                />
                Breached
              </span>
            </div>

            <div
              className={clsx(styles.slaClockNumeral, styles.slaClockNumeralBreached)}
              aria-label="Breached SLA elapsed time"
            >
              +{breachedTimer.main}
              <span className={styles.slaClockTailBreached}>{breachedTimer.tail}</span>
            </div>

            <p className={styles.slaCaption}>
              When a deadline passes, it escalates immediately to administrators.
              Recorded violations are durable and never erased.
            </p>
          </div>
        </div>
      </section>

      {/* ── 7. Closing Section & Minimal Project Footer ── */}
      <section className={styles.closingSection}>
        <h2 className={styles.closingHeadline}>Ready when the next one comes in.</h2>
        <p className={styles.closingSubline}>
          Zero noise, immediate clarity, and total accountability for your service desk.
        </p>

        <div className={styles.closingCtas}>
          {user ? (
            <Link to={getWorkspaceUrl()}>
              <Button variant="primary" size="large">
                Open your workspace
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button variant="primary" size="large">
                  Create account
                </Button>
              </Link>
              <Link to="/signin">
                <Button variant="ghost" size="large">
                  Sign in
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <Brand />
          </div>

          <nav className={styles.footerLinks} aria-label="Footer navigation">
            <a href="#how-it-works" className={styles.footerLink}>
              How it works
            </a>
            <a href="#roles" className={styles.footerLink}>
              Roles
            </a>
            <a href="#sla" className={styles.footerLink}>
              SLA
            </a>
            {user ? (
              <Link to={getWorkspaceUrl()} className={styles.footerLink}>
                Workspace
              </Link>
            ) : (
              <>
                <Link to="/signin" className={styles.footerLink}>
                  Sign in
                </Link>
                <Link to="/register" className={styles.footerLink}>
                  Create account
                </Link>
              </>
            )}
          </nav>

          <span className={styles.footerCourseTag}>
            Course project, BITS Pilani Hyderabad
          </span>
        </div>
      </footer>
    </div>
  );
};
