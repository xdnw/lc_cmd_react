const text = 'arg1: value arg2: value2';
const tokenRegex = /(?:([a-zA-Z0-9_]+)\s*[:=]\s*)?(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
let match;
let count = 0;
while ((match = tokenRegex.exec(text)) !== null) {
    console.log('Match:', match[0]);
    console.log('Key:', match[1]);
    console.log('Value:', match[2] || match[3] || match[4]);
    if (count++ > 10) break;
}


