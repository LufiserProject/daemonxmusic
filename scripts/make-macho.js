const fs = require('fs');
const path = require('path');

function createMachOBinary(outputPath) {
    // We construct a well-formed Mach-O 64-bit ARM64 executable
    // Page size 16KB (0x4000) for iOS ARM64
    const pageSize = 0x4000;
    
    // Commands:
    // 1. LC_SEGMENT_64: __PAGEZERO (size 72)
    // 2. LC_SEGMENT_64: __TEXT (size 72 + 80 = 152 with 1 section __text)
    // 3. LC_LOAD_DYLINKER: /usr/lib/dyld (size 32)
    // 4. LC_MAIN: entryoff = 0x4000, stacksize = 0 (size 24)
    // Total sizeofcmds = 72 + 152 + 32 + 24 = 280 (0x118)

    const headerSize = 32;
    const sizeofcmds = 280;
    const totalHeaderSize = headerSize + sizeofcmds;
    
    // Allocate buffer for 2 full pages (8KB for headers, text, padding)
    const buf = Buffer.alloc(pageSize * 2, 0);

    let offset = 0;

    // --- Mach-O 64-bit Header (32 bytes) ---
    buf.writeUInt32LE(0xfeedfacf, offset); offset += 4; // MH_MAGIC_64
    buf.writeUInt32LE(0x0100000c, offset); offset += 4; // CPU_TYPE_ARM64
    buf.writeUInt32LE(0x00000000, offset); offset += 4; // CPU_SUBTYPE_ARM64_ALL
    buf.writeUInt32LE(0x00000002, offset); offset += 4; // MH_EXECUTE
    buf.writeUInt32LE(4, offset);          offset += 4; // ncmds = 4
    buf.writeUInt32LE(sizeofcmds, offset); offset += 4; // sizeofcmds = 280
    buf.writeUInt32LE(0x00200085, offset); offset += 4; // flags = MH_NOUNDEFS | MH_DYLDLINK | MH_TWOLEVEL | MH_PIE
    buf.writeUInt32LE(0x00000000, offset); offset += 4; // reserved

    // --- 1. LC_SEGMENT_64: __PAGEZERO (72 bytes) ---
    buf.writeUInt32LE(0x19, offset);       offset += 4; // LC_SEGMENT_64
    buf.writeUInt32LE(72, offset);         offset += 4; // cmdsize
    buf.write('__PAGEZERO\0\0\0\0\0\0', offset, 16, 'ascii'); offset += 16;
    buf.writeBigUInt64LE(0x0000000000000000n, offset); offset += 8; // vmaddr
    buf.writeBigUInt64LE(0x0000000100000000n, offset); offset += 8; // vmsize (4GB)
    buf.writeBigUInt64LE(0n, offset); offset += 8; // fileoff
    buf.writeBigUInt64LE(0n, offset); offset += 8; // filesize
    buf.writeUInt32LE(0, offset); offset += 4; // maxprot = 0
    buf.writeUInt32LE(0, offset); offset += 4; // initprot = 0
    buf.writeUInt32LE(0, offset); offset += 4; // nsects = 0
    buf.writeUInt32LE(0, offset); offset += 4; // flags = 0

    // --- 2. LC_SEGMENT_64: __TEXT (152 bytes with 1 section) ---
    buf.writeUInt32LE(0x19, offset);       offset += 4; // LC_SEGMENT_64
    buf.writeUInt32LE(152, offset);        offset += 4; // cmdsize
    buf.write('__TEXT\0\0\0\0\0\0\0\0\0\0', offset, 16, 'ascii'); offset += 16;
    buf.writeBigUInt64LE(0x0000000100000000n, offset); offset += 8; // vmaddr
    buf.writeBigUInt64LE(BigInt(pageSize), offset); offset += 8; // vmsize
    buf.writeBigUInt64LE(0n, offset); offset += 8; // fileoff
    buf.writeBigUInt64LE(BigInt(pageSize), offset); offset += 8; // filesize
    buf.writeUInt32LE(5, offset); offset += 4; // maxprot = r-x (5)
    buf.writeUInt32LE(5, offset); offset += 4; // initprot = r-x (5)
    buf.writeUInt32LE(1, offset); offset += 4; // nsects = 1
    buf.writeUInt32LE(0, offset); offset += 4; // flags = 0

    // Section __TEXT,__text (80 bytes)
    buf.write('__text\0\0\0\0\0\0\0\0\0\0', offset, 16, 'ascii'); offset += 16;
    buf.write('__TEXT\0\0\0\0\0\0\0\0\0\0', offset, 16, 'ascii'); offset += 16;
    buf.writeBigUInt64LE(0x0000000100004000n, offset); offset += 8; // addr
    buf.writeBigUInt64LE(16n, offset); offset += 8; // size = 16 bytes
    buf.writeUInt32LE(pageSize, offset); offset += 4; // offset in file
    buf.writeUInt32LE(2, offset); offset += 4; // align = 2^2 = 4
    buf.writeUInt32LE(0, offset); offset += 4; // reloff
    buf.writeUInt32LE(0, offset); offset += 4; // nreloc
    buf.writeUInt32LE(0x80000400, offset); offset += 4; // flags = S_REGULAR | S_ATTR_SOME_INSTRUCTIONS | S_ATTR_PURE_INSTRUCTIONS
    buf.writeUInt32LE(0, offset); offset += 4; // reserved1
    buf.writeUInt32LE(0, offset); offset += 4; // reserved2
    buf.writeUInt32LE(0, offset); offset += 4; // reserved3

    // --- 3. LC_LOAD_DYLINKER: /usr/lib/dyld (32 bytes) ---
    buf.writeUInt32LE(0x0e, offset);       offset += 4; // LC_LOAD_DYLINKER
    buf.writeUInt32LE(32, offset);         offset += 4; // cmdsize
    buf.writeUInt32LE(12, offset);         offset += 4; // offset of path string
    buf.write('/usr/lib/dyld\0\0\0\0', offset, 16, 'ascii'); offset += 16;
    buf.writeUInt32LE(0, offset); offset += 4; // padding

    // --- 4. LC_MAIN (24 bytes) ---
    buf.writeUInt32LE(0x80000028, offset); offset += 4; // LC_MAIN
    buf.writeUInt32LE(24, offset);         offset += 4; // cmdsize
    buf.writeBigUInt64LE(BigInt(pageSize), offset); offset += 8; // entryoff (file offset to __text)
    buf.writeBigUInt64LE(0n, offset); offset += 8; // stacksize

    // --- Code at entryoff (pageSize = 0x4000) ---
    // ARM64 instructions:
    // mov w0, #0        -> 0x52800000
    // ret               -> 0xd65f03c0
    buf.writeUInt32LE(0x52800000, pageSize);
    buf.writeUInt32LE(0xd65f03c0, pageSize + 4);

    fs.writeFileSync(outputPath, buf);
    console.log(`Mach-O ARM64 executable written to ${outputPath} (${buf.length} bytes)`);
}

module.exports = { createMachOBinary };

if (require.main === module) {
    createMachOBinary(path.join(__dirname, '..', 'DaemonX_test'));
}
