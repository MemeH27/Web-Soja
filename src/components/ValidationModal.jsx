import { FaExclamation } from 'react-icons/fa6'

export default function ValidationModal({ message, onClose }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl transform transition-all animate-bounce-in">
                <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(249,115,22,0.4)]">
                    <FaExclamation className="text-4xl text-white" />
                </div>

                <h2 className="text-3xl font-bold text-white mb-2 font-serif">Atencion</h2>
                <p className="text-gray-400 mb-8 leading-relaxed">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-orange-500 hover:text-white transition-all duration-300 shadow-lg"
                >
                    Entendido
                </button>
            </div>
        </div>
    )
}
