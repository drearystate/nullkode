import {Trans} from '@common/i18n/trans';

export function InitialLoadingIndicator() {
  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-background">
      <div className="w-max">
        <div className="flex h-128 w-128 items-center justify-center rounded-full border border-divider/4 bg-background shadow">
          <div className="loader-grid grid grid-cols-3 gap-8">
            {Array.from({length: 9}).map((_, i) => (
              <Dot key={i} />
            ))}
          </div>
        </div>
        <div className="mt-14 text-center text-sm font-semibold uppercase text-muted">
          <Trans message="Loading..." />
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <div className="h-16 w-16 animate-pulse rounded-full bg-primary-light" />
  );
}
