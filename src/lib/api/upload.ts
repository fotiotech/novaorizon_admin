// lib/api/upload.ts
import api from "@/lib/api";

export interface UploadResult {
  url: string;
  fileKey: string;
}

export interface UploadOptions {
  /**
   * Logical owner of the upload (e.g. a product id, category id, user id).
   * Sanitized server-side and prefixed to the S3 key.
   */
  instanceId?: string;
  /**
   * Secondary grouping label (e.g. "categories", "products", "avatars").
   * Sanitized server-side and placed between `instanceId` and `uploads`.
   */
  subfolder?: string;
  /** Called with 0..100 as the browser uploads the file to the API server. */
  onProgress?: (pct: number) => void;
}

/**
 * POST /api/upload/s3 — admin only.
 *
 * Multipart upload to the API server (which pushes to S3 via the AWS SDK).
 * `instanceId` and `subfolder` are forwarded as form fields and used by the
 * backend to build a nested S3 key:
 *
 *   {instanceId}/{subfolder}/uploads/{uuid}-{filename}
 *
 * Missing segments are dropped, so callers that pass neither get the old
 * flat `uploads/…` layout.
 *
 * Progress is reported via XHR upload events. The session cookie is sent
 * automatically (`xhr.withCredentials = true`) so `requireAdmin` on the
 * backend succeeds.
 */
export function uploadFile(
  file: File,
  opts: UploadOptions = {},
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const baseURL = api.defaults.baseURL;
    if (!baseURL) {
      reject(new Error("API base URL is not configured"));
      return;
    }
    const url = `${baseURL.replace(/\/$/, "")}/upload/s3`;

    const formData = new FormData();
    formData.append("file", file);
    if (opts.instanceId) formData.append("instanceId", opts.instanceId);
    if (opts.subfolder) formData.append("subfolder", opts.subfolder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    // This request bypasses the axios instance, so carry its audience header.
    xhr.setRequestHeader("x-auth-audience", "admin");
    xhr.timeout = 120_000;

    if (opts.onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        opts.onProgress!(Math.round((event.loaded / event.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText || "{}");
          const data = parsed?.data ?? {};
          if (
            typeof data.url === "string" &&
            typeof data.fileKey === "string"
          ) {
            resolve({ url: data.url, fileKey: data.fileKey });
            return;
          }
          reject(new Error("Upload response missing url/fileKey"));
        } catch {
          reject(new Error("Failed to parse upload response"));
        }
        return;
      }

      let message = `Upload failed: HTTP ${xhr.status}`;
      try {
        const parsed = JSON.parse(xhr.responseText || "{}");
        if (typeof parsed?.message === "string") message = parsed.message;
        else if (Array.isArray(parsed?.errors?._form))
          message = parsed.errors._form[0];
        else if (Array.isArray(parsed?.errors?.file))
          message = parsed.errors.file[0];
      } catch {
        /* keep default message */
      }
      reject(new Error(message));
    };

    xhr.onerror = () =>
      reject(
        new Error(
          "Network error during upload — check CORS/connectivity to the API server",
        ),
      );
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    xhr.send(formData);
  });
}
/**
 * DELETE /api/upload/s3?key=<key|url> — admin only.
 *
 * Removes a single object from the bucket. Used to clean up orphaned uploads
 * when a form is abandoned or an image is replaced.
 */
export async function deleteS3Object(fileUrlOrKey: string): Promise<void> {
  if (!fileUrlOrKey) return;
  await api.delete("/upload/s3", { params: { key: fileUrlOrKey } });
}