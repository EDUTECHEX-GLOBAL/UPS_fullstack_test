import express from "express";
import authenticateToken from "../middleware/authMiddleware.js";
import { helpdeskUpload } from "../middleware/uploadMiddleware.js";
import {
  createHelpdeskTicket,
  getHelpdeskContext,
  getMyHelpdeskTickets,
  markHelpdeskTicketRead,
} from "../controllers/helpdeskController.js";

const router = express.Router();

router.get("/context", authenticateToken, getHelpdeskContext);
router.get("/tickets", authenticateToken, getMyHelpdeskTickets);
router.post("/tickets", authenticateToken, helpdeskUpload.single("screenshot"), createHelpdeskTicket);
router.patch("/tickets/:ticketNumber/read", authenticateToken, markHelpdeskTicketRead);

export default router;
