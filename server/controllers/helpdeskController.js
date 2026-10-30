import Account from "../models/accountModel.js";
import UserProfile from "../models/userprofilemodel.js";
import HelpdeskTicket from "../models/helpdeskModel.js";
import { getPresignedUrl } from "../middleware/uploadMiddleware.js";

const normalizePath = (value = "") => String(value || "").split("?")[0].trim();

const toTitle = (value = "") =>
  String(value || "")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "";

const getStudentId = (account = {}) =>
  account.studentId ||
  account.caId ||
  (account._id ? `STU-${account._id.toString().slice(-6).toUpperCase()}` : "");

const getFullName = (account = {}, profile = {}) => {
  const profileName = profile?.basicInfo?.fullName;
  const accountName = [account.firstName, account.lastName].filter(Boolean).join(" ");
  return profileName || accountName || account.email || "Student";
};

const getStudyLevel = (profile = {}) => {
  if (profile.programType === "PG") return "Postgraduate (PG)";
  if (profile.programType === "UG") return "Undergraduate (UG)";
  return "";
};

const getSelectedUniversity = (profile = {}) => profile.selectedUniversities?.[0] || {};

const getProgress = (account = {}) => {
  const progress = account.applicationProgress || {};
  const values = [
    progress.profile,
    progress.application,
    progress.education,
    progress.testing,
    progress.activities,
    progress.writing,
    progress.documents,
  ].map((value) => Number(value || 0));
  return Math.max(0, ...values);
};

const deriveCategory = (path = "", title = "") => {
  const sourcePath = String(path || "").toLowerCase();
  const sourceTitle = String(title || "").toLowerCase();
  const source = `${sourceTitle} ${sourcePath}`;

  if (source.includes("application progress")) return "Application Progress";
  if (source.includes("document")) return "Documents";
  if (source.includes("test score") || source.includes("testing") || source.includes("/scores") || source.includes("/tests")) return "Test Scores";
  if (source.includes("education") || source.includes("academic") || source.includes("firsteducation")) return "Education Details";
  if (source.includes("personal information") || source.includes("/personal")) return "Personal Information";
  if (source.includes("contact details") || source.includes("/contact")) return "Contact Details";
  if (source.includes("address") || source.includes("/address")) return "Address";
  if (source.includes("language") || source.includes("/language")) return "Language";
  if (source.includes("geography") || source.includes("/geography")) return "Geography";
  if (source.includes("special needs") || source.includes("specialneeds")) return "Profile";
  if (source.includes("activity") || source.includes("activities")) return "Activities";
  if (source.includes("writing") || source.includes("essay")) return "Writing";
  if (source.includes("family")) return "Family";
  if (source.includes("preview")) return "Application Preview";
  if (source.includes("course selection") || source.includes("college") || source.includes("university") || source.includes("course")) return "University Selection";
  if (source.includes("profile")) return "Profile";
  if (source.includes("master application") || source.includes("master-application")) return "Master Application";
  if (source.includes("bachelor application") || source.includes("/application")) return "Bachelor Application";
  if (source.includes("otp") || source.includes("password") || source.includes("account")) return "Account";
  if (source.includes("payment") || source.includes("fee")) return "Payment";
  if (sourceTitle === "dashboard" || /\/firstyear\/dashboard\/?$/.test(sourcePath)) return "Dashboard";
  return "Application";
};

const deriveIssueType = (category = "") => {
  if (category === "Dashboard") return "Dashboard page issue";
  if (category === "Application Progress") return "Progress tracking issue";
  if (category === "Personal Information") return "Personal information issue";
  if (category === "Contact Details") return "Contact details issue";
  if (category === "Address") return "Address information issue";
  if (category === "Language") return "Language information issue";
  if (category === "Geography") return "Geography information issue";
  if (category === "Profile") return "Profile form issue";
  if (category === "Education Details") return "Education details issue";
  if (category === "Documents") return "Upload issue";
  if (category === "Test Scores") return "Test score issue";
  if (category === "Family") return "Family information issue";
  if (category === "Activities") return "Activities form issue";
  if (category === "Writing") return "Writing section issue";
  if (category === "Application Preview") return "Preview or submit issue";
  if (category === "University Selection") return "Selection problem";
  if (category === "Bachelor Application") return "Bachelor application form issue";
  if (category === "Master Application") return "Master application form issue";
  if (category === "Account") return "OTP issue";
  if (category === "Payment") return "Payment issue";
  if (category === "Other") return "General support query";
  return "Data not saving";
};

const normalizeReportedSection = (section = "") => String(section || "").trim() || "Other";

const deriveIssueTypeForReportedSection = (section = "") => {
  const normalized = normalizeReportedSection(section);
  if (normalized === "Documents") return "Document requirement issue";
  if (normalized === "Payment") return "Payment issue";
  if (normalized === "Other") return "General support query";
  return deriveIssueType(normalized);
};

const derivePriority = (category = "") =>
  ["Account", "Payment", "Documents"].includes(category) ? "High" : "Medium";

const buildTicketSubject = (category, issueType) => `${category} - ${issueType}`;

const nextTicketNumber = async () => {
  const latest = await HelpdeskTicket.findOne().sort({ createdAt: -1 }).select("ticketNumber").lean();
  const latestNumber = Number(String(latest?.ticketNumber || "").replace(/\D/g, "")) || 231;
  return `SUP-${String(latestNumber + 1).padStart(6, "0")}`;
};

const getContextForUser = async (userId, source = {}) => {
  const [account, profile] = await Promise.all([
    Account.findById(userId).select("-password").lean(),
    UserProfile.findOne({ userId: String(userId) }).lean(),
  ]);

  if (!account) {
    const error = new Error("Student account not found");
    error.status = 404;
    throw error;
  }

  const sourcePath = normalizePath(source.sourcePath);
  const sourceTitle = source.sourceTitle || toTitle(sourcePath);
  const category = source.category || deriveCategory(sourcePath, sourceTitle);
  const issueType = source.issueType || deriveIssueType(category);
  const selectedUniversity = getSelectedUniversity(profile || {});
  const selectedCourse = selectedUniversity.selectedCourses?.[0] || {};

  return {
    studentName: getFullName(account, profile),
    studentEmail: profile?.basicInfo?.email || account.email || "",
    studentId: getStudentId(account),
    applicationId: "EQHE-000021",
    currentSection: sourceTitle || category,
    sourcePath,
    sourceTitle,
    studyLevel: getStudyLevel(profile || {}),
    selectedUniversity: selectedUniversity.name || selectedUniversity.universityName || selectedUniversity.INSTNM || "Not selected",
    selectedCourse: selectedCourse.title || selectedCourse.name || selectedCourse.program_name || "Not selected",
    currentProgress: getProgress(account),
    category,
    issueType,
    priority: source.priority || derivePriority(category),
    assignedRole: "partner",
    assignedPartner: {
      name: "EdutechEX Support Partner",
      email: process.env.HELPDESK_PARTNER_EMAIL || "",
    },
  };
};

const toClientTicket = async (ticket = {}) => {
  let screenshotUrl = ticket.screenshotUrl || "";

  if (ticket.screenshotKey) {
    try {
      screenshotUrl = await getPresignedUrl(ticket.screenshotKey);
    } catch (error) {
      console.error("Helpdesk screenshot presign error:", error);
    }
  }

  return {
    id: ticket.ticketNumber,
    ticketNumber: ticket.ticketNumber,
    ticketMode: ticket.ticketMode || "currentPage",
    reportedSection: ticket.reportedSection || "",
    category: ticket.category,
    issueType: ticket.issueType,
    priority: ticket.priority,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    unread: ticket.unreadForStudent,
    unreadForStudent: ticket.unreadForStudent,
    unreadForPartner: ticket.unreadForPartner,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    studentName: ticket.studentName,
    studentEmail: ticket.studentEmail,
    studentId: ticket.studentId,
    applicationId: ticket.applicationId,
    assignedPartner: ticket.assignedPartner,
    currentSection: ticket.currentSection,
    sourcePath: ticket.sourcePath,
    sourceTitle: ticket.sourceTitle,
    studyLevel: ticket.studyLevel,
    selectedUniversity: ticket.selectedUniversity,
    selectedCourse: ticket.selectedCourse,
    currentProgress: ticket.currentProgress,
    screenshotName: ticket.screenshotName,
    screenshotKey: ticket.screenshotKey,
    screenshotUrl,
    screenshotMimeType: ticket.screenshotMimeType,
    screenshotSize: ticket.screenshotSize,
    activity: Array.isArray(ticket.activity) ? ticket.activity : [],
    latestResponse: Array.isArray(ticket.activity)
      ? [...ticket.activity].reverse().find((item) => item.actorRole === "partner" || item.actorRole === "admin") || null
      : null,
  };
};

export const getHelpdeskContext = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const context = await getContextForUser(req.userId, req.query);
    return res.status(200).json({ success: true, context });
  } catch (error) {
    console.error("Helpdesk context error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to load helpdesk context",
    });
  }
};

export const getMyHelpdeskTickets = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const tickets = await HelpdeskTicket.find({ userId: req.userId }).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ success: true, tickets: await Promise.all(tickets.map(toClientTicket)) });
  } catch (error) {
    console.error("Helpdesk ticket list error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch helpdesk tickets" });
  }
};

export const createHelpdeskTicket = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const description = String(req.body.description || "").trim();
    if (!description) {
      return res.status(400).json({ success: false, message: "Issue description is required" });
    }

    const ticketMode = req.body.ticketMode === "otherQuery" ? "otherQuery" : "currentPage";
    let requestContext = req.body.context || {};
    if (typeof requestContext === "string") {
      try {
        requestContext = JSON.parse(requestContext);
      } catch {
        console.warn("Helpdesk context payload was not valid JSON; using source fields only");
        requestContext = {};
      }
    }

    const context = await getContextForUser(req.userId, {
      ...requestContext,
      sourcePath: req.body.sourcePath || requestContext.sourcePath,
      sourceTitle: req.body.sourceTitle || requestContext.sourceTitle,
    });

    const reportedSection = ticketMode === "otherQuery"
      ? normalizeReportedSection(req.body.reportedSection || req.body.category)
      : "";
    const category = ticketMode === "otherQuery"
      ? reportedSection
      : deriveCategory(context.sourcePath, context.sourceTitle);
    const issueType = ticketMode === "otherQuery"
      ? deriveIssueTypeForReportedSection(reportedSection)
      : deriveIssueType(category);
    const priority = derivePriority(category);
    const subject = buildTicketSubject(category, issueType);
    const submittedScreenshotName = String(req.body.screenshotName || "").trim();
    const uploadedFile = req.file || null;

    if (submittedScreenshotName && !uploadedFile) {
      console.warn("Helpdesk ticket submitted a screenshot name but no uploaded file reached multer/S3:", {
        screenshotName: submittedScreenshotName,
        ticketMode,
        userId: req.userId,
        contentType: req.headers["content-type"],
      });
    }

    const ticket = await HelpdeskTicket.create({
      ticketNumber: await nextTicketNumber(),
      userId: req.userId,
      ...context,
      ticketMode,
      reportedSection,
      category,
      issueType,
      priority,
      subject: String(req.body.subject || "").trim() || subject,
      description,
      screenshotName: uploadedFile?.originalname || submittedScreenshotName,
      screenshotKey: uploadedFile?.key || "",
      screenshotMimeType: uploadedFile?.mimetype || "",
      screenshotSize: uploadedFile?.size || 0,
      activity: [
        {
          actorRole: "student",
          message: description,
        },
        {
          actorRole: "system",
          message: `Ticket allocated to ${context.assignedPartner.name}`,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket submitted successfully",
      ticket: await toClientTicket(ticket.toObject()),
      context,
    });
  } catch (error) {
    console.error("Helpdesk create ticket error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create support ticket",
    });
  }
};

export const markHelpdeskTicketRead = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const ticketNumber = String(req.params.ticketNumber || "").trim();
    if (!ticketNumber) {
      return res.status(400).json({ success: false, message: "Ticket number is required" });
    }

    const ticket = await HelpdeskTicket.findOneAndUpdate(
      { ticketNumber, userId: req.userId },
      { $set: { unreadForStudent: false } },
      { new: true }
    ).lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Support ticket not found" });
    }

    return res.status(200).json({
      success: true,
      ticket: await toClientTicket(ticket),
    });
  } catch (error) {
    console.error("Helpdesk mark read error:", error);
    return res.status(500).json({ success: false, message: "Failed to mark ticket as read" });
  }
};

