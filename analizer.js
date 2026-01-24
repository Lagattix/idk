class EXEAnalyzer {
    analyze(arrayBuffer, filename = 'unknown.exe') {
        const buffer = new Uint8Array(arrayBuffer);
        
        // Analisi base
        const analysis = {
            basic: this.basicAnalysis(buffer, filename),
            pe: this.isPE(buffer) ? this.peAnalysis(buffer) : null,
            strings: this.extractStrings(buffer),
            security: this.securityAnalysis(buffer),
            risk: this.calculateRisk(buffer)
        };
        
        return analysis;
    }

    basicAnalysis(buffer, filename) {
        return {
            filename: filename,
            size: buffer.length,
            magicBytes: this.getMagicBytes(buffer),
            entropy: this.calculateEntropy(buffer),
            hash: {
                md5: this.calculateMD5(buffer),
                sha1: this.calculateSHA1(buffer),
                sha256: this.calculateSHA256(buffer)
            }
        };
    }

    isPE(buffer) {
        // Controlla firma "MZ" per PE files
        return buffer.length > 64 && 
               buffer[0] === 0x4D && buffer[1] === 0x5A; // "MZ"
    }

    peAnalysis(buffer) {
        try {
            // Analisi semplificata header PE
            const peOffset = this.getPEOffset(buffer);
            
            return {
                isPE: true,
                peOffset: peOffset,
                architecture: this.getArchitecture(buffer, peOffset),
                sections: this.getSectionCount(buffer, peOffset),
                entryPoint: this.getEntryPoint(buffer, peOffset),
                imports: this.getImportCount(buffer, peOffset),
                timestamp: this.getCompileTimestamp(buffer, peOffset),
                isDLL: this.isDLL(buffer, peOffset),
                hasSignature: this.hasDigitalSignature(buffer)
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    securityAnalysis(buffer) {
        const checks = {
            isSigned: false,
            hasManifest: false,
            hasResources: false,
            isPacked: false,
            suspiciousImports: [],
            suspiciousStrings: []
        };

        // Rileva packer comuni
        const packerSignatures = {
            'UPX': [0x55, 0x50, 0x58, 0x21], // UPX!
            'ASPack': [0x41, 0x53, 0x50, 0x61], // ASPa
            'PECompact': [0x50, 0x45, 0x43, 0x32] // PEC2
        };

        for (const [packer, sig] of Object.entries(packerSignatures)) {
            if (this.findPattern(buffer, sig)) {
                checks.isPacked = true;
                checks.packer = packer;
                break;
            }
        }

        // Controlla import sospette
        const suspiciousImports = [
            'VirtualAlloc', 'VirtualProtect', 'WriteProcessMemory',
            'CreateRemoteThread', 'WinExec', 'ShellExecute',
            'URLDownloadToFile', 'RegSetValue', 'CreateService'
        ];

        // Estrai stringhe sospette
        const suspiciousPatterns = [
            /http:\/\//i, /https:\/\//i, /\.onion/i,
            /C:\\.*\.(exe|dll|vbs)/i, /powershell/i, /cmd\.exe/i,
            /AutoIt/i, /meterpreter/i, /ransom/i, /bitcoin/i
        ];

        return checks;
    }

    calculateRisk(buffer) {
        let riskScore = 0;
        
        // Fattori di rischio
        if (!this.isPE(buffer)) riskScore += 30;
        
        const entropy = this.calculateEntropy(buffer);
        if (entropy > 7.5) riskScore += 20; // Alto entropy = possibilmente packato/criptato
        
        // Dimensione molto piccola (<10KB) o molto grande (>100MB)
        if (buffer.length < 10240) riskScore += 10;
        if (buffer.length > 100 * 1024 * 1024) riskScore += 10;
        
        return {
            score: Math.min(100, riskScore),
            level: riskScore < 30 ? 'BASSO' : riskScore < 60 ? 'MEDIO' : 'ALTO',
            factors: []
        };
    }

    // Utility functions
    getMagicBytes(buffer) {
        return Array.from(buffer.slice(0, 4))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
    }

    calculateEntropy(buffer) {
        const freq = new Array(256).fill(0);
        for (const byte of buffer) freq[byte]++;
        
        let entropy = 0;
        for (const count of freq) {
            if (count > 0) {
                const p = count / buffer.length;
                entropy -= p * Math.log2(p);
            }
        }
        return entropy;
    }

    extractStrings(buffer, minLength = 4) {
        const strings = [];
        let currentString = '';
        
        for (let i = 0; i < buffer.length; i++) {
            const char = buffer[i];
            
            // Caratteri stampabili ASCII
            if (char >= 32 && char <= 126) {
                currentString += String.fromCharCode(char);
            } else {
                if (currentString.length >= minLength) {
                    strings.push(currentString);
                }
                currentString = '';
            }
        }
        
        return strings.slice(0, 100); // Limita a 100 stringhe
    }

    // Hashing functions (simplified)
    calculateMD5(buffer) {
        // In produzione usa una libreria
        return 'md5_' + buffer.length;
    }

    calculateSHA256(buffer) {
        return 'sha256_' + buffer.length;
    }

    findPattern(buffer, pattern) {
        for (let i = 0; i <= buffer.length - pattern.length; i++) {
            let found = true;
            for (let j = 0; j < pattern.length; j++) {
                if (buffer[i + j] !== pattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return i;
        }
        return -1;
    }

    hexDump(buffer, offset = 0, length = 512) {
        const slice = buffer.slice(offset, offset + length);
        let hex = '';
        
        for (let i = 0; i < slice.length; i += 16) {
            // Offset
            hex += offset + i;
            hex += '  ';
            
            // Bytes hex
            for (let j = 0; j < 16; j++) {
                if (i + j < slice.length) {
                    hex += slice[i + j].toString(16).padStart(2, '0') + ' ';
                } else {
                    hex += '   ';
                }
                if (j === 7) hex += ' ';
            }
            
            hex += ' ';
            
            // ASCII
            for (let j = 0; j < 16; j++) {
                if (i + j < slice.length) {
                    const byte = slice[i + j];
                    hex += (byte >= 32 && byte <= 126) ? 
                        String.fromCharCode(byte) : '.';
                }
            }
            
            hex += '\n';
        }
        
        return hex;
    }
}
