declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_KEY: string;
      RAPID_API_KEY: string;
      RPC_URL: string;
      PRIVATE_KEY: string;
    }
  }
}
export {};