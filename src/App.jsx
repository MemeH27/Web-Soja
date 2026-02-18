import { useMemo, useState, useEffect } from 'react'
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

  // New: Persistent Active Order State
  const [activeOrder, setActiveOrder] = useState(null)

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
    if (!authLoading && !user && !hasPrompted) {
      setShowAuthModal(true)
      sessionStorage.setItem('soja_auth_prompted', 'true')
    }
  }, [user, authLoading])

  // Effect to handle secret route detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('adminsoja')) {
      console.log('Secret route detected: adminsoja')
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      setView('admin')
    }
    if (params.has('repartosoja')) {
      console.log('Secret route detected: repartosoja')
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      setView('delivery')
    }
  }, [])

  // Effect to handle initial view based on role
  useEffect(() => {
    const currentRole = role || profile?.role
    console.log('App render - User:', user?.email, 'Role check:', currentRole)
    if (currentRole === 'admin') {
      console.log('Admin detectado, redireccionando...')
      setView('admin')
    }
    if (currentRole === 'delivery') {
      console.log('Repartidor detectado, redireccionando...')
      setView('delivery')
    }
  }, [role, profile, user])

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
    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (subtotal <= 0) {
      setValidationMessage('Agrega al menos un producto al carrito.')
      return
    }
    if (!clientName.trim()) {
      setValidationMessage('Escribe tu nombre para continuar.')
      return
    }
    if (!clientPhone.trim()) {
      setValidationMessage('Escribe tu telefono para continuar.')
      return
    }
    if (deliveryType === 'delivery' && !deliveryLocation) {
      setValidationMessage('Por favor selecciona tu ubicacion en el mapa.')
      return
    }

    let message = `*NUEVO PEDIDO - SOJA*\n\n`
    message += `*Cliente:* ${clientName}\n`
    message += `*Teléfono:* ${clientPhone}\n`
    message += `*Tipo de Entrega:* ${deliveryType === 'delivery' ? 'Domicilio' : 'Para Llevar'}\n`

    if (deliveryType === 'delivery' && deliveryLocation) {
      const mapLink = `https://www.google.com/maps?q=${deliveryLocation.lat},${deliveryLocation.lng}`
      message += `*Ubicación:* ${mapLink}\n`
    }

    if (observations) {
      message += `*Observaciones:* ${observations}\n`
    }

    message += `\n*DETALLE DEL PEDIDO:*\n`
    cartItems.forEach(item => {
      message += `- ${item.qty}x ${item.name} (${formatHNL(item.total)})\n`
    })

    message += `\n*Subtotal:* ${formatHNL(subtotal)}\n`
    message += `*Envío:* ${formatHNL(shipping)}\n`
    message += `*TOTAL:* ${formatHNL(total)}\n`

    if (paymentDetails) {
      if (paymentDetails.method === 'cash') {
        message += `\n*Pago:* Efectivo\n`
        if (paymentDetails.change > 0) {
          message += `*Paga con:* ${formatHNL(paymentDetails.amount)}\n`
          message += `*Cambio a enviar:* ${formatHNL(paymentDetails.change)}\n`
        } else {
          message += `*Paga con:* Efectivo Exacto\n`
        }
      }
    }

    const whatsappUrl = `https://wa.me/50433135869?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')

    // Save to Supabase
    const saveOrder = async () => {
      try {
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user?.id || null,
            client_name: clientName,
            client_phone: clientPhone,
            items: cartItems,
            subtotal: subtotal,
            shipping: shipping,
            total: total,
            delivery_type: deliveryType,
            location: deliveryLocation,
            observations: observations,
            status: 'pending'
          })
        if (orderError) console.error('Error saving order:', orderError)
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

  function handleReset() {
    setView('home')
  }

  function formatHNL(value) {
    return `L ${value.toFixed(2)}`
  }

  if (authLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#e5242c] border-t-transparent rounded-full animate-spin"></div></div>

  return (
    <div className="site-shell relative">
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Success Modal */}
      {showSuccessModal && (
        <OrderSuccessModal
          onClose={() => {
            setShowSuccessModal(false)
            setView('home')
          }}
        />
      )}

      {/* Validation Modal */}
      {validationMessage && (
        <ValidationModal
          message={validationMessage}
          onClose={() => setValidationMessage(null)}
        />
      )}

      {/* Floating Button for Active Order */}
      {activeOrder && view !== 'tracking' && (
        <button
          onClick={() => setView('tracking')}
          className="fixed bottom-6 right-6 z-[100] bg-[#e5242c] text-white px-6 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform animate-bounce"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          Ver Pedido en Curso
        </button>
      )}

      {view === 'tracking' && activeOrder ? (
        <OrderTracking
          order={activeOrder}
          onBack={handleReset}
          onCancel={handleCancelOrder}
        />
      ) : view === 'home' ? (
        <>
          <Navbar
            setView={setView}
            user={user}
            setShowAuthModal={setShowAuthModal}
          />
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
      ) : view === 'admin' ? (
        <Admin setView={setView} />
      ) : view === 'delivery' ? (
        <Delivery setView={setView} />
      ) : view === 'profile' ? (
        <Profile onBack={() => setView('home')} />
      ) : (
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
      )}
    </div>
  )
}

export default App
