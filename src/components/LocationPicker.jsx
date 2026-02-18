import { useState, useEffect } from 'react'
import { FaMapMarkerAlt } from 'react-icons/fa'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon in Leaflet with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng)
        },
    })

    return position === null ? null : <Marker position={position}></Marker>
}

function MapAutoCenter({ position, setPosition, forceLocate }) {
    const map = useMap()

    useEffect(() => {
        if (forceLocate > 0) {
            map.locate({
                setView: true,
                maxZoom: 16,
                enableHighAccuracy: true,
                timeout: 10000
            })
        }
    }, [map, forceLocate])

    useMapEvents({
        locationfound(e) {
            // We FLY to the location, but we DO NOT set the position (pin) automatically
            // to avoid the "San Pedro Sula" jump issue from ISPs.
            map.flyTo(e.latlng, 16)
        },
        locationerror(e) {
            console.warn("Location error:", e.message)
        }
    })

    return null
}

export default function LocationPicker({ location, setLocation, onClose }) {
    const [position, setPosition] = useState(location || null)
    const [forceLocate, setForceLocate] = useState(0)

    // Default center: Santa Rosa de Copan
    const defaultCenter = [14.775, -88.779]

    const handleConfirm = () => {
        setLocation(position)
        onClose()
    }

    const handleRecenterCity = () => {
        setPosition(null)
        // This will trigger MapAutoCenter via the zoom/center of MapContainer if we manage it
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a1a] w-full max-w-3xl rounded-xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <h3 className="text-xl font-bold text-white">Confirma tu ubicación exacta</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="relative flex-grow h-[400px] md:h-[500px]">
                    <MapContainer
                        center={defaultCenter}
                        zoom={15}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%' }}
                        ref={(mapInstance) => {
                            if (mapInstance) {
                                window._map = mapInstance;
                            }
                        }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationMarker position={position} setPosition={setPosition} />
                        <MapAutoCenter position={position} setPosition={setPosition} forceLocate={forceLocate} />
                    </MapContainer>

                    {/* Overlay Controls */}
                    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                        <button
                            onClick={() => setForceLocate(prev => prev + 1)}
                            className="bg-white text-black px-4 py-3 rounded-xl shadow-lg hover:bg-gray-100 transition-all flex items-center gap-2 font-bold text-sm"
                            title="Usar mi ubicación actual"
                        >
                            <FaMapMarkerAlt className="text-[#e5242c]" />
                            <span>Mi ubicación</span>
                        </button>
                        <button
                            onClick={() => {
                                if (window._map) {
                                    window._map.flyTo(defaultCenter, 15);
                                }
                                setForceLocate(0);
                            }}
                            className="bg-black/60 text-white px-4 py-3 rounded-xl shadow-lg hover:bg-black/80 transition-all flex items-center gap-2 font-bold text-sm border border-white/10"
                        >
                            Ver Santa Rosa
                        </button>
                    </div>

                    {!position && (
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#e5242c] text-white px-6 py-3 rounded-full text-sm font-bold z-[1000] shadow-2xl border-2 border-white/20 animate-bounce">
                            Toca el mapa para fijar tu pin de entrega
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 bg-[#111] flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500 max-w-[300px] text-center sm:text-left">
                        Asegúrate de que el pin esté exactamente sobre tu casa para que el repartidor llegue sin problemas.
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-gray-300 hover:bg-white/5 transition-colors font-bold"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!position}
                            className="flex-1 sm:flex-none bg-[#e5242c] text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-all shadow-lg hover:shadow-red-500/20"
                        >
                            Confirmar Ubicación
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
