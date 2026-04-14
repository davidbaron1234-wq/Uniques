import { Resend } from "resend";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { subject, title, description, email } = await req.json() as {
      subject: string;
      title: string;
      description: string;
      email?: string;
    };

    if (!subject || !title?.trim() || !description?.trim()) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from:    "Uniques Support <onboarding@resend.dev>",
      to:      "davidbaron1234@gmail.com",
      subject: `[Support] ${subject}: ${title.trim()}`,
      html: `
        <h2>Support Ticket</h2>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Title:</strong> ${title.trim()}</p>
        <p><strong>Description:</strong></p>
        <p style="white-space:pre-wrap">${description.trim()}</p>
        ${email ? `<p><strong>Reply-to:</strong> ${email}</p>` : ""}
      `,
    });

    if (error) {
      console.error("[POST /api/support] Resend error:", error);
      return Response.json({ error: "Failed to send" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/support]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
