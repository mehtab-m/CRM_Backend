import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer, { MulterError } from 'multer';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';

export const uploadsDir = path.resolve(process.cwd(), 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      return;
    }
    cb(null, true);
  },
});

export const uploadsRouter = Router();

uploadsRouter.use(requireAuth);

const canUpload = requireRole('crm_owner', 'business_owner', 'business_employee');

uploadsRouter.post(
  '/',
  canUpload,
  (req: Request, res: Response, next: NextFunction) => {
    upload.array('files', 5)(req, res, (err: unknown) => {
      if (err instanceof MulterError) {
        res.status(400).json({ message: err.message });
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      res.status(400).json({ message: 'At least one image file is required' });
      return;
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urls = files.map((file) => `${baseUrl}/uploads/${file.filename}`);
    res.status(201).json({ urls });
  },
);
