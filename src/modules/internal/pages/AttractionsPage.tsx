import { InternalPageHero } from '../components/InternalPageHero';
import { AttractionsExplorer } from '../components/attractions/AttractionsExplorer';
import { WeeklyRecapSection } from '../components/WeeklyRecapSection';
import { InternalPageFrame } from '../layout/InternalPageFrame';

export function AttractionsPage() {
  return (
    <InternalPageFrame footer={<WeeklyRecapSection pinned />}>
      <InternalPageHero
        title="Attractions"
        subtitle="Explore the attraction catalog and related tours - the same library that powers EMS Attraction Tours, tuned for Company Hub browsing."
      />

      <main className="mx-auto w-full max-w-[1180px] px-5 pt-12 sm:px-8 sm:pt-14 lg:px-10">
        <AttractionsExplorer />
      </main>
    </InternalPageFrame>
  );
}
