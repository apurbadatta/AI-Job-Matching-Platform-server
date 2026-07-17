import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "candidate" | "employer" | "admin";
  status: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  session?: any;
}

export const isAuthenticated = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    req.user = session.user as AuthUser;
    req.session = session.session;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
};

export const hasRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

// Convenience middleware combinations
export const isEmployer = [isAuthenticated, hasRole(["employer", "admin"])];
export const isCandidate = [isAuthenticated, hasRole(["candidate", "admin"])];
export const isAdmin = [isAuthenticated, hasRole(["admin"])];
