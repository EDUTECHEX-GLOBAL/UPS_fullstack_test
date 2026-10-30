import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { submitContactMessage } from '../controllers/contactcontroller.js';

const router = express.Router();
const contactSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages were sent. Please try again later.' },
});

router.post('/', contactSubmitLimiter, submitContactMessage);

export default router;
