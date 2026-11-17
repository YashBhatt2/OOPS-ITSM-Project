import React, { useState } from 'react';
import { Nav } from '@/components/ui/Nav/Nav';
import { Button } from '@/components/ui/Button/Button';
import { emitIslandDevAction } from '@/components/ui/Island/islandDevBridge';
import styles from './DevIslandPlayground.module.css';

export const DevIslandPlayground: React.FC = () => {
  const [logMessage, setLogMessage] = useState<string>('Ready to test Island events.');

  let seq = Date.now();

  const handleFireNormal = () => {
    seq++;
    const id = `notif-${seq}`;
    emitIslandDevAction({
      type: 'FIRE_NOTIFICATION',
      notification: {
        id,
        incidentId: 'INC-000201',
        message: 'INC-000201 assigned to Priya Nair',
        createdAt: new Date().toISOString(),
        readAt: null,
        emailDelivered: false,
        priority: 'P3',
        slaStatus: 'ON_TRACK',
      },
    });
    setLogMessage('Fired normal P3 notification (5s auto-collapse).');
  };

  const handleFireAtRisk = () => {
    seq++;
    const id = `notif-${seq}`;
    emitIslandDevAction({
      type: 'FIRE_NOTIFICATION',
      notification: {
        id,
        incidentId: 'INC-000202',
        message: 'INC-000202 SLA at 80% threshold for VPN Gateway Service',
        createdAt: new Date().toISOString(),
        readAt: null,
        emailDelivered: true,
        priority: 'P2',
        slaStatus: 'AT_RISK',
      },
    });
    setLogMessage('Fired P2 At-Risk notification (amber indicator).');
  };

  const handleFireBreach = () => {
    seq++;
    const id = `notif-${seq}`;
    emitIslandDevAction({
      type: 'FIRE_NOTIFICATION',
      notification: {
        id,
        incidentId: 'INC-000203',
        message: 'INC-000203 SLA BREACH: Production PostgreSQL Cluster unresponsive',
        createdAt: new Date().toISOString(),
        readAt: null,
        emailDelivered: true,
        priority: 'P1',
        slaStatus: 'BREACHED',
      },
    });
    setLogMessage('Fired P1 SLA Breach notification (red pulse, border trace, 8s timer, vibration).');
  };

  const handleFireBurst = () => {
    seq++;
    const notifications = Array.from({ length: 10 }, (_, i) => ({
      id: `burst-${seq}-${i}`,
      incidentId: `INC-00021${i}`,
      message: `INC-00021${i}: High load anomaly detected on worker node ${i + 1}`,
      createdAt: new Date(Date.now() - i * 60000).toISOString(),
      readAt: null,
      emailDelivered: i % 2 === 0,
      priority: (i === 0 ? 'P1' : i < 3 ? 'P2' : 'P3') as any,
      slaStatus: i === 0 ? 'BREACHED' : 'ON_TRACK',
    }));

    emitIslandDevAction({
      type: 'FIRE_BURST',
      notifications,
    });
    setLogMessage('Fired burst of 10 notifications (coalesced into newest + 9 more).');
  };

  const handleFireLongMessage = () => {
    seq++;
    const id = `notif-${seq}`;
    emitIslandDevAction({
      type: 'FIRE_NOTIFICATION',
      notification: {
        id,
        incidentId: 'INC-000204',
        message:
          'INC-000204: An exceptionally long diagnostic message detailing a transient TLS handshake socket timeout exception occurring between edge ingress gateways and the internal payment dispatch pipeline during peak traffic burst.',
        createdAt: new Date().toISOString(),
        readAt: null,
        emailDelivered: true,
        priority: 'P2',
        slaStatus: 'AT_RISK',
      },
    });
    setLogMessage('Fired very long message (1 line ellipsis in peek, 2 lines in open card).');
  };

  const handleSetEmpty = () => {
    emitIslandDevAction({ type: 'SET_EMPTY' });
    setLogMessage('Set Island state to empty ("Nothing new.").');
  };

  const handleSetError = () => {
    emitIslandDevAction({
      type: 'SET_ERROR',
      error: "Can't refresh",
    });
    setLogMessage('Simulated polling error notice in open card ("Can\'t refresh").');
  };

  const handleReset = () => {
    emitIslandDevAction({ type: 'RESET' });
    setLogMessage('Reset Island to live backend data.');
  };

  const handleToggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <>
      <Nav role="ADMIN" userDisplayName="Dev Tester" />

      <main className={styles.playgroundContainer}>
        <header className={styles.playgroundHeader}>
          <div className={styles.devBadge}>Dev Only • Vite Development Mode</div>
          <h1 className={styles.title}>The Island Dev Playground</h1>
          <p className={styles.desc}>
            Interactive test harness for tuning Island motion, springs, gestures, and edge cases.
            Watch the Island in the top bar as actions trigger.
          </p>
        </header>

        <div className={styles.contentGrid}>
          {/* Action Trigger Card */}
          <section className={styles.controlCard}>
            <h2 className={styles.cardTitle}>Trigger Test Events</h2>
            <p className={styles.cardSubtitle}>Status: {logMessage}</p>

            <div className={styles.buttonGrid}>
              <Button variant="secondary" onClick={handleFireNormal}>
                Normal P3 Update
              </Button>
              <Button variant="secondary" onClick={handleFireAtRisk}>
                P2 At Risk (Amber)
              </Button>
              <Button variant="destructive" onClick={handleFireBreach}>
                P1 SLA Breach (Red Trace)
              </Button>
              <Button variant="secondary" onClick={handleFireBurst}>
                Burst of 10 Items
              </Button>
              <Button variant="secondary" onClick={handleFireLongMessage}>
                Very Long Message
              </Button>
              <Button variant="ghost" onClick={handleSetEmpty}>
                Empty State
              </Button>
              <Button variant="ghost" onClick={handleSetError}>
                Error Notice ("Can't refresh")
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Reset to Live API
              </Button>
            </div>
          </section>

          {/* Environment Controls */}
          <section className={styles.controlCard}>
            <h2 className={styles.cardTitle}>Environment & Appearance</h2>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Button variant="secondary" size="compact" onClick={handleToggleTheme}>
                Toggle Obsidian / Ceramic Theme
              </Button>
            </div>
          </section>

          {/* Gesture & Keyboard Guide */}
          <section className={styles.controlCard}>
            <h2 className={styles.cardTitle}>Gestures & Shortcuts Guide</h2>
            <ul className={styles.guideList}>
              <li className={styles.guideItem}>
                <span className={styles.guideTag}>Drag down</span>
                <span>Drag down on the pill to spring-open the notification card.</span>
              </li>
              <li className={styles.guideItem}>
                <span className={styles.guideTag}>Swipe up</span>
                <span>Swipe up on the open card to dismiss it back to pill rest.</span>
              </li>
              <li className={styles.guideItem}>
                <span className={styles.guideTag}>Swipe left</span>
                <span>On touch devices, swipe an unread notification left to mark it read.</span>
              </li>
              <li className={styles.guideItem}>
                <span className={styles.guideTag}>Hover check</span>
                <span>With pointer/mouse, hover over an unread row to reveal the quick mark-read check button.</span>
              </li>
              <li className={styles.guideItem}>
                <span className={styles.guideTag}>Key N</span>
                <span>Press N anywhere outside inputs to toggle the Island open or closed.</span>
              </li>
              <li className={styles.guideItem}>
                <span className={styles.guideTag}>Escape</span>
                <span>Press Escape to collapse the Island.</span>
              </li>
              <li className={styles.guideItem}>
                <span className={styles.guideTag}>Hover peek</span>
                <span>Hover or focus on a peek banner to pause the auto-collapse timer.</span>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </>
  );
};

export default DevIslandPlayground;
