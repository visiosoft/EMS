import { InternalPageHero } from '../components/InternalPageHero';
import { VenuesExplorer } from '../components/venues/VenuesExplorer';
import { WeeklyRecapSection } from '../components/WeeklyRecapSection';
import { InternalPageFrame } from '../layout/InternalPageFrame';

export function VenuesPage() {
  return (
    <InternalPageFrame footer={<WeeklyRecapSection pinned />}>
      <InternalPageHero
        title="Venues"
        subtitle="Discover venue partners across markets - seating capacity, type, and entertainment complex ties in one place."
      />

      <main className="mx-auto w-full max-w-[1180px] px-5 pt-12 sm:px-8 sm:pt-14 lg:px-10">
        <VenuesExplorer />
      </main>
    </InternalPageFrame>
  );
}
