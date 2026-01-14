import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import { InspectionMediaType } from '@/shared/types';
import { X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React/Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Hack to fix Leaflet's default icon path issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});


interface HeatmapViewerProps {
    media: InspectionMediaType[];
    isOpen: boolean;
    onClose: () => void;
    inspectionTitle?: string;
}

export default function HeatmapViewer({
    media,
    isOpen,
    onClose,
    inspectionTitle
}: HeatmapViewerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const layersRef = useRef<{
        markers: L.LayerGroup | null;
        heatmap: L.Layer | null;
        perimeter: L.Polygon | null;
        satellite: L.TileLayer | null;
        osm: L.TileLayer | null;
    }>({ markers: null, heatmap: null, perimeter: null, satellite: null, osm: null });

    // UI State for Controls
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [showPerimeter, setShowPerimeter] = useState(true);
    const [showMarkers, setShowMarkers] = useState(true);
    const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite');

    // Effect to toggle layers based on state
    useEffect(() => {
        const map = mapInstanceRef.current;
        const layers = layersRef.current;
        if (!map) return;

        // Toggle Heatmap
        if (layers.heatmap) {
            if (showHeatmap) map.addLayer(layers.heatmap);
            else map.removeLayer(layers.heatmap);
        }

        // Toggle Perimeter
        if (layers.perimeter) {
            if (showPerimeter) map.addLayer(layers.perimeter);
            else map.removeLayer(layers.perimeter);
        }

        // Toggle Markers
        if (layers.markers) {
            if (showMarkers) map.addLayer(layers.markers);
            else map.removeLayer(layers.markers);
        }

        // Toggle Base Map
        if (layers.satellite && layers.osm) {
            if (mapType === 'satellite') {
                map.addLayer(layers.satellite);
                map.removeLayer(layers.osm);
            } else {
                map.addLayer(layers.osm);
                map.removeLayer(layers.satellite);
            }
        }
    }, [showHeatmap, showPerimeter, showMarkers, mapType]);

    // Initial setup
    useEffect(() => {
        if (!isOpen) return;

        // Small timeout to allow DOM to render modal content
        const timer = setTimeout(() => {
            if (!mapContainerRef.current) return;
            if (mapInstanceRef.current) return; // Already initialized

            console.log("Iniciando mapa Leaflet...");

            // 1. Initialize Map
            const map = L.map(mapContainerRef.current, {
                zoomControl: false // We will add zoom control manually if needed or just use default interaction
            }).setView([-23.550520, -46.633308], 10);

            mapInstanceRef.current = map;

            // 2. Base Layers
            const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri',
                maxNativeZoom: 17,
                maxZoom: 22
            });

            const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap',
                maxNativeZoom: 19,
                maxZoom: 22
            });

            // Store refs
            layersRef.current.satellite = esriSatellite;
            layersRef.current.osm = osm;

            // Default to Satellite
            esriSatellite.addTo(map);

            // 3. Process Data
            const validMedia = media.filter(m => {
                const lat = Number(m.latitude);
                const lng = Number(m.longitude);
                return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
            });

            if (validMedia.length > 0) {
                const points: [number, number, number][] = [];
                const latlngs: [number, number][] = []; // For polygon
                const markers = L.layerGroup(); // Don't add yet, waiting for state
                const bounds = L.latLngBounds([]);

                validMedia.forEach(m => {
                    const lat = Number(m.latitude);
                    const lng = Number(m.longitude);

                    // Add to heatmap points
                    points.push([lat, lng, 0.6]);

                    // Add to lists
                    latlngs.push([lat, lng]);
                    bounds.extend([lat, lng]);

                    // Add Standard Marker (Alfinete)
                    const marker = L.marker([lat, lng]);

                    // Popup content
                    const popupContent = document.createElement('div');
                    popupContent.innerHTML = `
                        <div style="text-align: center;">
                            <img src="${m.file_url}" alt="${m.file_name}" style="max-width: 150px; max-height: 150px; border-radius: 4px; display: block; margin: 0 auto 5px;" />
                            <p style="font-size: 10px; margin: 0; font-weight: bold;">${m.file_name}</p>
                            <p style="font-size: 9px; margin: 0; color: #666;">${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                        </div>
                    `;

                    marker.bindPopup(popupContent);
                    markers.addLayer(marker);
                });

                // Store Markers
                layersRef.current.markers = markers;
                if (showMarkers) markers.addTo(map);

                // 1. Polygon / Perimeter Layer
                if (latlngs.length > 2) {
                    const polygonLayer = L.polygon(latlngs, {
                        color: '#ef4444', // Red-500
                        weight: 2,
                        opacity: 0.8,
                        fillColor: '#ef4444',
                        fillOpacity: 0.1,
                        dashArray: '5, 5' // Dashed line
                    });

                    layersRef.current.perimeter = polygonLayer;
                    if (showPerimeter) polygonLayer.addTo(map);
                }

                // 2. Heatmap Layer
                if ((L as any).heatLayer) {
                    const heatmapLayer = (L as any).heatLayer(points, {
                        radius: 30,
                        blur: 20,
                        maxZoom: 16,
                        gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
                    });

                    layersRef.current.heatmap = heatmapLayer;
                    if (showHeatmap) heatmapLayer.addTo(map);
                }

                // 5. Fit Bounds
                map.fitBounds(bounds, { padding: [50, 50] });
            }

            // Invalidate size
            map.invalidateSize();

        }, 100);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen, media]); // Note: We don't include show* states here to prevent map re-initialization

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 transition-opacity">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Mapa de Calor (GPS)</h2>
                        {inspectionTitle && (
                            <p className="text-xs text-slate-500">{inspectionTitle} • {media.filter(m => m.latitude && m.longitude).length} fotos geolocalizadas</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                        title="Fechar"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Map Container */}
                <div className="flex-1 relative bg-slate-100">
                    <div ref={mapContainerRef} className="absolute inset-0 z-0" style={{ height: '100%', width: '100%' }} />

                    {/* Floating Controls */}
                    <div className="absolute top-4 right-4 z-[400] bg-white rounded-lg shadow-md p-2 flex flex-col gap-2 border border-slate-200 w-48">
                        <p className="text-xs font-bold text-slate-500 uppercase px-1 mb-1">Visualização</p>

                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input
                                type="checkbox"
                                checked={showHeatmap}
                                onChange={e => setShowHeatmap(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700">🔥 Mapa de Calor</span>
                        </label>

                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input
                                type="checkbox"
                                checked={showPerimeter}
                                onChange={e => setShowPerimeter(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700">📏 Perímetro</span>
                        </label>

                        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input
                                type="checkbox"
                                checked={showMarkers}
                                onChange={e => setShowMarkers(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-slate-700">📍 Pontos (Fotos)</span>
                        </label>

                        <div className="h-px bg-slate-200 my-1" />

                        <p className="text-xs font-bold text-slate-500 uppercase px-1 mb-1">Tipo de Mapa</p>
                        <div className="flex gap-1 p-1 bg-slate-100 rounded">
                            <button
                                onClick={() => setMapType('satellite')}
                                className={`flex-1 text-xs py-1 rounded transition-colors ${mapType === 'satellite' ? 'bg-white shadow text-blue-700 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Satélite
                            </button>
                            <button
                                onClick={() => setMapType('street')}
                                className={`flex-1 text-xs py-1 rounded transition-colors ${mapType === 'street' ? 'bg-white shadow text-blue-700 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Ruas
                            </button>
                        </div>
                    </div>

                    {/* No Data Fallback */}
                    {media.filter(m => m.latitude && m.longitude).length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 pointer-events-none">
                            <div className="text-center p-6">
                                <p className="text-slate-500 font-medium">Nenhuma foto com coordenadas GPS encontrada nesta inspeção.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
