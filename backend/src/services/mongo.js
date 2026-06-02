import mongoose from 'mongoose';
import { config } from '../config.js';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectMongo() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(config.mongoUri, { dbName: 'specmind' });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
