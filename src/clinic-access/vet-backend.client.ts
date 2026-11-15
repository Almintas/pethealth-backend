import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_SERVICE_SECRET_HEADER } from '../internal-services/guards/internal-service.guard';

export type VetClinicAccess = {
  clinicId: string;
  clinicName: string;
  clinicPhone?: string | null;
  clinicAddress?: string | null;
  grantedAt: string;
};

export type VetAuditEvent = {
  id: string;
  action: string;
  entityType: string;
  actorType: string;
  actorName?: string | null;
  clinicName?: string | null;
  summary?: string | null;
  createdAt: string;
};

type VetGraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

/**
 * Owner → Vet service-to-service client. The Vet backend is the source of
 * truth for which clinics can access a pet; owners list and revoke through it.
 */
@Injectable()
export class VetBackendClient {
  private readonly logger = new Logger(VetBackendClient.name);

  constructor(private readonly configService: ConfigService) {}

  async listClinicAccessForPet(petId: string): Promise<VetClinicAccess[]> {
    const data = await this.execute<{
      internalClinicAccessForPet: VetClinicAccess[];
    }>(
      `
        query InternalClinicAccessForPet($petId: ID!) {
          internalClinicAccessForPet(petId: $petId) {
            clinicId
            clinicName
            clinicPhone
            clinicAddress
            grantedAt
          }
        }
      `,
      { petId },
    );
    return data.internalClinicAccessForPet;
  }

  async listAuditEventsForPet(
    petId: string,
    limit: number,
  ): Promise<VetAuditEvent[]> {
    const data = await this.execute<{
      internalAuditEventsForPet: VetAuditEvent[];
    }>(
      `
        query InternalAuditEventsForPet($petId: ID!, $limit: Int) {
          internalAuditEventsForPet(petId: $petId, limit: $limit) {
            id
            action
            entityType
            actorType
            actorName
            clinicName
            summary
            createdAt
          }
        }
      `,
      { petId, limit },
    );
    return data.internalAuditEventsForPet;
  }

  async revokeClinicAccess(petId: string, clinicId: string): Promise<boolean> {
    const data = await this.execute<{ internalRevokeClinicPetAccess: boolean }>(
      `
        mutation InternalRevokeClinicPetAccess($petId: ID!, $clinicId: ID!) {
          internalRevokeClinicPetAccess(petId: $petId, clinicId: $clinicId)
        }
      `,
      { petId, clinicId },
    );
    return data.internalRevokeClinicPetAccess;
  }

  private async execute<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const url = this.configService.get<string>('VET_GRAPHQL_URL')?.trim();
    const secret = this.configService
      .get<string>('OWNER_SERVICE_SECRET')
      ?.trim();
    if (!url || !secret) {
      throw new ServiceUnavailableException(
        'Clinic access is not available right now.',
      );
    }

    let payload: VetGraphqlResponse<T>;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [INTERNAL_SERVICE_SECRET_HEADER]: secret,
        },
        body: JSON.stringify({ query, variables }),
      });
      if (!response.ok) {
        this.logger.warn(`Vet backend responded with HTTP ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }
      payload = (await response.json()) as VetGraphqlResponse<T>;
    } catch {
      throw new ServiceUnavailableException(
        'Clinic access is not available right now. Please try again later.',
      );
    }

    if (payload.errors?.length || !payload.data) {
      this.logger.warn(
        `Vet backend GraphQL error: ${payload.errors?.[0]?.message ?? 'no data'}`,
      );
      throw new BadGatewayException(
        'Could not update clinic access. Please try again later.',
      );
    }
    return payload.data;
  }
}
