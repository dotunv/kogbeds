import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Publication, Prisma } from '@prisma/client';
import { init } from '@paralleldrive/cuid2';
import * as dns from 'dns/promises';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { InitiateDomainDto } from './dto/initiate-domain.dto';

const createId = init({ length: 24 });

const MAX_PUBLICATIONS = 10;

@Injectable()
export class PublicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<Publication[]> {
    return this.prisma.publication.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createForUser(
    userId: string,
    dto: CreatePublicationDto,
  ): Promise<Publication> {
    const count = await this.prisma.publication.count({
      where: { userId, deletedAt: null },
    });
    if (count >= MAX_PUBLICATIONS) {
      throw new ForbiddenException(
        JSON.stringify({ code: 'publication_limit_reached' }),
      );
    }

    const slugTaken = await this.prisma.publication.findUnique({
      where: { slug: dto.slug },
    });
    if (slugTaken) {
      throw new ConflictException(
        JSON.stringify({ code: 'publication_slug_taken' }),
      );
    }

    return this.prisma.publication.create({
      data: {
        userId,
        slug: dto.slug,
        title: dto.title ?? dto.slug,
        description: dto.description ?? '',
        type: dto.type ?? 'BOTH',
      },
    });
  }

  async createDefault(
    userId: string,
    username: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Publication> {
    const client = tx ?? this.prisma;
    return client.publication.create({
      data: {
        userId,
        slug: username,
        title: `${username}'s blog`,
        type: 'BOTH',
      },
    });
  }

  async findBySlug(slug: string): Promise<Publication | null> {
    return this.prisma.publication.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async getBySlugPublic(slug: string, userId?: string): Promise<Publication> {
    const pub = await this.prisma.publication.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!pub) throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));
    if (!pub.isPublic && pub.userId !== userId) {
      throw new ForbiddenException(JSON.stringify({ code: 'publication_not_public' }));
    }
    return pub;
  }

  async updateForOwner(
    userId: string,
    slug: string,
    dto: UpdatePublicationDto,
  ): Promise<Publication> {
    const pub = await this.requireOwner(userId, slug);
    return this.prisma.publication.update({
      where: { id: pub.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.accentColor !== undefined ? { accentColor: dto.accentColor } : {}),
        ...(dto.footerText !== undefined ? { footerText: dto.footerText } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
      },
    });
  }

  async softDeleteForOwner(userId: string, slug: string): Promise<{ deleted: true }> {
    const pub = await this.requireOwner(userId, slug);
    await this.prisma.publication.update({
      where: { id: pub.id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  async initiateDomain(
    userId: string,
    slug: string,
    dto: InitiateDomainDto,
  ): Promise<{ txtRecord: string; instructions: string }> {
    const pub = await this.requireOwner(userId, slug);

    const domain = dto.domain.trim().toLowerCase();

    const taken = await this.prisma.publication.findFirst({
      where: { customDomain: domain, NOT: { id: pub.id } },
    });
    if (taken) {
      throw new ConflictException(
        JSON.stringify({ code: 'publication_domain_already_claimed' }),
      );
    }

    const txtRecord = `grizzly-verify-${createId()}`;

    await this.prisma.publication.update({
      where: { id: pub.id },
      data: { customDomain: domain, domainTxtRecord: txtRecord, domainVerified: false },
    });

    return {
      txtRecord,
      instructions: `Add a TXT record to _grizzly-verify.${domain} with value: ${txtRecord}`,
    };
  }

  async verifyDomain(userId: string, slug: string): Promise<{ verified: boolean }> {
    const pub = await this.requireOwner(userId, slug);
    if (!pub.customDomain || !pub.domainTxtRecord) {
      throw new ForbiddenException(
        JSON.stringify({ code: 'publication_domain_not_verified' }),
      );
    }

    let verified = false;
    try {
      const records = await dns.resolveTxt(
        `_grizzly-verify.${pub.customDomain}`,
      );
      verified = records.some((r) =>
        r.join('').includes(pub.domainTxtRecord!),
      );
    } catch {
      verified = false;
    }

    if (verified) {
      await this.prisma.publication.update({
        where: { id: pub.id },
        data: { domainVerified: true },
      });
    }

    return { verified };
  }

  async removeDomain(userId: string, slug: string): Promise<{ removed: true }> {
    const pub = await this.requireOwner(userId, slug);
    await this.prisma.publication.update({
      where: { id: pub.id },
      data: { customDomain: null, domainTxtRecord: null, domainVerified: false },
    });
    return { removed: true };
  }

  private async requireOwner(userId: string, slug: string): Promise<Publication> {
    const pub = await this.prisma.publication.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!pub) throw new NotFoundException(JSON.stringify({ code: 'publication_not_found' }));
    if (pub.userId !== userId) {
      throw new ForbiddenException('Forbidden');
    }
    return pub;
  }
}
