export interface AddressData {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    full_address: string;
}

export interface AddressData {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    full_address: string;
}

export const parseAddressString = (fullAddr: string): AddressData => {
    if (!fullAddr) {
        return {
            cep: '',
            logradouro: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            uf: '',
            full_address: ''
        };
    }

    const newAddressData: AddressData = {
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        full_address: fullAddr
    };

    // 1. Extract CEP
    const cepMatch = fullAddr.match(/CEP:?\s*(\d{2}\.?\d{3}-?\d{3})/i);
    if (cepMatch) {
        newAddressData.cep = cepMatch[1].replace(/\D/g, '');
    }

    // Clean address: remove CEP, trim, remove trailing comma
    let cleanAddr = fullAddr.replace(/CEP:?\s*(\d{2}\.?\d{3}-?\d{3})/i, '').trim().replace(/,$/, '');

    // Normalize separators (semicolon to comma, en-dash/em-dash to hyphen)
    cleanAddr = cleanAddr.replace(/[;]/g, ',').replace(/[–—]/g, '-');

    // 2. Split Logic
    // Try comma first
    let parts = cleanAddr.split(',').map(p => p.trim()).filter(Boolean);

    // If no commas found, try simple space/dash heuristics
    if (parts.length < 2 && cleanAddr.includes(' - ')) {
        parts = cleanAddr.split(' - ').map(p => p.trim());
    }

    if (parts.length >= 2) {
        // Strategy: 
        // 1. Identify City/UF from the LAST part.
        // 2. Identify Number from the remaining parts (usually part 1).
        // 3. Excess parts between Number and City become Bairro/Complemento.

        // --- Step A: City/UF (Last Part) ---
        const lastPart = parts[parts.length - 1];
        let cityFound = false;

        // Regex for "City / UF" or "City - UF"
        if (lastPart.includes('/') || lastPart.includes(' - ')) {
            const separator = lastPart.includes('/') ? '/' : ' - ';
            const [city, uf] = lastPart.split(separator);
            if (city && uf && uf.trim().length === 2) {
                newAddressData.cidade = city.trim();
                newAddressData.uf = uf.trim();
                cityFound = true;
            }
        }

        // Fallback: Check if last part is just UF (2 chars) logic is unsafe without City. 
        // Assuming last part IS City/UF composite usually.
        // If not found above, verify if the PREVIOUS part + Last Part makes City/UF (e.g. "Bauru", "SP")?
        // Let's stick to the "City - UF" combined string for now as it matches the screenshot "BAURU - SP".

        if (cityFound) {
            // Remove the used part
            parts.pop();
        } else {
            // Maybe user just put "Sao Paulo" (City) and valid UF is inferred? 
            // Or "City, UF" was split into 2 parts?
            const potentialUF = parts[parts.length - 1];
            const potentialCity = parts[parts.length - 2];
            if (potentialUF.length === 2 && /^[A-Z]{2}$/.test(potentialUF) && potentialCity) {
                newAddressData.uf = potentialUF;
                newAddressData.cidade = potentialCity;
                parts.pop(); // Remove UF
                parts.pop(); // Remove City
            }
        }

        // --- Step B: Logradouro (Part 0) ---
        if (parts.length > 0) {
            newAddressData.logradouro = parts[0];
            parts.shift(); // Remove Logradouro
        }

        // --- Step C: Number (Next Part usually) ---
        if (parts.length > 0) {
            const potentialNum = parts[0];
            // Regex handles:
            // - Starts with digit: "123", "123A"
            // - Starts with "nº", "n°", "no", "num", "nr": "n° 123"
            // - "s/n", "sn"
            const numRegex = /^(\d+|s\/n|sn|n[º°o]|nr\.|num\.)/i;
            const isNumber = numRegex.test(potentialNum) || potentialNum.length < 10; // Heuristic length

            if (isNumber) {
                newAddressData.numero = potentialNum.replace(/^(n[º°o]|nr\.|num\.)\s*/i, ''); // Strip prefix
                parts.shift(); // Remove Number
            }
            // If NOT a number, it stays in parts (to be Bairro?)
        }

        // --- Step D: Remaining Parts (Bairro, Complemento) ---
        if (parts.length > 0) {
            // Usually next is Bairro
            newAddressData.bairro = parts[0];
            parts.shift();

            // Any remaining parts? Append to Complemento or Bairro?
            if (parts.length > 0) {
                newAddressData.complemento = parts.join(', ');
            }
        }

        // Final Cleanup
        // If UF still empty, look at end of full string again as fallback
        if (!newAddressData.uf) {
            const ufMatch = fullAddr.match(/\b([A-Z]{2})\b$/);
            if (ufMatch) newAddressData.uf = ufMatch[1];
        }

    } else {
        // Fallback: Dump everything in Logradouro if parsing fails
        newAddressData.logradouro = cleanAddr;
    }

    return newAddressData;
};
