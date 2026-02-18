import { FaCheck, FaWhatsapp } from 'react-icons/fa6'

export default function OrderSuccessModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl transform transition-all animate-bounce-in">
                <div className="w-20 h-20 bg-[#e5242c] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(229,36,44,0.4)]">
                    <FaCheck className="text-4xl text-white" />
                </div>

                <h2 className="text-3xl font-bold text-white mb-2 font-serif">¡Pedido exitoso!</h2>
                <p className="text-gray-400 mb-8 leading-relaxed">
                    Tu pedido se ha generado exitosamente. Te hemos redirigido a WhatsApp para enviar el detalle a la cocina.
                </p>

                <button
                    onClick={onClose}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-[#e5242c] hover:text-white transition-all duration-300 shadow-lg"
                >
                    Entendido
                </button>
            </div>
        </div>
    )
}
