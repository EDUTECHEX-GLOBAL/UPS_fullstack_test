import axiosInstance from "../api/axiosInstance";

const sortTicketsByActivity = (tickets = []) =>
  [...tickets].sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));

export const getLocalSupportTickets = () => [];

export const getHelpdeskContext = async (source = {}) => {
  try {
    const response = await axiosInstance.get("/api/helpdesk/context", { params: source });
    return response.data?.context || {};
  } catch (error) {
    console.warn("Helpdesk context unavailable; using local page context.", error?.response?.status || error?.message);
    return {};
  }
};

export const getSupportTickets = async () => {
  try {
    const response = await axiosInstance.get("/api/helpdesk/tickets");
    return sortTicketsByActivity(response.data?.tickets || []);
  } catch (error) {
    console.warn("Support tickets unavailable; showing an empty ticket list.", error?.response?.status || error?.message);
    return [];
  }
};

export const createSupportTicket = async (ticketData = {}) => {
  const formData = new FormData();

  Object.entries(ticketData).forEach(([key, value]) => {
    if (key === "screenshot" || key === "context") return;
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  if (ticketData.context) {
    formData.append("context", JSON.stringify(ticketData.context));
  }

  if (ticketData.screenshot) {
    formData.append("screenshot", ticketData.screenshot);
  }

  if (ticketData.screenshot) {
    console.log("Uploading helpdesk attachment:", ticketData.screenshot.name, ticketData.screenshot.type, ticketData.screenshot.size);
  }

  const response = await axiosInstance.post("/api/helpdesk/tickets", formData);
  return response.data?.ticket;
};

export const markTicketRead = async (ticketNumber) => {
  if (!ticketNumber) return null;
  const response = await axiosInstance.patch(`/api/helpdesk/tickets/${ticketNumber}/read`);
  return response.data?.ticket;
};

export const getTicketCounts = (tickets = []) => ({
  all: tickets.length,
  open: tickets.filter((ticket) => ticket.status === "Open" || ticket.status === "In Progress").length,
  unread: tickets.filter((ticket) => ticket.unread).length,
  resolved: tickets.filter((ticket) => ticket.status === "Resolved").length,
});

