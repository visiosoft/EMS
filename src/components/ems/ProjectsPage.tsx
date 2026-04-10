import React, { useState, useMemo } from 'react';
import { TOURS, ATTRACTIONS, COMPANIES, CONTACTS, DMAS, USERS, formatCurrency, formatDate, getStatusColor } from '@/data/constants';
import { StatusBadge, Avatar, SearchInput, FilterChips, TabBar, Modal, FormField, ActionMenu } from './Primitives';
import type { Project, Offer, Engagement, Tour, Attraction } from '@/data/constants';
import { Select2, toOptions, toObjOptions } from './Select2';

interface Props {
  projects: Project[];
  engagements: Engagement[];
  tours?: typeof TOURS;
  attractions?: typeof ATTRACTIONS;
  companies?: typeof COMPANIES;
  contacts?: typeof CONTACTS;
  dmas?: typeof DMAS;
  users?: typeof USERS;
  onNavigate: (view: string, data?: any) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info', action?: { label: string; onClick: () => void }) => void;
  onCreateEngagement: (offer: Offer, project: Project) => string;
  onUpdateProjects: (projects: Project[]) => void;
  onDeleteProject?: (projectId: string) => void;
}

// ─── Valid Project Statuses (NOT engagement statuses) ─────────────────────────
const PROJECT_STATUSES = ['Active', 'OffersSent', 'PartiallyBooked', 'FullyBooked', 'Dead'];

// ─── Tour Status Options ───────────────────────────────────────────────────────
const TOUR_STATUSES = ['Draft', 'Announced', 'ActiveRouting', 'Closed'];

export function ProjectsPage({ projects, engagements, onNavigate, addToast, onCreateEngagement, onUpdateProjects, onDeleteProject }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const filtered = projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Projects</h1>
        <button onClick={() => setShowCreateWizard(true)} className="bg-ems-accent hover:bg-ems-accent/80 text-background px-4 py-1.5 rounded-md text-sm font-medium">+ Create Project</button>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-64"><SearchInput value={search} onChange={setSearch} /></div>
        <FilterChips options={['All', ...PROJECT_STATUSES]} active={statusFilter} onChange={setStatusFilter} />
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-text-muted text-xs border-b border-border bg-surface">
            <th className="text-left py-2.5 px-3">Project Name</th>
            <th className="text-left py-2.5 px-3">Attraction — Tour</th>
            <th className="text-left py-2.5 px-3">Booker</th>
            <th className="text-left py-2.5 px-3">DMA(s)</th>
            <th className="text-left py-2.5 px-3">Offers</th>
            <th className="text-left py-2.5 px-3">Status</th>
            <th />
          </tr></thead>
          <tbody>
            {filtered.map(p => {
              const tour = TOURS.find(t => t.id === p.tourId);
              const attr = tour ? ATTRACTIONS.find(a => a.id === tour.attractionId) : null;
              const booker = USERS.find(u => u.id === p.bookerId);
              const accepted = p.offers.filter(o => o.status === 'Accepted').length;
              const submitted = p.offers.filter(o => o.status === 'Submitted').length;
              return (
                <tr key={p.id} onClick={() => onNavigate('project-detail', { projectId: p.id })}
                  className="border-b border-border/50 hover:bg-hover cursor-pointer">
                  <td className="py-2.5 px-3 text-text-primary font-medium">{p.name}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{attr?.name} — {tour?.name}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{booker?.name}</td>
                  <td className="py-2.5 px-3 text-xs text-text-secondary">{p.dmaIds.map(d => DMAS.find(dm => dm.id === d)?.name).join(', ')}</td>
                  <td className="py-2.5 px-3 text-xs">
                    {submitted > 0 && <span className="text-ems-blue">{submitted} Submitted</span>}
                    {accepted > 0 && <span className="text-ems-green ml-1">{accepted} Accepted</span>}
                    {p.offers.length === 0 && <span className="text-text-muted">—</span>}
                  </td>
                  <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2.5 px-3 text-right" onClick={e => e.stopPropagation()}>
                    <ActionMenu items={[
                      { label: 'Edit', onClick: () => setEditProject(p) },
                      {
                        label: 'Delete',
                        onClick: () => {
                          if (onDeleteProject) onDeleteProject(p.id);
                          else onUpdateProjects(projects.filter(x => x.id !== p.id));
                          addToast('Project deleted', 'warning');
                        },
                        danger: true,
                      },
                    ]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreateWizard && (
        <CreateProjectWizard
          onClose={() => setShowCreateWizard(false)}
          onSave={(proj) => {
            onUpdateProjects([proj, ...projects]);
            setShowCreateWizard(false);
            addToast('Project created successfully', 'success');
            onNavigate('project-detail', { projectId: proj.id });
          }}
        />
      )}

      {editProject && (
        <Modal title="Edit Project" onClose={() => setEditProject(null)} width={600}>
          <EditProjectForm project={editProject} onSave={(next) => {
            onUpdateProjects(projects.map(p => p.id === next.id ? next : p));
            setEditProject(null);
            addToast('Project updated', 'success');
          }} onCancel={() => setEditProject(null)} />
        </Modal>
      )}
    </div>
  );
}

// ─── Project Detail Page ──────────────────────────────────────────────────────

export function ProjectDetailPage({ project, projects, engagements, onNavigate, addToast, onCreateEngagement, onUpdateProjects }: {
  project: Project;
  projects: Project[];
  engagements: Engagement[];
  tours?: typeof TOURS;
  attractions?: typeof ATTRACTIONS;
  companies?: typeof COMPANIES;
  contacts?: typeof CONTACTS;
  dmas?: typeof DMAS;
  users?: typeof USERS;
  onNavigate: (view: string, data?: any) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info', action?: { label: string; onClick: () => void }) => void;
  onCreateEngagement: (offer: Offer, project: Project) => string;
  onUpdateProjects: (projects: Project[]) => void;
}) {
  const [showRecordResponse, setShowRecordResponse] = useState<string | null>(null);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [editOfferId, setEditOfferId] = useState<string | null>(null);

  const tour = TOURS.find(t => t.id === project.tourId);
  const attr = tour ? ATTRACTIONS.find(a => a.id === tour.attractionId) : null;
  const booker = USERS.find(u => u.id === project.bookerId);
  const agent = CONTACTS.find(c => c.id === project.agentContactId);
  const agentCompany = agent ? COMPANIES.find(co => co.id === agent.companyId) : null;

  const handleRecordResponse = (offerId: string, response: string, notes: string) => {
    const updatedProjects = projects.map(p => {
      if (p.id !== project.id) return p;
      return {
        ...p,
        offers: p.offers.map(o => {
          if (o.id !== offerId) return o;
          if (response === 'Accepted') {
            const engId = onCreateEngagement(o, project);
            return { ...o, status: 'Accepted', responseAt: new Date().toISOString().split('T')[0], responseNotes: notes, engagementId: engId };
          }
          return { ...o, status: response, responseAt: new Date().toISOString().split('T')[0], responseNotes: notes };
        }),
      };
    });
    onUpdateProjects(updatedProjects);
    setShowRecordResponse(null);

    if (response === 'Accepted') {
      addToast('Engagement created successfully', 'success', {
        label: 'View Engagement →',
        onClick: () => {
          const updated = updatedProjects.find(p => p.id === project.id);
          const offer = updated?.offers.find(o => o.id === offerId);
          if (offer?.engagementId) onNavigate('engagement-detail', { engagementId: offer.engagementId });
        },
      });
    } else {
      addToast(`Offer ${response.toLowerCase()}`, response === 'Declined' ? 'warning' : 'info');
    }
  };

  const statusCounts: Record<string, number> = {};
  project.offers.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  return (
    <div className="space-y-4">
      <button onClick={() => onNavigate('projects')} className="text-text-muted hover:text-text-primary text-sm">← Back to Projects</button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{project.name}</h1>
          <div className="text-sm text-text-secondary">{attr?.name} — {tour?.name} · {booker?.name} · DMAs: {project.dmaIds.map(d => DMAS.find(dm => dm.id === d)?.name).join(', ')}</div>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="grid grid-cols-[60%_40%] gap-6">
        {/* Left — Venues & Offers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-primary">Candidate Venues & Offers</h2>
            <button onClick={() => setShowAddVenue(true)} className="text-ems-accent text-sm hover:underline">+ Add Venue</button>
          </div>

          {project.offers.map(offer => {
            const venue = COMPANIES.find(c => c.id === offer.venueId);
            return (
              <div key={offer.id} className={`bg-card border border-border rounded-lg overflow-hidden ${offer.status === 'Declined' ? 'opacity-60' : ''}`}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-text-primary font-medium">{venue?.tradeName}</span>
                      <div className="text-xs text-text-secondary">{venue?.city}, {venue?.state} · {offer.configName} · Cap: {venue?.venueProfile?.configurations.find((c: any) => c.name === offer.configName)?.totalCap?.toLocaleString()}</div>
                    </div>
                    <StatusBadge status={offer.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-2 mt-2">
                    <div><span className="text-text-muted">Proposed Dates: </span><span className="text-text-primary">{offer.proposedDates.map(d => formatDate(d)).join(', ')} — {offer.showTime}</span></div>
                    <div><span className="text-text-muted">Deal: </span><span className="text-text-primary">{offer.dealType}</span></div>
                    <div><span className="text-text-muted">Guarantee: </span><span className="text-text-primary font-mono">{formatCurrency(offer.guarantee)}</span></div>
                    {offer.splitPct && <div><span className="text-text-muted">Split: </span><span className="text-text-primary">{offer.splitPct}% artist / {100 - offer.splitPct}% IAE after {formatCurrency(offer.breakeven)}</span></div>}
                    <div><span className="text-text-muted">Mktg Co-Op: </span><span className="text-text-primary font-mono">{formatCurrency(offer.marketingCoOp)}</span></div>
                  </div>
                  {offer.responseNotes && <div className="text-xs text-text-secondary mt-2 italic">"{offer.responseNotes}"</div>}
                  <div className="flex gap-2 mt-3 justify-end">
                    <button onClick={() => setEditOfferId(offer.id)} className="bg-elevated text-text-primary text-xs px-3 py-1 rounded border border-border hover:bg-hover">Edit</button>
                    <button onClick={() => {
                      const updatedProjects = projects.map(p => p.id === project.id ? { ...p, offers: p.offers.filter(o => o.id !== offer.id) } : p);
                      onUpdateProjects(updatedProjects);
                      addToast('Offer deleted', 'warning');
                    }} className="bg-elevated text-ems-coral text-xs px-3 py-1 rounded border border-border hover:bg-hover">Delete</button>
                    {offer.status === 'Submitted' && (
                      <button onClick={() => setShowRecordResponse(offer.id)} className="bg-elevated text-text-primary text-xs px-3 py-1 rounded border border-border hover:bg-hover">Record Response ▾</button>
                    )}
                    {offer.engagementId && (
                      <button onClick={() => onNavigate('engagement-detail', { engagementId: offer.engagementId })} className="text-ems-accent text-xs hover:underline">View Engagement →</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {project.offers.length === 0 && <div className="text-text-muted text-sm bg-card border border-border rounded-lg p-4">No offers yet. Add a venue to get started.</div>}
        </div>

        {/* Right — Project Info */}
        <div className="space-y-4">
          {agent && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Avatar name={`${agent.firstName} ${agent.lastName}`} />
                <div>
                  <div className="text-text-primary font-medium text-sm">{agent.firstName} {agent.lastName}</div>
                  <div className="text-xs text-text-secondary">{agent.title}</div>
                  <div className="text-xs text-text-secondary">{agentCompany?.tradeName}</div>
                </div>
              </div>
              <div className="text-xs space-y-1 mt-2">
                <div className="text-ems-blue">📧 {agent.email}</div>
                <div className="text-text-secondary">📞 {agent.phone}</div>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <div><span className="text-text-muted text-xs">Notes</span><p className="text-text-secondary text-sm mt-1">{project.notes}</p></div>
          </div>

          {project.offers.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-xs font-medium text-text-muted mb-2">Offer Status</h3>
              <div className="flex items-center gap-4">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  {(() => {
                    const total = project.offers.length;
                    const colors: Record<string, string> = { Draft: '#484F58', Submitted: '#388BFD', Accepted: '#3FB950', Declined: '#F85149', Countered: '#D29922' };
                    let offset = 0;
                    return Object.entries(statusCounts).map(([status, count]) => {
                      const pct = count / total;
                      const dash = pct * 283;
                      const el = <circle key={status} cx="60" cy="60" r="45" fill="none" stroke={colors[status] || '#484F58'} strokeWidth="12" strokeDasharray={`${dash} ${283 - dash}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" />;
                      offset += dash;
                      return el;
                    });
                  })()}
                  <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fill="#E6EDF3" fontSize="18" fontFamily="JetBrains Mono">{project.offers.length}</text>
                </svg>
                <div className="space-y-1">
                  {Object.entries(statusCounts).map(([s, c]) => (
                    <div key={s} className="flex items-center gap-1.5 text-xs">
                      <StatusBadge status={s} />
                      <span className="text-text-secondary font-mono">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showRecordResponse && (
        <RecordResponseModal
          offerId={showRecordResponse}
          offer={project.offers.find(o => o.id === showRecordResponse)!}
          onSave={handleRecordResponse}
          onClose={() => setShowRecordResponse(null)}
        />
      )}

      {showAddVenue && (
        <Modal title="Add Venue to Project" onClose={() => setShowAddVenue(false)} width={500}>
          <AddVenueForm project={project} onSave={(offer) => {
            const updatedProjects = projects.map(p => p.id === project.id ? { ...p, offers: [offer, ...p.offers] } : p);
            onUpdateProjects(updatedProjects);
            setShowAddVenue(false);
            addToast('Venue added to project', 'success');
          }} onCancel={() => setShowAddVenue(false)} />
        </Modal>
      )}

      {editOfferId && (
        <Modal title="Edit Offer" onClose={() => setEditOfferId(null)} width={500}>
          <EditOfferForm
            offer={project.offers.find(o => o.id === editOfferId)!}
            onSave={(offer) => {
              const updatedProjects = projects.map(p => p.id === project.id ? { ...p, offers: p.offers.map(o => o.id === offer.id ? offer : o) } : p);
              onUpdateProjects(updatedProjects);
              setEditOfferId(null);
              addToast('Offer updated', 'success');
            }}
            onCancel={() => setEditOfferId(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Edit Project Form ────────────────────────────────────────────────────────

function EditProjectForm({ project, onSave, onCancel }: { project: Project; onSave: (p: Project) => void; onCancel: () => void }) {
  const [name, setName] = useState(project.name);
  const [status, setStatus] = useState(project.status);
  const [notes, setNotes] = useState(project.notes);
  return (
    <div className="space-y-3">
      <FormField label="Name"><input className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary" value={name} onChange={e => setName(e.target.value)} /></FormField>
      <FormField label="Status">
        <Select2 options={toOptions(PROJECT_STATUSES)} value={status} onChange={setStatus} />
      </FormField>
      <FormField label="Notes"><textarea className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary h-20 resize-none" value={notes} onChange={e => setNotes(e.target.value)} /></FormField>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-text-secondary px-4 py-1.5">Cancel</button>
        <button onClick={() => onSave({ ...project, name, status, notes })} className="bg-ems-accent text-background px-4 py-1.5 rounded-md text-sm font-medium">Save</button>
      </div>
    </div>
  );
}

function EditOfferForm({ offer, onSave, onCancel }: { offer: Offer; onSave: (o: Offer) => void; onCancel: () => void }) {
  const [status, setStatus] = useState(offer.status);
  const [date, setDate] = useState(offer.proposedDates[0] || '');
  const [time, setTime] = useState(offer.showTime);
  const [guarantee, setGuarantee] = useState(String(offer.guarantee));
  return (
    <div className="space-y-3">
      <FormField label="Status"><Select2 options={toOptions(['Draft', 'Submitted', 'Accepted', 'Declined', 'Countered'])} value={status} onChange={setStatus} /></FormField>
      <FormField label="Date"><input type="date" className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary" value={date} onChange={e => setDate(e.target.value)} /></FormField>
      <FormField label="Show Time"><input type="time" className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary" value={time} onChange={e => setTime(e.target.value)} /></FormField>
      <FormField label="Guarantee"><input type="number" className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary" value={guarantee} onChange={e => setGuarantee(e.target.value)} /></FormField>
      <div className="flex justify-end gap-2"><button onClick={onCancel} className="text-text-secondary px-4 py-1.5">Cancel</button><button onClick={() => onSave({ ...offer, status, proposedDates: [date], showTime: time, guarantee: Number(guarantee) || 0 })} className="bg-ems-accent text-background px-4 py-1.5 rounded-md text-sm font-medium">Save</button></div>
    </div>
  );
}

function RecordResponseModal({ offerId, offer, onSave, onClose }: { offerId: string; offer: Offer; onSave: (id: string, response: string, notes: string) => void; onClose: () => void }) {
  const [response, setResponse] = useState('Accepted');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const venue = COMPANIES.find(c => c.id === offer.venueId);

  const handleSave = () => {
    if (response === 'Accepted' && !showConfirm) { setShowConfirm(true); return; }
    onSave(offerId, response, notes);
  };

  return (
    <Modal title="Record Talent Agent Response" onClose={onClose} width={500}>
      <div className="space-y-3">
        <div className="text-sm text-text-secondary">Offer: {venue?.tradeName} · {formatDate(offer.proposedDates[0])}</div>
        <FormField label="Response">
          <div className="flex gap-4">{['Accepted', 'Declined', 'Countered'].map(r => (
            <label key={r} className="flex items-center gap-1.5 text-sm text-text-primary cursor-pointer">
              <input type="radio" checked={response === r} onChange={() => { setResponse(r); setShowConfirm(false); }} className="accent-ems-accent" />{r}
            </label>
          ))}</div>
        </FormField>
        <FormField label="Notes">
          <textarea className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary h-20 resize-none" value={notes} onChange={e => setNotes(e.target.value)} />
        </FormField>
        {showConfirm && (
          <div className="bg-ems-accent-dim border border-ems-accent/30 rounded-lg p-3 text-sm text-ems-accent">
            Accepting this offer will automatically create a new Engagement. Proceed?
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-text-secondary px-4 py-1.5">Cancel</button>
          <button onClick={handleSave} className="bg-ems-accent text-background px-4 py-1.5 rounded-md text-sm font-medium">
            {showConfirm ? 'Confirm & Create Engagement' : 'Save Response'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AddVenueForm({ project, onSave, onCancel }: { project: Project; onSave: (o: Offer) => void; onCancel: () => void }) {
  const [venueId, setVenueId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const venues = COMPANIES.filter(c => c.types.includes('Venue'));
  const tour = TOURS.find(t => t.id === project.tourId);

  return (
    <div className="space-y-3">
      <FormField label="Venue" required>
        <Select2 options={[{ value: '', label: 'Select venue...' }, ...toObjOptions(venues, v => v.tradeName)]} value={venueId} onChange={setVenueId} placeholder="Select venue..." />
      </FormField>
      <FormField label="Proposed Date" required>
        <input type="date" className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary" value={date} onChange={e => setDate(e.target.value)} />
      </FormField>
      <FormField label="Show Time" required>
        <input type="time" className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary" value={time} onChange={e => setTime(e.target.value)} />
      </FormField>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onCancel} className="text-text-secondary px-4 py-1.5">Cancel</button>
        <button onClick={() => {
          if (!venueId || !date) return;
          const venue = venues.find(v => v.id === venueId);
          const config = venue?.venueProfile?.configurations.find((c: any) => c.isDefault);
          onSave({
            id: `ofr-${Date.now()}`, venueId, configName: config?.name || 'Default', proposedDates: [date], showTime: time,
            dealType: tour?.dealType || 'Guarantee', guarantee: tour?.guarantee || 0, splitPct: tour?.splitPct || null, breakeven: tour?.breakeven || null,
            marketingCoOp: 0, status: 'Draft',
          });
        }} className="bg-ems-accent text-background px-4 py-1.5 rounded-md text-sm font-medium">Add to Project</button>
      </div>
    </div>
  );
}

// ─── Create Project Wizard ─────────────────────────────────────────────────────
// Strict order: 1. Attraction → 2. Tour (existing or new) → 3. Agent → 4. DMAs → 5. Review

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface NewTourForm {
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  dealType: string;
  guarantee: string;
}

function CreateProjectWizard({ onClose, onSave }: { onClose: () => void; onSave: (p: Project) => void }) {
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1: Attraction
  const [attractionId, setAttractionId] = useState('');

  // Step 2: Tour
  const [tourMode, setTourMode] = useState<'existing' | 'new'>('existing');
  const [tourId, setTourId] = useState('');
  const [newTour, setNewTour] = useState<NewTourForm>({
    name: '', status: 'ActiveRouting', startDate: '', endDate: '',
    dealType: 'Guarantee', guarantee: '',
  });

  // Step 3: Agent (from tour's attraction agency)
  const [agentId, setAgentId] = useState('');

  // Step 4: DMAs
  const [selectedDmas, setSelectedDmas] = useState<string[]>([]);

  // Step 5: Project details
  const [projectName, setProjectName] = useState('');
  const [projectNotes, setProjectNotes] = useState('');

  const selectedAttraction = ATTRACTIONS.find(a => a.id === attractionId);
  const attractionTours = TOURS.filter(t => t.attractionId === attractionId);

  // Derive agency contacts from attraction
  const agencyContacts = useMemo(() => {
    if (!selectedAttraction) return [];
    return CONTACTS.filter(c => c.companyId === selectedAttraction.agencyId);
  }, [selectedAttraction]);

  // When attraction changes, auto-set project name
  const handleSelectAttraction = (id: string) => {
    setAttractionId(id);
    setTourId('');
    setAgentId('');
    const attr = ATTRACTIONS.find(a => a.id === id);
    if (attr) setProjectName(`${attr.name} ${new Date().getFullYear()}`);
  };

  const canProceed = () => {
    if (step === 1) return !!attractionId;
    if (step === 2) {
      if (tourMode === 'existing') return !!tourId;
      return !!(newTour.name && newTour.startDate && newTour.endDate);
    }
    if (step === 3) return !!agentId;
    if (step === 4) return selectedDmas.length > 0;
    return !!projectName.trim();
  };

  const handleNext = () => {
    if (!canProceed()) return;
    if (step < 5) setStep((step + 1) as WizardStep);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as WizardStep);
    else onClose();
  };

  const handleCreate = () => {
    if (!canProceed()) return;
    // For "new tour" mode, tourId will be a temporary placeholder
    const finalTourId = tourMode === 'existing' ? tourId : `tour-new-${Date.now()}`;
    onSave({
      id: `prj-${Date.now()}`,
      name: projectName,
      tourId: finalTourId,
      bookerId: 'usr-01',
      agentContactId: agentId,
      dmaIds: selectedDmas,
      status: 'Active',
      targetOnSale: null, // On-sale belongs to Engagement, not Project
      notes: projectNotes,
      createdAt: new Date().toISOString().split('T')[0],
      offers: [],
    });
  };

  const stepLabels = ['Attraction', 'Tour', 'Agent', 'DMAs', 'Review'];

  return (
    <Modal title="Create Project" onClose={onClose} width={760}>
      <div className="space-y-5">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-2">
          {stepLabels.map((label, idx) => {
            const s = (idx + 1) as WizardStep;
            const isActive = step === s;
            const isDone = step > s;
            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isDone ? 'bg-ems-green text-background' :
                    isActive ? 'bg-ems-accent text-background' :
                    'bg-elevated text-text-muted border border-border'
                  }`}>
                    {isDone ? '✓' : s}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-ems-accent' : isDone ? 'text-ems-green' : 'text-text-muted'}`}>
                    {label}
                  </span>
                </div>
                {idx < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${isDone ? 'bg-ems-green' : 'bg-border'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── STEP 1: Select Attraction ── */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-0.5">Select Attraction</h3>
              <p className="text-xs text-text-muted">Choose the artist or act for this project</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {ATTRACTIONS.map(a => {
                const agency = COMPANIES.find(c => c.id === a.agencyId);
                const tourCount = TOURS.filter(t => t.attractionId === a.id).length;
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelectAttraction(a.id)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      attractionId === a.id
                        ? 'border-ems-accent bg-ems-accent-dim'
                        : 'border-border bg-elevated hover:bg-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-text-primary font-medium text-sm">{a.name}</span>
                      <StatusBadge status={a.iaeStatus} />
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      {a.genres.join(', ')} · {a.marketTier}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {agency?.tradeName} · {tourCount} tour{tourCount !== 1 ? 's' : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: Select or Create Tour ── */}
        {step === 2 && selectedAttraction && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-0.5">Select Tour</h3>
              <p className="text-xs text-text-muted">Choose an existing tour for {selectedAttraction.name} or create a new one</p>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setTourMode('existing')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  tourMode === 'existing'
                    ? 'bg-ems-accent-dim text-ems-accent border-ems-accent/30'
                    : 'bg-elevated text-text-secondary border-border hover:bg-hover'
                }`}
              >
                Use Existing Tour
              </button>
              <button
                onClick={() => setTourMode('new')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  tourMode === 'new'
                    ? 'bg-ems-accent-dim text-ems-accent border-ems-accent/30'
                    : 'bg-elevated text-text-secondary border-border hover:bg-hover'
                }`}
              >
                + Create New Tour
              </button>
            </div>

            {tourMode === 'existing' && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {attractionTours.length === 0 ? (
                  <div className="text-text-muted text-sm bg-elevated rounded-lg p-4 text-center">
                    No existing tours. Switch to "Create New Tour".
                  </div>
                ) : attractionTours.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTourId(t.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      tourId === t.id
                        ? 'border-ems-accent bg-ems-accent-dim'
                        : 'border-border bg-elevated hover:bg-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-text-primary font-medium">{t.name}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      {t.dealType} · {t.guarantee ? `$${t.guarantee.toLocaleString()} guarantee` : 'No guarantee set'}
                    </div>
                    <div className="text-xs text-text-muted">
                      {t.startDate} → {t.endDate}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {tourMode === 'new' && (
              <div className="space-y-3 bg-elevated border border-border rounded-lg p-4">
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">New Tour Details</h4>
                <FormField label="Tour Name" required>
                  <input
                    className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent"
                    value={newTour.name}
                    onChange={e => setNewTour(p => ({ ...p, name: e.target.value }))}
                    placeholder={`${selectedAttraction.name} Tour 2025`}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Tour Status">
                    <Select2
                      options={toOptions(TOUR_STATUSES)}
                      value={newTour.status}
                      onChange={v => setNewTour(p => ({ ...p, status: v }))}
                    />
                  </FormField>
                  <FormField label="Deal Type">
                    <Select2
                      options={toOptions(['Guarantee', 'GuaranteeVsSplit', 'FlatFee'])}
                      value={newTour.dealType}
                      onChange={v => setNewTour(p => ({ ...p, dealType: v }))}
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Start Date" required>
                    <input
                      type="date"
                      className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent"
                      value={newTour.startDate}
                      onChange={e => setNewTour(p => ({ ...p, startDate: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="End Date" required>
                    <input
                      type="date"
                      className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent"
                      value={newTour.endDate}
                      onChange={e => setNewTour(p => ({ ...p, endDate: e.target.value }))}
                    />
                  </FormField>
                </div>
                <FormField label="Guarantee ($)">
                  <input
                    type="number"
                    className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent"
                    value={newTour.guarantee}
                    onChange={e => setNewTour(p => ({ ...p, guarantee: e.target.value }))}
                    placeholder="0"
                  />
                </FormField>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Select Agent ── */}
        {step === 3 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-0.5">Select Talent Agent</h3>
              <p className="text-xs text-text-muted">
                Agent from {COMPANIES.find(c => c.id === selectedAttraction?.agencyId)?.tradeName || 'the agency'} linked to this tour
              </p>
            </div>
            {agencyContacts.length === 0 ? (
              <div className="text-text-muted text-sm bg-elevated rounded-lg p-4 text-center">
                No contacts found for this agency. Add contacts in Companies first.
              </div>
            ) : (
              <div className="space-y-2">
                {agencyContacts.map(ct => {
                  const company = COMPANIES.find(c => c.id === ct.companyId);
                  return (
                    <button
                      key={ct.id}
                      onClick={() => setAgentId(ct.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${
                        agentId === ct.id
                          ? 'border-ems-accent bg-ems-accent-dim'
                          : 'border-border bg-elevated hover:bg-hover'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-ems-purple-dim text-ems-purple flex items-center justify-center text-xs font-semibold">
                        {ct.firstName[0]}{ct.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <div className="text-text-primary font-medium text-sm">{ct.firstName} {ct.lastName}</div>
                        <div className="text-xs text-text-secondary">{ct.title} · {company?.tradeName}</div>
                        <div className="text-xs text-ems-blue">{ct.email}</div>
                      </div>
                      {agentId === ct.id && (
                        <span className="text-ems-accent text-lg">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Select DMAs ── */}
        {step === 4 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-0.5">Target DMAs</h3>
              <p className="text-xs text-text-muted">Select the markets for this project. At least one is required.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {DMAS.filter(d => d.status === 'Active').map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDmas(prev =>
                    prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]
                  )}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    selectedDmas.includes(d.id)
                      ? 'bg-ems-accent-dim text-ems-accent border-ems-accent/30'
                      : 'bg-elevated text-text-secondary border-border hover:bg-hover'
                  }`}
                >
                  {selectedDmas.includes(d.id) && <span className="mr-1">✓</span>}
                  {d.name}
                </button>
              ))}
            </div>
            {selectedDmas.length > 0 && (
              <div className="text-xs text-text-muted">
                {selectedDmas.length} DMA{selectedDmas.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: Review & Project Details ── */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-0.5">Review & Create</h3>
              <p className="text-xs text-text-muted">Confirm details and give your project a name</p>
            </div>

            {/* Summary */}
            <div className="bg-elevated border border-border rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-text-muted text-xs block">Attraction</span><span className="text-text-primary font-medium">{selectedAttraction?.name}</span></div>
                <div>
                  <span className="text-text-muted text-xs block">Tour</span>
                  <span className="text-text-primary font-medium">
                    {tourMode === 'existing'
                      ? TOURS.find(t => t.id === tourId)?.name
                      : newTour.name + ' (new)'}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted text-xs block">Agent</span>
                  <span className="text-text-primary">{(() => { const ct = CONTACTS.find(c => c.id === agentId); return ct ? `${ct.firstName} ${ct.lastName}` : '—'; })()}</span>
                </div>
                <div>
                  <span className="text-text-muted text-xs block">DMAs</span>
                  <span className="text-text-primary">{selectedDmas.map(id => DMAS.find(d => d.id === id)?.name).join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Project name + notes */}
            <FormField label="Project Name" required>
              <input
                className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-ems-accent"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g. Stella Vance Midwest Fall 2025"
              />
            </FormField>
            <FormField label="Notes">
              <textarea
                className="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary h-20 resize-none focus:outline-none focus:border-ems-accent"
                value={projectNotes}
                onChange={e => setProjectNotes(e.target.value)}
                placeholder="Internal notes about this project..."
              />
            </FormField>

            {/* Note: no On-Sale Date — that's at Engagement level */}
            <div className="text-xs text-text-muted bg-elevated rounded-lg px-3 py-2 border border-border/50 flex items-center gap-2">
              <span>ℹ</span>
              <span>On-sale date is set per Engagement, not at the Project level.</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            onClick={handleBack}
            className="text-text-secondary px-4 py-1.5 text-sm hover:text-text-primary"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          <button
            onClick={step === 5 ? handleCreate : handleNext}
            disabled={!canProceed()}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              canProceed()
                ? 'bg-ems-accent hover:bg-ems-accent/80 text-background'
                : 'bg-elevated text-text-muted cursor-not-allowed'
            }`}
          >
            {step === 5 ? 'Create Project' : 'Next →'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
