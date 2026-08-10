/**
 * A tiny ZIP writer, and the splitter that turns Foundry's single-file output
 * into index.html + styles.css + script.js.
 *
 * Entries are stored uncompressed. These are a few tens of kilobytes of text,
 * so deflate would save little, and "stored" keeps this to something that can
 * be read and trusted in one sitting rather than pulling in a dependency.
 */

export type ZipEntry = { name: string; content: string };

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** DOS time/date, which is what the ZIP format stores. */
function dosStamp(date: Date): { time: number; date: number } {
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      (Math.floor(date.getSeconds() / 2) & 0x1f),
    date:
      ((date.getFullYear() - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

export function buildZip(entries: ZipEntry[], now = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const stamp = dosStamp(now);

  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = encoder.encode(entry.content);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // local file header signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // flags: UTF-8 filenames
    lv.setUint16(8, 0, true); // method: stored
    lv.setUint16(10, stamp.time, true);
    lv.setUint16(12, stamp.date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); // compressed size
    lv.setUint32(22, data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra field length
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // central directory signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, stamp.time, true);
    cv.setUint16(14, stamp.date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true); // extra
    cv.setUint16(32, 0, true); // comment
    cv.setUint16(34, 0, true); // disk number start
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, offset, true); // offset of local header
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // end of central directory
  ev.setUint16(4, 0, true); // this disk
  ev.setUint16(6, 0, true); // disk with central dir
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true); // comment length

  const total =
    locals.reduce((n, l) => n + l.length, 0) + centralSize + end.length;
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of [...locals, ...centrals, end]) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/**
 * Splits the single-file document into separate assets. Inline styles and
 * scripts move to their own files; anything already external is left alone.
 */
export function splitIntoFiles(html: string): ZipEntry[] {
  const css: string[] = [];
  const js: string[] = [];

  let doc = html.replace(
    /[ \t]*<style[^>]*>([\s\S]*?)<\/style>\s*/gi,
    (_full, body: string) => {
      css.push(body.trim());
      return "";
    },
  );

  doc = doc.replace(
    /[ \t]*<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>\s*/gi,
    (_full, body: string) => {
      js.push(body.trim());
      return "";
    },
  );

  if (css.length) {
    const link = '  <link rel="stylesheet" href="styles.css" />\n';
    doc = doc.includes("</head>")
      ? doc.replace(/<\/head>/i, `${link}</head>`)
      : link + doc;
  }

  if (js.length) {
    const tag = '  <script src="script.js" defer></script>\n';
    doc = doc.includes("</body>")
      ? doc.replace(/<\/body>/i, `${tag}</body>`)
      : doc + tag;
  }

  const files: ZipEntry[] = [{ name: "index.html", content: doc.trim() }];
  if (css.length) files.push({ name: "styles.css", content: css.join("\n\n") });
  if (js.length) files.push({ name: "script.js", content: js.join("\n\n") });
  return files;
}
