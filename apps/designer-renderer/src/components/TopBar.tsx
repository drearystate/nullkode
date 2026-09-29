import { useT } from '@open-codesign/i18n';
import { Wordmark } from '@open-codesign/ui';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { type CSSProperties, useEffect } from 'react';
import { type HubTab, useCodesignStore } from '../store';
import { useUiPrefs } from '../state/ui-prefs';
import { LanguageToggle } from './LanguageToggle';
import { NullkodeNav } from './NullkodeNav';
import { SwitchToBuilderButton } from './SwitchToBuilder';

export const TOPBAR_DRAG_SPACER_TEST_ID = 'topbar-drag-spacer';

export const dragStyle = { WebkitAppRegion: 'drag' } as CSSProperties;
export const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties;

const HUB_TABS: HubTab[] = ['recent', 'all', 'examples', 'resources'];

const topbarButtonClass =
  'inline-flex h-9 items-center rounded-[var(--radius-sm)] px-[var(--space-2_5)] text-[var(--text-sm)] leading-none whitespace-nowrap transition-colors duration-[var(--duration-faster)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]';

export function TopBar() {
  const t = useT();
  const setView = useCodesignStore((s) => s.setView);
  const view = useCodesignStore((s) => s.view);
  const previousView = useCodesignStore((s) => s.previousView);
  const currentDesignId = useCodesignStore((s) => s.currentDesignId);
  const designs = useCodesignStore((s) => s.designs);
  const currentDesign = designs.find((d) => d.id === currentDesignId);
  const hubTab = useCodesignStore((s) => s.hubTab);
  const setHubTab = useCodesignStore((s) => s.setHubTab);
  const brand = useUiPrefs((st) => st.brand);
  const loadMe = useUiPrefs((st) => st.loadMe);

  // Brand (name + logo) comes from the server — the platform is white-label.
  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  return (
    <header
      className="h-[56px] sm:h-[var(--size-titlebar-height)] shrink-0 flex min-w-0 items-center gap-2 sm:gap-[var(--space-3)] pl-3 pr-3 sm:pl-6 sm:pr-[var(--space-5)] select-none overflow-hidden"
      style={{
        ...dragStyle,
        borderBottom: '1px solid oklch(0.22 0.025 50 / 0.08)',
        background: 'var(--color-background)',
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-[var(--space-6)] h-full">
        <div className={`min-w-0 shrink ${view === 'hub' ? 'hidden sm:block' : 'hidden lg:block'}`}>
          <Wordmark size="md" name={brand?.name ?? null} logoUrl={brand?.logoUrl ?? null} />
        </div>

        {view === 'settings' ? (
          <div className="flex items-center gap-[var(--space-2)] min-w-0">
            <span style={{ color: 'oklch(0.22 0.025 50 / 0.2)' }}>/</span>
            <button
              type="button"
              onClick={() => setView(previousView === 'settings' ? 'hub' : previousView)}
              aria-label={t('topbar.closeSettings')}
              className={`${topbarButtonClass} gap-[6px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]`}
              style={{
                ...noDragStyle,
              }}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
              <span className="truncate">{t('topbar.settingsLabel')}</span>
            </button>
          </div>
        ) : view === 'hub' ? (
          <nav
            className="codesign-scroll-x flex h-full min-w-0 items-center gap-[var(--space-1)] overflow-x-auto overflow-y-hidden"
            aria-label={t('hub.tabs.all')}
          >
            {HUB_TABS.map((tab) => {
              const active = tab === hubTab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setHubTab(tab)}
                  aria-current={active ? 'page' : undefined}
                  className={`${topbarButtonClass} relative shrink-0 font-medium`}
                  style={{
                    ...noDragStyle,
                    color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    background: active ? 'var(--color-accent-tint)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--color-text-muted)';
                  }}
                >
                  {t(`hub.tabs.${tab}`)}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute left-[var(--space-2_5)] right-[var(--space-2_5)] bottom-0 h-[2px] rounded-full"
                      style={{ background: 'var(--color-accent)' }}
                    />
                  ) : null}
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="flex items-center gap-[var(--space-2)] min-w-0">
            <button
              type="button"
              onClick={() => setView('hub')}
              aria-label={t('topbar.openMyDesigns')}
              className={`${topbarButtonClass} shrink-0 gap-[6px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]`}
              style={noDragStyle}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">{t('topbar.backToDesigns')}</span>
            </button>
            <span className="hidden sm:inline" style={{ color: 'oklch(0.22 0.025 50 / 0.2)' }}>/</span>
            <button
              type="button"
              onClick={() => setView('hub')}
              aria-label={t('topbar.openMyDesigns')}
              className={`${topbarButtonClass} min-w-0 max-w-[420px] gap-[6px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]`}
              style={{
                ...noDragStyle,
              }}
            >
              <FolderOpen className="hidden w-4 h-4 shrink-0 sm:block" aria-hidden />
              <span className="truncate" title={currentDesign?.name ?? ''}>
                {currentDesign?.name ?? t('sidebar.noDesign')}
              </span>
            </button>
          </div>
        )}
      </div>

      <div
        data-testid={TOPBAR_DRAG_SPACER_TEST_ID}
        className="hidden min-w-[16px] flex-none self-stretch sm:block"
        style={dragStyle}
      />

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-[var(--space-2)]">
        {/* One editor per app: hand this design's app over to the page
            builder (asks first), or open it there once it has moved. */}
        {view === 'workspace' ? <SwitchToBuilderButton /> : null}
        <div className="hidden items-center gap-[var(--space-1)] md:flex" style={noDragStyle}>
          <LanguageToggle />
        </div>
        {/* Platform nav: your apps / Admin / account menu. */}
        <NullkodeNav />
      </div>
    </header>
  );
}
