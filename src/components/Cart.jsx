import { useState } from 'react'
import { FaBasketShopping, FaMapLocationDot, FaCommentDots, FaTrash, FaCircleCheck } from 'react-icons/fa6'
import LocationPicker from './LocationPicker'

function formatHNL(value) {
    return `L ${value.toFixed(2)}`
}

export default function Cart({
    cartItems,
    updateQty,
    subtotal,
    shipping,
    total,
    deliveryType,
    setDeliveryType,
    clientName,
    setClientName,
    clientPhone,
    setClientPhone,
    handleCheckout,
    deliveryLocation,
    setDeliveryLocation,
    observations,
    setObservations
}) {
    const [showMap, setShowMap] = useState(false)
    const [needsChange, setNeedsChange] = useState(false)
    const [payWith, setPayWith] = useState('')

    const calculateChange = () => {
        if (!payWith) return 0
        const payAmount = parseFloat(payWith)
        return payAmount - total
    }

    const onCheckoutClick = () => {
        // Prepare Payment Data
        let paymentData = { method: 'cash', amount: 0, change: 0 }

        if (deliveryType === 'delivery' && needsChange) {
            const change = calculateChange()
            if (change < 0) {
                alert('El monto a pagar debe ser mayor al total.')
                return
            }
            paymentData = {
                method: 'cash',
                amount: parseFloat(payWith),
                change: change
            }
        }

        handleCheckout(paymentData)
    }

    return (
        <aside className="w-full lg:w-[400px] bg-[#1a1a1a] flex flex-col h-full border-l border-white/10 shadow-2xl">
            <div className="p-6 border-b border-white/10 bg-[#111]">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="bg-[#e5242c] p-2 rounded-lg text-white text-lg shadow-lg">
                        <FaBasketShopping />
                    </span>
                    Tu Pedido
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {cartItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                        <FaBasketShopping className="text-6xl mb-4 opacity-20" />
                        <p>Tu canasta esta vacia.</p>
                        <p className="text-sm mt-2 text-gray-600">Agrega unos deliciosos platos del menu.</p>
                    </div>
                ) : (
                    cartItems.map((item) => (
                        <div className="flex items-center gap-4 bg-[#222] p-3 rounded-xl border border-white/5 hover:border-[#e5242c]/30 transition-colors" key={item.id}>
                            <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                            <div className="flex-1">
                                <h4 className="text-white font-bold text-sm line-clamp-1">{item.name}</h4>
                                <p className="text-[#e5242c] font-bold text-sm">{formatHNL(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-[#111] rounded-lg px-2 py-1 border border-white/10">
                                <button
                                    onClick={() => updateQty(item.id, -1)}
                                    className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center font-bold"
                                >
                                    -
                                </button>
                                <span className="text-white font-mono text-sm w-4 text-center">{item.qty}</span>
                                <button
                                    onClick={() => updateQty(item.id, 1)}
                                    className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center font-bold"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-6 bg-[#111] border-t border-white/10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
                <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-gray-400 text-sm">
                        <span>Subtotal:</span>
                        <span>{formatHNL(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-sm">
                        <span>Envio:</span>
                        <span>{deliveryType === 'delivery' ? formatHNL(shipping) : 'No aplica'}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold text-xl pt-2 border-t border-white/10 mt-2">
                        <span>Total:</span>
                        <span className="text-[#e5242c]">{formatHNL(total)}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Tipo de entrega</label>
                        <div className="grid grid-cols-2 gap-2 bg-[#222] p-1 rounded-lg">
                            <button
                                className={`py-2 rounded-md text-sm font-bold transition-all ${deliveryType === 'delivery' ? 'bg-[#e5242c] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                onClick={() => setDeliveryType('delivery')}
                            >
                                Delivery
                            </button>
                            <button
                                className={`py-2 rounded-md text-sm font-bold transition-all ${deliveryType === 'pickup' ? 'bg-[#e5242c] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                onClick={() => setDeliveryType('pickup')}
                            >
                                Pick Up
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="Nombre"
                            className="bg-[#222] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#e5242c] w-full"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                        />
                        <input
                            type="tel"
                            placeholder="Telefono"
                            className="bg-[#222] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#e5242c] w-full"
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                        />
                    </div>

                    {deliveryType === 'delivery' && (
                        <div>
                            <button
                                className={`w-full py-3 rounded-lg border flex items-center justify-center gap-2 transition-all duration-300 text-sm font-bold
                                    ${deliveryLocation
                                        ? 'bg-green-500/10 border-green-500 text-green-500'
                                        : 'bg-[#222] border-white/10 text-gray-400 hover:border-[#e5242c] hover:text-white'
                                    }`}
                                onClick={() => setShowMap(true)}
                            >
                                {deliveryLocation ? <FaCircleCheck /> : <FaMapLocationDot />}
                                {deliveryLocation ? 'Ubicacion guardada' : 'Marcar ubicacion en mapa'}
                            </button>
                        </div>
                    )}

                    {/* Payment / Change Section - Redesigned */}
                    {deliveryType === 'delivery' && (
                        <div className="bg-[#222] p-4 rounded-xl border border-white/5 space-y-4">
                            <label className="text-xs text-gray-500 uppercase font-bold block">Metodo de pago (Efectivo)</label>

                            <div className="flex gap-2">
                                <button
                                    className={`flex-1 py-3 rounded-lg text-xs font-bold border-2 transition-all duration-300 ${!needsChange ? 'bg-green-600/20 text-green-500 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20'}`}
                                    onClick={() => setNeedsChange(false)}
                                >
                                    Pago Exacto
                                </button>
                                <button
                                    className={`flex-1 py-3 rounded-lg text-xs font-bold border-2 transition-all duration-300 ${needsChange ? 'bg-[#e5242c]/20 text-[#e5242c] border-[#e5242c] shadow-[0_0_15px_rgba(229,36,44,0.3)]' : 'bg-[#1a1a1a] text-gray-400 border-white/5 hover:border-white/20'}`}
                                    onClick={() => setNeedsChange(true)}
                                >
                                    Ocupo Cambio
                                </button>
                            </div>

                            {needsChange && (
                                <div className="animate-slideDown">
                                    <div className="flex gap-3 items-center">
                                        <div className="relative flex-1 group">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold group-focus-within:text-[#e5242c] transition-colors">L</span>
                                            <input
                                                type="number"
                                                placeholder="Monto billete..."
                                                className="w-full bg-[#111] border border-white/10 rounded-lg pl-8 pr-3 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#e5242c] transition-colors"
                                                value={payWith}
                                                onChange={(e) => setPayWith(e.target.value)}
                                            />
                                        </div>
                                        <div className="bg-[#111] border border-white/10 rounded-lg px-4 py-2 min-w-[100px] flex flex-col justify-center items-end">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Cambio</span>
                                            <span className={`text-sm font-black font-mono ${calculateChange() < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                L {calculateChange() > 0 ? calculateChange().toFixed(2) : '0.00'}
                                            </span>
                                        </div>
                                    </div>
                                    {calculateChange() < 0 && (
                                        <p className="text-red-500 text-[10px] mt-2 font-bold flex items-center gap-1 animate-pulse">
                                            <FaCircleCheck className="rotate-45" /> El pago debe ser mayor al total
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative">
                        <textarea
                            placeholder="Observaciones (opcional)..."
                            className="w-full bg-[#222] border border-white/10 rounded-lg p-3 text-white text-sm min-h-[60px] focus:outline-none focus:border-[#e5242c] resize-none"
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                        />
                        <FaCommentDots className="absolute top-3 right-3 text-gray-600" />
                    </div>

                    <button
                        className="w-full bg-white text-black py-3 rounded-lg font-black uppercase tracking-wider hover:bg-[#e5242c] hover:text-white transition-all duration-300 shadow-xl"
                        onClick={onCheckoutClick}
                    >
                        Finalizar Pedido
                    </button>
                </div>
            </div>

            {showMap && (
                <LocationPicker
                    location={deliveryLocation}
                    setLocation={setDeliveryLocation}
                    onClose={() => setShowMap(false)}
                />
            )}
        </aside>
    )
}
