import React, { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Camera,
  Calendar,
  User,
  Activity,
  Plus,
  X,
  Stethoscope,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import {
  fetchRecords,
  fetchRecordsStats,
  fetchRecordDetail,
  deleteRecord,
  downloadRecordPdf,
} from "../lib/api";
import { getRiskTokens } from "../lib/theme";

/**
 * Clinical Records Dashboard for Doctors and Eye Care Practitioners.
 * Adheres to HCI principles:
 * - Triple-encoding on all risk tiers and quality states
 * - Real-time client-side search and filtering
 * - Recognition over recall: Full context inspection drawer / modal
 * - Confirmation before destructive action (Delete)
 * - Fitts's Law touch targets and high-contrast WCAG 2.1 AA styling
 *
 * @param {{
 *   onNewScreening: () => void,
 *   onSelectRecordForInspection?: (record: any) => void
 * }} props
 */
export function RecordsPage({ onNewScreening, onSelectRecordForInspection }) {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("all"); // 'all' | 'High' | 'Moderate' | 'Low' | 'reject'

  // Selected Record for Detail Modal
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [recordDetail, setRecordDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null);

  // Load records and statistics
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordsData, statsData] = await Promise.all([
        fetchRecords({ search: searchQuery, tier: selectedTier }),
        fetchRecordsStats(),
      ]);
      setRecords(recordsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message || "Failed to load clinic records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTier]);

  // Handle Search on Enter or debounced
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Open detail modal
  const handleOpenDetail = async (recordId) => {
    setSelectedRecordId(recordId);
    setDetailLoading(true);
    try {
      const detail = await fetchRecordDetail(recordId);
      setRecordDetail(detail);
    } catch (err) {
      alert("Failed to load record details: " + err.message);
      setSelectedRecordId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Close detail modal
  const handleCloseDetail = () => {
    setSelectedRecordId(null);
    setRecordDetail(null);
  };

  // Handle PDF Download
  const handleDownloadPdf = async (recordId, e) => {
    if (e) e.stopPropagation();
    try {
      await downloadRecordPdf(recordId);
    } catch (err) {
      alert("Could not generate PDF: " + err.message);
    }
  };

  // Handle Record Delete
  const handleDelete = async (recordId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete screening record #${recordId}? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(recordId);
    try {
      await deleteRecord(recordId);
      if (selectedRecordId === recordId) {
        handleCloseDetail();
      }
      await loadData();
    } catch (err) {
      alert("Failed to delete record: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Clinic Patient Screening Records
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {stats?.total_screenings || records.length} Screenings
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Database of all patient retinal examinations, diagnostic classifications, Image Quality Assessments, and clinical PDF reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={onNewScreening}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Patient Screening
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards (Triple Encoded) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Patients</span>
            <User className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats ? stats.total_screenings : "..."}
          </div>
          <p className="text-[11px] text-slate-500">Historical database total</p>
        </div>

        {/* Card 2: High Risk */}
        <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-xs font-bold uppercase tracking-wider">High Risk</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">
            {stats ? stats.high_risk_count : "..."}
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400/80">Referral recommended (Grade 2+)</p>
        </div>

        {/* Card 3: Moderate Risk */}
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">Moderate Risk</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {stats ? stats.moderate_risk_count : "..."}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400/80">Follow-up in 3-6 mos</p>
        </div>

        {/* Card 4: Low Risk */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Low Risk</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {stats ? stats.low_risk_count : "..."}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80">Routine annual screening</p>
        </div>

        {/* Card 5: Recapture */}
        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-xs space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Needs Retake</span>
            <Camera className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            {stats ? stats.recapture_count : "..."}
          </div>
          <p className="text-[11px] text-slate-500">IQA quality gate rejected</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name or MRN..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </form>

          {/* Tier Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
            <span className="text-slate-400 text-[11px] mr-1 hidden md:inline">Filter:</span>
            {[
              { id: "all", label: "All Records" },
              { id: "High", label: "High Risk" },
              { id: "Moderate", label: "Moderate" },
              { id: "Low", label: "Low Risk" },
              { id: "reject", label: "Needs Retake" },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedTier(pill.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  selectedTier === pill.id
                    ? "bg-slate-900 text-white dark:bg-emerald-700 dark:text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Records Table */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Loading clinic records from database...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Database Error</span>
          </div>
          <p className="text-xs">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="text-xs font-semibold underline text-rose-700 dark:text-rose-300"
          >
            Retry Loading
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Patient Records Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || selectedTier !== "all"
                ? "No patient screenings match your search or filter criteria."
                : "No retinal screenings have been recorded in the database yet."}
            </p>
          </div>
          <button
            type="button"
            onClick={onNewScreening}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Start First Patient Screening
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Patient & MRN</th>
                  <th className="py-3 px-3">Demographics & Eye</th>
                  <th className="py-3 px-3">Exam Date</th>
                  <th className="py-3 px-3">Photo Quality</th>
                  <th className="py-3 px-3">AI Diagnosis & Confidence</th>
                  <th className="py-3 px-3">Clinical Action Plan</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {records.map((rec) => {
                  const isRejected = rec.quality_decision === "reject-recapture";
                  const grade = rec.grade_predicted ?? (rec.grade_label?.includes("Moderate") ? 2 : rec.grade_label?.includes("Proliferative") ? 4 : 0);

                  // Diagnosis label and confidence (only computed for gradable/optimal images)
                  const confVal = rec.grade_confidence !== null && rec.grade_confidence !== undefined
                    ? Math.round(rec.grade_confidence * 100)
                    : null;

                  let diagLabel = "No DR";
                  let diagBadgeClass = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                  let DiagIcon = CheckCircle2;
                  let actionPlanText = "Routine Annual Checkup";
                  let actionPlanColor = "text-emerald-700 dark:text-emerald-400";

                  if (grade === 4 || rec.grade_label?.includes("Proliferative")) {
                    diagLabel = "Proliferative DR";
                    diagBadgeClass = "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
                    DiagIcon = AlertOctagon;
                    actionPlanText = "Urgent Specialist Referral";
                    actionPlanColor = "text-rose-700 dark:text-rose-400";
                  } else if (grade === 3 || rec.grade_label?.includes("Severe")) {
                    diagLabel = "Severe DR";
                    diagBadgeClass = "bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800";
                    DiagIcon = AlertOctagon;
                    actionPlanText = "Urgent Specialist Referral";
                    actionPlanColor = "text-orange-700 dark:text-orange-400";
                  } else if (grade === 2 || rec.grade_label?.includes("Moderate")) {
                    diagLabel = "Moderate DR";
                    diagBadgeClass = "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                    DiagIcon = AlertTriangle;
                    actionPlanText = "Specialist Referral (3–6 Mo)";
                    actionPlanColor = "text-amber-700 dark:text-amber-400";
                  } else if (grade === 1 || rec.grade_label?.includes("Mild")) {
                    diagLabel = "Mild DR";
                    diagBadgeClass = "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800";
                    DiagIcon = CheckCircle2;
                    actionPlanText = "Clinical Follow-up (6–12 Mo)";
                    actionPlanColor = "text-sky-700 dark:text-sky-400";
                  }

                  const dateFormatted = rec.created_at ? new Date(rec.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }) : "N/A";

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => handleOpenDetail(rec.id)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      {/* Patient & MRN */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {rec.preprocessed_image ? (
                            <img
                              src={rec.preprocessed_image}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                              <Eye className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              {rec.name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 block">
                              {rec.patient_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Demographics & Eye */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {rec.age} yrs • {rec.gender}
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {rec.eye_examined?.includes("OD") ? "OD (Right)" : rec.eye_examined?.includes("OS") ? "OS (Left)" : rec.eye_examined || "OU"}
                        </span>
                      </td>

                      {/* Exam Date */}
                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {dateFormatted}
                      </td>

                      {/* Photo Quality */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700" title="Blurry or low-contrast fundus photo">
                            <Camera className="w-3 h-3 text-slate-500" />
                            Retake Advised
                          </span>
                        ) : rec.quality_decision === "enhance-then-accept" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Enhanced Quality
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Optimal Clarity
                          </span>
                        )}
                      </td>

                      {/* AI Diagnosis & Confidence */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Ungradable (Quality Suboptimal)
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${diagBadgeClass}`}>
                            <DiagIcon className="w-3 h-3 shrink-0" />
                            <span>{diagLabel}</span>
                            {confVal !== null && (
                              <span className="font-semibold opacity-90">({confVal}%)</span>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Clinical Action Plan */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isRejected ? (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Re-photograph fundus
                          </span>
                        ) : (
                          <span className={`font-semibold block text-[11px] ${actionPlanColor}`}>
                            {actionPlanText}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleDownloadPdf(rec.id, e)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Download Clinical PDF Report"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(rec.id, e)}
                            disabled={deletingId === rec.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6">
            {detailLoading || !recordDetail ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
                <p className="text-sm text-slate-500">Loading screening detail...</p>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {recordDetail.name}
                      </h2>
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {recordDetail.patient_id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Screened on {new Date(recordDetail.created_at).toLocaleString()} • Attending: {recordDetail.doctor_name || "Staff Clinician"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(recordDetail.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseDetail}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Patient Intake Demographics Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Age & Gender</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {recordDetail.age} yrs • {recordDetail.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Target Eye</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {recordDetail.eye_examined || "OD (Right)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Diabetes History</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {recordDetail.diabetes_type || "None"}{" "}
                      {recordDetail.diabetes_duration ? `(${recordDetail.diabetes_duration} yrs)` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Contact</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {recordDetail.contact || "None noted"}
                    </span>
                  </div>
                  {recordDetail.clinical_notes && (
                    <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block font-medium">Physician Clinical Notes:</span>
                      <p className="text-slate-700 dark:text-slate-300 italic">"{recordDetail.clinical_notes}"</p>
                    </div>
                  )}
                </div>

                {/* Clinical AI Diagnosis & Recommendation Card */}
                {(() => {
                  const isDetailRejected = recordDetail.quality_decision === "reject-recapture";
                  const detailGrade = recordDetail.grade_predicted ?? (recordDetail.grade_label?.includes("Moderate") ? 2 : recordDetail.grade_label?.includes("Proliferative") ? 4 : 0);
                  const detailConf = recordDetail.grade_confidence !== null && recordDetail.grade_confidence !== undefined
                    ? Math.round(recordDetail.grade_confidence * 100)
                    : null;

                  if (isDetailRejected) {
                    return (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            <Camera className="w-3.5 h-3.5 text-slate-500" />
                            <span>Ungradable — Retake Photograph Required</span>
                          </span>

                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Photo Quality: Suboptimal (Retake Advised)
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
                          <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Clinical Action Plan</span>
                          <p className="text-slate-700 dark:text-slate-300">
                            Automated AI diagnostic staging and confidence scores are withheld to protect clinical safety because this photograph fell below the minimum clarity threshold. Please re-photograph the patient's fundus under proper dilation and focus.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  let detailDiag = "No Diabetic Retinopathy Detected";
                  let detailBadge = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
                  let DetailIcon = CheckCircle2;
                  let detailAction = "Routine Annual Retinal Screening (Glycemic & BP optimization)";

                  if (detailGrade === 4 || recordDetail.grade_label?.includes("Proliferative")) {
                    detailDiag = "Stage 4: Proliferative Diabetic Retinopathy";
                    detailBadge = "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700";
                    DetailIcon = AlertOctagon;
                    detailAction = "Prompt Specialist Referral: Comprehensive dilated retinal exam by an ophthalmologist recommended.";
                  } else if (detailGrade === 3 || recordDetail.grade_label?.includes("Severe")) {
                    detailDiag = "Stage 3: Severe Non-Proliferative DR";
                    detailBadge = "bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700";
                    DetailIcon = AlertOctagon;
                    detailAction = "Prompt Specialist Referral: Comprehensive dilated retinal exam by an ophthalmologist recommended.";
                  } else if (detailGrade === 2 || recordDetail.grade_label?.includes("Moderate")) {
                    detailDiag = "Stage 2: Moderate Non-Proliferative DR";
                    detailBadge = "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700";
                    DetailIcon = AlertTriangle;
                    detailAction = "Clinical Follow-up: Referral to retina specialist within 3–6 months advised.";
                  } else if (detailGrade === 1 || recordDetail.grade_label?.includes("Mild")) {
                    detailDiag = "Stage 1: Mild Non-Proliferative DR";
                    detailBadge = "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700";
                    DetailIcon = CheckCircle2;
                    detailAction = "Clinical Monitoring: Follow-up exam in 6–12 months with glycemic optimization.";
                  }

                  return (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${detailBadge}`}>
                            <DetailIcon className="w-3.5 h-3.5" />
                            <span>{detailDiag}</span>
                            {detailConf !== null && (
                              <span className="font-semibold opacity-90">({detailConf}% confidence)</span>
                            )}
                          </span>
                        </div>

                        {/* Photo Quality Status */}
                        <div>
                          {recordDetail.quality_decision === "accept" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              Optimal Photo Quality
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
                              <span className="w-2 h-2 rounded-full bg-sky-500" />
                              Acceptable (Enhanced)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Plan */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                        <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">Recommended Action Plan</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailAction}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Fundus & Heatmap Visuals Side-by-Side */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Photographic Acquisition & Explainability (Grad-CAM)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        Standardized Fundus Photograph
                      </span>
                      {recordDetail.preprocessed_image ? (
                        <img
                          src={recordDetail.preprocessed_image}
                          alt="Retinal Fundus"
                          className="w-56 h-56 mx-auto rounded-xl object-contain border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-56 h-56 mx-auto rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500">
                          No Fundus Image Saved
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        Grad-CAM Conv5 Activation Heatmap
                      </span>
                      {recordDetail.heatmap_image ? (
                        <img
                          src={recordDetail.heatmap_image}
                          alt="Grad-CAM Heatmap"
                          className="w-56 h-56 mx-auto rounded-xl object-contain border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-56 h-56 mx-auto rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500">
                          Heatmap Unavailable
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantitative IQA Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Automated Image Quality Assessment (IQA)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Field-of-View</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {(recordDetail.fov_ratio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Sharpness (Laplacian)</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {recordDetail.sharpness.toFixed(1)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Illumination Index</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {recordDetail.illumination_var.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Vessel Contrast</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {recordDetail.vessel_contrast.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(recordDetail.id, e)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Record
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseDetail}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  >
                    Close Window
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
