import { IGameMetadata } from "@craft/engine";
import { AppConfig } from "../appConfig";

export class ApiServiceClass {
  constructor(private baseUrl = AppConfig.api.baseUrl) {}

  async getWorlds(): Promise<IGameMetadata[]> {
    const response = await fetch(`${this.baseUrl}/worlds`);
    return await response.json();
  }
}

export const ApiService = new ApiServiceClass();
