class EXEDownloader {
    constructor() {
        this.maxSize = 50 * 1024 * 1024; // 50MB max
        this.allowedDomains = [
            'github.com', 'github-releases.githubusercontent.com',
            'dropbox.com', 'drive.google.com',
            'sourceforge.net', 'gitlab.com'
        ];
    }

    async downloadFromUrl(url) {
        try {
            // 1. Valida URL
            if (!this.validateUrl(url)) {
                throw new Error('URL non consentito o non valido');
            }

            // 2. Usa Cloud Function come proxy (sicurezza)
            const downloadFunction = firebase.functions().httpsCallable('downloadAndAnalyze');
            
            const result = await downloadFunction({
                url: url,
                maxSize: this.maxSize,
                timestamp: new Date().toISOString()
            });

            if (result.data.error) {
                throw new Error(result.data.error);
            }

            // 3. Restituisci dati
            return {
                success: true,
                filename: result.data.filename,
                content: result.data.content, // Base64 encoded
                size: result.data.size,
                contentType: result.data.contentType,
                headers: result.data.headers,
                analysis: result.data.preliminaryAnalysis
            };

        } catch (error) {
            console.error('Download error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    validateUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Controllo estensione
            if (!urlObj.pathname.toLowerCase().endsWith('.exe')) {
                return false;
            }

            // Controllo dominio (whitelist)
            const domain = urlObj.hostname;
            const isAllowed = this.allowedDomains.some(allowed => 
                domain.includes(allowed) || domain.endsWith('.' + allowed)
            );

            if (!isAllowed) {
                // Domini non in whitelist richiedono conferma
                const confirmed = confirm(
                    `⚠️ Dominio non in whitelist: ${domain}\n\n` +
                    `Continuare solo se si tratta di un file legittimo e sicuro.\n` +
                    `Vuoi procedere?`
                );
                return confirmed;
            }

            return true;

        } catch {
            return false;
        }
    }

    // Decodifica Base64 in ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Crea link download per l'utente
    createDownloadLink(filename, contentBase64) {
        const byteCharacters = atob(contentBase64);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/octet-stream' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'downloaded_file.exe';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
}
