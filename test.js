const text = '{key:"value with spaces", key2=\'value2\'}';
let t = text.trim();
if (t.startsWith('{') && t.endsWith('}')) {
    t = t.substring(1, t.length - 1).trim();
}
const pairRegex = /(?:^|[\s,]+)(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s:=,]+))\s*[:=]\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s,]+))/g;
let match;
while ((match = pairRegex.exec(t)) !== null) {
    console.log(match);
}
