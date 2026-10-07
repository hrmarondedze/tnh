import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import { db } from "../db/index.ts";
import { users, organisationMemberships, organisations } from "../db/schema.ts";
import { eq, and } from "drizzle-orm";

export interface AuthUserRecord {
  id: number;
  uid: string;
  email: string;
  name: string;
  platformRole: string;
  isRestricted: boolean;
}

export interface AuthRequest extends Request {
  authUser?: AuthUserRecord;
}

const DEMO_PERSONAS: Record<string, { uid: string; email: string; name: string }> = {
  "demo-student": {
    uid: "demo-student-tariro",
    email: "tariro.moyo@demo.tourbridge.zw",
    name: "Tariro Moyo (Fictional Demo)",
  },
  "demo-guide": {
    uid: "demo-guide-farai",
    email: "farai.ndlovu@demo.tourbridge.zw",
    name: "Farai Ndlovu (Fictional Demo)",
  },
  "demo-hospitality": {
    uid: "demo-hospitality-nyasha",
    email: "nyasha.chikwanda@demo.tourbridge.zw",
    name: "Nyasha Chikwanda (Fictional Demo)",
  },
  "demo-employer": {
    uid: "demo-employer-zambezi",
    email: "recruitment@zambezisands.demo.zw",
    name: "Kudzai Sibanda (Lodge Employer Demo)",
  },
  "demo-institution": {
    uid: "demo-institution-byo",
    email: "registrar@bulawayohospitality.demo.zw",
    name: "Dr. Chipo Mutasa (Institution Demo)",
  },
  "demo-admin": {
    uid: "demo-admin-trust",
    email: "admin@tourbridge.demo.zw",
    name: "Tendai Gumbo (Platform Admin Demo)",
  },
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const demoKey = req.headers["x-demo-persona"] as string | undefined;

    if (demoKey && DEMO_PERSONAS[demoKey]) {
      const persona = DEMO_PERSONAS[demoKey];
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.uid, persona.uid));

      if (existing.length > 0) {
        if (existing[0].isRestricted) {
          return res.status(403).json({
            error: "Account restricted by platform moderation.",
          });
        }
        req.authUser = {
          id: existing[0].id,
          uid: existing[0].uid,
          email: existing[0].email,
          name: existing[0].name,
          platformRole: existing[0].platformRole || "member",
          isRestricted: Boolean(existing[0].isRestricted),
        };
        return next();
      }
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
    }

    const token = authHeader.split("Bearer ")[1];

    // Check if token matches a demo UID directly
    if (token.startsWith("demo-persona:")) {
      const key = token.replace("demo-persona:", "");
      if (DEMO_PERSONAS[key]) {
        const persona = DEMO_PERSONAS[key];
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.uid, persona.uid));
        if (existing.length > 0) {
          if (existing[0].isRestricted) {
            return res.status(403).json({
              error: "Account restricted by platform moderation.",
            });
          }
          req.authUser = {
            id: existing[0].id,
            uid: existing[0].uid,
            email: existing[0].email,
            name: existing[0].name,
            platformRole: existing[0].platformRole || "member",
            isRestricted: Boolean(existing[0].isRestricted),
          };
          return next();
        }
      }
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email || `${uid}@tourbridge.zw`;
    const displayName = decodedToken.name || email.split("@")[0];

    const upserted = await db
      .insert(users)
      .values({
        uid,
        email,
        name: displayName,
        preferredName: displayName.split(" ")[0],
        avatarUrl: decodedToken.picture || "",
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    const userRecord = upserted[0];
    if (userRecord.isRestricted) {
      return res.status(403).json({
        error: "Your account is currently restricted by platform administration.",
      });
    }

    req.authUser = {
      id: userRecord.id,
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.name,
      platformRole: userRecord.platformRole || "member",
      isRestricted: Boolean(userRecord.isRestricted),
    };
    next();
  } catch (error) {
    console.error("Authentication verification error:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.authUser || req.authUser.platformRole !== "admin") {
    return res.status(403).json({
      error: "Forbidden: Platform Administrator privileges required.",
    });
  }
  next();
};

export async function verifyOrgStaffPermission(
  userId: number,
  organisationId: number
): Promise<{ allowed: boolean; membership?: typeof organisationMemberships.$inferSelect; org?: typeof organisations.$inferSelect }> {
  try {
    const memberships = await db
      .select()
      .from(organisationMemberships)
      .where(
        and(
          eq(organisationMemberships.userId, userId),
          eq(organisationMemberships.organisationId, organisationId),
          eq(organisationMemberships.isActive, true)
        )
      );

    if (memberships.length === 0) {
      return { allowed: false };
    }

    const orgs = await db
      .select()
      .from(organisations)
      .where(eq(organisations.id, organisationId));

    if (orgs.length === 0) {
      return { allowed: false };
    }

    return { allowed: true, membership: memberships[0], org: orgs[0] };
  } catch (error) {
    console.error("Failed checking org staff permission:", error);
    throw new Error("Permission check failed", { cause: error });
  }
}
