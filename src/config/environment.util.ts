import { Environment } from './env.validation';

export function isProductionEnvironment(nodeEnv: string | undefined): boolean {
  return nodeEnv === Environment.Production;
}
