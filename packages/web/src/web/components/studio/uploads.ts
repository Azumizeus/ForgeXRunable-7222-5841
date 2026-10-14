import { client, errMsg } from "../../lib/api";
import { tr } from "../../lib/i18n";

const TYPES: Record<string, string> = { png: "image/png", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml" };

/** presign → PUT to storage → confirm. Runs 4 in parallel. Returns count of successes + error messages. */
export async function uploadTraits(layerId: string, files: File[], onProgress?: (done: number, total: number) => void) {
  let done = 0;
  const errors: string[] = [];
  const queue = [...files];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      try {
        const contentType = f.type || TYPES[f.name.split(".").pop()?.toLowerCase() ?? ""] || "application/octet-stream";
        const { url, key } = await client.traits.presign({ layerId, filename: f.name, contentType });
        const put = await fetch(url, { method: "PUT", body: f, headers: { "Content-Type": contentType } });
        if (!put.ok) throw new Error(tr(`Envoi échoué (${put.status})`, `Upload failed (${put.status})`));
        await client.traits.confirm({ layerId, key, filename: f.name });
      } catch (e) {
        errors.push(`${f.name} : ${errMsg(e)}`);
      }
      onProgress?.(++done, files.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker));
  return { ok: files.length - errors.length, errors };
}
