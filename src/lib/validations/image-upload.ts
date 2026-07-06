const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Please upload a JPEG, PNG, or WebP image";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be 5MB or smaller";
  }
  return null;
}
