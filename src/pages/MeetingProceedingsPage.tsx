import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, MapPin, ArrowLeft, FileText,
  CheckCircle2, XCircle, AlertCircle, Printer,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Loader } from '../components/common/Loader';
import { Button } from '../components/ui/Button';
import { getMeetingProceedings } from '../services/supabaseData';
import type { MeetingProceedings, ActionItem } from '../types/database';

const TYPE_LABEL: Record<string, string> = {
  general: 'General Meeting',
  committee: 'Committee Meeting',
  emergency: 'Emergency Meeting',
  agm: 'Annual General Meeting',
};

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  present: { label: 'Present', cls: 'bg-success/15 text-success', icon: CheckCircle2 },
  absent: { label: 'Absent', cls: 'bg-destructive/15 text-destructive', icon: XCircle },
  excused: { label: 'Excused', cls: 'bg-gold-400/20 text-gold-700', icon: AlertCircle },
};

function fmtDateTime(iso: string): string {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

export const MeetingProceedingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<MeetingProceedings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) { setNotFound(true); setLoading(false); return; }
      try {
        const result = await getMeetingProceedings(id);
        if (!mounted) return;
        if (!result) setNotFound(true);
        else setData(result);
      } catch (err) {
        console.warn('Failed to load proceedings', err);
        if (mounted) setNotFound(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const roll = data?.attendance_roll ?? [];
  const rollSorted = useMemo(() => {
    const order: Record<string, number> = { present: 0, excused: 1, absent: 2 };
    return [...roll].sort((a, b) => {
      const oa = order[a.status] ?? 9;
      const ob = order[b.status] ?? 9;
      if (oa !== ob) return oa - ob;
      return (a.display_name ?? '').localeCompare(b.display_name ?? '');
    });
  }, [roll]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, excused: 0 };
    roll.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [roll]);

  const actions = data?.action_items ?? [];

  if (loading) {
    return (
      <>
        <PageHeader
          title="Meeting Proceedings"
          subtitle="Official record of a past meeting"
          description="Loading the published minutes…"
        />
        <div className="container mx-auto px-4 py-12">
          <Loader />
        </div>
      </>
    );
  }

  if (notFound || !data) {
    return (
      <>
        <PageHeader
          title="Proceedings not available"
          subtitle="404"
          description="The minutes for this meeting have not been published yet, or the meeting does not exist."
        />
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="max-w-xl mx-auto">
              <CardContent className="p-10 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-heading text-xl font-bold mb-2">
                  Minutes are not yet published
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  The Secretary is still drafting these minutes. Once published, this page will display
                  the agenda, discussions, decisions, action items, and attendance roll.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                    onClick={() => navigate('/meetings')}
                  >
                    Back to Meetings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={data.title}
        subtitle={TYPE_LABEL[data.meeting_type] ?? 'Meeting'}
        description="Official published proceedings from the Secretary."
      />

      <section className="py-12 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl space-y-6">

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/meetings')}
            >
              Back to Meetings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>

          {/* Header card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {TYPE_LABEL[data.meeting_type] ?? data.meeting_type}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-success/15 text-success">
                    Published
                  </span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold mb-2">
                  {data.title}
                </h1>
                {data.description && (
                  <p className="text-sm text-muted-foreground mb-3">{data.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {fmtDateTime(data.scheduled_at)}
                  </span>
                  {data.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {data.location}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Attendance roll */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Attendance roll
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-4 text-center text-sm">
                  <div className="rounded-lg bg-success/10 p-3">
                    <div className="text-2xl font-bold text-success">{counts.present}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Present</div>
                  </div>
                  <div className="rounded-lg bg-gold-400/10 p-3">
                    <div className="text-2xl font-bold text-gold-700">{counts.excused}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Excused</div>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-3">
                    <div className="text-2xl font-bold text-destructive">{counts.absent}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Absent</div>
                  </div>
                </div>
                {rollSorted.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No attendance recorded.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr className="text-left">
                          <th className="py-2 font-semibold">Member</th>
                          <th className="py-2 font-semibold">Role</th>
                          <th className="py-2 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rollSorted.map((r, i) => {
                          const b = STATUS_BADGE[r.status];
                          const Icon = b?.icon ?? AlertCircle;
                          return (
                            <tr key={`${r.display_name}-${i}`} className="border-b last:border-0">
                              <td className="py-2 font-medium">{r.display_name}</td>
                              <td className="py-2 text-muted-foreground">
                                {r.hierarchy_role ?? '—'}
                              </td>
                              <td className="py-2 text-right">
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${b?.cls ?? ''}`}>
                                  <Icon className="w-3 h-3" />
                                  {b?.label ?? r.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Agenda */}
          {data.agenda && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Agenda</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line leading-relaxed">{data.agenda}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Discussions */}
          {data.discussions && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Discussions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line leading-relaxed">{data.discussions}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Decisions */}
          {data.decisions && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Decisions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line leading-relaxed">{data.decisions}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Action items */}
          {actions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Action items ({actions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {actions.map((a, i) => (
                      <ActionItemRow key={i} item={a} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Sign-off */}
          <Card>
            <CardContent className="p-4 text-xs text-muted-foreground text-center">
              Published on {fmtDate(data.published_at)}
              {data.published_by_name && (
                <> by <span className="font-semibold">{data.published_by_name}</span></>
              )}
              . Minutes are official records of the Catholic Silanga CBO.
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

// ============================================================

const ActionItemRow: React.FC<{ item: ActionItem }> = ({ item }) => {
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">
          ✓
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {item.what ?? '(no description)'}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
            {item.who && (
              <span>
                <span className="font-semibold">Owner:</span> {item.who}
              </span>
            )}
            {item.by && (
              <span>
                <span className="font-semibold">Due:</span> {fmtDate(item.by)}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

export default MeetingProceedingsPage;