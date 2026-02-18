import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { FaCheck, FaFireBurner, FaMotorcycle, FaHouse, FaChevronDown, FaChevronUp, FaBan, FaMoneyBillWave } from 'react-icons/fa6'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../supabaseClient'

// SOJA Location - Entre 2 y 3 calle NE en av. 4 NE, Santa Rosa de Copán
const RESTAURANT_POS = [14.76816879623832, -88.77541047130629]

// Custom colored DivIcons (visible on dark maps)
const restaurantIcon = new L.DivIcon({
    html: `<div style="
        background: #e5242c;
        width: 42px; height: 42px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 15px rgba(229,36,44,0.6);
        display: flex; align-items: center; justify-content: center;
    "><span style="transform: rotate(45deg); font-size: 18px; display: block; text-align: center; line-height: 36px;">🍜</span></div>`,
    className: '',
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -42]
})

const motoIcon = new L.DivIcon({
    html: `<div style="
        background: #f59e0b;
        width: 46px; height: 46px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 20px rgba(245,158,11,0.7);
        display: flex; align-items: center; justify-content: center;
        font-size: 22px;
        animation: pulse 1.5s infinite;
    ">🛵</div>`,
    className: '',
    iconSize: [46, 46],
    iconAnchor: [23, 23],
})

const homeIcon = new L.DivIcon({
    html: `<div style="
        background: #22c55e;
        width: 42px; height: 42px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 15px rgba(34,197,94,0.6);
        display: flex; align-items: center; justify-content: center;
    "><span style="transform: rotate(45deg); font-size: 18px; display: block; text-align: center; line-height: 36px;">🏠</span></div>`,
    className: '',
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -42]
})

function MapBounds({ routeCoords }) {
    const map = useMap()
    useEffect(() => {
        if (routeCoords && routeCoords.length > 0) {
            const bounds = L.latLngBounds(routeCoords)
            map.fitBounds(bounds, { padding: [50, 50] })
        }
    }, [routeCoords, map])
    return null
}

export default function OrderTracking({ order, onBack, onCancel }) {
    const [statusStep, setStatusStep] = useState(0)
    const [motoPos, setMotoPos] = useState(RESTAURANT_POS)
    const [routeCoords, setRouteCoords] = useState([])
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [deliveryStaff, setDeliveryStaff] = useState(null)

    const destination = order.location ? [order.location.lat, order.location.lng] : [14.780, -88.785]
    const steps = ['Confirmado', 'Cocinando', 'En camino', 'Entregado']

    // Fetch Route
    useEffect(() => {
        const fetchRoute = async () => {
            try {
                const start = `${RESTAURANT_POS[1]},${RESTAURANT_POS[0]}`
                const end = `${destination[1]},${destination[0]}`
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`)
                const data = await response.json()
                if (data.routes && data.routes[0]) {
                    const coords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]])
                    setRouteCoords(coords)
                } else {
                    setRouteCoords([RESTAURANT_POS, destination])
                }
            } catch (err) {
                setRouteCoords([RESTAURANT_POS, destination])
            }
        }
        fetchRoute()
    }, [destination])

    // Map status string to step index
    useEffect(() => {
        const statusMap = { 'pending': 0, 'prepared': 1, 'shipped': 2, 'delivered': 3 }
        setStatusStep(statusMap[order.status] || 0)
    }, [order.status])

    // Subscription for delivery staff location
    useEffect(() => {
        if (order.delivery_id) {
            const fetchStaff = async () => {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', order.delivery_id)
                    .single()
                if (data) {
                    setDeliveryStaff(data)
                    if (data.last_lat && data.last_lng) {
                        setMotoPos([data.last_lat, data.last_lng])
                    }
                }
            }
            fetchStaff()

            const sub = supabase
                .channel(`delivery_tracking_${order.id}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${order.delivery_id}`
                }, (payload) => {
                    const { last_lat, last_lng } = payload.new
                    if (last_lat && last_lng) {
                        setMotoPos([last_lat, last_lng])
                    }
                    setDeliveryStaff(payload.new)
                })
                .subscribe()

            return () => {
                supabase.removeChannel(sub)
            }
        }
    }, [order.delivery_id])

    return (
        <div className="fixed inset-0 z-50 bg-[#0f0f0f] flex flex-col md:flex-row font-sans h-[100dvh]">

            {/* Map Area */}
            <div className="relative w-full h-[55%] md:h-full md:flex-grow order-1 md:order-2">
                <MapContainer
                    center={RESTAURANT_POS}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    className="leaflet-dark-mode"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    <MapBounds routeCoords={routeCoords} />
                    {routeCoords.length > 0 && (
                        <Polyline positions={routeCoords} pathOptions={{ color: '#e5242c', weight: 5, opacity: 0.8 }} />
                    )}
                    <Marker position={RESTAURANT_POS} icon={restaurantIcon}><Popup>SOJA Restaurant</Popup></Marker>
                    <Marker position={destination} icon={homeIcon}><Popup>Tu Ubicacion</Popup></Marker>
                    {statusStep >= 1 && <Marker position={motoPos} icon={motoIcon} zIndexOffset={1000} />}
                </MapContainer>

                {/* Mobile Gradient Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#151515] to-transparent pointer-events-none md:hidden z-[400]" />

                {/* Mobile Logo Back Button */}
                <button
                    onClick={onBack}
                    className="absolute top-4 left-4 z-[500] bg-black/50 p-2 rounded-full md:hidden backdrop-blur-sm border border-white/10 hover:bg-black/70 transition-colors"
                >
                    <img src="/img/logo/logo_blanco.png" alt="SOJA" className="h-8 w-8 object-contain" />
                </button>
            </div>

            {/* Sidebar / Bottom Sheet */}
            <div className={`
                w-full md:w-[400px] bg-[#1a1a1a] md:border-r border-t md:border-t-0 border-[#333] flex flex-col 
                z-20 shadow-[0_-5px_30px_rgba(0,0,0,0.5)] order-2 md:order-1
                h-[45%] md:h-full transition-all duration-300
            `}>
                <div className="p-4 md:p-6 border-b border-[#333] bg-[#151515] shrink-0 flex justify-between items-start md:block">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <button onClick={onBack} className="hidden md:flex text-gray-400 hover:text-white items-center gap-3 font-bold uppercase tracking-wider transition-colors group">
                                <img src="/img/logo/logo_blanco.png" alt="SOJA" className="h-8 group-hover:opacity-80 transition-opacity" />
                                <span>Volver</span>
                            </button>

                        </div>

                        <h2 className="text-xl md:text-2xl font-black text-white mb-1">Pedido en curso</h2>
                        <div className="flex items-center gap-2">
                            <p className="text-[#e5242c] text-sm font-bold uppercase tracking-wider">
                                {order.status === 'pending' ? 'Esperando confirmación' :
                                    order.status === 'prepared' ? 'Preparando tu comida' :
                                        order.status === 'shipped' ? '¡El repartidor va en camino!' :
                                            '¡Disfruta tu comida!'}
                            </p>
                            <div className="w-2 h-2 rounded-full bg-[#e5242c] animate-pulse" />
                        </div>
                        {deliveryStaff && order.status === 'shipped' && (
                            <p className="text-[10px] text-gray-400 mt-2 uppercase font-black tracking-widest bg-white/5 py-1 px-3 rounded-full w-fit">
                                Repartidor: {deliveryStaff.first_name}
                            </p>
                        )}

                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    <div className="space-y-6 relative pl-2">
                        <div className="absolute left-[19px] top-2 bottom-8 w-0.5 bg-[#333]" />
                        {steps.map((step, index) => {
                            const isCompleted = statusStep > index
                            const isCurrent = statusStep === index

                            let icon = <div className="w-2 h-2 rounded-full bg-white" />
                            if (index === 0) icon = <FaCheck className="text-xs" />
                            if (index === 1) icon = <FaFireBurner className="text-xs" />
                            if (index === 2) icon = <FaMotorcycle className="text-xs" />
                            if (index === 3) icon = <FaHouse className="text-xs" />

                            return (
                                <div key={step} className={`relative flex items-center gap-4 transition-all duration-500 ${index <= statusStep ? 'opacity-100' : 'opacity-30'}`}>
                                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-4 border-[#1a1a1a]
                                        ${isCompleted || isCurrent ? 'bg-[#e5242c] text-white shadow-[0_0_15px_rgba(229,36,44,0.6)]' : 'bg-[#333] text-gray-500'}
                                    `}>
                                        {icon}
                                    </div>
                                    <div>
                                        <p className={`font-bold text-base md:text-lg ${isCurrent ? 'text-white' : 'text-gray-400'}`}>{step}</p>
                                        {isCurrent && <p className="text-xs text-[#e5242c] font-bold animate-pulse">En proceso...</p>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {statusStep < 3 && (
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <button
                                onClick={onCancel}
                                className="w-full flex items-center justify-center gap-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 py-3 rounded-xl transition-all duration-300 font-bold text-xs uppercase tracking-wider group"
                            >
                                <FaBan className="group-hover:rotate-12 transition-transform" />
                                <span>Cancelar Pedido en curso</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Details Footer */}
                <div className="bg-[#111] border-t border-[#333] shrink-0">
                    <button
                        className="w-full p-4 flex justify-between items-center text-white md:cursor-default"
                        onClick={() => window.innerWidth < 768 && setIsDetailsOpen(!isDetailsOpen)}
                    >
                        <span className="font-bold uppercase text-xs tracking-wider">Detalles del pedido</span>
                        <span className="md:hidden text-gray-400">{isDetailsOpen ? <FaChevronDown /> : <FaChevronUp />}</span>
                    </button>

                    <div className={`px-4 pb-4 md:block transition-all duration-300 overflow-hidden ${isDetailsOpen ? 'max-h-64' : 'max-h-0 md:max-h-full'}`}>
                        <div className="bg-[#222] rounded-xl p-3 border border-[#333] space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-white font-bold text-sm">{order.client_name || 'Cliente'}</p>
                                    <p className="text-gray-400 text-xs">{order.client_phone}</p>
                                </div>
                                <span className="text-[#e5242c] font-black text-xl">L {order.total.toFixed(2)}</span>
                            </div>

                            {order.payment && order.payment.change > 0 && (
                                <div className="bg-[#1a1a1a] p-2 rounded text-xs flex items-center gap-2 text-green-400 border border-green-500/20">
                                    <FaMoneyBillWave />
                                    <span>Paga con L {order.payment.amount} - Cambio: <strong>L {order.payment.change}</strong></span>
                                </div>
                            )}

                            {order.payment && order.payment.change === 0 && (
                                <div className="bg-[#1a1a1a] p-2 rounded text-xs flex items-center gap-2 text-gray-400">
                                    <FaMoneyBillWave />
                                    <span>Pago exacto</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
