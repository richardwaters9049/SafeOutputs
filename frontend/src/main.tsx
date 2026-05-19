import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileSearch,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import "./styles.css";

type Decision = "approved" | "review_required" | "blocked";

type Finding = {
  check_id: string;
  title: string;
  severity: number;
  evidence: string;
  recommendation: string;
};

type Assessment = {
  assessment_id: string;
  submitted_at: string;
  risk_score: number;
  decision: Decision;
  findings: Finding[];
  submission: FormState;
};

type FormState = {
  researcher_id: string;
  project_id: string;
  file_name: string;
  file_kind: string;
  preview_text: string;
  declared_rows: number;
  declared_columns: number;
};

type Scenario = {
  title: string;
  description: string;
  expected: Decision;
  submission: FormState;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const scenarios: Scenario[] = [
  {
    title: "Aggregate cohort table",
    description: "Safe summary counts with no obvious identifiers or small cells.",
    expected: "approved",
    submission: {
      researcher_id: "res-2048",
      project_id: "ukb-heart-imaging",
      file_name: "heart_imaging_age_band_summary_2026_q2.csv",
      file_kind: "table",
      preview_text: "age_band,total,mean_bmi\n50-59,420,27.4\n60-69,538,28.1\n70-79,316,27.9",
      declared_rows: 12,
      declared_columns: 3,
    },
  },
  {
    title: "Rare disease small cell",
    description: "Granular cohort output that should require reviewer confirmation.",
    expected: "review_required",
    submission: {
      researcher_id: "res-1182",
      project_id: "rare-cardiac-genomics",
      file_name: "rare_disease_genotype_cell_counts_by_region.csv",
      file_kind: "table",
      preview_text: "region,variant,count\nNorth West,BRCA-like variant,count=3\nLondon,variant B,n=2",
      declared_rows: 8,
      declared_columns: 3,
    },
  },
  {
    title: "Direct identifier in notes",
    description: "Free-text export with contact details that should be blocked.",
    expected: "blocked",
    submission: {
      researcher_id: "res-9041",
      project_id: "participant-follow-up",
      file_name: "participant_follow_up_notes_with_contact_details.txt",
      file_kind: "document",
      preview_text:
        "Participant contact: alex@example.org. Date of birth noted in source extract. Rare disease cohort n=3.",
      declared_rows: 1,
      declared_columns: 1,
    },
  },
  {
    title: "Large approved model export",
    description: "High-volume model evidence that needs an operational review step.",
    expected: "review_required",
    submission: {
      researcher_id: "res-3760",
      project_id: "metabolic-risk-modelling",
      file_name: "model_feature_importance_export_full_feature_matrix.csv",
      file_kind: "table",
      preview_text: "feature,importance\nage_band,0.22\nsex,0.18\nimaging_score,0.16",
      declared_rows: 180000,
      declared_columns: 246,
    },
  },
];

const initialForm = scenarios[0].submission;

const pageTransition = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const headerTransition = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 },
};

const cardTransition = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const slideUpTransition = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

const slideInTransition = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

const expandTransition = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
};

function App() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void loadAssessments();
  }, []);

  useEffect(() => {
    if (selected) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected]);

  async function loadAssessments() {
    try {
      const response = await fetch(`${API_URL}/assessments`);
      if (!response.ok) {
        throw new Error("Could not load assessment history");
      }
      const data = (await response.json()) as Assessment[];
      setAssessments(data);
    } catch {
      setError("Start the FastAPI service to connect live review history.");
    }
  }

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSelected(null);

    try {
      const response = await fetch(`${API_URL}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Assessment failed");
      }

      const assessment = (await response.json()) as Assessment;
      setAssessments((items) => [assessment, ...items]);
      setSelected(assessment);
    } catch {
      setError("The API could not assess this output. Check the backend service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const metrics = useMemo(() => {
    const blocked = assessments.filter((item) => item.decision === "blocked").length;
    const review = assessments.filter((item) => item.decision === "review_required").length;
    const approved = assessments.filter((item) => item.decision === "approved").length;
    return { blocked, review, approved, total: assessments.length };
  }, [assessments]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F5E6E8] text-[#192A51]">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <motion.section
          animate="show"
          className="grid gap-5 rounded-lg border border-[#D5C6E0]/80 bg-white/75 p-5 shadow-xl shadow-[#192A51]/10 backdrop-blur md:grid-cols-[1fr_auto]"
          initial="hidden"
          transition={{ duration: 0.45, ease: "easeOut" }}
          variants={pageTransition}
        >
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#967AA1]">
              Trusted research export control
            </p>
            <h1 className="text-3xl font-black leading-none sm:text-5xl">SafeOutputs AI</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#192A51]/75 sm:text-base">
              Screens researcher export files before release, combining deterministic disclosure
              checks with an AI-ready scoring workflow. The expected output is an explainable
              decision: approved, review required, or blocked.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Total" value={metrics.total} tone="total" />
            <Metric label="Approved" value={metrics.approved} tone="approved" />
            <Metric label="Review" value={metrics.review} tone="review_required" />
            <Metric label="Blocked" value={metrics.blocked} tone="blocked" />
          </div>
        </motion.section>

        <motion.section
          animate="show"
          className="grid gap-4 md:grid-cols-3"
          initial="hidden"
          transition={{ delay: 0.08, duration: 0.45, ease: "easeOut" }}
          variants={pageTransition}
        >
          <InfoCard
            icon={<FileSearch size={18} />}
            title="What it does"
            body="Accepts export metadata and a preview extract, then checks for disclosure risks."
          />
          <InfoCard
            icon={<Sparkles size={18} />}
            title="How it works"
            body="Scores identifiers, small cells, sensitive terms, and export volume with auditable evidence."
          />
          <InfoCard
            icon={<ClipboardCheck size={18} />}
            title="Expected output"
            body="Returns a risk score, decision, findings, and recommendations for reviewer action."
          />
        </motion.section>

        <motion.section
          animate="show"
          className="rounded-lg border border-[#D5C6E0]/80 bg-[#192A51] p-4 text-white shadow-xl shadow-[#192A51]/15"
          initial="hidden"
          transition={{ delay: 0.14, duration: 0.45, ease: "easeOut" }}
          variants={pageTransition}
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#D5C6E0]">
                Dummy test data
              </p>
              <h2 className="text-lg font-black">Load a realistic export scenario</h2>
            </div>
            <p className="max-w-xl text-sm text-[#F5E6E8]/80">
              Use these to test the product the way a researcher or reviewer would: load, assess,
              then inspect the result.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {scenarios.map((scenario, index) => (
              <ScenarioButton
                index={index}
                key={scenario.title}
                scenario={scenario}
                onSelect={() => {
                  setForm(scenario.submission);
                  setSelected(null);
                }}
              />
            ))}
          </div>
        </motion.section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <motion.form
            animate="show"
            className="rounded-lg border border-[#D5C6E0]/80 bg-white p-5 shadow-xl shadow-[#192A51]/10"
            initial="hidden"
            onSubmit={submitAssessment}
            transition={{ delay: 0.2, duration: 0.45, ease: "easeOut" }}
            variants={pageTransition}
          >
            <PanelHeading icon={<FileSearch size={20} />} title="Submit Output" />

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Researcher ID"
                value={form.researcher_id}
                onChange={(value) => setForm({ ...form, researcher_id: value })}
              />
              <TextField
                label="Project ID"
                value={form.project_id}
                onChange={(value) => setForm({ ...form, project_id: value })}
              />
              <TextField
                label="File name"
                value={form.file_name}
                onChange={(value) => setForm({ ...form, file_name: value })}
              />
              <label className="grid gap-2 text-sm font-bold text-[#192A51]">
                File kind
                <select
                  className="min-h-11 rounded-md border border-[#AAA1C8]/70 bg-[#F5E6E8]/45 px-3 text-[#192A51] outline-none transition focus:border-[#192A51] focus:ring-4 focus:ring-[#D5C6E0]/60"
                  value={form.file_kind}
                  onChange={(event) => setForm({ ...form, file_kind: event.target.value })}
                >
                  <option value="table">Table</option>
                  <option value="document">Document</option>
                  <option value="image">Image</option>
                  <option value="code">Code</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <NumberField
                label="Rows"
                value={form.declared_rows}
                onChange={(value) => setForm({ ...form, declared_rows: value })}
              />
              <NumberField
                label="Columns"
                value={form.declared_columns}
                onChange={(value) => setForm({ ...form, declared_columns: value })}
              />
            </div>

            <label className="mt-4 grid gap-2 text-sm font-bold text-[#192A51]">
              Preview text
              <textarea
                className="min-h-48 resize-y rounded-md border border-[#AAA1C8]/70 bg-[#F5E6E8]/45 px-3 py-3 font-mono text-sm text-[#192A51] outline-none transition focus:border-[#192A51] focus:ring-4 focus:ring-[#D5C6E0]/60"
                value={form.preview_text}
                onChange={(event) => setForm({ ...form, preview_text: event.target.value })}
              />
            </label>

            <AnimatePresence>
              {error && (
                <motion.p
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-md border border-[#967AA1]/50 bg-[#F5E6E8] px-3 py-2 text-sm font-semibold text-[#192A51]"
                  exit={{ opacity: 0, y: -8 }}
                  initial={{ opacity: 0, y: -8 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#192A51] px-5 text-sm font-black text-white shadow-lg shadow-[#192A51]/20 transition hover:bg-[#967AA1] disabled:cursor-wait disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
              whileTap={{ scale: 0.98 }}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
              ) : (
                <ShieldCheck size={18} aria-hidden="true" />
              )}
              {isSubmitting ? "Assessing output" : "Assess output"}
            </motion.button>
          </motion.form>

          <motion.section
            animate="show"
            className="rounded-lg border border-[#D5C6E0]/80 bg-white p-5 shadow-xl shadow-[#192A51]/10"
            initial="hidden"
            transition={{ delay: 0.26, duration: 0.45, ease: "easeOut" }}
            variants={pageTransition}
          >
            <PanelHeading icon={<ClipboardCheck size={20} />} title="Review Queue" />
            <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1">
              {assessments.length === 0 && (
                <p className="rounded-md bg-[#F5E6E8]/70 p-4 text-sm font-semibold text-[#192A51]/70">
                  No assessments yet. Load a sample, submit it, and the queue will populate here.
                </p>
              )}
              <AnimatePresence initial={false}>
                {assessments.map((assessment) => (
                  <QueueItem
                    assessment={assessment}
                    isActive={selected?.assessment_id === assessment.assessment_id}
                    key={assessment.assessment_id}
                    onSelect={() => setSelected(assessment)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        </section>

        <AnimatePresence>
          {selected && (
            <motion.section
              animate={{ opacity: 1, y: 0, height: "auto" }}
              className="rounded-lg border border-[#AAA1C8] bg-white p-5 shadow-2xl shadow-[#192A51]/15"
              exit={{ opacity: 0, y: 16, height: 0 }}
              initial={{ opacity: 0, y: 24, height: 0 }}
              ref={resultsRef}
              transition={{ duration: 0.38, ease: "easeOut" }}
            >
              <AssessmentDetail assessment={selected} />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function InfoCard({ body, icon, title }: { body: string; icon: React.ReactNode; title: string }) {
  return (
    <motion.article
      className="rounded-lg border border-[#D5C6E0]/80 bg-white/80 p-4 shadow-lg shadow-[#192A51]/10"
      whileHover={{ y: -3 }}
    >
      <div className="mb-3 inline-flex rounded-md bg-[#D5C6E0] p-2 text-[#192A51]">{icon}</div>
      <h2 className="mb-2 text-base font-black">{title}</h2>
      <p className="text-sm leading-6 text-[#192A51]/70">{body}</p>
    </motion.article>
  );
}

function ScenarioButton({
  index,
  onSelect,
  scenario,
}: {
  index: number;
  onSelect: () => void;
  scenario: Scenario;
}) {
  return (
    <motion.button
      animate={{ opacity: 1, y: 0 }}
      className="group grid min-h-44 gap-3 rounded-lg border border-[#AAA1C8]/50 bg-white/10 p-4 text-left transition hover:border-[#F5E6E8] hover:bg-white/15"
      initial={{ opacity: 0, y: 12 }}
      onClick={onSelect}
      transition={{ delay: 0.18 + index * 0.04, duration: 0.35 }}
      type="button"
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-black text-white">{scenario.title}</h3>
        <DecisionBadge decision={scenario.expected} />
      </div>
      <p className="text-sm leading-5 text-[#F5E6E8]/80">{scenario.description}</p>
      <span className="mt-auto inline-flex items-center gap-2 text-sm font-black text-[#D5C6E0]">
        <Play size={15} aria-hidden="true" />
        Load sample
      </span>
    </motion.button>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: Decision | "total" }) {
  const toneClass = {
    total: "border-[#192A51] bg-[#192A51] text-white",
    approved: "border-emerald-500 bg-emerald-50 text-emerald-800",
    review_required: "border-amber-500 bg-amber-50 text-amber-900",
    blocked: "border-rose-500 bg-rose-50 text-rose-900",
  }[tone];

  return (
    <motion.div
      className={`rounded-lg border-l-4 p-3 shadow-sm ${toneClass}`}
      whileHover={{ scale: 1.02 }}
    >
      <span className="block text-xs font-bold uppercase tracking-[0.12em] opacity-75">{label}</span>
      <strong className="mt-1 block text-2xl font-black">{value}</strong>
    </motion.div>
  );
}

function PanelHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="rounded-md bg-[#D5C6E0] p-2 text-[#192A51]">{icon}</div>
      <h2 className="text-lg font-black">{title}</h2>
    </div>
  );
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#192A51]">
      {label}
      <input
        className="min-h-11 rounded-md border border-[#AAA1C8]/70 bg-[#F5E6E8]/45 px-3 text-[#192A51] outline-none transition focus:border-[#192A51] focus:ring-4 focus:ring-[#D5C6E0]/60"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#192A51]">
      {label}
      <input
        className="min-h-11 rounded-md border border-[#AAA1C8]/70 bg-[#F5E6E8]/45 px-3 text-[#192A51] outline-none transition focus:border-[#192A51] focus:ring-4 focus:ring-[#D5C6E0]/60"
        min="0"
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function QueueItem({
  assessment,
  isActive,
  onSelect,
}: {
  assessment: Assessment;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      animate={{ opacity: 1, x: 0 }}
      className={`grid min-w-0 grid-cols-[1fr_auto] items-center gap-3 rounded-lg border p-3 text-left transition ${isActive
        ? "border-[#192A51] bg-[#D5C6E0]/65 shadow-md"
        : "border-[#D5C6E0] bg-[#F5E6E8]/45 hover:border-[#967AA1] hover:bg-[#D5C6E0]/35"
        }`}
      exit={{ opacity: 0, x: 12 }}
      initial={{ opacity: 0, x: -12 }}
      onClick={onSelect}
      type="button"
      whileHover={{ x: 2 }}
    >
      <div className="min-w-0">
        <span className="block truncate text-sm font-black text-[#192A51]">
          {assessment.submission.file_name}
        </span>
        <span className="mt-1 block text-xs font-semibold text-[#192A51]/60">
          Risk {assessment.risk_score} • {assessment.submission.project_id}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <DecisionBadge decision={assessment.decision} />
        <ChevronRight size={16} aria-hidden="true" />
      </div>
    </motion.button>
  );
}

function DecisionBadge({ decision }: { decision: Decision }) {
  const config = {
    approved: {
      className: "bg-emerald-100 text-emerald-800",
      icon: CheckCircle2,
      label: "Approved",
    },
    review_required: {
      className: "bg-amber-100 text-amber-900",
      icon: AlertTriangle,
      label: "Review",
    },
    blocked: {
      className: "bg-rose-100 text-rose-900",
      icon: XCircle,
      label: "Blocked",
    },
  }[decision];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${config.className}`}
    >
      <Icon size={14} aria-hidden="true" />
      {config.label}
    </span>
  );
}

function AssessmentDetail({ assessment }: { assessment: Assessment }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="min-w-0">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#967AA1]">
          Assessment complete
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:flex-col">
          <div className="min-w-0">
            <h2 className="truncate font-black text-[#192A51]">
              {assessment.submission.file_name}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#192A51]/60">
              {assessment.assessment_id} • {new Date(assessment.submitted_at).toLocaleString()}
            </p>
          </div>
          <DecisionBadge decision={assessment.decision} />
        </div>

        <div className="mt-6 rounded-lg bg-[#F5E6E8]/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-black">Risk score</span>
            <strong className="text-3xl font-black">{assessment.risk_score}</strong>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white">
            <motion.div
              animate={{ width: `${assessment.risk_score}%` }}
              className="h-full rounded-full bg-[#967AA1]"
              initial={{ width: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {assessment.findings.length === 0 && (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800"
            initial={{ opacity: 0, y: 10 }}
          >
            No disclosure risks found. This output is ready for export approval.
          </motion.p>
        )}
        {assessment.findings.map((finding, index) => (
          <motion.article
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-[#D5C6E0] bg-[#F5E6E8]/45 p-4"
            initial={{ opacity: 0, y: 12 }}
            key={finding.check_id}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="text-base font-black">{finding.title}</h3>
              <span className="text-xs font-black uppercase tracking-[0.12em] text-[#967AA1]">
                Severity {finding.severity}
              </span>
            </div>
            <p className="mb-2 text-sm leading-6 text-[#192A51]/75">{finding.evidence}</p>
            <p className="text-sm font-black text-[#192A51]">{finding.recommendation}</p>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
