import express from "express";
import { protectProcessAdmin } from "../middleware/processAdminAuth.js";
import {
  getSupportProcessTickets,
  replyToSupportProcessTicket,
} from "../controllers/supportprocessController.js";

const router = express.Router();

router.get("/tickets", protectProcessAdmin, getSupportProcessTickets);
router.post("/tickets/:ticketNumber/replies", protectProcessAdmin, replyToSupportProcessTicket);

export default router;
