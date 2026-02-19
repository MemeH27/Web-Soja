import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
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
import RoleGuard from './components/RoleGuard'
import MyOrders from './pages/MyOrders'
import ClickSpark from './components/Animations/ClickSpark'



// ─── New Order Notification ───────────────────────────────────────────────────
function NewOrderToast({ order, onDismiss }) {
  const navigate = useNavigate()
  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className="fixed top-24 right-6 z-[9999] bg-[#111] border-2 border-[#e5242c] rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-right duration-500 max-w-sm"
      style={{ top: 'calc(env(safe-area-inset-top) + 80px)' }}
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-[#e5242c]/10 rounded-2xl flex items-center justify-center text-[#e5242c] shrink-0 text-3xl">
          🍱
        </div>
        <div className="flex-1">
          <p className="text-[#e5242c] text-xs font-black uppercase tracking-widest mb-1">Nuevo pedido recibido</p>
          <p className="text-white font-bold text-lg mb-1">{order.client_name || 'Nuevo Cliente'}</p>
          <p className="text-gray-400 text-sm line-clamp-1">{order.items?.length} productos • L {order.total?.toFixed(2)}</p>
        </div>
        <button onClick={onDismiss} className="text-gray-600 hover:text-white transition-colors text-2xl leading-none">×</button>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => { navigate('/adminpanel'); onDismiss(); }}
          className="flex-1 bg-[#e5242c] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#c41e25] transition-all active:scale-95"
        >
          Ver en Panel
        </button>
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
    : order.status === 'cooking'
      ? 'Tu pedido se esta cocinando 👨‍🍳'
      : order.status === 'ready'
        ? '¡Tu pedido esta listo! ✨'
        : order.status === 'shipped'
          ? 'Tu pedido va en camino 🛵'
          : '¡Pedido entregado! Buen provecho 🥢'

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

function DeliveredOrderModal({ order, onClose }) {
  const shortId = order?.id ? order.id.slice(0, 8).toUpperCase() : '--------'

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111] border border-green-500/30 rounded-[2.2rem] p-8 text-center shadow-2xl animate-in zoom-in duration-300">
        <div className="w-20 h-20 mx-auto mb-5 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center text-4xl">
          ✅
        </div>
        <p className="text-green-400 text-[11px] font-black uppercase tracking-[0.18rem] mb-2">Pedido Entregado</p>
        <h3 className="text-white text-2xl font-black mb-3">Tu pedido #{shortId} ha sido entregado con exito</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-7">
          Gracias por tu compra. Esperamos que disfrutes tu comida. Buen provecho de parte de SOJA.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-black uppercase tracking-wider transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

// ─── Home Component ───────────────────────────────────────────────────────────
function Home({ setView, menu, menuLoading, user, setShowAuthModal }) {
  return (
    <>
      <Navbar setView={setView} user={user} setShowAuthModal={setShowAuthModal} />
      <main id="inicio">
        <Hero setView={setView} />
        <InfoStrip />
        <Featured setView={setView} menu={menu} loading={menuLoading} />
        <About />
        <Reviews />
      </main>
      <Footer setView={setView} />
    </>
  )
}

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Custom setView that uses navigate
  const setView = (v) => {
    switch (v) {
      case 'home': navigate('/'); break;
      case 'admin': navigate('/adminpanel'); break;
      case 'delivery': navigate('/deliverypanel'); break;
      case 'tracking': navigate('/tracking'); break;
      case 'profile': navigate('/profile'); break;
      case 'order': navigate('/order'); break;
      case 'my-orders': navigate('/my-orders'); break;
      default: navigate('/');

    }
  }

  const { user, profile, role, signOut, loading: authLoading } = useAuth()
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
  const [deliveredOrderModal, setDeliveredOrderModal] = useState(null)
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
    const isSpecialRoute = ['/adminpanel', '/deliverypanel'].includes(pathname)
    if (!authLoading && !user && !hasPrompted && !isSpecialRoute) {
      setShowAuthModal(true)
      sessionStorage.setItem('soja_auth_prompted', 'true')
    } else if (isSpecialRoute && showAuthModal) {
      setShowAuthModal(false)
    }
  }, [user, authLoading, pathname, showAuthModal])

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
          setDeliveredOrderModal(payload.new)
          localStorage.removeItem('soja_active_order_id')
          setActiveOrder(null)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [activeOrder?.id])

  // ─── Secret route detection (kept for backwards compat) ───────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('adminsoja')) {
      window.history.replaceState({}, '', window.location.pathname)
      navigate('/adminpanel')
    }
    if (params.has('repartosoja')) {
      window.history.replaceState({}, '', window.location.pathname)
      navigate('/deliverypanel')
    }
  }, [navigate])

  // ─── Auto-redirect based on role ─────────────────────────────────────────
  useEffect(() => {
    const currentRole = role || profile?.role
    if (currentRole === 'admin' && pathname !== '/adminpanel') navigate('/adminpanel')
    if (currentRole === 'delivery' && pathname !== '/deliverypanel') navigate('/deliverypanel')
  }, [role, profile, user, navigate, pathname])

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

  async function handleCancelOrder(reason) {
    if (!activeOrder) return
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancel_reason: reason
        })
        .eq('id', activeOrder.id)

      if (error) throw error

      setActiveOrder(null)
      localStorage.removeItem('soja_active_order_id')
      toast.success('Pedido cancelado correctamente')
      navigate('/')
    } catch (err) {
      toast.error('Error al cancelar el pedido')
      console.error(err)
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
      <ClickSpark sparkColor="#e5242c" sparkCount={10} sparkSize={12} duration={500} />
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
      {deliveredOrderModal && role !== 'admin' && role !== 'delivery' && (
        <DeliveredOrderModal
          order={deliveredOrderModal}
          onClose={() => setDeliveredOrderModal(null)}
        />
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {showSuccessModal && (
        <OrderSuccessModal onClose={() => { setShowSuccessModal(false); navigate('/') }} />
      )}

      {validationMessage && (
        <ValidationModal message={validationMessage} onClose={() => setValidationMessage(null)} />
      )}

      {/* Floating Active Order Button */}
      {activeOrder && pathname !== '/tracking' && (
        <button
          onClick={() => navigate('/tracking')}
          className="fixed bottom-6 right-6 z-[100] bg-[#e5242c] text-white px-6 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform animate-bounce"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          Ver Pedido en Curso
        </button>
      )}

      <Routes>
        <Route path="/" element={
          <Home setView={setView} menu={allItems} menuLoading={menuLoading} user={user} setShowAuthModal={setShowAuthModal} />
        } />
        <Route path="/tracking" element={
          activeOrder ? (
            <OrderTracking order={activeOrder} onBack={() => navigate('/')} onCancel={handleCancelOrder} />
          ) : (
            <Navigate to="/" replace />
          )
        } />
        <Route path="/adminpanel" element={
          <RoleGuard requiredRole="admin" user={user} role={role} loading={authLoading}>
            <Admin setView={setView} />
          </RoleGuard>
        } />
        <Route path="/deliverypanel" element={
          <RoleGuard requiredRole="delivery" user={user} role={role} loading={authLoading}>
            <Delivery setView={setView} />
          </RoleGuard>
        } />
        <Route path="/profile" element={
          <Profile onBack={() => navigate('/')} setCart={setCart} />
        } />
        <Route path="/my-orders" element={
          <MyOrders onBack={() => navigate('/')} setCart={setCart} setView={setView} />
        } />

        <Route path="/order" element={
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
        } />
        <Route path="*" element={<Navigate to="/" replace />} /> {/* Catch-all for unknown routes */}
      </Routes>
    </div>
  )
}
