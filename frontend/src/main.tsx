import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, CheckCircle2, Cloud, FileSearch, ShieldCheck, XCircle } from "lucide-react";
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
  submission: {
    researcher_id: string;
    project_id: string;
    file_name: string;
    file_kind: string;
    preview_text: string;
    declared_rows: number;
    declared_columns: number;
  };
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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const initialForm: FormState = {
  researcher_id: "res-2048",
  project_id: "ukb-heart-imaging",
  file_name: "aggregate_results.csv",
  file_kind: "table",
  preview_text: "age_band,total\n50-59,420\n60-69,538",
  declared_rows: 12,
  declared_columns: 2,
};

function App() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAssessments();
  }, []);

  async function loadAssessments() {
    try {
      const response = await fetch(`${API_URL}/assessments`);
      if (!response.ok) {
        throw new Error("Could not load assessment history");
      }
      const data = (await response.json()) as Assessment[];
      setAssessments(data);
      setSelected((current) => current ?? data[0] ?? null);
    } catch {
      setError("Start the FastAPI service to connect live review history.");
    }
  }

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

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
    return { blocked, review, approved };
  }, [assessments]);

  return (
    <main className="shell">
      <section className="topbar" aria-label="Platform summary">
        <div>
          <p className="eyebrow">Trusted research environment</p>
          <h1>SafeOutputs AI</h1>
        </div>
        <div className="status-strip" aria-label="Assessment counts">
          <Metric label="Approved" value={metrics.approved} tone="approved" />
          <Metric label="Review" value={metrics.review} tone="review" />
          <Metric label="Blocked" value={metrics.blocked} tone="blocked" />
        </div>
      </section>

      <section className="workspace">
        <form className="panel form-panel" onSubmit={submitAssessment}>
          <div className="panel-heading">
            <FileSearch size={20} aria-hidden="true" />
            <h2>Submit Output</h2>
          </div>

          <div className="field-grid">
            <label>
              Researcher ID
              <input value={form.researcher_id} onChange={(event) => setForm({ ...form, researcher_id: event.target.value })} />
            </label>
            <label>
              Project ID
              <input value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })} />
            </label>
            <label>
              File name
              <input value={form.file_name} onChange={(event) => setForm({ ...form, file_name: event.target.value })} />
            </label>
            <label>
              File kind
              <select value={form.file_kind} onChange={(event) => setForm({ ...form, file_kind: event.target.value })}>
                <option value="table">Table</option>
                <option value="document">Document</option>
                <option value="image">Image</option>
                <option value="code">Code</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Rows
              <input type="number" min="0" value={form.declared_rows} onChange={(event) => setForm({ ...form, declared_rows: Number(event.target.value) })} />
            </label>
            <label>
              Columns
              <input type="number" min="0" value={form.declared_columns} onChange={(event) => setForm({ ...form, declared_columns: Number(event.target.value) })} />
            </label>
          </div>

          <label>
            Preview text
            <textarea value={form.preview_text} onChange={(event) => setForm({ ...form, preview_text: event.target.value })} />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={isSubmitting}>
            <ShieldCheck size={18} aria-hidden="true" />
            {isSubmitting ? "Assessing" : "Assess output"}
          </button>
        </form>

        <section className="panel queue-panel" aria-label="Review queue">
          <div className="panel-heading">
            <Cloud size={20} aria-hidden="true" />
            <h2>Review Queue</h2>
          </div>
          <div className="queue">
            {assessments.length === 0 && <p className="empty">No assessments yet.</p>}
            {assessments.map((assessment) => (
              <button
                className={`queue-item ${selected?.assessment_id === assessment.assessment_id ? "active" : ""}`}
                key={assessment.assessment_id}
                type="button"
                onClick={() => setSelected(assessment)}
              >
                <span>{assessment.submission.file_name}</span>
                <DecisionBadge decision={assessment.decision} />
              </button>
            ))}
          </div>
        </section>

        <section className="panel detail-panel" aria-label="Assessment detail">
          {selected ? <AssessmentDetail assessment={selected} /> : <p className="empty">Select an assessment.</p>}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: Decision | "review" }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: Decision }) {
  const config = {
    approved: { label: "Approved", icon: CheckCircle2 },
    review_required: { label: "Review", icon: AlertTriangle },
    blocked: { label: "Blocked", icon: XCircle },
  }[decision];
  const Icon = config.icon;
  return (
    <span className={`badge ${decision}`}>
      <Icon size={15} aria-hidden="true" />
      {config.label}
    </span>
  );
}

function AssessmentDetail({ assessment }: { assessment: Assessment }) {
  return (
    <>
      <div className="detail-header">
        <div>
          <p className="eyebrow">{assessment.assessment_id}</p>
          <h2>{assessment.submission.file_name}</h2>
        </div>
        <DecisionBadge decision={assessment.decision} />
      </div>

      <div className="risk-row">
        <span>Risk score</span>
        <meter min="0" max="100" value={assessment.risk_score} />
        <strong>{assessment.risk_score}</strong>
      </div>

      <div className="finding-list">
        {assessment.findings.length === 0 && <p className="empty">No disclosure risks found.</p>}
        {assessment.findings.map((finding) => (
          <article className="finding" key={finding.check_id}>
            <div>
              <h3>{finding.title}</h3>
              <span>Severity {finding.severity}</span>
            </div>
            <p>{finding.evidence}</p>
            <p className="recommendation">{finding.recommendation}</p>
          </article>
        ))}
      </div>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

