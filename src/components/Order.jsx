import { useState, useMemo } from 'react'
import { FaChevronLeft } from 'react-icons/fa6'
// Removed FOOD_ITEMS, DRINK_ITEMS import
import Cart from './Cart'

function formatHNL(value) {
    return `L ${value.toFixed(2)}`
}

export default function Order({
    setView,
    menu = [],
    loading,
    cart,
    updateQty,
    // Cart props
    cartItems,
    deliveryType,
    setDeliveryType,
    subtotal,
    shipping,
    total,
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
    const foodItems = useMemo(() => menu.filter(item => item.category === 'food'), [menu])
    const drinkItems = useMemo(() => menu.filter(item => item.category === 'drink'), [menu])

    if (loading) return <div className="text-white text-center py-20">Cargando menú...</div>
    return (
        <main className="min-h-screen bg-[#111] flex flex-col md:flex-row md:h-screen font-sans">
            {/* Main Content Area (Menu) */}
            <section className="flex-1 flex flex-col md:h-full md:overflow-hidden">
                {/* Header */}
                <header className="p-4 md:p-6 border-b border-white/10 bg-[#1a1a1a] flex justify-between items-center shrink-0 sticky top-0 z-30 md:static">
                    <div className="flex items-center gap-4">
                        <button
                            className="bg-[#222] hover:bg-[#333] text-white p-2 rounded-full transition-colors"
                            onClick={() => setView('home')}
                        >
                            <FaChevronLeft />
                        </button>
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-white">Haz tu pedido</h2>
                            <p className="text-gray-400 text-xs md:text-sm">Selecciona tus favoritos</p>
                        </div>
                    </div>
                </header>

                {/* Scrollable Menu Items */}
                <div className="flex-1 md:overflow-y-auto custom-scrollbar p-4 md:p-6">
                    <div className="max-w-4xl mx-auto space-y-8">

                        {/* Food Section */}
                        <article>
                            <h3 className="flex items-center gap-3 text-white font-bold text-xl uppercase tracking-wider mb-6">
                                <span className="w-1.5 h-6 bg-[#e5242c] rounded-full"></span>
                                Platos Principales
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                                {foodItems.map((item) => (
                                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-xl overflow-hidden border border-white/5 flex flex-col sm:flex-row shadow-lg group hover:border-[#e5242c]/30 hover:shadow-[0_10px_30px_-10px_rgba(229,36,44,0.15)] hover:-translate-y-1 transition-all duration-300 relative" key={item.id}>
                                        <div className="w-full h-32 sm:w-36 sm:h-full shrink-0 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-black/20 z-10 group-hover:bg-transparent transition-colors"></div>
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                                        </div>
                                        <div className="p-3 md:p-4 flex flex-col flex-1 justify-between relative z-20">
                                            <div className="mb-2">
                                                <h4 className="text-white font-bold text-sm md:text-lg leading-tight group-hover:text-[#e5242c] transition-colors line-clamp-2 md:line-clamp-none">{item.name}</h4>
                                                <p className="text-gray-400 text-xs line-clamp-2 mt-1 hidden sm:block">Delicioso plato preparado con ingredientes frescos y la receta original.</p>
                                                <div className="mt-2 flex items-baseline gap-2">
                                                    <span className="text-[#e5242c] font-black text-sm md:text-lg">{formatHNL(item.price)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 bg-[#222] w-full sm:w-max rounded-lg p-1 border border-white/10 shadow-inner justify-between sm:justify-start">
                                                <button
                                                    onClick={() => updateQty(item.id, -1)}
                                                    className="text-gray-400 hover:text-white hover:bg-white/10 w-8 h-8 rounded-md flex items-center justify-center font-bold transition-colors active:scale-95 bg-[#111] sm:bg-transparent"
                                                >
                                                    -
                                                </button>
                                                <span className="text-white font-mono text-sm w-6 text-center font-bold">{cart[item.id] || 0}</span>
                                                <button
                                                    onClick={() => updateQty(item.id, 1)}
                                                    className="text-white bg-[#e5242c] hover:bg-[#c41e25] w-8 h-8 rounded-md flex items-center justify-center font-bold transition-all shadow-md active:scale-95"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>

                        {/* Drinks Section */}
                        <article>
                            <h3 className="flex items-center gap-3 text-white font-bold text-xl uppercase tracking-wider mb-6">
                                <span className="w-1.5 h-6 bg-[#e5242c] rounded-full"></span>
                                Bebidas y Extras
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                                {drinkItems.map((item) => (
                                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-xl overflow-hidden border border-white/5 flex flex-col sm:flex-row shadow-lg group hover:border-[#e5242c]/30 hover:shadow-[0_10px_30px_-10px_rgba(229,36,44,0.15)] hover:-translate-y-1 transition-all duration-300 relative" key={item.id}>
                                        <div className="w-full h-32 sm:w-32 sm:h-full shrink-0 relative overflow-hidden">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                                        </div>
                                        <div className="p-3 md:p-4 flex flex-col flex-1 justify-between relative z-20">
                                            <div>
                                                <h4 className="text-white font-bold text-sm md:text-base leading-tight group-hover:text-[#e5242c] transition-colors line-clamp-1">{item.name}</h4>
                                                <div className="mt-1">
                                                    <span className="text-[#e5242c] font-black text-sm md:text-base">{formatHNL(item.price)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 bg-[#222] w-full sm:w-max rounded-lg p-1 border border-white/10 shadow-inner justify-between sm:justify-start mt-2">
                                                <button
                                                    onClick={() => updateQty(item.id, -1)}
                                                    className="text-gray-400 hover:text-white hover:bg-white/10 w-7 h-7 rounded-md flex items-center justify-center font-bold transition-colors active:scale-95 bg-[#111] sm:bg-transparent"
                                                >
                                                    -
                                                </button>
                                                <span className="text-white font-mono text-sm w-6 text-center font-bold">{cart[item.id] || 0}</span>
                                                <button
                                                    onClick={() => updateQty(item.id, 1)}
                                                    className="text-white bg-[#e5242c] hover:bg-[#c41e25] w-7 h-7 rounded-md flex items-center justify-center font-bold transition-all shadow-md active:scale-95"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>

                    </div>
                </div>
            </section>

            {/* Cart Section - Mobile: Stacked at bottom, Desktop: Right Sidebar */}
            <div className="md:w-[400px] shrink-0 border-t md:border-t-0 md:border-l border-white/10">
                <Cart
                    cartItems={cartItems}
                    updateQty={updateQty}
                    deliveryType={deliveryType}
                    setDeliveryType={setDeliveryType}
                    subtotal={subtotal}
                    shipping={shipping}
                    total={total}
                    clientName={clientName}
                    setClientName={setClientName}
                    clientPhone={clientPhone}
                    setClientPhone={setClientPhone}
                    handleCheckout={handleCheckout}
                    deliveryLocation={deliveryLocation}
                    setDeliveryLocation={setDeliveryLocation}
                    observations={observations}
                    setObservations={setObservations}
                />
            </div>
        </main>
    )
}
