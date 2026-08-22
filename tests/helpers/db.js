import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Helper de base de datos en memoria para pruebas de modelos (sin DB real, sin red externa).
let mongod;

export async function connect() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function clearDatabase() {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

export async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}
