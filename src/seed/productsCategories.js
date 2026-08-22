import mongoose from "mongoose";
import Category from "../models/category.js";
import Product from "../models/product.js";
import dotenv from "dotenv";

dotenv.config();

async function seed() {
  const dbURI = process.env.MONGODB_URI;

  await mongoose.connect(dbURI, {});

  // Categorías principales
  const mainCategories = [
    { name: "Perros", description: "Alimento, juguetes y accesorios para perros" },
    { name: "Gatos", description: "Alimento, juguetes y accesorios para gatos" },
    { name: "Aves", description: "Alimento y accesorios para aves" },
    { name: "Peces y Acuarios", description: "Peceras, acuarios y accesorios para peces" },
    { name: "Higiene y Cuidado", description: "Arena, shampoo y productos de higiene para mascotas" },
    { name: "Juguetes", description: "Juguetes para todo tipo de mascotas" },
    { name: "Alimentación", description: "Alimento y snacks para mascotas" },
  ];

  // Limpiar colecciones
  await Category.deleteMany({});
  await Product.deleteMany({});

  // Insertar categorías principales
  const categories = {};
  for (const cat of mainCategories) {
    const category = new Category(cat);
    await category.save();
    categories[cat.name] = category;
  }

  // Productos de prueba
  const productsData = [
    {
      name: "Correa retráctil para perros",
      description: "Correa retráctil de 5 metros, resistente, para paseos seguros.",
      price: 15.99,
      stock: 30,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Perros"]._id,
    },
    {
      name: "Cama acolchada para perros medianos",
      description: "Cama suave y lavable, ideal para el descanso de perros medianos.",
      price: 34.5,
      stock: 15,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Perros"]._id,
    },
    {
      name: "Rascador para gatos con torre",
      description: "Torre rascadora de varios niveles con juguetes colgantes.",
      price: 42.0,
      stock: 12,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Gatos"]._id,
      discount: 20,
    },
    {
      name: "Transportadora para gatos",
      description: "Transportadora ventilada y segura para viajes cortos al veterinario.",
      price: 28.75,
      stock: 18,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Gatos"]._id,
    },
    {
      name: "Jaula para aves medianas",
      description: "Jaula amplia con percheros y bandeja extraíble para aseo fácil.",
      price: 55.0,
      stock: 10,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Aves"]._id,
    },
    {
      name: "Comedero y bebedero para jaula",
      description: "Set de comedero y bebedero de fácil instalación para jaulas de aves.",
      price: 12.3,
      stock: 25,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Aves"]._id,
    },
    {
      name: "Acuario de vidrio 20 litros",
      description: "Acuario de vidrio templado, ideal para peces pequeños y medianos.",
      price: 89.99,
      stock: 8,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Peces y Acuarios"]._id,
      discount: 15,
    },
    {
      name: "Filtro interno para acuario",
      description: "Filtro silencioso que mantiene el agua limpia y oxigenada.",
      price: 22.4,
      stock: 20,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Peces y Acuarios"]._id,
    },
    {
      name: "Arena aglomerante para gatos",
      description: "Arena de rápida absorción y control de olores.",
      price: 19.9,
      stock: 40,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Higiene y Cuidado"]._id,
    },
    {
      name: "Shampoo hipoalergénico para mascotas",
      description: "Shampoo suave apto para perros y gatos de piel sensible.",
      price: 14.5,
      stock: 22,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Higiene y Cuidado"]._id,
    },
    {
      name: "Pelota de goma resistente para perros",
      description: "Pelota de goma natural resistente a mordidas fuertes.",
      price: 8.99,
      stock: 50,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Juguetes"]._id,
    },
    {
      name: "Ratón de peluche con catnip",
      description: "Juguete de peluche relleno con catnip para estimular el juego felino.",
      price: 6.5,
      stock: 45,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Juguetes"]._id,
    },
    {
      name: "Alimento seco para perros adultos 15kg",
      description: "Alimento balanceado con proteína de pollo para perros adultos.",
      price: 58.0,
      stock: 25,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Alimentación"]._id,
      discount: 30,
    },
    {
      name: "Alimento húmedo para gatos (pack x12)",
      description: "Pack de 12 sobres de alimento húmedo en salsa para gatos adultos.",
      price: 24.9,
      stock: 30,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Alimentación"]._id,
    },
    {
      name: "Snacks dentales para perros",
      description: "Snacks masticables que ayudan a la limpieza dental de tu perro.",
      price: 11.2,
      stock: 35,
      imagesUrl: ["/img/products/placeholder.svg"],
      category: categories["Alimentación"]._id,
    },
  ];

  for (const prod of productsData) {
    const product = new Product(prod);
    await product.save();
  }

  console.log("Datos de prueba insertados correctamente.");
  await mongoose.disconnect();
}

seed();
