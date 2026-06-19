import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

// POST /api/send-email
//
// Body (JSON):
// {
//   "to": ["user1@example.com", "user2@example.com"],   // string or string[]
//   "cc": ["cc1@example.com"],                           // optional
//   "bcc": ["bcc1@example.com"],                         // optional
//   "subject": "Hello from SCP",
//   "html": "<b>HTML content</b>",                      // optional (but html or text required)
//   "text": "Plain text fallback",                       // optional
//   "replyTo": "reply@example.com",                      // optional
//   "attachments": [                                     // optional
//     { "filename": "report.pdf", "content": "<base64>", "contentType": "application/pdf" }
//   ]
// }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── Validate required fields ──────────────────────────────────────────
    if (!body.to) {
      return NextResponse.json(
        { success: false, error: '"to" field is required' },
        { status: 400 }
      );
    }

    if (!body.subject) {
      return NextResponse.json(
        { success: false, error: '"subject" field is required' },
        { status: 400 }
      );
    }

    if (!body.html && !body.text) {
      return NextResponse.json(
        { success: false, error: 'At least one of "html" or "text" is required' },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      html: body.html,
      text: body.text,
      replyTo: body.replyTo,
      attachments: body.attachments,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}