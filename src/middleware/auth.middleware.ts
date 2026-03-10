import { prisma } from "../config/prisma";
import { requireAuth } from "../policies/requireAuth";

export const authMiddleware = requireAuth(prisma);
