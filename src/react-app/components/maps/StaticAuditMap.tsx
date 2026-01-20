
import { useEffect, useRef } from 'react';
// @ts-ignore
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { InspectionMediaType } from '@/shared/types';

// Icons fix
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface StaticAuditMapProps {
    media: InspectionMediaType[];
    height?: string;
    width?: string;
    className?: string;
}

export default function StaticAuditMap({ media, height = '300px', width = '100%', className = '' }: StaticAuditMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        const geoMedia = media.filter(m => m.latitude && m.longitude);
        if (!mapContainerRef.current || geoMedia.length === 0) return;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const latitudes = geoMedia.map(m => Number(m.latitude!));
        const longitudes = geoMedia.map(m => Number(m.longitude!));
        const centerLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length;
        const centerLng = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            zoomAnimation: false,
            fadeAnimation: false // Better for PDF capture
        }).setView([centerLat, centerLng], 15);

        mapInstanceRef.current = map;

        // Use Satellite or Standard based on preference? Using Standard for lighter PDFs usually, 
        // but PDFGenerator used Satellite. Let's use Standard for 'Audit Map' in summary and let PDFGenerator override layers if needed?
        // Actually PDFGenerator used "World_Imagery". Let's use OpenStreetMap for now as it loads faster and is cleaner for print unless satellite is required.
        // The user code in PDFGenerator used ArcGis World Imagery.
        // Let's use OSM for general UI map.
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: ''
        }).addTo(map);

        // Add Heatmap if available
        const points: [number, number, number][] = geoMedia.map(m => [Number(m.latitude), Number(m.longitude), 0.6]);
        if ((L as any).heatLayer && points.length > 0) {
            (L as any).heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 15,
                gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
            }).addTo(map);
        }

        // Add Markers
        geoMedia.forEach(m => {
            L.circleMarker([Number(m.latitude), Number(m.longitude)], {
                radius: 5,
                fillColor: '#ef4444',
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(map);
        });

        const bounds = L.latLngBounds(geoMedia.map(m => [Number(m.latitude), Number(m.longitude)]));
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [30, 30] });
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [media]);

    const geoMediaCount = media.filter(m => m.latitude && m.longitude).length;

    if (geoMediaCount === 0) {
        return (
            <div className={`bg-slate-50 flex items-center justify-center text-slate-400 text-sm ${className}`} style={{ height, width }}>
                Sem dados de GPS
            </div>
        );
    }

    return <div ref={mapContainerRef} className={className} style={{ height, width }} />;
}
