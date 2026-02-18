// DEPRECATED: These lists are now in Supabase. detailed usage in scripts/migrate_data.js
export const FOOD_ITEMS = [
    { id: 'arrozcharsiu', name: 'Arroz Charsiu', price: 220, image: '/img/productos/arrozcharsiu.jpg' },
    { id: 'arrozconmariscos', name: 'Arroz con Mariscos', price: 280, image: '/img/productos/arrozconmariscos.jpg' },
    { id: 'arrozfrito', name: 'Arroz Frito', price: 180, image: '/img/productos/arrozfrito.jpg' },
    { id: 'camaronesempanizados', name: 'Camarones Empanizados', price: 260, image: '/img/productos/camaronesempanizados.jpg' },
    { id: 'camaronkunpao', name: 'Camaron Kun Pao', price: 255, image: '/img/productos/camaronkunpao.jpg' },
    { id: 'pollonaranja', name: 'Pollo Naranja', price: 220, image: '/img/productos/pollonaranja.jpg' },
    { id: 'pollokunpao', name: 'Pollo Kun Pao', price: 215, image: '/img/productos/pollokunpao.jpg' },
    { id: 'pollosesame', name: 'Pollo Sesame', price: 225, image: '/img/productos/pollosesame.jpg' },
    { id: 'sopawantan', name: 'Sopa Wantan', price: 150, image: '/img/productos/sopawantan.jpg' },
    { id: 'tacoschinos', name: 'Tacos Chinos', price: 140, image: '/img/productos/tacoschinos.jpg' },
    { id: 'wantanvapor', name: 'Wantan al Vapor', price: 145, image: '/img/productos/wantanvapor.jpg' },
]

export const DRINK_ITEMS = [
    { id: 'refrescos', name: 'Refrescos', price: 40, image: '/img/productos/refrescos.png' },
    { id: 'telipton', name: 'Te Lipton', price: 45, image: '/img/productos/telipton.webp' },
    { id: 'frescoscoca', name: 'Aguas Frescas', price: 50, image: '/img/productos/frescoscoca.jpg' },
]

export const REVIEWS = [
    {
        author: 'Yeny T.',
        meta: 'Local Guide - 132 opiniones - 49 fotos',
        time: 'Hace 2 meses',
        rating: 5,
        text: 'Me encanta la comida y ponen mas que suficiente aunque el plato pequeno alcance para varias personas.',
    },
    {
        author: 'German Villanueva',
        meta: 'Local Guide - 63 opiniones - 113 fotos',
        time: 'Hace 9 meses',
        rating: 5,
        text: 'Excelente comida y atencion, lo mejor de la comida china.',
    },
    {
        author: 'Quewin Vinke',
        meta: 'Local Guide - 108 opiniones - 41 fotos',
        time: 'Hace 2 anos',
        rating: 4,
        text: 'Comida muy rica y servicio excelente, lugar acogedor y familiar.',
    },
    {
        author: 'Karla A.',
        meta: '8 opiniones - 5 fotos',
        time: 'Hace 2 anos',
        rating: 5,
        text: 'Excelente servicio, personal amable y tiempos de entrega correctos.',
    },
    {
        author: 'Edgar Anariba',
        meta: 'Local Guide - 36 opiniones - 39 fotos',
        time: 'Hace un ano',
        rating: 4,
        text: 'Porciones grandes, atencion al cliente muy buena y ambiente agradable.',
    },
    {
        author: 'Nicole Linares',
        meta: 'Local Guide - 121 opiniones - 185 fotos',
        time: 'Hace un ano',
        rating: 5,
        text: 'Buen sazon y porciones grandes por un precio proporcional.',
    },
]

export const DAILY_SCHEDULE = [
    'Lunes: 10:00 a.m. - 8:00 p.m.',
    'Martes: 10:00 a.m. - 8:00 p.m.',
    'Miercoles: 10:00 a.m. - 8:00 p.m.',
    'Jueves: 10:00 a.m. - 8:00 p.m.',
    'Viernes: 10:00 a.m. - 8:00 p.m.',
    'Sabado: 10:00 a.m. - 8:00 p.m.',
    'Domingo: 10:00 a.m. - 8:00 p.m.',
]

export const featuredDishIds = ['arrozfrito', 'sopawantan', 'camaronesempanizados', 'pollonaranja', 'tacoschinos']
export const featuredHighlights = ['Favorito del chef', 'Top ventas', 'Edicion premium', 'Sabor intenso', 'Tradicion SOJA']
export const SHIPPING_COST = 40
