import { callerIsStaff } from "@/lib/access";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKETS = { media: "csc-media", documents: "csc-documents" } as const;

const MAX_BYTES = { media: 10 * 1024 * 1024, documents: 25 * 1024 * 1024 };

const ALLOWED = {
  media: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
  ],
};

function matchesSignature(b: Buffer, type: string): boolean {
  const hex = b.subarray(0, 12).toString("hex");
  const ascii = b.subarray(0, 12).toString("latin1");
  switch (type) {
    case "image/png": return hex.startsWith("89504e470d0a1a0a");
    case "image/jpeg": return hex.startsWith("ffd8ff");
    case "image/gif": return ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a");
    case "image/webp": return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
    case "image/avif": return ascii.slice(4, 8) === "ftyp";
    case "application/pdf": return ascii.startsWith("%PDF-");
    case "application/msword":
    case "application/vnd.ms-excel": return hex.startsWith("d0cf11e0a1b11ae1");
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return hex.startsWith("504b0304");
    default: return false;
  }
}

type UploadInput = {
  kind: "media" | "documents";
  fileName: string;
  contentType: string;
  dataBase64: string;
};

export const uploadAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UploadInput) => {
    if (input.kind !== "media" && input.kind !== "documents") {
      throw new Error("Invalid upload target.");
    }
    if (!input.fileName || !input.dataBase64) throw new Error("Missing file data.");
    if (typeof input.fileName !== "string" || input.fileName.length > 200)
      throw new Error("Invalid file name.");

    if (input.dataBase64.length > Math.ceil((MAX_BYTES[input.kind] * 4) / 3) + 16)
      throw new Error("File is too large.");
    if (!ALLOWED[input.kind].includes(input.contentType)) {
      throw new Error("This file type is not allowed.");
    }
    return input;
  })
  .handler(async ({ data, context }) => {

    const isStaff = await callerIsStaff(context.supabase);
    if (!isStaff) throw new Error("You are not allowed to upload files.");

    const bytes = Buffer.from(data.dataBase64, "base64");
    if (bytes.byteLength > MAX_BYTES[data.kind]) {
      throw new Error("File is too large.");
    }

    if (!matchesSignature(bytes, data.contentType)) {
      throw new Error("The file contents do not match its type.");
    }

    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safeName}`;
    const bucket = BUCKETS[data.kind];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (signError || !signed) throw new Error(signError?.message ?? "Could not link file.");

    return {
      url: signed.signedUrl,
      fileName: data.fileName,
      fileSize: bytes.byteLength,
    };
  });
