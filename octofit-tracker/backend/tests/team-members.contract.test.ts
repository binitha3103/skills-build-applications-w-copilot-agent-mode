import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Team, User } from '../src/models/index.js';

let mongo: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([Team.deleteMany({}), User.deleteMany({})]);
});

describe('team member references', () => {
  it('rejects member IDs that do not belong to users', async () => {
    const response = await request(app).post('/api/teams').send({
      name: 'Ghost team',
      mascot: 'Ghost',
      members: [new mongoose.Types.ObjectId().toString()],
    });

    expect(response.status).toBe(404);
    expect(await Team.countDocuments()).toBe(0);
  });
});