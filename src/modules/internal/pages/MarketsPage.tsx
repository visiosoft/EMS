import { InternalPageHero } from '../components/InternalPageHero';
import { MarketsExplorer } from '../components/markets/MarketsExplorer';
import { WeeklyRecapSection } from '../components/WeeklyRecapSection';
import { InternalPageFrame } from '../layout/InternalPageFrame';

export function MarketsPage() {
  return (
    <InternalPageFrame footer={<WeeklyRecapSection pinned />}>
      <InternalPageHero
        title="Markets"
        subtitle="Explore designated market areas and the postal codes tied to each marketplace across the organization."
      />

      <main className="mx-auto w-full max-w-[1180px] px-5 pt-12 sm:px-8 sm:pt-14 lg:px-10">
        <MarketsExplorer />
      </main>
    </InternalPageFrame>
  );
}
