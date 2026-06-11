import { Router } from 'express';
import multer from 'multer';
import { updateProfileSchema } from '@say-it/shared';
import { usersController } from './users.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const usersRoutes = Router();

usersRoutes.use(authenticate);
usersRoutes.get('/me', usersController.me);
usersRoutes.patch('/me', validate({ body: updateProfileSchema }), usersController.updateMe);
usersRoutes.post('/me/avatar', upload.single('avatar'), usersController.uploadAvatar);
usersRoutes.get('/directory', usersController.directory);
usersRoutes.post('/presence/bulk', usersController.bulkPresence);
usersRoutes.get('/:id', usersController.getById);
usersRoutes.get('/:id/presence', usersController.presence);

export const departmentsRoutes = Router();
departmentsRoutes.use(authenticate);
departmentsRoutes.get('/', usersController.departments);
departmentsRoutes.get('/:id/members', usersController.departmentMembers);
