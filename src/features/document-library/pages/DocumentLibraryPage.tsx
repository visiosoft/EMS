import { DocumentLibrary } from '../components/DocumentLibrary';
import { InternalPageFrame } from '@/modules/internal/layout/InternalPageFrame';
import { InternalPageHero } from '@/modules/internal/components/InternalPageHero';

export function DocumentLibraryPage() {
  return (
    <InternalPageFrame>
      <InternalPageHero
        title="Document Library"
        subtitle="Browse, search, and manage documents stored in Shared Documents."
      />
      <main
        style={{
          maxWidth: 1200,
          margin: '24px auto',
          padding: '0 24px',
          width: '100%',
        }}
      >
        <DocumentLibrary />
      </main>
    </InternalPageFrame>
  );
}
