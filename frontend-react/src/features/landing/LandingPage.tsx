import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useScroll, useMotionValueEvent } from 'motion/react';
import { Bell, ArrowRight } from '@phosphor-icons/react';
import clsx from 'clsx';
import { Brand, BrandMark } from '@/components/ui/Brand/Brand';
import { ThemeToggle } from '@/components/ui/ThemeToggle/ThemeToggle';
import { Button } from '@/components/ui/Button/Button';
import { Segmented } from '@/components/ui/Segmented/Segmented';
import { LifecycleBar } from '@/components/ui/LifecycleBar/LifecycleBar';
import { StatTile } from '@/components/ui/StatTile/StatTile';
import { PriorityMarker } from '@/components/ui/PriorityMarker/PriorityMarker';
import { StatusLabel } from '@/components/ui/StatusLabel/StatusLabel';
import { useAuth } from '@/features/auth/AuthContext';
import { PRODUCT_NAME, IncidentStatus } from '@/lib/constants';
import styles from './LandingPage.module.css';

interface StageInfo {
  status: IncidentStatus;
  name: string;
  desc: string;
}

const STAGES: StageInfo[] = [
  {
    status: 'NEW',
    name: 'Report',
    desc: 'Capture the issue with clear impact, urgency, and affected service context.',
  },
  {
    status: 'ASSIGNED',
    name: 'Assign',
    desc: 'Route immediately with skill-weighted capacity assignment or balanced round-robin.',
  },
  {
    status: 'ACKNOWLEDGED',
    name: 'Acknowledge',
    desc: 'Technicians claim responsibility with immediate SLA countdown initiation.',
  },
  {
    status: 'IN_PROGRESS',
    name: 'Investigate',
    desc: 'Diagnose root causes with duplicate detection and resolution suggestions.',
  },
  {
    status: 'RESOLVED',
    name: 'Resolve',
    desc: 'Apply permanent fixes, document changes, and record resolution time metrics.',
  },
  {
    status: 'VERIFIED',
    name: 'Verify',
    desc: 'End users confirm the resolution before tickets ever settle into permanent records.',
  },
  {
    status: 'CLOSED',
    name: 'Close',
    desc: 'Complete the audit record with immutable timeline history and metric logs.',
  },
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [activeRole, setActiveRole] = useState<'employee' | 'technician' | 'admin'>('employee');
  const [islandState, setIslandState] = useState<'rest' | 'peek' | 'open'>('peek');
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const journeyRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: journeyRef,
    offset: ['start center', 'end center'],
  });

  useEffect(() => {
    const checkMotion = () => {
      const reduced =
        document.documentElement.getAttribute('data-reduced-motion') === 'true' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setIsReducedMotion(reduced);
      if (reduced) {
        setActiveStageIdx(6); // Show fully filled
      }
    };
    checkMotion();
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', checkMotion);
    return () => media.removeEventListener('change', checkMotion);
  }, []);

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (isReducedMotion) return;
    const clamped = Math.max(0, Math.min(0.999, latest));
    const stage = Math.floor(clamped * STAGES.length);
    setActiveStageIdx(stage);
  });

  const getWorkspaceUrl = () => {
    if (user?.role === 'ADMIN') return '/admin';
    if (user?.role === 'TECHNICIAN') return '/technician';
    return '/employee';
  };

  return (
    <div className={styles.pageContainer}>
      {/* ── 1. Top Bar (Glass) ── */}
      <header className={styles.topBar}>
        <Brand />
        <div className={styles.topBarRight}>
          <ThemeToggle />
          {user ? (
            <Link to={getWorkspaceUrl()}>
              <Button variant="primary" size="compact">
                Open your workspace
              </Button>
            </Link>
          ) : (
            <div className={styles.authButtons}>
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
        </div>
      </header>

      {/* ── 2. Hero: Horizon Scene (Cinematic Moment) ── */}
      <section className={styles.heroSection}>
        <div className={styles.heroUpperBand}>
          <div className={styles.heroDisplayBrand}>{PRODUCT_NAME}</div>
          <h1 className={styles.heroHeadline}>
            Every incident, from report to resolution.
          </h1>
          <p className={styles.heroSubline}>
            A quiet, precise service desk for modern teams. Built for zero noise,
            immediate clarity, and unyielding SLA adherence.
          </p>

          <div className={styles.heroCtas}>
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
          </div>
        </div>

        <div className={styles.heroFloor}>
          <p className={styles.heroFloorTagline}>
            ENGINEERED FOR TEAMS THAT CANNOT AFFORD DOWNTIME
          </p>
        </div>
      </section>

      {/* ── 3. The Journey (Sticky Lifecycle Bar) ── */}
      <section className={styles.section} ref={journeyRef}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Lifecycle Architecture</span>
          <h2 className={styles.sectionTitle}>The Incident Journey</h2>
          <p className={styles.sectionDesc}>
            Seven deliberate stages ensure total operational ownership without tickets falling through the cracks.
          </p>
        </div>

        <div className={styles.journeyContainer}>
          <aside className={styles.journeyStickyColumn}>
            <h3 className={styles.lifecycleStickyTitle}>Stage Progress</h3>
            <div className={styles.stageProgressIndicator}>
              <span>Stage {activeStageIdx + 1} of 7</span>
              <span>{STAGES[activeStageIdx].name}</span>
            </div>
            <LifecycleBar status={STAGES[activeStageIdx].status} />
          </aside>

          <div className={styles.stagesList}>
            {STAGES.map((s, idx) => {
              const isActive = idx === activeStageIdx;
              return (
                <article
                  key={s.status}
                  className={clsx(styles.stageItem, isActive && styles.stageItemActive)}
                >
                  <div className={styles.stageHeaderRow}>
                    <span className={styles.stageIndex}>0{idx + 1} // STAGE</span>
                    <StatusLabel status={s.status} />
                  </div>
                  <h4 className={styles.stageName}>{s.name}</h4>
                  <p className={styles.stageDescription}>{s.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. Roles Section ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Role-Specific Workspaces</span>
          <h2 className={styles.sectionTitle}>Built for every stakeholder</h2>
          <p className={styles.sectionDesc}>
            Tailored interfaces designed for reporting speed, tactical triage, and administrative oversight.
          </p>
        </div>

        <div className={styles.rolesControlWrapper}>
          <Segmented
            name="role-preview"
            value={activeRole}
            onChange={(val) => setActiveRole(val)}
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'technician', label: 'Technician' },
              { value: 'admin', label: 'Administrator' },
            ]}
          />
        </div>

        <div className="sr-only">
          Preview of the {activeRole} interface showing dedicated dashboard stats and real-time operational incident view.
        </div>

        <div className={styles.previewFrame} aria-hidden="true">
          {activeRole === 'employee' && (
            <>
              <div className={styles.previewStatsGrid}>
                <StatTile label="Active incidents" value={1} />
                <StatTile label="Awaiting verification" value={0} />
                <StatTile label="Resolved this month" value={4} />
              </div>
              <div className={styles.previewIncidentCard}>
                <div className={styles.previewCardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <PriorityMarker priority="P2" />
                    <h4 className={styles.previewIncidentTitle}>VPN connection drops after laptop standby</h4>
                  </div>
                  <StatusLabel status="IN_PROGRESS" />
                </div>
                <div className={styles.previewIncidentMeta}>
                  <span>INC-000109</span>
                  <span>•</span>
                  <span>Network & VPN</span>
                  <span>•</span>
                  <span>Reported 45m ago</span>
                </div>
                <LifecycleBar status="IN_PROGRESS" />
              </div>
            </>
          )}

          {activeRole === 'technician' && (
            <>
              <div className={styles.previewStatsGrid}>
                <StatTile label="Assigned to you" value={3} />
                <StatTile label="SLA at risk" value={1} changeText="1 warning" changeDirection="bad" />
                <StatTile label="Resolved today" value={5} changeText="On track" changeDirection="good" />
              </div>
              <div className={styles.previewIncidentCard}>
                <div className={styles.previewCardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <PriorityMarker priority="P1" />
                    <h4 className={styles.previewIncidentTitle}>Primary PostgreSQL read replica connection timeout</h4>
                  </div>
                  <StatusLabel status="IN_PROGRESS" />
                </div>
                <div className={styles.previewIncidentMeta}>
                  <span>INC-000114</span>
                  <span>•</span>
                  <span>Database Services</span>
                  <span>•</span>
                  <span style={{ color: 'var(--red)', fontWeight: 500 }}>SLA: 18m remaining</span>
                </div>
                <LifecycleBar status="IN_PROGRESS" />
              </div>
            </>
          )}

          {activeRole === 'admin' && (
            <>
              <div className={styles.previewStatsGrid}>
                <StatTile label="Open incidents" value={8} />
                <StatTile label="SLA compliance" value="98.4%" changeText="+1.2%" changeDirection="good" />
                <StatTile label="Average MTTR" value="38m" changeText="-6m this week" changeDirection="good" />
              </div>
              <div className={styles.previewIncidentCard}>
                <div className={styles.previewCardHeader}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', color: 'var(--text-3)', textTransform: 'uppercase' }}>
                      Automated Routing Policy
                    </span>
                    <h4 className={styles.previewIncidentTitle} style={{ marginTop: 'var(--space-1)' }}>
                      Skill-Weighted Capacity Distribution
                    </h4>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', color: 'var(--green)' }}>
                    Active
                  </span>
                </div>
                <div className={styles.previewIncidentMeta}>
                  <span>6 eligible technicians</span>
                  <span>•</span>
                  <span>14 catalog services configured</span>
                  <span>•</span>
                  <span>Zero unassigned queue</span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── 5. Capabilities: Editorial Hairline List (NOT CARDS) ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>System Architecture</span>
          <h2 className={styles.sectionTitle}>Capabilities engineered for resilience</h2>
          <p className={styles.sectionDesc}>
            Built from first principles for deterministic priority assessment, intelligent routing, and strict audit compliance.
          </p>
        </div>

        <div className={styles.hairlineList}>
          <div className={styles.hairlineItem}>
            <span className={styles.itemIndex}>01</span>
            <h3 className={styles.itemTitle}>Deterministic Priority Matrix</h3>
            <p className={styles.itemSummary}>
              Calculated automatically from impact (1–3), urgency (1–3), and service tier criticality.
              Eliminates emotional escalation and ensures engineering focus lands on true P1 outages first.
            </p>
          </div>

          <div className={styles.hairlineItem}>
            <span className={styles.itemIndex}>02</span>
            <h3 className={styles.itemTitle}>Interchangeable Dispatch Routing</h3>
            <p className={styles.itemSummary}>
              Administrators switch seamlessly between skill-weighted capacity assignment and balanced
              round-robin load balancing without taking the incident desk offline.
            </p>
          </div>

          <div className={styles.hairlineItem}>
            <span className={styles.itemIndex}>03</span>
            <h3 className={styles.itemTitle}>Proactive SLA Enforcement</h3>
            <p className={styles.itemSummary}>
              Unobtrusive visual warnings trigger at 80% elapsed time, escalating immediately upon breach.
              Keeps resolution clocks visible without generating continuous alert fatigue.
            </p>
          </div>

          <div className={styles.hairlineItem}>
            <span className={styles.itemIndex}>04</span>
            <h3 className={styles.itemTitle}>Tamper-Evident Audit Trail</h3>
            <p className={styles.itemSummary}>
              Every state transition, assignment re-route, and resolution note is immutably timestamped
              in the system ledger, providing airtight post-incident reviews.
            </p>
          </div>

          <div className={styles.hairlineItem}>
            <span className={styles.itemIndex}>05</span>
            <h3 className={styles.itemTitle}>The Island Notification System</h3>
            <p className={styles.itemSummary}>
              A quiet, unobtrusive ambient instrument that stays calm during normal operations, peeking
              only when critical updates arrive and expanding into a focused incident feed.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. The Island Strip Demo ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Ambient Notification Instrument</span>
          <h2 className={styles.sectionTitle}>The Island</h2>
          <p className={styles.sectionDesc}>
            Notifications should inform, never overwhelm. The Island remains silent until action is required.
          </p>
        </div>

        <div className={styles.islandDemoBox}>
          <Segmented
            name="island-state"
            value={islandState}
            onChange={(val) => setIslandState(val)}
            options={[
              { value: 'rest', label: 'Rest State' },
              { value: 'peek', label: 'Peek Banner' },
              { value: 'open', label: 'Open Feed' },
            ]}
          />

          <div className={styles.islandDemoStage}>
            {islandState === 'rest' && (
              <div className={styles.demoRestPill}>
                <Bell size={16} weight="light" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-meta)', fontWeight: 600 }}>
                  3
                </span>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'var(--red-fill)',
                  }}
                />
              </div>
            )}

            {islandState === 'peek' && (
              <div className={styles.demoPeekBox}>
                <div
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: 'var(--r-sm)',
                    backgroundColor: 'var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--line-1)',
                  }}
                >
                  <PriorityMarker priority="P1" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--fs-micro)',
                      color: 'var(--text-3)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Priority Incident • 2m ago
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--fs-body-s)',
                      fontWeight: 600,
                      color: 'var(--text-1)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Database replication connection timeout
                  </div>
                </div>
                <ArrowRight size={16} weight="light" color="var(--text-2)" />
              </div>
            )}

            {islandState === 'open' && (
              <div className={styles.demoOpenCard}>
                <div className={styles.demoOpenHeader}>
                  <span className={styles.demoOpenTitle}>Notifications (3 unread)</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--fs-micro)',
                      color: 'var(--text-3)',
                    }}
                  >
                    All caught up
                  </span>
                </div>
                <div className={styles.demoItemList}>
                  <div className={styles.demoItem}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: 'var(--red)',
                        marginTop: '0.4rem',
                      }}
                    />
                    <div className={styles.demoItemContent}>
                      <p className={styles.demoItemText}>
                        INC-000142 assigned to Priya Nair
                      </p>
                      <div className={styles.demoItemMeta}>
                        <span>2m ago</span>
                        <span className={styles.demoEmailedBadge}>Also emailed</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.demoItem}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: 'var(--red)',
                        marginTop: '0.4rem',
                      }}
                    />
                    <div className={styles.demoItemContent}>
                      <p className={styles.demoItemText}>
                        Incident INC-000139 moved to In progress
                      </p>
                      <div className={styles.demoItemMeta}>
                        <span>14m ago</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.demoItem}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: 'var(--red)',
                        marginTop: '0.4rem',
                      }}
                    />
                    <div className={styles.demoItemContent}>
                      <p className={styles.demoItemText}>
                        Resolution proposed for INC-000135
                      </p>
                      <div className={styles.demoItemMeta}>
                        <span>1h ago</span>
                        <span className={styles.demoEmailedBadge}>Also emailed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 7. Closing CTA & Minimal Footer ── */}
      <section className={styles.closingSection}>
        <h2 className={styles.closingHeadline}>Service management, refined.</h2>
        <p className={styles.closingSubline}>
          Zero noise, immediate clarity, and total accountability for your engineering services.
        </p>
        <div>
          {user ? (
            <Link to={getWorkspaceUrl()}>
              <Button variant="primary" size="large">
                Open your workspace
              </Button>
            </Link>
          ) : (
            <Link to="/register">
              <Button variant="primary" size="large">
                Start reporting incidents
              </Button>
            </Link>
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <BrandMark size={20} />
          <div className={styles.footerStatus}>
            <span className={styles.statusGreenDot} aria-hidden="true" />
            <span>Systems operational</span>
          </div>
        </div>

        <nav className={styles.footerLinks} aria-label="Footer navigation">
          {user ? (
            <Link to={getWorkspaceUrl()}>Workspace</Link>
          ) : (
            <>
              <Link to="/signin">Sign in</Link>
              <Link to="/register">Create account</Link>
            </>
          )}
        </nav>

        <p className={styles.footerCopy}>
          © 2026 {PRODUCT_NAME}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
