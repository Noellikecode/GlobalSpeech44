import { Router } from "express";
import { db } from "../db";
import { clinics, submissions } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Get pending submissions
router.get("/submissions", async (req, res) => {
  try {
    const pendingSubmissions = await db
      .select({
        id: submissions.id,
        status: submissions.status,
        createdAt: submissions.createdAt,
        clinic: {
          id: clinics.id,
          name: clinics.name,
          country: clinics.country,
          state: clinics.state,
          city: clinics.city,
          latitude: clinics.latitude,
          longitude: clinics.longitude,
          costLevel: clinics.costLevel,
          services: clinics.services,
          languages: clinics.languages,
          teletherapy: clinics.teletherapy,
          phone: clinics.phone,
          website: clinics.website,
          email: clinics.email,
          notes: clinics.notes,
          submittedBy: clinics.submittedBy,
          submitterEmail: clinics.submitterEmail,
        }
      })
      .from(submissions)
      .innerJoin(clinics, eq(submissions.clinicId, clinics.id))
      .where(eq(submissions.status, "pending"))
      .orderBy(submissions.createdAt);

    res.json(pendingSubmissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Approve submission
router.post("/submissions/:id/approve", async (req, res) => {
  try {
    const submissionId = req.params.id;
    
    // Find the submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId));
    
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    
    // Update clinic to verified
    await db
      .update(clinics)
      .set({ verified: true })
      .where(eq(clinics.id, submission.clinicId!));
    
    // Update submission status
    await db
      .update(submissions)
      .set({ 
        status: "approved",
        reviewedBy: "admin", // In a real app, this would be the current user
        reviewedAt: new Date()
      })
      .where(eq(submissions.id, submissionId));
    
    res.json({ message: "Submission approved successfully" });
  } catch (error) {
    console.error("Error approving submission:", error);
    res.status(500).json({ error: "Failed to approve submission" });
  }
});

// Reject submission
router.post("/submissions/:id/reject", async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { reason } = req.body;
    
    // Find the submission
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId));
    
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    
    // Update submission status
    await db
      .update(submissions)
      .set({ 
        status: "rejected",
        reviewedBy: "admin",
        reviewedAt: new Date(),
        rejectionReason: reason
      })
      .where(eq(submissions.id, submissionId));
    
    // Optionally delete the clinic record since it was rejected
    await db
      .delete(clinics)
      .where(eq(clinics.id, submission.clinicId!));
    
    res.json({ message: "Submission rejected successfully" });
  } catch (error) {
    console.error("Error rejecting submission:", error);
    res.status(500).json({ error: "Failed to reject submission" });
  }
});

export default router;