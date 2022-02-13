import { DataSource } from 'apollo-datasource';
import isEmail from 'isemail';
import { PrismaClient, Pet, Trip } from '@prisma/client';

export class UserAPI extends DataSource {
  prisma: PrismaClient;
  context: any;

  constructor({ prisma }: any) {
    super();
    this.prisma = prisma;
  }

  /**
   * This is a function that gets called by ApolloServer when being setup.
   * This function gets called with the datasource config including things
   * like caches and context. We'll assign this.context to the request context
   * here, so we can know about the user making requests
   */
  initialize(config: any) {
    this.context = config.context;
  }

  async findOrCreateUser(emailInput: { email?: string } = {}) {
    const email =
      this.context && this.context.user
        ? this.context.user.email
        : emailInput.email;
    if (!email || !isEmail.validate(email)) return null;

    // there is an email
    const user = await this.prisma.user.upsert({
      where: { email },
      create: { email },
      update: { email },
    });

    return user;
  }

  async bookTrips({
    launchIds,
  }: {
    launchIds: number[];
  }): Promise<Trip[] | undefined> {
    const userId = this.context.user.id;
    if (!userId) return;

    let results = [];

    // for each launch id, try to book the trip and add it to the results array
    // if successful
    for (const launchId of launchIds) {
      const res = (await this.bookTrip({ launchId })) as never;
      if (res) results.push(res);
    }

    return results;
  }

  async bookTrip({ launchId }: { launchId: number }): Promise<Trip> {
    const userId = this.context.user.id;

    const userBookedTrip = await this.prisma.trip.findUnique({
      where: {
        userId_launchId: {
          userId,
          launchId: Number(launchId),
        },
      },
    });

    if (userBookedTrip) {
      return userBookedTrip;
    }

    const trip = await this.prisma.trip.create({
      data: {
        launchId: Number(launchId),
        User: {
          connect: {
            id: userId,
          },
        },
      },
    });

    return trip;
  }

  async cancelTrip({ launchId }: { launchId: number }) {
    const userId = this.context.user.id;
    return false;
  }

  async getLaunchIdsByUser(): Promise<number[]> {
    const userId = this.context.user.id;

    const trips = await this.prisma.trip.findMany({
      where: {
        userId,
      },
    });

    return trips.map((t) => t.launchId || -1).filter((id) => id !== -1);
  }

  async isBookedOnLaunch({ launchId }: { launchId: number }): Promise<Boolean> {
    if (!this.context || !this.context.user) return false;
    const userId = this.context.user.id;

    const trip = await this.prisma.trip.findUnique({
      where: {
        userId_launchId: {
          userId,
          launchId: Number(launchId),
        },
      },
    });

    return Boolean(trip);
  }

  async addPetForUser(name: string): Promise<Pet | null> {
    if (!this.context || !this.context.user) return null;
    const userId = this.context.user.id;

    const pet = await this.prisma.pet.create({
      data: {
        name,
        User: {
          connect: {
            id: userId,
          },
        },
      },
    });

    return pet;
  }
}
