import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { db } from "./src/db/index.ts";
import { reservations, admins } from "./src/db/schema.ts";
import { eq, and } from "drizzle-orm";
import { SPACES } from "./src/types.ts";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function toPublicAdmin(admin: { id: number; name: string; email: string }) {
  return { id: admin.id, name: admin.name, email: admin.email };
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Mock email sender
  const sendEmail = (to: string, subject: string, body: string) => {
    console.log(`\n=== EMAIL SENT TO: ${to} ===\nSubject: ${subject}\n\n${body}\n==================================\n`);
  };

  app.get("/api/reservations", async (req, res) => {
    try {
      const allReservations = await db.select().from(reservations);
      // Sort by date descending
      allReservations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(allReservations);
    } catch (error: any) {
      console.error("Failed to fetch reservations:", error);
      res.status(500).json({ error: error.message || "Failed to fetch reservations" });
    }
  });

  app.post("/api/reservations", async (req, res) => {
    try {
      const { space, date, startTime, endTime, name, email, reason } = req.body;
      
      // Basic validation
      if (!space || !date || !startTime || !endTime || !name || !email || !reason) {
        return res.status(400).json({ error: "Todos los campos son requeridos" });
      }

      if (startTime >= endTime) {
        return res.status(400).json({ error: "La hora de inicio debe ser anterior a la hora de fin" });
      }

      if (!SPACES.some(s => s.name === space)) {
        return res.status(400).json({ error: "El espacio seleccionado no es válido" });
      }

      const today = new Date().toISOString().slice(0, 10);
      if (date < today) {
        return res.status(400).json({ error: "No se pueden solicitar fechas pasadas" });
      }

      // Only CONFIRMED reservations block a slot; multiple PENDING requests may
      // compete for the same slot and an admin decides which one to approve.
      const overlappingStrict = await db.select().from(reservations).where(
        and(
          eq(reservations.space, space),
          eq(reservations.date, date),
          eq(reservations.status, 'CONFIRMED')
        )
      );

      const hasConflict = overlappingStrict.some(existing => {
        return startTime < existing.endTime && endTime > existing.startTime;
      });

      if (hasConflict) {
        return res.status(400).json({ error: "El espacio ya está reservado en ese horario" });
      }

      const token = uuidv4();
      const newReservation = await db.insert(reservations).values({
        space,
        date,
        startTime,
        endTime,
        name,
        email,
        reason,
        status: 'PENDING',
        token,
      }).returning();

      // Send emails to admins
      const allAdmins = await db.select().from(admins);
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      
      for (const admin of allAdmins) {
        sendEmail(
          admin.email,
          "Nueva Solicitud de Espacio CITRO",
          `Hola ${admin.name},\n\nSe ha recibido una nueva solicitud de espacio:\n- Espacio: ${space}\n- Fecha: ${date}\n- Horario: ${startTime} a ${endTime}\n- Solicitante: ${name} (${email})\n- Motivo: ${reason}\n\nPara APROBAR esta solicitud, haz clic aquí:\n${appUrl}/api/reservations/${token}/approve\n\nPara RECHAZAR esta solicitud, haz clic aquí:\n${appUrl}/api/reservations/${token}/reject\n`
        );
      }

      res.status(201).json(newReservation[0]);
    } catch (error: any) {
      console.error("Failed to create reservation:", error);
      res.status(500).json({ error: "Ocurrió un error al procesar tu solicitud." });
    }
  });

  app.get("/api/reservations/:token/approve", async (req, res) => {
    try {
      const token = req.params.token;
      const reservationArray = await db.select().from(reservations).where(eq(reservations.token, token));
      
      if (reservationArray.length === 0) {
        return res.status(404).send("Solicitud no encontrada.");
      }
      
      const reservation = reservationArray[0];
      
      if (reservation.status !== 'PENDING') {
        return res.status(400).send(`Esta solicitud ya fue ${reservation.status === 'CONFIRMED' ? 'APROBADA' : 'RECHAZADA'}.`);
      }

      // Check conflict again just in case another was approved meanwhile
      const overlappingStrict = await db.select().from(reservations).where(
        and(
          eq(reservations.space, reservation.space),
          eq(reservations.date, reservation.date),
          eq(reservations.status, 'CONFIRMED')
        )
      );
      
      const hasConflict = overlappingStrict.some(existing => {
        return reservation.startTime < existing.endTime && reservation.endTime > existing.startTime;
      });

      if (hasConflict) {
        return res.status(400).send("No se puede aprobar. Hay un conflicto de horario con una reserva ya confirmada.");
      }

      await db.update(reservations).set({ status: 'CONFIRMED' }).where(eq(reservations.token, token));
      
      sendEmail(
        reservation.email,
        "Tu solicitud de espacio en CITRO fue APROBADA",
        `Hola ${reservation.name},\n\nTu solicitud para usar ${reservation.space} el día ${reservation.date} de ${reservation.startTime} a ${reservation.endTime} ha sido APROBADA.\n\n¡Gracias!`
      );
      
      res.send(`<h1>Solicitud Aprobada</h1><p>Se ha notificado al solicitante.</p>`);
    } catch (error: any) {
      console.error(error);
      res.status(500).send("Error interno del servidor.");
    }
  });

  app.get("/api/reservations/:token/reject", async (req, res) => {
    try {
      const token = req.params.token;
      const reservationArray = await db.select().from(reservations).where(eq(reservations.token, token));
      
      if (reservationArray.length === 0) {
        return res.status(404).send("Solicitud no encontrada.");
      }
      
      const reservation = reservationArray[0];
      
      if (reservation.status !== 'PENDING') {
        return res.status(400).send(`Esta solicitud ya fue ${reservation.status === 'CONFIRMED' ? 'APROBADA' : 'RECHAZADA'}.`);
      }

      await db.update(reservations).set({ status: 'REJECTED' }).where(eq(reservations.token, token));
      
      sendEmail(
        reservation.email,
        "Tu solicitud de espacio en CITRO fue RECHAZADA",
        `Hola ${reservation.name},\n\nLamentamos informarte que tu solicitud para usar ${reservation.space} el día ${reservation.date} de ${reservation.startTime} a ${reservation.endTime} ha sido RECHAZADA.\n\nSi tienes dudas, contacta a la administración.`
      );
      
      res.send(`<h1>Solicitud Rechazada</h1><p>Se ha notificado al solicitante.</p>`);
    } catch (error: any) {
      console.error(error);
      res.status(500).send("Error interno del servidor.");
    }
  });

  // Admin auth middleware: validates per-admin credentials sent as headers
  const adminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const email = req.headers['x-admin-email'];
      const password = req.headers['x-admin-password'];
      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(401).json({ error: "No autorizado" });
      }

      const found = await db.select().from(admins).where(eq(admins.email, email.toLowerCase().trim()));
      if (found.length === 0 || !verifyPassword(password, found[0].password)) {
        return res.status(401).json({ error: "No autorizado" });
      }

      (req as any).adminUser = found[0];
      next();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // Whether any administrator account exists yet (first-run setup)
  app.get("/api/admin/setup-status", async (req, res) => {
    try {
      const count = await db.select().from(admins);
      res.json({ needsSetup: count.length === 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // One-time setup: creates the very first admin account, gated by the
  // ADMIN_PASSWORD env var so a stranger can't self-register as admin.
  app.post("/api/admin/setup", async (req, res) => {
    try {
      const { masterKey, name, email, password } = req.body;

      if (!process.env.ADMIN_PASSWORD) {
        return res.status(500).json({ error: "El servidor no tiene configurada la clave maestra (ADMIN_PASSWORD)" });
      }
      if (masterKey !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Clave maestra incorrecta" });
      }
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Nombre, correo y contraseña son requeridos" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
      }

      const existing = await db.select().from(admins);
      if (existing.length > 0) {
        return res.status(400).json({ error: "La configuración inicial ya se completó. Inicia sesión normalmente." });
      }

      const newAdmin = await db.insert(admins).values({
        name,
        email: email.toLowerCase().trim(),
        password: hashPassword(password),
      }).returning();

      res.status(201).json(toPublicAdmin(newAdmin[0]));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Correo y contraseña son requeridos" });
      }

      const found = await db.select().from(admins).where(eq(admins.email, email.toLowerCase().trim()));
      if (found.length === 0 || !verifyPassword(password, found[0].password)) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      res.json({ success: true, admin: toPublicAdmin(found[0]) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/admins", adminAuth, async (req, res) => {
    try {
      const allAdmins = await db.select().from(admins);
      res.json(allAdmins.map(toPublicAdmin));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/admins", adminAuth, async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Nombre, correo y contraseña son requeridos" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
      }

      const newAdmin = await db.insert(admins).values({
        name,
        email: email.toLowerCase().trim(),
        password: hashPassword(password),
      }).returning();
      res.status(201).json(toPublicAdmin(newAdmin[0]));
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(400).json({ error: "Ya existe un administrador con ese correo" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/admins/:id", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const targetId = parseInt(id);
      const requester = (req as any).adminUser;

      if (requester.id === targetId) {
        return res.status(400).json({ error: "No puedes eliminar tu propia cuenta mientras tienes la sesión iniciada" });
      }

      const allAdmins = await db.select().from(admins);
      if (allAdmins.length <= 1) {
        return res.status(400).json({ error: "Debe quedar al menos un administrador" });
      }

      await db.delete(admins).where(eq(admins.id, targetId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/reservations/:id/status", adminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const reservationArray = await db.select().from(reservations).where(eq(reservations.id, parseInt(id)));
      if (reservationArray.length === 0) {
        return res.status(404).json({ error: "Solicitud no encontrada" });
      }
      
      const reservation = reservationArray[0];

      const validTransitions: Record<string, string[]> = {
        CONFIRMED: ['PENDING'],
        REJECTED: ['PENDING'],
        CANCELLED: ['CONFIRMED'],
      };

      if (!validTransitions[status]) {
        return res.status(400).json({ error: "Estado no válido" });
      }

      if (!validTransitions[status].includes(reservation.status)) {
        return res.status(400).json({ error: `No se puede pasar de ${reservation.status} a ${status}` });
      }

      if (status === 'CONFIRMED') {
        const overlappingStrict = await db.select().from(reservations).where(
          and(
            eq(reservations.space, reservation.space),
            eq(reservations.date, reservation.date),
            eq(reservations.status, 'CONFIRMED')
          )
        );

        const hasConflict = overlappingStrict.some(existing => {
          return existing.id !== reservation.id && (reservation.startTime < existing.endTime && reservation.endTime > existing.startTime);
        });

        if (hasConflict) {
          return res.status(400).json({ error: "Conflicto de horario con una reserva ya confirmada" });
        }
      }

      await db.update(reservations).set({ status }).where(eq(reservations.id, parseInt(id)));

      if (status === 'CONFIRMED') {
        sendEmail(
          reservation.email,
          "Tu solicitud de espacio en CITRO fue APROBADA",
          `Hola ${reservation.name},\n\nTu solicitud para usar ${reservation.space} el día ${reservation.date} de ${reservation.startTime} a ${reservation.endTime} ha sido APROBADA.\n\n¡Gracias!`
        );
      } else if (status === 'REJECTED') {
        sendEmail(
          reservation.email,
          "Tu solicitud de espacio en CITRO fue RECHAZADA",
          `Hola ${reservation.name},\n\nLamentamos informarte que tu solicitud para usar ${reservation.space} el día ${reservation.date} de ${reservation.startTime} a ${reservation.endTime} ha sido RECHAZADA.\n\nSi tienes dudas, contacta a la administración.`
        );
      } else if (status === 'CANCELLED') {
        sendEmail(
          reservation.email,
          "Tu reserva de espacio en CITRO fue CANCELADA",
          `Hola ${reservation.name},\n\nTu reserva para usar ${reservation.space} el día ${reservation.date} de ${reservation.startTime} a ${reservation.endTime} ha sido CANCELADA por la administración.\n\nSi tienes dudas, contacta a la administración.`
        );
      }

      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
