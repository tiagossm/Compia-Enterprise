import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { fetchWithAuth } from '@/react-app/utils/auth';

export interface AddressData {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    latitude?: number | null;
    longitude?: number | null;
    // Helper to store the full formatted string if needed
    full_address?: string;
}

interface AddressFormProps {
    data: AddressData;
    onChange: (data: AddressData) => void;
    readOnly?: boolean;
}

export default function AddressForm({ data, onChange, readOnly = false }: AddressFormProps) {
    const [loadingCep, setLoadingCep] = useState(false);

    const handleChange = (field: keyof AddressData, value: string) => {
        onChange({ ...data, [field]: value });
    };

    const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCep = e.target.value.replace(/\D/g, '');
        handleChange('cep', newCep);

        if (newCep.length === 8) {
            setLoadingCep(true);
            try {
                const response = await fetchWithAuth(`/api/cep/${newCep}`);
                if (response.ok) {
                    const result = await response.json();
                    const cepData = result.data || result;
                    onChange({
                        ...data,
                        cep: newCep,
                        logradouro: cepData.logradouro || '',
                        bairro: cepData.bairro || '',
                        cidade: cepData.localidade || '',
                        uf: cepData.uf || '',
                        complemento: cepData.complemento || data.complemento,
                    });
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            } finally {
                setLoadingCep(false);
            }
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    onChange({
                        ...data,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Erro ao obter localização:', error);
                    alert('Erro ao obter localização GPS');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            alert('Geolocalização não é suportada neste navegador');
        }
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Navigation className="w-4 h-4 text-slate-500" />
                Endereço do Local
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* CEP */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">CEP</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={data.cep || ''}
                            onChange={handleCEPChange}
                            disabled={readOnly}
                            placeholder="00000-000"
                            maxLength={9}
                            className="w-full pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                        />
                        {loadingCep && <span className="absolute right-2 top-2.5 animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></span>}
                    </div>
                </div>

                {/* Logradouro */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Logradouro</label>
                    <input
                        type="text"
                        value={data.logradouro || ''}
                        onChange={(e) => handleChange('logradouro', e.target.value)}
                        disabled={readOnly}
                        placeholder="Rua, Avenida, etc."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                </div>

                {/* Número */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Número</label>
                    <input
                        type="text"
                        value={data.numero || ''}
                        onChange={(e) => handleChange('numero', e.target.value)}
                        disabled={readOnly}
                        placeholder="123"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                </div>

                {/* Complemento */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Complemento</label>
                    <input
                        type="text"
                        value={data.complemento || ''}
                        onChange={(e) => handleChange('complemento', e.target.value)}
                        disabled={readOnly}
                        placeholder="Apto, Sala, Bloco..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                </div>

                {/* Bairro */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Bairro</label>
                    <input
                        type="text"
                        value={data.bairro || ''}
                        onChange={(e) => handleChange('bairro', e.target.value)}
                        disabled={readOnly}
                        placeholder="Bairro"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                </div>

                {/* Cidade */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                    <input
                        type="text"
                        value={data.cidade || ''}
                        onChange={(e) => handleChange('cidade', e.target.value)}
                        disabled={readOnly}
                        placeholder="Cidade"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                </div>

                {/* UF */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">UF</label>
                    <input
                        type="text"
                        value={data.uf || ''}
                        onChange={(e) => handleChange('uf', e.target.value)}
                        disabled={readOnly}
                        maxLength={2}
                        placeholder="UF"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 uppercase"
                    />
                </div>
            </div>

            {/* GPS Button */}
            {!readOnly && (
                <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                >
                    <MapPin size={14} />
                    Capturar Localização GPS
                </button>
            )}

            {data.latitude && data.longitude && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                    <MapPin size={12} />
                    GPS: {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
                </p>
            )}
        </div>
    );
}
