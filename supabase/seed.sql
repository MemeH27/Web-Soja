-- Clear existing data
truncate table public.products;
truncate table public.reviews;

-- Insert Products
insert into public.products (id, name, price, image, category) values
('arrozcharsiu', 'Arroz Charsiu', 220, '/img/productos/arrozcharsiu.jpg', 'food'),
('arrozconmariscos', 'Arroz con Mariscos', 280, '/img/productos/arrozconmariscos.jpg', 'food'),
('arrozfrito', 'Arroz Frito', 180, '/img/productos/arrozfrito.jpg', 'food'),
('camaronesempanizados', 'Camarones Empanizados', 260, '/img/productos/camaronesempanizados.jpg', 'food'),
('camaronkunpao', 'Camaron Kun Pao', 255, '/img/productos/camaronkunpao.jpg', 'food'),
('pollonaranja', 'Pollo Naranja', 220, '/img/productos/pollonaranja.jpg', 'food'),
('pollokunpao', 'Pollo Kun Pao', 215, '/img/productos/pollokunpao.jpg', 'food'),
('pollosesame', 'Pollo Sesame', 225, '/img/productos/pollosesame.jpg', 'food'),
('sopawantan', 'Sopa Wantan', 150, '/img/productos/sopawantan.jpg', 'food'),
('tacoschinos', 'Tacos Chinos', 140, '/img/productos/tacoschinos.jpg', 'food'),
('wantanvapor', 'Wantan al Vapor', 145, '/img/productos/wantanvapor.jpg', 'food'),
('refrescos', 'Refrescos', 40, '/img/productos/refrescos.png', 'drink'),
('telipton', 'Te Lipton', 45, '/img/productos/telipton.webp', 'drink'),
('frescoscoca', 'Aguas Frescas', 50, '/img/productos/frescoscoca.jpg', 'drink');

-- Insert Reviews
insert into public.reviews (author, meta, time_text, rating, content) values
('Yeny T.', 'Local Guide - 132 opiniones - 49 fotos', 'Hace 2 meses', 5, 'Me encanta la comida y ponen mas que suficiente aunque el plato pequeno alcance para varias personas.'),
('German Villanueva', 'Local Guide - 63 opiniones - 113 fotos', 'Hace 9 meses', 5, 'Excelente comida y atencion, lo mejor de la comida china.'),
('Quewin Vinke', 'Local Guide - 108 opiniones - 41 fotos', 'Hace 2 anos', 4, 'Comida muy rica y servicio excelente, lugar acogedor y familiar.'),
('Karla A.', '8 opiniones - 5 fotos', 'Hace 2 anos', 5, 'Excelente servicio, personal amable y tiempos de entrega correctos.'),
('Edgar Anariba', 'Local Guide - 36 opiniones - 39 fotos', 'Hace un ano', 4, 'Porciones grandes, atencion al cliente muy buena y ambiente agradable.'),
('Nicole Linares', 'Local Guide - 121 opiniones - 185 fotos', 'Hace un ano', 5, 'Buen sazon y porciones grandes por un precio proporcional.');
