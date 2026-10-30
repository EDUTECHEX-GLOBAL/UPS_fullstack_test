import HelpdeskTicket from "../models/helpdeskModel.js";
import { getPresignedUrl } from "../middleware/uploadMiddleware.js";

const toSupportProcessTicket = async (ticket = {}) => {
  let screenshotUrl = ticket.screenshotUrl || "";
  const screenshotKey = ticket.screenshotKey || "";
  const screenshotName = ticket.screenshotName || "";

  if (screenshotKey) {
    try {
      screenshotUrl = await getPresignedUrl(screenshotKey) || "";
    } catch (error) {
      console.warn("Support process screenshot presign skipped:", error?.message || error);
    }
  }

  const hasAttachment = Boolean(screenshotKey || screenshotName || screenshotUrl);
  const attachmentAvailable = Boolean(screenshotUrl);

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
    screenshotName,
    screenshotKey,
    screenshotUrl,
    screenshotMimeType: ticket.screenshotMimeType,
    screenshotSize: ticket.screenshotSize,
    hasAttachment,
    attachmentAvailable,
    attachmentMissingReason: hasAttachment && !attachmentAvailable ? "Uploaded file URL is not available. The ticket may only have an old filename, or S3 presigning failed." : "",
    activity: Array.isArray(ticket.activity) ? ticket.activity : [],
    latestResponse: Array.isArray(ticket.activity)
      ? [...ticket.activity].reverse().find((item) => item.actorRole === "partner" || item.actorRole === "admin") || null
      : null,
  };
};

export const getSupportProcessTickets = async (_req, res) => {
  try {
    const tickets = await HelpdeskTicket.find({ assignedRole: { $in: ["partner", "process-admin"] } }).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      tickets: await Promise.all(tickets.map(toSupportProcessTicket)),
    });
  } catch (error) {
    console.error("Support process ticket list error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch support tickets",
    });
  }
};

export const replyToSupportProcessTicket = async (req, res) => {
  try {
    const ticketNumber = String(req.params.ticketNumber || "").trim();
    const message = String(req.body.message || "").trim();
    const status = ["Open", "In Progress", "Resolved", "Closed"].includes(req.body.status)
      ? req.body.status
      : "In Progress";

    if (!ticketNumber) {
      return res.status(400).json({ success: false, message: "Ticket number is required" });
    }
    if (!message) {
      return res.status(400).json({ success: false, message: "Reply message is required" });
    }

    const actorEmail = req.processAdmin?.email || req.user?.email || process.env.HELPDESK_PARTNER_EMAIL || "";
    const ticket = await HelpdeskTicket.findOneAndUpdate(
      { ticketNumber, assignedRole: { $in: ["partner", "process-admin"] } },
      {
        $set: {
          status,
          unreadForStudent: true,
          unreadForPartner: false,
        },
        $push: {
          activity: {
            actorRole: "partner",
            message,
            actorEmail,
          },
        },
      },
      { new: true }
    ).lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Support ticket not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Reply sent to student",
      ticket: await toSupportProcessTicket(ticket),
    });
  } catch (error) {
    console.error("Support process reply error:", error);
    return res.status(500).json({ success: false, message: "Failed to send support reply" });
  }
};
