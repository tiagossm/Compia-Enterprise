import { useRef } from 'react';
import html2canvas from 'html2canvas';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { InspectionType, InspectionMediaType } from '@/shared/types';

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

interface UseMapSnapshotProps {
    media: InspectionMediaType[];
    inspection: InspectionType;
    includeHeatmap: boolean;
}

export const useMapSnapshot = ({ media, inspection, includeHeatmap }: UseMapSnapshotProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const generateMapSnapshot = async (): Promise<string> => {
        // Check if map is enabled and container exists
        if (!includeHeatmap || !mapContainerRef.current) return '';

        // Filter valid media
        const validMedia = media.filter(m => {
            const lat = Number(m.latitude);
            const lng = Number(m.longitude);
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        });

        const hasInspectionGeo = inspection.location_start_lat && inspection.location_start_lng;

        if (validMedia.length === 0 && !hasInspectionGeo) return '';

        return new Promise((resolve) => {
            try {
                console.log("Generating Map Snapshot for PDF...");
                // Ensure container is empty
                if (mapContainerRef.current) {
                    mapContainerRef.current.innerHTML = '';
                }

                // Initialize Map
                const map = L.map(mapContainerRef.current!, {
                    zoomControl: false,
                    attributionControl: false,
                    fadeAnimation: false,
                    zoomAnimation: false,
                    dragging: false
                }).setView([-23.550520, -46.633308], 10);

                // Add Satellite Layer (Best for Reports)
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                    attribution: '',
                    maxNativeZoom: 17,
                    maxZoom: 22
                }).addTo(map);

                const points: [number, number, number][] = [];
                const latlngs: [number, number][] = [];
                const bounds = L.latLngBounds([]);

                // Process Media Points
                validMedia.forEach(m => {
                    const lat = Number(m.latitude);
                    const lng = Number(m.longitude);

                    points.push([lat, lng, 0.6]);
                    latlngs.push([lat, lng]);
                    bounds.extend([lat, lng]);

                    // Marker
                    L.marker([lat, lng], {
                        icon: new L.Icon.Default()
                    }).addTo(map);
                });

                // Process Inspection Start Point
                if (hasInspectionGeo) {
                    const lat = Number(inspection.location_start_lat);
                    const lng = Number(inspection.location_start_lng);
                    bounds.extend([lat, lng]);
                    L.marker([lat, lng], {
                        icon: new L.Icon.Default()
                    }).addTo(map);
                }

                // Perimeter
                if (latlngs.length > 2) {
                    L.polygon(latlngs, {
                        color: '#ef4444',
                        weight: 3,
                        opacity: 0.8,
                        fillColor: '#ef4444',
                        fillOpacity: 0.1,
                        dashArray: '10, 10' // Larger dash for print visibility
                    }).addTo(map);
                }

                // Heatmap
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((L as any).heatLayer && points.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (L as any).heatLayer(points, {
                        radius: 35, // Larger radius for static image
                        blur: 25,
                        maxZoom: 15,
                        gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
                    }).addTo(map);
                }

                // Fit Bounds
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }

                // Wait for tiles to load and then capture
                // 2.5 seconds to be safe for satellite tiles
                setTimeout(async () => {
                    try {
                        const canvas = await html2canvas(mapContainerRef.current!, {
                            useCORS: true,
                            allowTaint: true,
                            // @ts-ignore
                            scale: 2, // Retain high quality
                            logging: false,
                            backgroundColor: null // Transparent background if possible
                        });

                        const imgData = canvas.toDataURL('image/png', 0.8);

                        // Cleanup
                        map.remove();
                        if (mapContainerRef.current) mapContainerRef.current.innerHTML = '';

                        resolve(imgData);
                    } catch (e) {
                        console.error("Map Html2Canvas Capture Error:", e);
                        map.remove();
                        resolve('');
                    }
                }, 2500);

            } catch (err) {
                console.error("Map Generation Error:", err);
                resolve('');
            }
        });
    };

    return { mapContainerRef, generateMapSnapshot };
};
