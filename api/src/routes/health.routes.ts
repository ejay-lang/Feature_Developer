import { Router } from 'express';
import { getHealth } from '../modules/health/health.controller.js';

export const healthRoutes = Router();

healthRoutes.get('/', getHealth);
