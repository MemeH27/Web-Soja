import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Featured from './components/Featured'
import About from './components/About'
import Reviews from './components/Reviews'
import Footer from './components/Footer'
import Order from './components/Order'
import InfoStrip from './components/InfoStrip'
import OrderTracking from './components/OrderTracking'
import OrderSuccessModal from './components/OrderSuccessModal'
import ValidationModal from './components/ValidationModal'
import AuthModal from './components/AuthModal'
import { SHIPPING_COST } from './data'
import { useMenu } from './hooks/useMenu'
import { useAuth } from './hooks/useAuth.jsx'
import { supabase } from './supabaseClient'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Delivery from './pages/Delivery'

// ─── Role Guard Component ─────────────────────────────────────────────────────
function RoleGuard({ children, requiredRole, user, role, loading }) {
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 animate-pulse font-bold tracking-widest uppercase text-xs">Verificando Credenciales...</p>
      </div>
    )
  }

  // For delivery: must be logged in with delivery role
  if (requiredRole === 'delivery') {
    // Delivery page handles its own login flow, so we just render it
    return children
  }

  // For admin: must be logged in with admin role
  if (requiredRole === 'admin') {
    if (!user || role !== 'admin') {
      console.warn(`⛔ Acceso denegado: rol '${role}' intentó acceder al panel de admin`)
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-black uppercase tracking-widest">Acceso Denegado</h1>
          <p className="text-gray-500 text-sm">No tienes permisos para ver esta sección.</p>
        </div>
      )
    }
    return children
  }

  return children
}

// ─── New Order Notification ───────────────────────────────────────────────────
function NewOrderToast({ order, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className="fixed right-4 z-[9999] bg-[#111] border border-[#e5242c]/50 rounded-3xl p-5 shadow-2xl shadow-[#e5242c]/20 animate-in slide-in-from-right duration-500 max-w-md"
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-[#e5242c]/10 rounded-2xl flex items-center justify-center text-[#e5242c] shrink-0 text-2xl">
          🛵
        </div>
        <div className="flex-1">
          <p className="text-[#e5242c] text-xs font-black uppercase tracking-widest mb-1">Nuevo Pedido</p>
          <p className="text-white font-bold text-base">{order.client_name}</p>
          <p className="text-gray-300 text-sm">L {Number(order.total).toFixed(2)} · {order.delivery_type === 'delivery' ? 'Domicilio' : 'Para Llevar'}</p>
        </div>
        <button onClick={onDismiss} className="text-gray-600 hover:text-white transition-colors text-lg leading-none">×</button>
      </div>
    </div>
  )
}

function UserOrderStatusToast({ order, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 7000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const statusLabel = order.status === 'pending'
    ? 'Pedido confirmado'
    : order.status === 'prepared'
      ? 'Tu pedido se esta preparando'
      : order.status === 'shipped'
        ? 'Tu pedido va en camino'
        : 'Pedido entregado'

  return (
    <div
      className="fixed left-4 z-[9999] bg-[#111] border border-white/20 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-left duration-500 max-w-md"
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-[#e5242c]/10 rounded-2xl flex items-center justify-center text-[#e5242c] shrink-0 text-2xl">
          🍜
        </div>
        <div className="flex-1">
          <p className="text-[#e5242c] text-xs font-black uppercase tracking-widest mb-1">Actualizacion de pedido</p>
          <p className="text-white font-bold text-base">{statusLabel}</p>
          <p className="text-gray-300 text-sm">{order.delivery_type === 'delivery' ? 'Entrega a domicilio' : 'Para llevar'}</p>
        </div>
        <button onClick={onDismiss} className="text-gray-600 hover:text-white transition-colors text-lg leading-none">×</button>
      </div>
    </div>
  )
}

function App() {
  const { user, profile, role, loading: authLoading } = useAuth()
  const [view, setView] = useState('home')
  const [deliveryType, setDeliveryType] = useState('delivery')
  const [cart, setCart] = useState({})
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [deliveryLocation, setDeliveryLocation] = useState(null)
  const [observations, setObservations] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [validationMessage, setValidationMessage] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [activeOrder, setActiveOrder] = useState(null)
  const [newOrderToast, setNewOrderToast] = useState(null)
  const [userOrderToast, setUserOrderToast] = useState(null)
  const audioRef = useRef(null)
  const notifSubRef = useRef(null)

  const { menu: allItems, loading: menuLoading } = useMenu()

  // Pre-fill user data if available
  useEffect(() => {
    if (profile) {
      setClientName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim())
      setClientPhone(profile.phone || '')
      setDeliveryLocation(profile.location || null)
    }
  }, [profile])

  // Show Auth Modal on start if not logged in (one-time prompt)
  useEffect(() => {
    const hasPrompted = sessionStorage.getItem('soja_auth_prompted')
    if (!authLoading && !user && !hasPrompted && view !== 'admin' && view !== 'delivery') {
      setShowAuthModal(true)
      sessionStorage.setItem('soja_auth_prompted', 'true')
    } else if ((view === 'admin' || view === 'delivery') && showAuthModal) {
      setShowAuthModal(false)
    }
  }, [user, authLoading, view, showAuthModal])

  // Restore active order from localStorage on first load
  useEffect(() => {
    const savedOrderId = localStorage.getItem('soja_active_order_id')
    if (!savedOrderId || activeOrder) return

    const fetchActiveOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', savedOrderId)
        .single()

      if (data && data.status !== 'delivered') {
        setActiveOrder(data)
      } else if (data && data.status === 'delivered') {
        localStorage.removeItem('soja_active_order_id')
      }
    }
    fetchActiveOrder()
  }, [activeOrder])

  // Keep user order tracking subscription always tied to current active order
  useEffect(() => {
    const trackedOrderId = activeOrder?.id || localStorage.getItem('soja_active_order_id')
    if (!trackedOrderId) return

    const sub = supabase
      .channel(`active_order_tracking_${trackedOrderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${trackedOrderId}`
      }, (payload) => {
        setActiveOrder((prev) => {
          const nextOrder = payload.new
          if (prev?.status && prev.status !== nextOrder.status) {
            setUserOrderToast(nextOrder)
            playToastSound('status')
          }
          return nextOrder
        })

        if (payload.new.status === 'delivered') {
          setTimeout(() => {
            localStorage.removeItem('soja_active_order_id')
            setActiveOrder(null)
          }, 10000)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [activeOrder?.id, playToastSound])

  // ─── Secret route detection (kept for backwards compat) ───────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('adminsoja')) {
      window.history.replaceState({}, '', window.location.pathname)
      setView('admin')
    }
    if (params.has('repartosoja')) {
      window.history.replaceState({}, '', window.location.pathname)
      setView('delivery')
    }
  }, [])

  // ─── Auto-redirect based on role ─────────────────────────────────────────
  useEffect(() => {
    const currentRole = role || profile?.role
    if (currentRole === 'admin') setView('admin')
    if (currentRole === 'delivery') setView('delivery')
  }, [role, profile, user])

  // ─── App Toast Notification Sound ────────────────────────────────────────
  const playToastSound = useCallback((type = 'default') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      if (type === 'status') {
        oscillator.frequency.setValueAtTime(660, ctx.currentTime)
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.09)
      } else {
        oscillator.frequency.setValueAtTime(880, ctx.currentTime)
        oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
      }

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.45)
    } catch (e) {
      console.log('Audio notification not available')
    }
  }, [])

  useEffect(() => {
    if (role !== 'admin') return

    // Subscribe to new orders for admin notifications
    const sub = supabase
      .channel('admin_new_orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        console.log('🔔 Nuevo pedido recibido:', payload.new)
        setNewOrderToast(payload.new)
        playToastSound('new')
      })
      .subscribe()

    notifSubRef.current = sub
    return () => { supabase.removeChannel(sub) }
  }, [role, playToastSound])

  // ─── Cart & Checkout ──────────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    return allItems.reduce((acc, item) => acc + (cart[item.id] || 0) * item.price, 0)
  }, [allItems, cart])

  const shipping = deliveryType === 'delivery' && subtotal > 0 ? SHIPPING_COST : 0
  const total = subtotal + shipping

  const cartItems = useMemo(() => {
    return allItems
      .filter((item) => (cart[item.id] || 0) > 0)
      .map((item) => ({ ...item, qty: cart[item.id], total: cart[item.id] * item.price }))
  }, [allItems, cart])

  function updateQty(id, change) {
    setCart((prev) => {
      const nextQty = Math.max(0, (prev[id] || 0) + change)
      return { ...prev, [id]: nextQty }
    })
  }

  function handleCheckout(paymentDetails) {
    if (subtotal <= 0) { setValidationMessage('Agrega al menos un producto al carrito.'); return }
    if (!clientName.trim()) { setValidationMessage('Escribe tu nombre para continuar.'); return }
    if (!clientPhone.trim()) { setValidationMessage('Escribe tu telefono para continuar.'); return }
    if (deliveryType === 'delivery' && !deliveryLocation) { setValidationMessage('Por favor selecciona tu ubicacion en el mapa.'); return }

    let message = `*NUEVO PEDIDO - SOJA*\n\n`
    message += `*Cliente:* ${clientName}\n`
    message += `*Teléfono:* ${clientPhone}\n`
    message += `*Tipo de Entrega:* ${deliveryType === 'delivery' ? 'Domicilio' : 'Para Llevar'}\n`

    if (deliveryType === 'delivery' && deliveryLocation) {
      const mapLink = `https://www.google.com/maps?q=${deliveryLocation.lat},${deliveryLocation.lng}`
      message += `*Ubicación:* ${mapLink}\n`
    }

    if (observations) message += `*Observaciones:* ${observations}\n`

    message += `\n*DETALLE DEL PEDIDO:*\n`
    cartItems.forEach(item => { message += `- ${item.qty}x ${item.name} (${formatHNL(item.total)})\n` })
    message += `\n*Subtotal:* ${formatHNL(subtotal)}\n`
    message += `*Envío:* ${formatHNL(shipping)}\n`
    message += `*TOTAL:* ${formatHNL(total)}\n`

    if (paymentDetails?.method === 'cash') {
      message += `\n*Pago:* Efectivo\n`
      if (paymentDetails.change > 0) {
        message += `*Paga con:* ${formatHNL(paymentDetails.amount)}\n`
        message += `*Cambio a enviar:* ${formatHNL(paymentDetails.change)}\n`
      } else {
        message += `*Paga con:* Efectivo Exacto\n`
      }
    }

    window.open(`https://wa.me/50433135869?text=${encodeURIComponent(message)}`, '_blank')

    const saveOrder = async () => {
      try {
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user?.id || null,
            client_name: clientName,
            client_phone: clientPhone,
            items: cartItems,
            subtotal,
            shipping,
            total,
            delivery_type: deliveryType,
            location: deliveryLocation,
            observations,
            status: 'pending'
          })
          .select()
          .single()

        if (orderError) {
          console.error('Error saving order:', orderError)
        } else if (newOrder) {
          console.log('✅ Pedido guardado:', newOrder.id)
          setActiveOrder(newOrder)
          localStorage.setItem('soja_active_order_id', newOrder.id)
        }
      } catch (err) {
        console.error('Unexpected error saving order:', err)
      }
    }
    saveOrder()
    setCart({})
    setShowSuccessModal(true)
  }

  function handleCancelOrder() {
    if (window.confirm('¿Estas seguro que deseas cancelar tu pedido?')) {
      setActiveOrder(null)
      setView('home')
    }
  }

  function formatHNL(value) { return `L ${value.toFixed(2)}` }

  if (authLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="site-shell relative">
      {/* Admin New Order Toast */}
      {newOrderToast && role === 'admin' && (
        <NewOrderToast
          order={newOrderToast}
          onDismiss={() => setNewOrderToast(null)}
        />
      )}
      {userOrderToast && role !== 'admin' && (
        <UserOrderStatusToast
          order={userOrderToast}
          onDismiss={() => setUserOrderToast(null)}
        />
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {showSuccessModal && (
        <OrderSuccessModal onClose={() => { setShowSuccessModal(false); setView('home') }} />
      )}

      {validationMessage && (
        <ValidationModal message={validationMessage} onClose={() => setValidationMessage(null)} />
      )}

      {/* Floating Active Order Button */}
      {activeOrder && view !== 'tracking' && (
        <button
          onClick={() => setView('tracking')}
          className="fixed bottom-6 right-6 z-[100] bg-[#e5242c] text-white px-6 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform animate-bounce"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          Ver Pedido en Curso
        </button>
      )}

      {view === 'tracking' && activeOrder ? (
        <OrderTracking order={activeOrder} onBack={() => setView('home')} onCancel={handleCancelOrder} />
      ) : view === 'admin' ? (
        <RoleGuard requiredRole="admin" user={user} role={role} loading={authLoading}>
          <Admin setView={setView} />
        </RoleGuard>
      ) : view === 'delivery' ? (
        <RoleGuard requiredRole="delivery" user={user} role={role} loading={authLoading}>
          <Delivery setView={setView} />
        </RoleGuard>
      ) : view === 'profile' ? (
        <Profile onBack={() => setView('home')} />
      ) : view === 'order' ? (
        <Order
          setView={setView}
          menu={allItems}
          loading={menuLoading}
          cart={cart}
          updateQty={updateQty}
          cartItems={cartItems}
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
      ) : (
        <>
          <Navbar setView={setView} user={user} setShowAuthModal={setShowAuthModal} />
          <main id="inicio">
            <Hero setView={setView} />
            <InfoStrip />
            {menuLoading ? (
              <div className="py-24 text-center text-white">Cargando menú...</div>
            ) : (
              <Featured setView={setView} menu={allItems} />
            )}
            <About />
            <Reviews />
          </main>
          <Footer setView={setView} />
        </>
      )}
    </div>
  )
}

export default App
