// routes/types.ts
import type { Request } from "express";

// Extend Express Request to include user for authenticated routes
export interface AuthRequest extends Request {
  user?: { 
    userId: string; 
    username: string; 
    role: string; 
  };
}